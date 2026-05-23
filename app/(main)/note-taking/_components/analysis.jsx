"use client";

import React, { useEffect, useState, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ChevronLeft, Download, Sparkles, Target, Zap, Loader2 } from "lucide-react";
import html2canvas from "html2canvas";
import { analyzeNoteCategory, getNotesByIds } from "@/actions/note";

export default function Analysis() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const reportRef = useRef(null);

  const category = searchParams.get("category") || "General";
  const ids = searchParams.get("ids")?.split(",") || [];

  const [insightData, setInsightData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function performAnalysis() {
      if (ids.length === 0) {
        setError("No notes found to analyze.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        // Fetch full note objects including child lists
        const fetchResult = await getNotesByIds(ids);
        
        if (!fetchResult.success) throw new Error("Could not retrieve notes.");

        // Trigger Gemini Analysis
        const analysis = await analyzeNoteCategory(category, fetchResult.data);
        setInsightData(analysis);
      } catch (err) {
        console.error(err);
        setError("Analysis failed. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    performAnalysis();
  }, [category]);

  const handleDownload = async () => {
    if (!reportRef.current) return;
    const canvas = await html2canvas(reportRef.current, { 
      scale: 3, 
      backgroundColor: "#ffffff",
      logging: false 
    });
    const link = document.createElement("a");
    link.download = `${category.replace(/\s+/g, "-")}-Analysis.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white p-6 text-center">
        <div className="relative mb-6">
          <div className="absolute inset-0 bg-blue-100 blur-2xl rounded-full animate-pulse" />
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin relative z-10" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Generating Intelligence</h2>
        <p className="text-slate-500 text-sm max-w-xs leading-relaxed">
          Insightivia AI is analyzing your {category} notes and child tasks to find patterns...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <p className="text-rose-500 font-bold mb-4">{error}</p>
        <button onClick={() => router.back()} className="text-blue-600 font-bold flex items-center gap-2">
          <ChevronLeft className="w-4 h-4" /> Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-lg border-b border-slate-100 px-6 py-4 flex items-center justify-between">
        <button onClick={() => router.back()} className="p-2 hover:bg-slate-50 rounded-full transition-colors">
          <ChevronLeft className="w-6 h-6 text-slate-600" />
        </button>
        <span className="text-xs font-black uppercase tracking-widest text-slate-400">AI Strategy Report</span>
        <button onClick={handleDownload} className="p-2 text-blue-600 hover:bg-blue-50 rounded-full transition-colors">
          <Download className="w-6 h-6" />
        </button>
      </header>

      <main ref={reportRef} className="max-w-3xl mx-auto px-6 py-12 bg-white">
        <div className="mb-12">
          <h1 className="text-4xl font-black text-[#0a1128] mb-2 tracking-tight leading-none">
            {category}
          </h1>
          <p className="text-slate-400 text-sm font-bold uppercase tracking-tighter">
            Note Category Analysis • {new Date().toLocaleDateString()}
          </p>
        </div>

        <section className="mb-14">
          <div className="flex items-center gap-2 mb-4 text-blue-600">
            <Sparkles className="w-5 h-5 fill-blue-600" />
            <h2 className="text-lg font-black uppercase tracking-wider">Summary Outlook</h2>
          </div>
          <p className="text-slate-600 text-lg leading-relaxed font-medium italic">
            "{insightData?.summary}"
          </p>
        </section>

        <section className="mb-14">
          <h2 className="text-lg font-black uppercase tracking-wider text-slate-900 mb-6">Recurring Patterns</h2>
          <div className="space-y-8">
            {insightData?.patterns.map((item, i) => (
              <div key={i} className="flex gap-5">
                <div className="flex-shrink-0 w-10 h-10 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center">
                  <Zap className="w-5 h-5 text-amber-500 fill-amber-500" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-slate-900">{item.title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="pt-10 border-t border-slate-100">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200">
              <Target className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-lg font-black uppercase tracking-wider text-slate-900">Key Focus Areas</h2>
          </div>
          <div className="grid gap-4">
            {insightData?.focusPoints.map((point, i) => (
              <div key={i} className="group p-5 bg-slate-50 border border-slate-100 rounded-[1.5rem] transition-all hover:bg-white hover:shadow-md flex items-center gap-4">
                <span className="text-2xl font-black text-blue-100 group-hover:text-blue-600 transition-colors">0{i+1}</span>
                <p className="text-slate-700 text-sm font-bold leading-tight">{point}</p>
              </div>
            ))}
          </div>
        </section>

        <footer className="mt-20 pt-10 border-t border-slate-50 text-center">
          <p className="text-[10px] font-bold text-slate-300 uppercase tracking-[0.3em]">
            Generated by Insightivia Note Assistant
          </p>
        </footer>
      </main>
    </div>
  );
}