"use server";
import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

function serializeAccount(account) {
  return {
    ...account,
    balance: account.balance?.toNumber?.() ?? 0,
    _count: account._count, // keep counts as-is
  };
}


export async function getUserAccounts() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) throw new Error("User not found");

  const accounts = await db.account.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { transactions: true } },
    },
  });

  return accounts.map(serializeAccount); // serialize before returning
}

export async function getUserGoals(accountId) {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const user = await db.user.findUnique({
      where: { clerkUserId: userId },
    });
    if (!user) throw new Error("User not found");

    const goals = await db.goal.findMany({
      where: {
        userId: user.id,
        accountId,
      },
      include: {
        account: true, //  include account info
      },
      orderBy: { createdAt: "desc" },
    });

    return goals.map((g) => ({
      ...g,
      amount: g.amount.toNumber(),
      currentAmount: g.currentAmount?.toNumber?.() ?? 0,
      account: g.account
        ? serializeAccount(g.account) //  serialize nested account too
        : null,
    }));
  } catch (error) {
    console.error("Error fetching goals:", error);
    return [];
  }
}

export async function createGoal(data) {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    // Find user
    const user = await db.user.findUnique({
      where: { clerkUserId: userId },
    });

    if (!user) throw new Error("User not found");

    // Insert new goal
    const newGoal = await db.goal.create({
      data: {
        title: data.title,
        amount: Number(data.amount),
        currentAmount: 0, // start at 0
        userId: user.id,
        ...(data.accountId && { accountId: data.accountId }),
      },
    });

    revalidatePath("/dashboard");

    // 👇 Convert Decimal fields to numbers before returning
    return {
      success: true,
      data: {
        ...newGoal,
        amount: newGoal.amount?.toNumber?.() ?? 0,
        currentAmount: newGoal.currentAmount?.toNumber?.() ?? 0,
      },
    };

  } catch (error) {
    console.error("Goal creation failed:", error);
    throw error;
  }
}

export async function updateGoal(id, { title, amount, accountId }) {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const user = await db.user.findUnique({
      where: { clerkUserId: userId },
    });

    if (!user) throw new Error("User not found");

    const goal = await db.goal.update({
      where: {
        id,
        userId: user.id, // ensure goal belongs to user
      },
      data: {
        ...(title && { title }),
        ...(amount && { amount: Number(amount) }), // always cast to number
        ...(accountId && { accountId }),
      },
    });

    revalidatePath("/dashboard");

    //  serialize all Decimal fields before returning
    return {
      success: true,
      data: {
        ...goal,
        amount: goal.amount?.toNumber?.() ?? 0,
        currentAmount: goal.currentAmount?.toNumber?.() ?? 0,
      },
    };
  } catch (error) {
    console.error("Error updating goal:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteGoal(goalId) {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const allocationCount = await db.transactionAllocation.count({
      where: { goalId },
    });

    if (allocationCount > 0) {
      return {
        success: false,
        type: "HAS_ALLOCATIONS",
        message:
          "This allocation cannot be removed because it already has funded transactions.",
      };
    }

    await db.goal.delete({
      where: { id: goalId },
    });

    return { success: true };
  } catch (error) {
    console.error("Error deleting goal:", error);
    return { success: false, error: error.message };
  }
}