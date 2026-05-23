"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Sparkles, Lightbulb, Activity, Coins, FileText } from "lucide-react";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { getDailyTips } from "@/actions/dashboard";
import Spendsense from "./spendsense";
import { useRouter } from "next/navigation";
import StatementPage from "./statement-of-account";

const DailyTips = () => {
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [showCard, setShowCard] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [spendsenseOpen, setSpendsenseOpen] = useState(false);
  const [soaOpen, setSoaOpen] = useState(false);
  const router = useRouter();

 const handleGenerateTips = async () => {
  setShowConfirm(false);
  setLoading(true);

  try {
    const res = await getDailyTips();

    if (!res || !res.status) {
      toast.error("Unexpected response. Try again.");
      return;
    }

    switch (res.status) {
      case "NO_ACCOUNT":
        router.push("/dashboard?noAccount=true");
        return;

      case "NO_DEFAULT":
        router.push("/dashboard?noDefault=true");
        return;

      case "NO_TRANSACTIONS":
        router.push("/dashboard?noTransactions=true");
        return;

      case "RATE_LIMITED":
        toast.error("You’ve reached your daily limit. Try again tomorrow.");
        return;

      case "OK":
        setResult(res);
        setShowCard(true);
        return;

      default:
        toast.error("Something went wrong.");
    }
  } finally {
    setLoading(false);
  }
};

  const parseCategories = (catString) => {
    if (!catString || catString === "None") return [];
    const cleaned = catString.trim().replace(/^,|,$/g, "");
    const pairRegex = /\s*,?\s*([^:]+):\s*(₱?[\d,]+(?:\.\d+)?)/g;
    const matches = [];
    let m;
    while ((m = pairRegex.exec(cleaned)) !== null) {
      matches.push({ name: m[1].trim(), amount: m[2].trim() });
    }
    return matches;
  };

  // Lock scroll when modal open
  useEffect(() => {
    const active = showConfirm || loading || showCard;
    const prev = document.body.style.overflow;
    if (active) document.body.style.overflow = "hidden";
    else document.body.style.overflow = prev || "";
    return () => (document.body.style.overflow = prev || "");
  }, [showConfirm, loading, showCard]);

  const renderModal = (content) =>
    typeof document !== "undefined" ? createPortal(content, document.body) : null;

  // 📱 Fullscreen request before navigating to /cha-ching
  const handleChaChingClick = async (e) => {
    e.preventDefault();
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      const el = document.documentElement;
      try {
        if (el.requestFullscreen) await el.requestFullscreen();
        else if (el.webkitRequestFullscreen) await el.webkitRequestFullscreen(); // Safari
        else if (el.msRequestFullscreen) await el.msRequestFullscreen(); // Edge legacy
      } catch (err) {
        console.warn("Fullscreen request failed:", err);
      }
    }
    router.push("/cha-ching");
  };

  return (
    <>
      {/* 🌟 Floating Action Button Group */}
      <div className="fixed bottom-5 right-5 md:bottom-8 md:right-8 z-50 flex flex-col items-end pointer-events-none">
       {/* Hidden Buttons wrapper — this alone controls pointer events */}
<div className={`flex flex-col items-end space-y-2 mb-2 transition-all duration-300 ${
  showMenu
    ? "opacity-100 translate-y-0 pointer-events-auto"
    : "opacity-0 translate-y-4 pointer-events-none"
}`}>

  {/* Remove pointer-events-auto from all spans and buttons inside */}
  <div className="flex items-center space-x-2">
    <span className={`bg-gray-800 text-white text-sm px-2 py-1 rounded-md shadow-md transition-opacity duration-200 ${
      showMenu ? "opacity-100" : "opacity-0"
    }`}>Daily Tips</span>
    <button onClick={() => setShowConfirm(true)}
      className="bg-yellow-500 hover:bg-yellow-600 text-white p-3 rounded-full shadow-lg transition">
      <Lightbulb className="w-5 h-5" />
    </button>
  </div>

  <div className="flex items-center space-x-2">
    <span className={`bg-gray-800 text-white text-sm px-2 py-1 rounded-md shadow-md transition-opacity duration-200 ${
      showMenu ? "opacity-100" : "opacity-0"
    }`}>SpendSense</span>
    <button onClick={() => setSpendsenseOpen(true)}
      className="bg-blue-500 hover:bg-blue-600 text-white p-3 rounded-full shadow-lg transition">
      <Activity className="w-5 h-5" />
    </button>
  </div>

  <div className="flex items-center space-x-2">
    <span className={`bg-gray-800 text-white text-sm px-2 py-1 rounded-md shadow-md transition-opacity duration-200 ${
      showMenu ? "opacity-100" : "opacity-0"
    }`}>Statement of Account</span>
    <button onClick={() => setSoaOpen(true)}
      className="bg-blue-500 hover:bg-blue-600 text-white p-3 rounded-full shadow-lg transition">
      <Activity className="w-5 h-5" />
    </button>
  </div>

  <div className="flex items-center space-x-2">
    <span className={`bg-gray-800 text-white text-sm px-2 py-1 rounded-md shadow-md transition-opacity duration-200 ${
      showMenu ? "opacity-100" : "opacity-0"
    }`}>Note Library</span>
    <button onClick={() => router.push("/note-taking")}
      className="bg-indigo-600 hover:bg-indigo-700 text-white p-3 rounded-full shadow-lg transition">
      <FileText className="w-5 h-5" />
    </button>
  </div>

  <div className="flex items-center space-x-2">
    <span className={`bg-gray-800 text-white text-sm px-2 py-1 rounded-md shadow-md transition-opacity duration-200 ${
      showMenu ? "opacity-100" : "opacity-0"
    }`}>Cha-Ching</span>
    <button onClick={handleChaChingClick}
      className="bg-gray-400 hover:bg-gray-500 text-white p-3 rounded-full shadow-lg transition">
      <Coins className="w-5 h-5" />
    </button>
  </div>
</div>

{/* Main toggle — keep pointer-events-auto here since it's always visible */}
<button
  aria-label="Menu"
  onClick={() => setShowMenu((prev) => !prev)}
  className={`pointer-events-auto bg-gradient-to-r from-yellow-500 to-orange-500 text-white p-4 rounded-full shadow-lg transition-transform duration-300 ${
    showMenu ? "rotate-45" : "hover:scale-110"
  }`}
>
  <Sparkles className="w-6 h-6 transition-transform" />
</button>
      </div>

      {/* Confirmation Modal */}
      {showConfirm &&
        renderModal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center px-4"
            onClick={() => setShowConfirm(false)}
          >
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>
            <Card
              className="relative w-full max-w-md p-4 md:p-6 text-center rounded-2xl z-[10000]"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-lg font-semibold mb-2">View Today’s Tips?</h2>
              <p className="text-sm text-muted-foreground mb-6">
                You can only generate daily tips once per day. Do you want to view them now?
              </p>
              <div className="flex justify-center gap-3 flex-wrap">
                <button
                  onClick={() => setShowConfirm(false)}
                  className="px-4 py-2 rounded-md border w-full sm:w-auto"
                >
                  Cancel
                </button>
                <button
                  onClick={handleGenerateTips}
                  className="px-4 py-2 rounded-md bg-yellow-500 text-white hover:bg-yellow-600 w-full sm:w-auto"
                >
                  Yes, Generate
                </button>
              </div>
            </Card>
          </div>
        )}

      {/* Loading Modal */}
      {loading &&
        renderModal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>
            <Card className="relative w-full max-w-md p-4 md:p-6 text-center rounded-2xl z-[10000]">
              <img
                src="/daily-insight.gif"
                alt="Generating tips"
                className="mx-auto w-24 h-24 md:w-28 md:h-28 mb-4"
              />
              <p className="text-base md:text-lg font-semibold mb-2">
                Generating Tips... Please wait.
              </p>
              <p className="text-xs md:text-sm text-muted-foreground mb-4">
                This may take a few seconds.
              </p>
              <div className="mt-3 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-yellow-500 animate-pulse w-3/4"></div>
              </div>
            </Card>
          </div>
        )}

      {/* Result Card */}
      {showCard &&
        result &&
        renderModal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 overflow-y-auto"
            onClick={() => {
              setShowCard(false);
              setResult(null);
            }}
          >
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>
            <Card
              className="relative w-full max-w-xl p-4 md:p-6 rounded-2xl max-h-[90vh] overflow-y-auto z-[10000]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex flex-col items-center text-center">
                <img
                  src="/daily-insight.gif"
                  alt="Daily Insight"
                  className="w-24 h-24 md:w-28 md:h-28 mb-3"
                />
                <h2 className="text-lg md:text-xl font-bold text-yellow-600 mb-1">
                  💡 Your Daily Insights
                </h2>
                <p className="text-xs md:text-sm text-muted-foreground mb-4">
                  A quick snapshot of today's financial summary and three short tips.
                </p>
              </div>

              <div className="grid gap-3 grid-cols-1 sm:grid-cols-3 mb-4">
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
                  color="text-yellow-600"
                />
              </div>

              {result.summary?.categories && result.summary.categories !== "None" && (
                <div className="mb-4">
                  <div className="text-sm text-muted-foreground mb-2">Top Categories</div>
                  <div className="flex flex-wrap gap-2 overflow-visible">
                    {parseCategories(result.summary.categories)
                      .slice(0, 4)
                      .map((c, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-2 whitespace-nowrap rounded-full px-3 py-1 bg-gray-100 border text-xs flex-shrink-0"
                        >
                          <span className="capitalize font-medium leading-none">
                            {c.name}:
                          </span>
                          <span className="text-gray-700 leading-none whitespace-nowrap">
                            {c.amount}
                          </span>
                        </span>
                      ))}
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <h3 className="text-base font-semibold text-yellow-600">💡 Daily Tips</h3>
                {result.tips?.map((tip, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 p-3 rounded-lg bg-yellow-50 border border-yellow-200 shadow-sm"
                  >
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-yellow-600 text-white flex items-center justify-center font-bold text-xs">
                      {idx + 1}
                    </div>
                    <p className="text-sm leading-relaxed text-gray-800">{tip}</p>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => {
                    setShowCard(false);
                    setResult(null);
                  }}
                  className="px-4 py-2 rounded-md border w-full sm:w-auto"
                >
                  Close
                </button>
              </div>
            </Card>
          </div>
        )}

      {/* SpendSense Modal */}
      <Spendsense controlledOpen={spendsenseOpen} onOpenChange={setSpendsenseOpen} />
      <StatementPage controlledOpen={soaOpen} onOpenChange={setSoaOpen}/>
    </>
  );
};

const SummaryItem = ({ label, value, color }) => (
  <div className="p-3 rounded-lg bg-gray-50 border text-center">
    <div className="text-xs text-muted-foreground">{label}</div>
    <div className={`font-medium mt-1 ${color}`}>{value ?? "—"}</div>
  </div>
);

export default DailyTips;
