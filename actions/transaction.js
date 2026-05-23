"use server";
import { aj, ajTips, ajSpendsense } from "@/lib/arcjet";
import { db } from "@/lib/prisma";
import { request } from "@arcjet/next";
import { auth } from "@clerk/nextjs/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { revalidatePath } from "next/cache";
// At the top of transaction.js
import { defaultCategories } from "@/data/categories";
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const serializeAmount = (obj) => ({
    ...obj,
    amount: obj.amount.toNumber(),
});

export async function createTransaction(data) {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const req = await request();
    const decision = await aj.protect(req, { userId, requested: 1 });
    if (decision.isDenied()) {
      if (decision.reason.isRateLimit()) {
        const { remaining, reset } = decision.reason;
        console.error({ code: "RATE_LIMIT_EXCEEDED", details: { remaining, resetInSeconds: reset } });
        throw new Error("Too many requests. Please try again later.");
      }
      throw new Error("Request Blocked");
    }

    const user = await db.user.findUnique({ where: { clerkUserId: userId } });
    if (!user) throw new Error("User not found");

    const account = await db.account.findUnique({
      where: { id: data.accountId, userId: user.id },
    });
    if (!account) throw new Error("Account not found");

    const balanceChange = data.type === "EXPENSE" ? -data.amount : data.amount;
    const newBalance = Number(account.balance) + balanceChange;

    const transaction = await db.$transaction(async (tx) => {
      // 1. Create the transaction (no goalId needed anymore)
      const newTransaction = await tx.transaction.create({
        data: {
          type: data.type,
          amount: data.amount,
          description: data.description,
          date: data.date,
          accountId: data.accountId,
          category: data.category,
          isRecurring: data.isRecurring,
          recurringInterval: data.recurringInterval,
          userId: user.id,
          nextRecurringDate:
            data.isRecurring && data.recurringInterval
              ? calculateNextRecurringDate(data.date, data.recurringInterval)
              : null,
        },
      });

      // 2. Update account balance
      await tx.account.update({
        where: { id: data.accountId },
        data: { balance: newBalance },
      });

      // 3. Process allocations if INCOME
      if (data.type === "INCOME" && data.allocations?.length > 0) {
        const validAllocations = data.allocations.filter(
          (a) => a.goalId && parseFloat(a.amount) > 0
        );

        // Guard: total cannot exceed income amount
        const totalAllocated = validAllocations.reduce(
          (sum, a) => sum + parseFloat(a.amount), 0
        );
        if (totalAllocated > data.amount) {
          throw new Error("Total allocated amount exceeds income amount");
        }

        // 4. Create allocation records
        await tx.transactionAllocation.createMany({
          data: validAllocations.map((a) => ({
            transactionId: newTransaction.id,
            goalId: a.goalId,
            amount: parseFloat(a.amount),
          })),
        });

        // 5. Increment each goal's currentAmount
        await Promise.all(
          validAllocations.map((a) =>
            tx.goal.update({
              where: { id: a.goalId },
              data: { currentAmount: { increment: parseFloat(a.amount) } },
            })
          )
        );
      }

      return newTransaction;
    });

    revalidatePath("/dashboard");
    revalidatePath(`/account/${transaction.accountId}`);
    return { success: true, data: serializeAmount(transaction) };

  } catch (error) {
    console.error("Transaction creation failed:", error);
    return { success: false, error: error.message };
  }
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

