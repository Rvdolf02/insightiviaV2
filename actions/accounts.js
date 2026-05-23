"use server";

import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { success } from "zod";

const serializeTransaction = (obj) => {
    const serialized = { ...obj };

    if (obj.balance) {
        serialized.balance = obj.balance.toNumber();
    }
    if (obj.amount) {
        serialized.amount = obj.amount.toNumber();
    }
    // If transaction has a related goal, serialize it
  if (obj.goal) {
    serialized.goal = {
      ...obj.goal,
      currentAmount: obj.goal.currentAmount
        ? obj.goal.currentAmount.toNumber()
        : null,
      amount: obj.goal.amount ? obj.goal.amount.toNumber() : null,
    };
  }
    return serialized;
};

export async function updateDefaultAccount(accountId) {
    try {
        const { userId } = await auth();
            if (!userId) throw new Error("Unauthorized");

            const user = await db.user.findUnique({
                where: { clerkUserId: userId },
            });

            if (!user) {
                throw new Error("User not found");
            }

        await db.account.updateMany({
            where: {userId: user.id, isDefault: true },
            data: { isDefault: false },
        });

        const account = await db.account.update({
            where: {
                id: accountId,
                userId: user.id,
            },
            data: { isDefault: true },
        });

        revalidatePath('/dashboard');
        return { success: true, data: serializeTransaction(account) };
    } catch (error) {
        return { success: false, error: error.message };
    }
} 

export async function getAccountWithTransactions(accountId) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({ where: { clerkUserId: userId } });
  if (!user) throw new Error("User not found");

  const account = await db.account.findUnique({
    where: { id: accountId, userId: user.id },
    include: {
      transactions: {
        orderBy: { date: "desc" },
        include: {
          allocations: {
            include: {
              goal: true, // so we can access goal.title per allocation
            },
          },
        },
      },
      _count: {
        select: { transactions: true },
      },
    },
  });

  if (!account) return null;

  return {
    ...serializeTransaction(account),
    transactions: account.transactions.map((t) => ({
      ...serializeTransaction(t),
      allocations: t.allocations.map((a) => ({
        goalId: a.goalId,
        goalTitle: a.goal?.title ?? "Unknown Goal",
        amount: a.amount.toNumber(),
      })),
    })),
  };
}

export async function bulkDeleteTransactions(transactionIds) {
  try {
    const { userId } = await auth();   
    if (!userId) throw new Error("Unauthorized");

    const user = await db.user.findUnique({
      where: { clerkUserId: userId },
    });

    if (!user) throw new Error("User not found");

    // Find the transactions
    const transactions = await db.transaction.findMany({
      where: {
        id: { in: transactionIds },
        userId: user.id,
      },
      select: {
        id: true,
        type: true,
        amount: true,
        accountId: true,
      },
    });

    if (transactions.length === 0) {
      return { success: false, error: "No transactions found" };
    }

    // Collect account balance changes
    const accountBalanceChanges = transactions.reduce((acc, transaction) => {
      const amount = Number(transaction.amount);
      const change = transaction.type === "EXPENSE" ? amount : -amount;

      acc[transaction.accountId] = (acc[transaction.accountId] || 0) + change;
      return acc;
    }, {});

    await db.$transaction(async (tx) => {

    // Get allocations for all transactions
    const allocations = await tx.transactionAllocation.findMany({
      where: {
        transactionId: { in: transactionIds },
      },
    });

    // Reverse goal funding (CRITICAL FIX)
    const goalAdjustments = allocations.reduce((acc, alloc) => {
      const amount = Number(alloc.amount);
      acc[alloc.goalId] = (acc[alloc.goalId] || 0) + amount;
      return acc;
    }, {});

    for (const [goalId, amount] of Object.entries(goalAdjustments)) {
      await tx.goal.updateMany({
        where: { id: goalId },
        data: {
          currentAmount: { decrement: amount },
        },
      });
    }

    // delete transactions
    await tx.transaction.deleteMany({
      where: {
        id: { in: transactionIds },
        userId: user.id,
      },
    });

    // update account balances (your existing logic)
    for (const [accountId, balanceChange] of Object.entries(accountBalanceChanges)) {
      await tx.account.update({
        where: { id: accountId },
        data: {
          balance: { increment: balanceChange },
        },
      });
    }
  });

    revalidatePath("/dashboard");
    revalidatePath("/account/[id]");

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Create a function for checking the Subscription type