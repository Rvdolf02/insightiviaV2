"use server";
// Daily Tips || CRUD: account || Spendsense
import { aj, ajTips, ajSpendsense } from "@/lib/arcjet";
import { db } from "@/lib/prisma";
import { request } from "@arcjet/next";
import { auth } from "@clerk/nextjs/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { revalidatePath } from "next/cache";

const serializeTransaction = (obj) => {
    const serialized = { ...obj };

    if (obj.balance) {
        serialized.balance = obj.balance.toString();
    }
    if (obj.amount) {
        serialized.amount = obj.amount.toString();
    }
    return serialized;
};

export async function getUserAccounts() {
  const { userId } = await auth();

  if (!userId) return []; // ✅ Not logged in → empty

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) return []; // ✅ User missing in DB → empty array

  const accounts = await db.account.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: { transactions: true },
      },
    },
  });

  return accounts.map(serializeTransaction);
}

export async function getDashboardData() {
  const { userId } = await auth();

  if (!userId) return []; 

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) return [];

  const transactions = await db.transaction.findMany({
    where: { userId: user.id },
    orderBy: { date: "desc" },
  });

  return transactions.map(serializeTransaction);
}

function serializeDecimal(obj) {
  return JSON.parse(JSON.stringify(obj));
}

export async function getStatementData(accountId, startDate, endDate) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) throw new Error("User not found");

  const account = await db.account.findFirst({
    where: {
      userId: user.id,
      ...(accountId
        ? { id: accountId } // use specific account
        : { isDefault: true } // fallback to default account
      ),
    },
    include: {
      user: true,
      transactions: {
        where: {
          date: {
            gte: new Date(startDate),
            lte: new Date(endDate),
          },
        },
        orderBy: { date: "asc" },
        include: {
          allocations: {
            include: { goal: true },
          },
        },
      },
    },
  });

  if (!account) {
    throw new Error(
      accountId
        ? "Account not found"
        : "No default account found"
    );
  }

  // --- Running Balance ---
  let runningBalance = 0;

  const transactionsWithBalance = account.transactions.map((t) => {
    const amount = Number(t.amount);
    runningBalance += t.type === "INCOME" ? amount : -amount;

    return {
      ...t,
      runningBalance,
    };
  });

  // --- Summary ---
  const totalIn = transactionsWithBalance
    .filter((t) => t.type === "INCOME")
    .reduce((acc, t) => acc + Number(t.amount), 0);

  const totalOut = transactionsWithBalance
    .filter((t) => t.type === "EXPENSE")
    .reduce((acc, t) => acc + Number(t.amount), 0);

  const beginningBalance =
    Number(account.balance) - (totalIn - totalOut);

    return serializeDecimal({
    account,
    user: account.user,
    transactions: transactionsWithBalance,
    summary: {
      beginningBalance,
      totalIn,
      totalOut,
      endingBalance: Number(account.balance),
    },
  });
}

export async function createAccount(data) {
    try {
        const { userId } = await auth();
        if (!userId) throw new Error("Unauthorized");

        const user = await db.user.findUnique({
            where: { clerkUserId: userId },
        });

        if (!user) {
            throw new Error("User not found");
        }

        // Convert balance to float before saving 
        const balanceFloat = parseFloat(data.balance)
        if(isNaN(balanceFloat)){
            throw new Error("Invalid balance amount");
        }

        // Check if this is the user's first account
        const existingAccounts = await db.account.findMany({
            where: { userId: user.id },
        });

        const shouldBeDefault =
            existingAccounts.length === 0 ? true : data.isDefault;

        // If this account should be default , unset other default accounts
        if (shouldBeDefault) {
            await db.account.updateMany({
                where: {userId: user.id, isDefault: true },
                data: { isDefault: false },
            });
        }

        const account = await db.account.create({
            data: {
                ...data,
                balance: balanceFloat,
                userId: user.id,
                isDefault: shouldBeDefault,
            }, 
        });

        const serializedAccount = serializeTransaction(account);

        revalidatePath("/dashboard");
        return { success:true, data:serializedAccount};
    } catch (error) {
      return { success: false, error: error.message };
    }
}

