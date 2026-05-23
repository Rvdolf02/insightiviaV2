import { sendEmail } from "@/actions/send-email";
import { db } from "../prisma";
import { inngest } from "./client";
import EmailTemplate from "@/emails/template";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Every 6 Hours will be triggered + the condition of Monthly email
export const checkBudgetAlert = inngest.createFunction(
  { name: "Check Budget Alerts" },
  { cron: "0 */6 * * *" },
  async ({ step }) => {
   const budgets = await step.run("fecth-budget", async() =>{
    return await db.budget.findMany({
      include: {
        user: {
          include: {
            accounts: {
              where: {
                isDefault: true,
              },
            },
          },
        },
      },
    });
   });

   for(const budget of budgets) {
    const defaultAccount = budget.user.accounts[0];
    if (!defaultAccount) continue; // Skip if no default account

    await step.run(`check-budget-${budget.id}`, async () => {
        const currentDate = new Date();
        const startOfMonth = new Date(
            currentDate.getFullYear(),
            currentDate.getMonth(),
            1
        );
        const endOfMonth = new Date(
            currentDate.getFullYear(), 
            currentDate.getMonth() + 1,
            0
        );

      const expenses = await db.transaction.aggregate({
        where: {
          userId: budget.userId,
          accountId: defaultAccount.id, // Only consider default account
          type: "EXPENSE",
          date: {
                gte: startOfMonth,
                lte: endOfMonth,
          },
        },
        _sum: {
          amount: true,
        },
      });

      const totalExpenses = expenses._sum.amount?.toNumber() || 0;
      const budgetAmount = budget.amount;
      const percentageUsed = (totalExpenses / budgetAmount) * 100;

      if(
        percentageUsed >= 80 && 
        (!budget.lastAlertSent || 
          isNewMonth(new Date (budget.lastAlertSent), new Date()))
        ) {

          // Send Email
          await sendEmail({
            to: budget.user.email,
            subject: `Budget Alert for ${defaultAccount.name}`,
            react: EmailTemplate({
              userName: budget.user.name,
              type: "budget-alert",
              data: {
                percentageUsed,
                budgetAmount: parseInt(budgetAmount).toFixed(1),
                totalExpenses: parseInt(totalExpenses).toFixed(1),
                accountName: defaultAccount.name,
              },
            }),
          });

          // Update lastAlertSent
          await db.budget.update({
            where: { id: budget.id },
            data: { lastAlertSent: new Date() },
          });
        } 
    });
   }
  }
);

function isNewMonth(lastAlertDate, currentDate) {
  return (
    lastAlertDate.getMonth() !== currentDate.getMonth() ||
    lastAlertDate.getFullYear() !== currentDate.getFullYear()
  );
}

// Every mid-night will be triggered
export const triggerRecurringTransactions = inngest.createFunction({
  id: "trigger-recurring-transactions",
  name: "Trigger Recurring Transactions",
}, {cron:"0 0 * * *"},
  async ({ step }) => {
    // 1. Fetch all due recurring transactions
    const recurringTransactions = await step.run(
    "fetch-recurring-transactions",
    async () => {
      return await db.transaction.findMany({
        where: {
          isRecurring: true,
          status: "COMPLETED",
          nextRecurringDate: { lte: new Date() },
        },
      });
    }
);

    // 2. Create events for each transaction
    if (recurringTransactions.length > 0) {
      const events = recurringTransactions.map((transaction) => ({
        name: "transaction.recurring.process",
        data: { transactionId: transaction.id, userId: transaction.userId },
      }));

    // 3. Send events to be processed
    await inngest.send(events);
    }
    return { triggered: recurringTransactions.length };
  }
);

