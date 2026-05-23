"use client";

import React, { useState, useEffect } from "react";
import { AlertCircle, X, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";

const BudgetAlert = ({ percentUsed, currentExpenses }) => {
  const [show, setShow] = useState(false);
  const [status, setStatus] = useState("good");

  // 📅 Monthly pacing logic
  const today = new Date();
  const currentDay = today.getDate();
  const daysInMonth = new Date(
    today.getFullYear(),
    today.getMonth() + 1,
    0
  ).getDate();

  const timeProgress = (currentDay / daysInMonth) * 100;

  useEffect(() => {
    // 🎯 Determine status (Finance-based thresholds)
    let newStatus = "good";

    if (percentUsed >= 120) {
      newStatus = "critical"; // severe overspending
    } else if (percentUsed >= 100) {
      newStatus = "over"; // budget overrun
    } else if (percentUsed >= 90) {
      newStatus = "risk"; // high risk
    } else if (percentUsed >= 70) {
      newStatus = "caution"; // warning zone
    }

    // ⚠️ Pacing condition (actual vs expected)
    if (percentUsed > timeProgress + 10 && percentUsed < 100) {
      newStatus = "overspending_fast";
    }

    setStatus(newStatus);

    // Only show alert if not "good"
    setShow(newStatus !== "good");
  }, [percentUsed, timeProgress]);

  if (!show) return null;

  // 🎨 UI Styles based on status
  const styles = {
    critical: "border-red-700 bg-red-100",
    over: "border-red-500 bg-red-50",
    risk: "border-orange-500 bg-orange-50",
    caution: "border-yellow-500 bg-yellow-50",
    overspending_fast: "border-purple-500 bg-purple-50",
  };

  const titles = {
    critical: "Critical Budget Overrun",
    over: "Budget Limit Exceeded",
    risk: "High Spending Risk",
    caution: "Budget Warning",
    overspending_fast: "Spending Too Fast",
  };

  const messages = {
    critical:
      "Significant budget overrun detected. Immediate financial adjustment is required.",
    over:
      "You have exceeded your allocated monthly budget.",
    risk:
      "Spending is approaching the budget limit and may exceed soon.",
    caution:
      "You are nearing your budget threshold. Monitor your expenses.",
    overspending_fast:
      "Your spending pace is higher than expected for this point in the month.",
  };

  const isDanger =
    status === "critical" || status === "over";

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -100, opacity: 0 }}
        className="fixed top-20 left-0 right-0 z-[100] flex justify-center px-4 pointer-events-none"
      >
        <Card
          className={`pointer-events-auto w-full max-w-md border-2 shadow-2xl ${styles[status]}`}
        >
          <div className="p-4 flex items-start gap-3">
            <div className="mt-1">
              {isDanger ? (
                <AlertCircle className="h-5 w-5 text-red-600" />
              ) : (
                <TriangleAlert className="h-5 w-5 text-yellow-600" />
              )}
            </div>

            <div className="flex-1">
              <h4 className="font-bold text-sm">
                {titles[status]}
              </h4>

              <p className="text-xs text-gray-600 mt-1">
                ₱{currentExpenses.toLocaleString()} spent
                ({percentUsed.toFixed(1)}% of budget)
              </p>

              <p className="text-xs mt-1">
                {messages[status]}
              </p>
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 rounded-full hover:bg-gray-200"
              onClick={() => setShow(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
};

export default BudgetAlert;