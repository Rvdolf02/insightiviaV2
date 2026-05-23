"use client";

import { createGoal, deleteGoal, updateGoal } from "@/actions/goal";
import { goalSchema } from "@/app/lib/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash,
} from "lucide-react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import useFetch from "@/hooks/use-fetch";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const GoalProgress = ({
  accounts,
  goals = [],
  editMode = false,
  initialData = null,
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  // --- dialog state ---
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState(null);
  const router = useRouter();

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(goalSchema),
    defaultValues:
      editMode && initialData
        ? {
            title: initialData.title,
            amount: initialData.amount.toString(),
            accountId: initialData.accountId,
          }
        : {
            title: "",
            amount: "",
            accountId: accounts.find((ac) => ac.isDefault)?.id,
          },
  });

  const {
    loading: goalLoading,
    fn: goalFn,
    data: goalResult,
  } = useFetch(editMode || editingGoal ? updateGoal : createGoal);

  const onSubmit = (data) => {
    const formData = { ...data, amount: parseFloat(data.amount) };
    if (editingGoal) {
      goalFn(editingGoal.id, formData);
    } else {
      goalFn(formData);
    }
  };

  useEffect(() => {
    if (goalResult?.success && !goalLoading) {
      toast.success(
        editMode || editingGoal
          ? "Changes have been applied successfully."
          : "Funds can now be tracked against this allocation."
      );
      reset();
      setIsAdding(false);
      setEditingGoal(null);
      router.refresh();
    }
  }, [goalResult, goalLoading]);

  const {
    loading: deleteLoading,
    fn: deleteFn,
    data: deleteResult,
    error: deleteError,
  } = useFetch(deleteGoal);

  const handleOpenDeleteDialog = (goal) => {
    setSelectedGoal(goal);
    setTimeout(() => setOpenDialog(true), 50); // ensure dropdown closes first
  };

  const handleConfirmDelete = async () => {
    if (!selectedGoal) return;
    try {
      await deleteFn(selectedGoal.id); // trigger delete
    } catch (err) {
      toast.error(err?.message || "Action failed");
    } finally {
      setOpenDialog(false); // always close
    }
  };

  useEffect(() => {
    if (!deleteLoading && deleteResult) {
      if (deleteResult.success) {
        toast.success("This allocation is no longer tracked.");
        router.refresh();
      } else {
        if (deleteResult.type === "HAS_ALLOCATIONS") {
          toast.warning(deleteResult.message); // softer UX
        } else {
          toast.error(deleteResult.message);
        }
      }
    }
  }, [deleteResult, deleteLoading, router]);

 
  return (
    <div className="space-y-6">
      {/* Add/Edit Form */}
      {isAdding || editingGoal ? (
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4 border p-4 rounded-xl shadow-sm bg-white"
        >
          <div className="space-y-2">
            <label className="text-sm font-medium">Allocation Name</label>
            <Input placeholder="Enter allocation name" {...register("title")} />
            {errors.title && (
              <p className="text-sm text-red-500">{errors.title.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Allocated Amount</label>
            <Input
              type="number"
              step="0.01"
              placeholder="0.00"
              {...register("amount")}
            />
            {errors.amount && (
              <p className="text-sm text-red-500">{errors.amount.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Fund Source</label>
            <Controller
              name="accountId"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={(val) => field.onChange(val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Account" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.accountId && (
              <p className="text-sm text-red-500">
                {errors.accountId.message}
              </p>
            )}
          </div>

          <div className="flex gap-4">
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => {
                setIsAdding(false);
                setEditingGoal(null);
                reset();
              }}
            >
              Cancel
            </Button>
            <Button type="submit" className="w-full" disabled={goalLoading}>
              {goalLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {editingGoal ? "Applying..." : "Processing..."}
                </>
              ) : editingGoal ? (
                "Update Allocation"
              ) : (
                "Create Allocation"
              )}
            </Button>
          </div>
        </form>
      ) : (
        <>
          {/* Header + Add Button */}
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">💰 Savings Allocations</h2>
         
          </div>

          {/* Goals Grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {goals
              .filter((goal) => goal.account?.isDefault)
              .map((goal) => {
                const progress = Math.min(
                  (goal.currentAmount / goal.amount) * 100,
                  100
                );
                return (
                  <Card
                    key={goal.id}
                    className="rounded-2xl shadow-md hover:shadow-lg transition"
                  >
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <div className="flex-1">
                        <CardTitle className="gap-1">{goal.title}</CardTitle>
                        <CardDescription>
                          ₱{goal.currentAmount?.toLocaleString()} funded • ₱
                          {goal.amount?.toLocaleString()} target
                        </CardDescription>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent  align="end" className="w-15">
                          <DropdownMenuItem  className="cursor-pointer w-full flex items-center gap-2 px-2 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                            onClick={() => {
                              setEditingGoal(goal);
                              reset({
                                title: goal.title,
                                amount: goal.amount.toString(),
                                accountId: goal.accountId,
                              });
                            }}
                          >
                            <Pencil className="h-4 w-4 text-gray-600" /> Update Allocation
                          </DropdownMenuItem>
                           <DropdownMenuItem
                            className="text-red-500 focus:text-red-700 hover:bg-red-50 cursor-pointer"
                            onClick={() => handleOpenDeleteDialog(goal)}
                          >
                            <Trash className="h-4 w-4 text-red-600" /> Remove Allocation
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <Progress value={progress} />
                        <p className="text-xs text-muted-foreground text-right">
                          {progress.toFixed(1)}% funded
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}

            {/* Empty Add Goal Card */}
           <Card
              className="border-dashed border-2 flex items-center justify-center rounded-2xl hover:bg-muted transition cursor-pointer"
              onClick={() => {
                setIsAdding(true);
                setEditingGoal(null); 
                reset({
                  title: "",
                  amount: "",
                  accountId: accounts.find((ac) => ac.isDefault)?.id,
                }); 
              }}
            >
              <CardContent className="flex flex-col items-center justify-center p-6 text-center">
                <Plus className="w-6 h-6 mb-2 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">
                  Add Allocation
                </span>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* AlertDialog for delete */}
      <AlertDialog open={openDialog} onOpenChange={setOpenDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Allocation? "{selectedGoal?.title}"</AlertDialogTitle>
            <p className="text-sm text-muted-foreground">
              This allocation will permanently removed and its progress will no longer be tracked.
            </p>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <button className="px-3 py-1 rounded-md border">Cancel</button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <button
                onClick={handleConfirmDelete}
                disabled={deleteLoading}
                className="px-3 py-1 rounded-md bg-red-600 text-white disabled:opacity-60"
              >
                {deleteLoading ? "Removing..." : "Remove"}
              </button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default GoalProgress;
