"use client";

import { updateBudget } from '@/actions/budget';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import useFecth from '@/hooks/use-fetch';
import { Check, Pencil, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import BudgetAlert from './budget-alerts';

const BudgetProgress = ({ initialBudget, currentExpenses }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [newBudget, setNewBudget] = useState(
    initialBudget?.amount?.toString() || ""
  );

  const percentUsed = initialBudget
    ? (currentExpenses / initialBudget.amount) * 100
    : 0;

  // 📅 SAME monthly pacing logic as BudgetAlert
  const today = new Date();
  const currentDay = today.getDate();
  const daysInMonth = new Date(
    today.getFullYear(),
    today.getMonth() + 1,
    0
  ).getDate();

  const timeProgress = (currentDay / daysInMonth) * 100;
  
  let status = "good";

  if (currentExpenses === 0) {
    status = "no_activity";
  } else if (percentUsed >= 120) {
    status = "critical";
  } else if (percentUsed >= 100) {
    status = "over";
  } else if (percentUsed >= 90) {
    status = "risk";
  } else if (percentUsed >= 70) {
    status = "caution";
  }

  // ⚠️ Keep pacing logic LAST
  if (
    currentExpenses > 0 &&
    percentUsed > timeProgress + 10 &&
    percentUsed < 100
  ) {
    status = "overspending_fast";
  }

  const statusLabels = {
  no_activity: "No Spending Recorded",
  good: "Within Budget",
  caution: "Approaching Budget Threshold",
  risk: "High Spending Risk",
  over: "Budget Overrun",
  critical: "Critical Budget Overrun",
  overspending_fast: "Spending Pace Exceeds Plan",
};

  const progressColor = `${
  status === "no_activity"
    ? "bg-gray-400"
    : status === "critical" || status === "over"
    ? "bg-red-600"
    : status === "risk"
    ? "bg-orange-500"
    : status === "caution"
    ? "bg-yellow-500"
    : status === "overspending_fast"
    ? "bg-purple-500"
    : "bg-green-500"
}`;

  const {
    loading: isLoading,
    fn: updateBudgetFn,
    data: updatedBudget,
    error,
  } = useFecth(updateBudget);

  const handleUpdateBudget = async () => {
    const amount = parseFloat(newBudget);

    if (isNaN(amount) || amount < 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    await updateBudgetFn(amount);
  };

  useEffect(() => {
    if (updatedBudget?.success) {
      setIsEditing(false);
      toast.success("Budget updated successfully");
    }
  }, [updatedBudget]);

  useEffect(() => {
    if (error) {
      toast.error(error.message || "Failed to update budget");
    }
  }, [error]);

  const handleCancel = () => {
    setNewBudget(initialBudget?.amount?.toString() || "");
    setIsEditing(false);
  };

  return (
    <>
      {/* 🔁 SAME ALERT SYSTEM */}
      <BudgetAlert 
        percentUsed={percentUsed} 
        currentExpenses={currentExpenses} 
      />

      <Card>
        <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
          <div className='flex-1'>
            <CardTitle>Monthly Budget (Default Account)</CardTitle>

            <div className='flex items-center gap-2 mt-2'>
              {isEditing ? (
                <div className='flex items-center gap-2'>
                  <Input
                    type="number"
                    value={newBudget}
                    onChange={(e) => setNewBudget(e.target.value)}
                    className="w-32"
                    placeholder="Enter amount"
                    autoFocus
                    disabled={isLoading}
                  />

                  <Button 
                    variant="ghost"
                    size="icon"
                    onClick={handleUpdateBudget}
                    disabled={isLoading}
                  > 
                    <Check className='h-4 w-4 text-green-500'/>
                  </Button>

                  <Button 
                    variant="ghost"
                    size="icon"
                    onClick={handleCancel}
                    disabled={isLoading}
                  > 
                    <X className='h-4 w-4 text-red-500'/>
                  </Button>
                </div>
              ) : (
                <>
                <CardDescription>
                    {initialBudget ? (() => {
                        const budget = initialBudget.amount;
                        const remaining = budget - currentExpenses;

                        const formattedExpense = currentExpenses.toLocaleString('en-PH', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                        });

                        const formattedBudget = budget.toLocaleString('en-PH', {
                        });

                        const formattedDiff = Math.abs(remaining).toLocaleString('en-PH', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                        });

                        return (
                        <div className="flex flex-col space-y-1"> 
                            {/* 🔥 PRIMARY: VARIANCE */}
                            <span className={`text-sm font-semibold ${
                              remaining < 0 ? "text-red-600" : "text-green-600"
                            }`}>
                              {currentExpenses === 0
                                ? `₱${formattedBudget} budget allocated`
                                : remaining >= 0
                                ? `₱${formattedDiff} under budget`
                                : `₱${formattedDiff} over budget`}
                            </span>

                            {/* 📊 SECONDARY: CONTEXT */}
                            <span className="text-xs text-muted-foreground">
                            ₱{formattedExpense} spent 
                            </span>
                        </div>
                        );

                    })() : "No budget has been allocated for this period"}
                </CardDescription>
                  <Button
                    variant='ghost'
                    size='icon'
                    onClick={() => setIsEditing(true)}
                    className='h-6 w-6'
                  >
                    <Pencil className='h-3 w-3'/>
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {initialBudget && (
            <div className='space-y-1'>

              {/* 📊 PROGRESS BAR */}
              <Progress 
                value={Math.min(percentUsed, 100)}
                extraStyles={progressColor}
                />

                <p className="text-xs text-muted-foreground text-right">
    Budget Utilization
  </p>

  <p className="text-sm font-semibold text-right">
    {percentUsed.toFixed(1)}%
  </p>

  <p className={`text-xs font-medium text-right ${
    status === "critical" || status === "over"
      ? "text-red-600"
      : status === "risk"
      ? "text-orange-500"
      : status === "caution"
      ? "text-yellow-600"
      : status === "overspending_fast"
      ? "text-purple-500"
      : "text-green-600"
  }`}>
    {statusLabels[status]}
  </p>

            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
};

export default BudgetProgress;