export async function updateAccount(data) {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    // Find the current user
    const user = await db.user.findUnique({
      where: { clerkUserId: userId },
    });

    if (!user) throw new Error("User not found");

    // If setting this account as default → unset default for all others
    if (data.isDefault) {
      await db.account.updateMany({
        where: { userId: user.id },
        data: { isDefault: false },
      });
    }
    const balanceFloat = parseFloat(data.balance);
    if (isNaN(balanceFloat)) {
    throw new Error("Invalid balance amount");
    }

    // Update the current account
    const updatedAccount = await db.account.update({
      where: { id: data.id, userId: user.id },
      data: {
        name: data.name,
        type: data.type,
        balance: balanceFloat,
        isDefault: data.isDefault,
      },
    });

    // Serialize before returning
    const serialized = {
      ...updatedAccount,
     balance: updatedAccount.balance?.toString() ?? "0",

    };

    revalidatePath("/dashboard");
    // Always return balance as string
    return {
    success: true,
    data: {
        ...updatedAccount,
        balance: balanceFloat.toString(),
    },
    };
  } catch (error) {
      return { success: false, error: error.message };
  }
}

export async function deleteAccount(accountId) {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const user = await db.user.findUnique({
      where: { clerkUserId: userId },
    });

    if (!user) throw new Error("User not found");

    // Verify the account belongs to the user
    const account = await db.account.findUnique({
      where: { id: accountId, userId: user.id },
      include: { transactions: true },
    });

    if (!account) throw new Error("Account not found");

    // Block deletion if default account
    if (account.isDefault) {
      throw new Error(
        "You cannot delete the default account. Please set another account as default first."
      );
    }

    // Cascade delete: first delete transactions, then account
    await db.$transaction([
      db.transaction.deleteMany({
        where: { accountId: account.id, userId: user.id },
      }),
      db.account.delete({
        where: { id: account.id, userId: user.id },
      }),
    ]);

    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    console.error("Delete account error:", error); // helpful for debugging
    return { success: false, error: error.message};
  }
}


export async function getDailyTips() {
  try {
    const { userId } = await auth();
   // if (!userId) return { status: "UNAUTHORIZED" };
      if (!userId) throw new Error("Unauthorized");
    // Step 1: Check rate limit **only when we are sure the user has data**
    const req = await request();

    // Fetch user + accounts first (so we avoid wasting Arcjet chances)
    const user = await db.user.findUnique({
      where: { clerkUserId: userId },
      include: { accounts: true },
    });

    if (!user) return { status: "NO_USER" };

    // No accounts
    if (!user.accounts || user.accounts.length === 0)
      return { status: "NO_ACCOUNT" };

    // No default account
    const defaultAccount = user.accounts.find((acc) => acc.isDefault);
    if (!defaultAccount)
      return {
        status: "NO_DEFAULT",
      };

    // Fetch transactions
    const transactions = await db.transaction.findMany({
      where: {
        userId: user.id,
        accountId: defaultAccount.id,
      },
    });

    // No transactions
    if (transactions.length === 0)
      return { status: "NO_TRANSACTIONS" };

    // At this point we are SURE user has valid data.
    // Now we apply ARCJET rate limiting.
    const decision = await ajTips.protect(req, {
      userId,
      requested: 1,
    });

    if (decision.isDenied()) {
      return { status: "RATE_LIMITED" };
    }

    // Build stats
    const stats = transactions.reduce(
      (s, t) => {
        const amount = Number(t.amount);
        if (t.type === "EXPENSE") {
          s.totalExpenses += amount;
          s.byCategory[t.category] =
            (s.byCategory[t.category] || 0) + amount;
        } else {
          s.totalIncome += amount;
        }
        return s;
      },
      {
        totalExpenses: 0,
        totalIncome: 0,
        byCategory: {},
        transactionCount: transactions.length,
      }
    );

    const formatPeso = (value) =>
      value.toLocaleString("en-PH", { style: "currency", currency: "PHP" });

    const categoriesList = Object.entries(stats.byCategory)
      .map(([cat, amt]) => `${cat}: ${formatPeso(amt)}`)
      .join(", ");

    // Generate AI output since user has complete data
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

   
    const prompt = `
    You are a financial assistant helping users save money.
    Analyze this user's monthly financial summary and give exactly 3 short, practical tips.

    Rules:
    - Output must be exactly 3 tips in one line.
    - Separate each tip with double pipe symbols: ||
    - Do not number the tips, do not add labels like "Tip 1:".
    - Keep it conversational, friendly, and motivational.
    - Use Philippine Peso (₱) with comma separators (₱1,234).
    - Do not use the dollar sign ($).
    - Base the advice strictly on the financial summary below.

    Financial Summary:
    - Total Income: ${formatPeso(stats.totalIncome)}
    - Total Expenses: ${formatPeso(stats.totalExpenses)}
    - Net Income: ${formatPeso(stats.totalIncome - stats.totalExpenses)}
    - Expense Categories: ${categoriesList || "None"}

    Output format example (MUST follow exactly):
    tip 1 || tip 2 || tip 3
    `;


    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();

    const tips = text
      .split("||")
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, 3);

    return {
      status: "OK",
      tips,
      summary: {
        totalIncome: formatPeso(stats.totalIncome),
        totalExpenses: formatPeso(stats.totalExpenses),
        netIncome: formatPeso(stats.totalIncome - stats.totalExpenses),
        categories: categoriesList || "None",
      },
    };
  } catch (error) {
    return { status: "ERROR", error: error.message };
  }
}

