
import z from "zod";

export const accountSchema = z.object({
    name: z.string().min(1, "Name is required"),
    type: z.enum(["CURRENT", "SAVINGS"]),
    balance: z.union([z.string(), z.number()])
    .transform(val => String(val))
    .refine(val => val.trim() !== "", "Initial balance is required"),
    isDefault: z.boolean().default(false),
});

export const transactionSchema = z.object({
    type: z.enum(["INCOME", "EXPENSE"]),
    amount: z.string().min(1, "Amount is required"),
    goalId: z.string().nullable().optional(),
    description: z.string().optional(),
    date: z.date({ required_error: "Date is required"}),
    accountId: z.string().min(1, "Account is required"),
    category: z
        .string()
        .min(1, "Category is required")
        .optional() // allow undefined
        .transform((val) => val ?? "") // undefined → ""
        .refine((val) => val.length > 0, {
          message: "Category is required",
        }),
    allocations: z.array(
          z.object({
            goalId: z.string().min(1),
            amount: z.coerce.number().positive(),
          })
        ).optional().default([]),

    isRecurring: z.boolean().default(false),
    recurringInterval: z
        .enum(["DAILY", "WEEKLY", "MONTHLY", "YEARLY"])
        .optional(),
      }).refine(
        (data) => {
          // only fail when isRecurring is true but no recurringInterval
          return !(data.isRecurring && !data.recurringInterval);
        },
        {
          message: "Recurring Interval is required for recurring transactions",
          path: ["recurringInterval"], // this points the error to the right field
        }
      );

export const goalSchema = z.object({
  title: z
    .string()
    .min(1, "Please enter an allocation name"),

  amount: z
    .string()
    .min(1, "Amount must be greater than ₱0.00")
    .refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
      message: "Amount must be a valid positive number",
    }),

  accountId: z
    .string()
    .min(1, "Please select a funding source"),
});

// if this code cannot handle the program then uninstall the current zod and install downgrade version

/*.superRefine((data, ctx) => {
    if (data.isRecurring && !data.recurringInterval) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Recurring Interval is required for recurring transactions",
            path: ["recurringInterval"],
            
        });
    }
});*/