export const processRecurringTransactions = inngest.createFunction(
  {
    id: "process-recurring-transaction", // Only process 25 transactions
    throttle: {
    period: "1m", // per minute
    key: "event.data.userId", // per user
    
    },
  },
  {event: "transaction.recurring.process" },
  async ({ event, step }) => {
    // Validate event data
    if (!event?.data?.transactionId || !event?.data?.userId) {
      console.error("Invalid event data:", event);
      return { error: "Missing required event data" };
    }

    await step.run("process-transaction", async () => {
      const transaction = await db.transaction.findUnique({
        where: {
          id: event.data.transactionId,
          userId: event.data.userId,
        },
        include: {
          account: true,
        },
      });
      
      if (!transaction || !isTransactionDue(transaction)) return;

      await db.$transaction(async (tx) => {
        // Create new transaction
        await tx.transaction.create({
          data: {
            type: transaction.type,
            amount: transaction.amount,
            description: `${transaction.description} (Recurring)`,
            date: new Date(),
            category: transaction.category,
            userId: transaction.userId,
            accountId: transaction.accountId,
            isRecurring: false,
          },
        });

        // Update account balance
        const balanceChange = 
          transaction.type === "EXPENSE"
          ? -transaction.amount.toNumber()
          : transaction.amount.toNumber();
        
        await tx.account.update({
          where: { id: transaction.accountId },
          data: {balance: { increment: balanceChange } },
        });

        // Update last processed date and next recurring date
        await tx.transaction.update({
          where: { id: transaction.id },
          data: {
            lastProcessed: new Date(),
            nextRecurringDate: calculateNextRecurringDate(
            new Date(),
            transaction.recurringInterval
           ),
          }
        });
      });
    });
  }
);

function isTransactionDue(transaction) {
  // If no lastProcessed date, transaction is due
  if (!transaction.lastProcessed) return true;

  const today = new Date();
  const nextDue = new Date (transaction.nextRecurringDate);

  // Compare with nextDue date
  return nextDue <= today;
}

// Helper function to calculate next recurring date
function calculateNextRecurringDate(startDate, interval) {
    const date = new Date(startDate);

    switch (interval) {
        case "DAILY":
            date.setDate(date.getDate() + 1);
            break;
        case "WEEKLY":
            date.setDate(date.getDate() + 7);
            break;
        case "MONTHLY":
            date.setMonth(date.getMonth() + 1);
            break;
        case "YEARLY":
            date.setFullYear(date.getFullYear() + 1);
            break;
    }
    
    return date;
}

// Automated Monthly Report (Resend, ReactMail, Inngest, Gemini) based on Default Account
export const generateMonthlyReports = inngest.createFunction({
    id: "generate-monthly-reports",
    name: "Generate Monthly Reports",
  },
  { cron: "0 0 1 * *" },
  async ({ step }) => {
    const users = await step.run("fetch-users", async () => {
      return await db.user.findMany({
        include: { accounts: true },
      });
    });

    for (const user of users) {
     
      const defaultAccount = user.accounts.find((acc) => acc.isDefault);

      // If no default account, skip this user
      if (!defaultAccount) {
        console.warn(`User ${user.id} has no default account, skipping report.`);
        continue;
      }

      await step.run(`generate-report-${user.id}`, async () => {
        const lastMonth = new Date();
        lastMonth.setMonth(lastMonth.getMonth() - 1);

        const stats = await getMonthlyStats(user.id, lastMonth, defaultAccount.id);
        const monthName = lastMonth.toLocaleString("default", {
          month: "long",
        });
        
        const insights = await generateFinancialInsights(stats, monthName);

         // Send Email
          await sendEmail({
            to: user.email,
            subject: `Your Monthly Financial Report - ${monthName}`,
            react: EmailTemplate({
              userName: user.name,
              type: "monthly-report",
              data: {
                stats,
                month: monthName,
                insights,
              },
            }),
          });
      });
    }

    return { processed: users.length };
  }
);

