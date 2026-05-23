"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { getSpendsenseResult } from "@/actions/dashboard";
import { useRouter } from "next/navigation";

const Spendsense = ({ controlledOpen = false, onOpenChange }) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [showCard, setShowCard] = useState(false);

  const handleClose = () => onOpenChange?.(false);

  // Prevent background scroll when modal is active
  useEffect(() => {
    const active = controlledOpen || loading || (showCard && result);
    const prev = document.body.style.overflow;
    if (active) document.body.style.overflow = "hidden";
    return () => (document.body.style.overflow = prev || "");
  }, [controlledOpen, loading, showCard, result]);

const router = useRouter();

const handleGenerate = async () => {
  setLoading(true);
  try {
    const res = await getSpendsenseResult();

    if (res.status === "NO_ACCOUNT") {
      router.push("/dashboard?noAccount=true");
      return;
    }

    if (res.status === "NO_DEFAULT") {
      router.push("/dashboard?noDefault=true");
      return;
    }

    if (res.status === "NO_TRANSACTIONS") {
      router.push("/dashboard?noTransactions=true");
      return;
    }

    if (res.status === "RATE_LIMITED") {
      toast.error("You've reached your weekly limit. Try again tomorrow.");
      onOpenChange?.(false);
      return;
    }
    // SUCCESS CASE
    setResult(res);
    setShowCard(true);

  } finally {
    setLoading(false);
  }
};


  if (typeof document === "undefined") return null;

  const modalActive = controlledOpen || loading || (showCard && result);

  const modal = modalActive ? (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center px-2 sm:px-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal container with scrollable area */}
      <div
        className="relative z-[10000] w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl transform transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Confirmation */}
        {controlledOpen && !loading && !showCard && (
          <Card className="w-full p-4 sm:p-6 text-center rounded-2xl">
            <h3 className="text-lg font-semibold mb-2">
              Take the SpendSense test?
            </h3>
            <p className="text-sm text-muted-foreground mb-6">
              This analysis can be run once every 7 days. Do you want to use
              your chance now?
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-3">
              <button
                onClick={handleClose}
                className="px-4 py-2 rounded-md border w-full sm:w-auto"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerate}
                className="px-4 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 w-full sm:w-auto"
              >
                Yes, analyze
              </button>
            </div>
          </Card>
        )}

        {/* Loading */}
        {loading && (
          <Card className="w-full p-4 sm:p-6 text-center rounded-2xl">
            <img
              src="/daily-insight.gif"
              alt="Analyzing"
              className="mx-auto w-24 h-24 sm:w-28 sm:h-28 mb-4"
            />
            <p className="text-lg font-semibold mb-2">
              Analyzing your spending style...
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              This may take a few seconds.
            </p>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-600 animate-pulse w-3/5"></div>
            </div>
          </Card>
        )}

        {/* Result */}
        {showCard && result && !loading && (
          <Card className="w-full p-4 sm:p-6 rounded-2xl shadow-lg bg-white">
            {/* Header */}
            <div className="flex flex-col items-center text-center">
              <img
                src={result.gif || "/balanced-spender.gif"}
                alt={result.type}
                className="w-28 h-28 sm:w-32 sm:h-32 mb-3 object-contain"
              />
              <h2 className="text-xl sm:text-2xl font-bold mb-1">{result.type}</h2>
              <p className="text-sm text-muted-foreground mb-4">
                A short snapshot of your spending profile
              </p>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              <SummaryItem
                label="Total Income"
                value={result.summary?.totalIncome}
                color="text-green-700"
              />
              <SummaryItem
                label="Total Expenses"
                value={result.summary?.totalExpenses}
                color="text-red-600"
              />
              <SummaryItem
                label="Net Income"
                value={result.summary?.netIncome}
                color="text-indigo-600"
              />
            </div>

            {/* Reasons */}
            <Section title="Why this profile?">
              {result.reasons?.map((r, i) => (
                <div
                  key={i}
                  className="px-3 py-2 bg-gray-50 rounded-md border text-sm"
                >
                  {r}
                </div>
              ))}
            </Section>

            {/* Quick actions */}
            <Section title="Quick actions">
              {result.bullets?.map((b, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 p-3 bg-indigo-50 rounded-lg border"
                >
                  <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-sm">
                    {i + 1}
                  </div>
                  <div className="text-sm text-gray-800">{b}</div>
                </div>
              ))}
            </Section>

            {/* Close button */}
            <div className="mt-6 flex flex-col sm:flex-row justify-end gap-3">
              <button
                onClick={() => {
                  setShowCard(false);
                  onOpenChange?.(false);
                }}
                className="px-4 py-2 rounded-md border w-full sm:w-auto"
              >
                Close
              </button>
            </div>
          </Card>
        )}
      </div>
    </div>
  ) : null;

  return createPortal(modal, document.body);
};

const SummaryItem = ({ label, value, color }) => (
  <div className="p-3 rounded-lg bg-gray-50 border text-sm text-center sm:text-left">
    <div className="text-xs text-muted-foreground">{label}</div>
    <div className={`font-medium mt-1 break-words ${color}`}>
      {value ?? "—"}
    </div>
  </div>
);

const Section = ({ title, children }) => (
  <div className="mb-4">
    <h3 className="text-sm font-semibold mb-2">{title}</h3>
    <div className="space-y-2">{children}</div>
  </div>
);

export default Spendsense;