export async function getSpendsenseResult() {
 try {
      const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

   
  

    // fetch user & accounts
   const user = await db.user.findUnique({
      where: { clerkUserId: userId }, // match Clerk ID
      include: { accounts: true },
    });
    if (!user) throw new Error("User not found");
    // No accounts at all → Cannot run SpendSense
    if (!user.accounts || user.accounts.length === 0) {
      return { status: "NO_ACCOUNT" };
    }

    const defaultAccount = user.accounts.find((a) => a.isDefault);
    if (!defaultAccount) {
      return { status: "NO_DEFAULT" };
    }

    const transactions = await db.transaction.findMany({
      where: {
        userId: user.id,
        accountId: defaultAccount.id,
      },
    });

    if (!transactions || transactions.length === 0) {
      return { status: "NO_TRANSACTIONS" };
    }

    // Arcjet should run here, only after all "NO_*" cases are passed
    const req = await request();
    const decision = await ajSpendsense.protect(req, { userId, requested: 1 });

   {/*} if (decision.isDenied()) {
      if (decision.reason?.isRateLimit && decision.reason.isRateLimit()) {
        throw new Error("You can run SpendSense once per 7 days. Try again later.");
      }
      throw new Error("Request blocked by rate limiter.");
    }
  */}

    if (decision.isDenied()) {
      return { status: "RATE_LIMITED" };
    }


    // Build stats: totals and category breakdown
    const stats = transactions.reduce(
      (s, t) => {
        const amount = Number(t.amount);
        if (t.type === "EXPENSE") {
          s.totalExpenses += amount;
          s.byCategory[t.category] = (s.byCategory[t.category] || 0) + amount;
        } else {
          s.totalIncome += amount;
        }
        return s;
      },
      { totalExpenses: 0, totalIncome: 0, byCategory: {}, transactionCount: transactions.length }
    );

    const formatPeso = (v) =>
      Number(v).toLocaleString("en-PH", { style: "currency", currency: "PHP" });

    const categoriesList = Object.entries(stats.byCategory)
      .map(([cat, amt]) => `${cat}: ${formatPeso(amt)}`)
      .join(", ") || "None";

    // compute category % of expense (for personality rules)
    const categoryPercent = {};
    const totalExpenses = stats.totalExpenses || 0;
    if (totalExpenses > 0) {
      for (const [cat, amt] of Object.entries(stats.byCategory)) {
        categoryPercent[cat] = Math.round((amt / totalExpenses) * 100);
      }
    }

    // Provide the prompt to Gemini. Ask for strict JSON to avoid parsing mess.
    // We request fields: type, reasons[], bullets[] (5 short bullets max), suggestionScore.
    // Also ask the model to choose spinner gif name from a known list.
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `
You are a financial profile classifier. Based strictly on the JSON financial summary below, 
categorize the user's spending style into one of these exact types:

["Necessity Keeper","Balanced Spender","Lifestyle Lover","Growth Investor","Health-Focused","Generous Giver","Debt Juggler"]

Then provide:
- a short justification array ("reasons") of up to 3 brief items explaining why this type fits,
- a short action list "bullets" (up to 5) giving practical next steps,
- "gif" field with one of these exact filenames: "/necessity-keeper.gif","/balanced-spender.gif","/lifestyle-lover.gif","/growth-investor.gif","/health-wellness.gif","/generous-giver.gif","/debt-juggler.gif","/no-data.gif"
- keep all text concise and avoid long paragraphs.

**IMPORTANT: output only valid JSON with exactly these keys:**
{
  "type": "<one of the types above>",
  "gif": "<one of the gif filenames above>",
  "reasons": ["reason 1", "reason 2", ...],
  "bullets": ["action 1", "action 2", ...]
}

**Financial summary (values already formatted with ₱):**
{
  "totalIncome": "${formatPeso(stats.totalIncome)}",
  "totalExpenses": "${formatPeso(stats.totalExpenses)}",
  "netIncome": "${formatPeso(stats.totalIncome - stats.totalExpenses)}",
  "categories": "${categoriesList}"
}

Return only JSON, nothing else.
`;

    // call Gemini
   const response = await model.generateContent(prompt);

    // Get plain text
    const text = response?.response?.text();
    if (!text || typeof text !== "string") {
      throw new Error("Invalid response from generative model");
    }

    // Parse JSON safely
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (err) {
      // If model deviated, try to extract JSON substring
      const jsonStart = text.indexOf("{");
      const jsonEnd = text.lastIndexOf("}");
      if (jsonStart >= 0 && jsonEnd > jsonStart) {
        const substr = text.slice(jsonStart, jsonEnd + 1);
        parsed = JSON.parse(substr);
      } else {
        throw new Error("Unexpected model output format");
      }
    }

    // Validate required fields and sanitize
    const type = parsed.type || "Balanced Spender";
    const gif = parsed.gif || "/balanced-spender.gif";
    const reasons = Array.isArray(parsed.reasons) ? parsed.reasons.slice(0, 3) : [];
    const bullets = Array.isArray(parsed.bullets) ? parsed.bullets.slice(0, 5) : [];

    // Return structured info (server returns formatted pesos in summary)
    return {
      type,
      gif,
      reasons,
      bullets,
      summary: {
        totalIncome: formatPeso(stats.totalIncome),
        totalExpenses: formatPeso(stats.totalExpenses),
        netIncome: formatPeso(stats.totalIncome - stats.totalExpenses),
        categories: categoriesList,
        categoryPercent,
      },
    };
  } catch (error) {
    console.error("getSpendsenseResult error:", error);
    // return helpful error to client
    throw error;
  }
}

// Use the gif above with matching spender type and dsiplay these in .jsx file in a white card floating in dashboard page <Spendsense />
// i need you to use the button from my header as the trigger for this operation, if button is triggered show a confirmation asking whether the user want to use their chance to take the spending test (once every 7 days)
// Note: while designing this i need you to think like a front-end designer
{/* this will be the format design in the jsx. file
  show the result in a white card while making the card float in dashboard page
  -image gif at the top inside the card
  -place spender type below the gif
  -from gemini output explain (command gemini) why the user got a specific sepender type, you may break this into 5 list (use rounded long background to place the explanation)
  */} 