const getMonthlyStats = async (userId, month, accountId) => {
  const startDate = new Date(month.getFullYear(), month.getMonth(), 1);
  const endDate = new Date(month.getFullYear(), month.getMonth() + 1, 0);

  const transactions = await db.transaction.findMany({
    where: {
      userId,
      accountId, 
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
  });

  return transactions.reduce(
    (stats, t) => {
      const amount = t.amount.toNumber();
      if(t.type === "EXPENSE") {
        stats.totalExpenses += amount;
        stats.byCategory[t.category] =
          (stats.byCategory[t.category] || 0) + amount;
      } else {
        stats.totalIncome += amount;
      }
      return stats;
    },
    {
      totalExpenses: 0,
      totalIncome: 0,
      byCategory: {},
      transactionCount: transactions.length,
    }
  );
};

// Monthly Report Generation
async function generateFinancialInsights(stats, month) {
  
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const formatPeso =(value) => 
    value.toLocaleString("en-PH", { style: "currency", currency: "PHP" });

   const prompt = `
    Analyze this financial data and provide 3 concise, actionable insights.
    Focus on spending patterns and practical advice.
    Keep it friendly and conversational.

    Always:
  - Use the Philippine Peso symbol (₱) instead of $.
  - Format all amounts with comma separators (e.g., ₱1,234,567).
  - Never use the dollar sign ($).

    Financial Data for ${month}:
    - Total Income: ${stats.totalIncome}
    - Total Expenses: ${stats.totalExpenses}
    - Net Income: ${stats.totalIncome - stats.totalExpenses}
    - Expense Categories: ${Object.entries(stats.byCategory)
      .map(([category, amount]) => `${category}: ${formatPeso(amount)}`)
      .join(", ")}

    Format the response as a JSON array of strings, like this:
    ["insight 1", "insight 2", "insight 3"]
  `;

  try {
     const result = await model.generateContent(prompt);

      const response = result.response;
      const text = response.text();
      const cleanedText = text.replace(/```(?:json)?\n?/g, "").trim();

      return JSON.parse(cleanedText);
  } catch (error) {
    console.error("Error generating insights:", error);
    return [ 
      "Your highest expense category this month might need attention.",
      "Consider setting up a budget for better financial management.",
      "Track your recurring expenses to identify potential savings.",
    ];
  }
}

function calculateNextDate(interval) {
  const date = new Date();
  switch (interval) {
    case "DAILY": date.setDate(date.getDate() + 1); break;
    case "WEEKLY": date.setDate(date.getDate() + 7); break;
    case "MONTHLY": date.setMonth(date.getMonth() + 1); break;
    case "YEARLY": date.setFullYear(date.getFullYear() + 1); break;
    default: date.setDate(date.getDate() + 1);
  }
  return date;
}

export const triggerRecurringNotes = inngest.createFunction(
  { id: "trigger-recurring-notes", name: "Trigger Recurring Notes" },
  { cron: "0 0 * * *" }, // Midnight daily
  async ({ step }) => {
    const dueNotes = await step.run("fetch-due-notes", async () => {
      return await db.note.findMany({
        where: {
          isRecurring: true,
          // Use lte (less than or equal) to find everything due up to now
          nextRecurringDate: { lte: new Date() },
        },
        select: { id: true, userId: true }
      });
    });

    if (dueNotes.length > 0) {
      // Map the notes into the correct Inngest event format
      const events = dueNotes.map((note) => ({
        name: "note.recurring.process",
        // Ensure data is an object containing the noteId
        data: { 
          noteId: note.id, 
          userId: note.userId 
        },
      }));
      
      await inngest.send(events);
    }
    
    return { triggered: dueNotes.length };
  }
);

export const processRecurringNote = inngest.createFunction(
  { id: "process-recurring-note", name: "Process Recurring Note" },
  { event: "note.recurring.process" },
  async ({ event, step }) => {
    const noteId = event.data?.noteId;

    if (!noteId) {
      console.warn("Process Recurring Note: No noteId found in event data.");
      return { status: "skipped", reason: "Missing noteId" };
    }

    return await step.run("reset-note-tasks", async () => {
      const note = await db.note.findUnique({
        where: { id: noteId },
      });

      if (!note || !note.isRecurring) {
        return { status: "cancelled", reason: "Note not found or not recurring" };
      }

      return await db.$transaction(async (tx) => {
        // 1. Reset separate TodoItem database records
        await tx.todoItem.updateMany({
          where: { noteId: note.id },
          data: { isAccomplished: false },
        });

        // 2. Reset the Checkbox states inside the Note content (HTML string)
        // This targets both the list item attribute and the input attribute
        const resetContent = note.content
          .replace(/data-checked="true"/g, 'data-checked="false"')
          .replace(/checked="checked"/g, "");

        // 3. Calculate the next occurrence
        const nextDate = calculateNextDate(note.recurringInterval);
        
        // 4. Update the Note with both the new Date and the Reset Content
        await tx.note.update({
          where: { id: note.id },
          data: { 
            nextRecurringDate: nextDate,
            content: resetContent, // This is what Tiptap reads
          },
        });
        
        return { success: true, noteId: note.id, nextDate };
      });
    });
  }
);