// Income and Expense Scanner 
export async function scanReceipt(file) {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const incomeCategories = defaultCategories
      .filter((c) => c.type === "INCOME")
      .map((c) => c.id); 

    const expenseCategories = defaultCategories
      .filter((c) => c.type === "EXPENSE")
      .map((c) => c.id);

        // Convert file to array buffer
        const arrayBuffer = await file.arrayBuffer();
        const base64String = Buffer.from(arrayBuffer).toString("base64");

        const prompt = `
Analyze this financial document image and extract transaction information.

The document may be a:
- store receipt
- payment receipt
- invoice
- billing statement
- statement of account
- tuition statement
- payment confirmation
- expense receipt
- income document

Your task is to determine the correct TRANSACTION AMOUNT representing the actual money paid, payable, or received in this document.

Important decision rules when selecting the amount:

1. If the document is a purchase receipt:
   - Use the **Total**, **Grand Total**, or **Amount Paid**.

2. If the document is an invoice or bill:
   - Use **Amount Due**, **Total Due**, or **Payable Amount**.

3. If the document is a statement of account (like school tuition):
   - Prefer **Current Charges**, **Amount to Pay**, **Semester Payable**, or **Amount Due for this period**.
   - DO NOT select **Remaining Balance**, **Total Balance**, or **Overall Outstanding Balance** unless it clearly represents the required payment for the current transaction.

4. If the document shows multiple totals:
   - Choose the value most clearly associated with the **actual payment required or made in this transaction**.

5. Ignore numbers labeled as:
   - Previous balance
   - Remaining balance
   - Running balance
   - Account balance
   - Credit limit
   - Cumulative total

6. If the document represents income:
   - Use the **Net Amount**, **Amount Received**, **Payment Received**, or **Deposit Amount**.

Extract the following information:
- Data Type (one of: Income,Expense)
- Total transaction amount (number only)
- IF Data Type is Income select on this list: Suggested category for income (one of: salary,freelance,investments,business,rental,other-income) THIS IS REQUIRED For INCOME: [${incomeCategories.join(", ")}]
- IF Data Tyoe is Expense select on this list: Suggested category for expense (one of: housing,transportation,groceries,utilities,entertainment,food,shopping,healthcare,education,personal,travel,insurance,gifts,bills,other-expense) THIS IS REQUIRED For EXPENSE: [${expenseCategories.join(", ")}]
- Date of the transaction (convert to ISO format YYYY-MM-DD if possible)
- Description summarizing what the payment or purchase was for and the date of the transaction from the immage
- Merchant, institution, or organization name


Category selection rules MUST SELECT ONE BY USING THE PROVIDED CATEGORY LIST:
- If the document clearly represents income, choose an income category.
- If it represents a purchase or payment, choose an expense category.
- If the merchant is a school or university, prefer the education category.
- If uncertain, choose other-expense or other-income.
- Return them using lower-case

Only respond with valid JSON in this exact format:

{
  "type" : "string",
  "amount": number,
  "category": "string",
  "description": "string",
  "merchantName": "string",
}

If the image does not contain a financial transaction (receipt, bill, invoice, or payment document), return an empty object.
`;

        const result = await model.generateContent([
            {
                inlineData: {
                    data: base64String,
                    mimeType: file.type,
                },
            },
            prompt,
        ]);

        const response = await result.response;
        const text = response.text();
        const cleanedText = text.replace(/```(?:json)?\n?/g, "").trim();

        try {
            const data = JSON.parse(cleanedText);
            return {
                type: data.type,
                category: data.category,
                amount: parseFloat(data.amount),
                description: data.description,
                merchantName: data.merchantName,
            };
        } catch (parseError) {
            console.error("Error parsing JSON reponse:", parseError);
            throw new Error("Invalid response format from Gemini");
        }
    } catch (error) {
        console.error("Error scanning receipt:", error.message);
        throw new Error("Failed to scan receipt");
    }
}
export async function getTransaction(id) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({ where: { clerkUserId: userId } });
  if (!user) throw new Error("User not found");

  const transaction = await db.transaction.findUnique({
    where: {
      id,
      userId: user.id,
    },
    include: {
      allocations: true, // ← this is what's missing
    },
  });

  if (!transaction) throw new Error("Transaction not found");

  // Serialize Decimal fields before returning to client component
  return {
    ...transaction,
    amount: transaction.amount.toNumber(),
    allocations: transaction.allocations.map((a) => ({
      goalId: a.goalId,
      amount: a.amount.toNumber(), // ← Decimal → plain number
    })),
  };
}
export async function updateTransaction(id, data) {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const user = await db.user.findUnique({ where: { clerkUserId: userId } });
    if (!user) throw new Error("User not found");

    // Fetch original transaction WITH its allocations
    const originalTransaction = await db.transaction.findUnique({
      where: { id, userId: user.id },
      include: {
        account: true,
        allocations: true,
      },
    });
    if (!originalTransaction) throw new Error("Transaction not found");

    // --- BALANCE CHANGE ---
    const oldBalanceChange =
      originalTransaction.type === "EXPENSE"
        ? -originalTransaction.amount.toNumber()
        : originalTransaction.amount.toNumber();

    const newBalanceChange =
      data.type === "EXPENSE" ? -data.amount : data.amount;

    const netBalanceChange = newBalanceChange - oldBalanceChange;

    // --- PREPARE NEW ALLOCATIONS ---
    // If type changed away from INCOME, wipe all allocations
    const newAllocations =
      data.type === "INCOME"
        ? (data.allocations || []).filter(
            (a) => a.goalId && parseFloat(a.amount) > 0
          )
        : [];

    // Guard: total allocated cannot exceed new income amount
    if (newAllocations.length > 0) {
      const totalAllocated = newAllocations.reduce(
        (sum, a) => sum + parseFloat(a.amount),
        0
      );
      if (totalAllocated > data.amount) {
        throw new Error("Total allocated amount exceeds income amount");
      }
    }

    const transaction = await db.$transaction(async (tx) => {
      // 1. Update core transaction fields
      const updated = await tx.transaction.update({
        where: { id, userId: user.id },
        data: {
          type: data.type,
          amount: data.amount,
          description: data.description,
          date: data.date,
          account: { connect: { id: data.accountId } },
          category: data.category,
          isRecurring: data.isRecurring,
          // Clear interval and next date if not recurring
          recurringInterval: data.isRecurring
            ? data.recurringInterval
            : null,
          nextRecurringDate:
            data.isRecurring && data.recurringInterval
              ? calculateNextRecurringDate(data.date, data.recurringInterval)
              : null,
        },
      });

      // 2. Update account balance
      await tx.account.update({
        where: { id: data.accountId },
        data: { balance: { increment: netBalanceChange } },
      });

      // 3. Build maps for diffing old vs new allocations
      const oldMap = new Map(
        originalTransaction.allocations.map((a) => [
          a.goalId,
          a.amount.toNumber(),
        ])
      );
      const newMap = new Map(
        newAllocations.map((a) => [a.goalId, parseFloat(a.amount)])
      );

      // 4. Handle goals that were removed or had their amount changed
      for (const [goalId, oldAmount] of oldMap.entries()) {
        if (!newMap.has(goalId)) {
          // Goal removed entirely (or type changed to EXPENSE) → revert
          await tx.goal.update({
            where: { id: goalId },
            data: {
              currentAmount: {
                // Floor at 0 to prevent negative goal progress
                decrement: oldAmount,
              },
            },
          });
        } else {
          // Goal still present → apply only the net difference
          const diff = newMap.get(goalId) - oldAmount;
          if (diff !== 0) {
            await tx.goal.update({
              where: { id: goalId },
              data: { currentAmount: { increment: diff } },
            });
          }
        }
      }

      // 5. Handle newly added goals (didn't exist in old allocations)
      for (const [goalId, newAmount] of newMap.entries()) {
        if (!oldMap.has(goalId)) {
          await tx.goal.update({
            where: { id: goalId },
            data: { currentAmount: { increment: newAmount } },
          });
        }
      }

      // 6. Replace allocation records atomically
      // Delete all old records first, then insert the new set
      await tx.transactionAllocation.deleteMany({
        where: { transactionId: id },
      });

      if (newAllocations.length > 0) {
        await tx.transactionAllocation.createMany({
          data: newAllocations.map((a) => ({
            transactionId: id,
            goalId: a.goalId,
            amount: parseFloat(a.amount),
          })),
        });
      }

      return updated;
    });

    revalidatePath("/dashboard");
    revalidatePath(`/account/${data.accountId}`);
    return { success: true, data: serializeAmount(transaction) };

  } catch (error) {
    console.error("Transaction update failed:", error);
    return { success: false, error: error.message }; // consistent with createTransaction
  }
}