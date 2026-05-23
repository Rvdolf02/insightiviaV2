"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { 
  ChevronLeft, Lightbulb, Mail, Bell, Brain, 
  UserCircle, Timer, TrendingUp, Target, 
  Table, Edit3, PlusCircle, Scan, FileText, Landmark,
  Smile, ClipboardList
} from "lucide-react";

export default function FeatureGuide() {
  return (
    <div className="min-h-screen bg-[#fcfdfe] pb-32"> {/* Increased bottom padding */}
      {/* Sticky Header */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b px-4 h-14 flex items-center">
        <div className="container mx-auto flex items-center max-w-6xl">
          <Link href="/">
            <Button variant="ghost" size="icon" className="rounded-full h-8 w-8">
              <ChevronLeft className="w-5 h-5 text-slate-600" />
            </Button>
          </Link>
          <h1 className="flex-1 text-center text-[13px] font-bold text-slate-800 tracking-tight pr-8 md:pr-0 md:text-base">
            Feature Guide
          </h1>
        </div>
      </nav>

      <div className="container mx-auto px-5 pt-8 md:pt-16 max-w-6xl">
        {/* Page Title */}
        <header className="mb-10 md:mb-20 md:text-center max-w-2xl mx-auto">
          <h2 className="text-[32px] md:text-5xl font-bold text-slate-900 leading-[1.1] mb-3 md:mb-6">
            Insightivia <span className="text-blue-600">Detailed Guide</span>
          </h2>
          <p className="text-slate-500 text-[13px] md:text-base leading-relaxed">
            Explore every tool designed to help you master your finances with the power of artificial intelligence.
          </p>
        </header>

        {/* --- DASHBOARD KPIs SECTION --- */}
        <section className="mb-16">
          <p className="text-[9px] md:text-xs font-bold text-blue-500 uppercase tracking-[0.15em] mb-6 md:text-center">
            Dashboard KPIs
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-[#0a0f1d] rounded-[28px] p-6 text-white relative overflow-hidden shadow-lg flex flex-col justify-center min-h-[140px]">
              <div className="relative z-10">
                <p className="text-slate-400 text-[9px] md:text-[10px] uppercase font-bold tracking-wider mb-1">Total Net Worth</p>
                <h3 className="text-[28px] md:text-3xl font-bold tracking-tight">$142,500.00</h3>
              </div>
              <div className="absolute right-6 top-1/2 -translate-y-1/2 bg-blue-500/10 p-3 rounded-2xl border border-white/5">
                  <Landmark className="w-6 h-6 text-blue-400" />
              </div>
            </div>
            <div className="bg-white border border-slate-100 p-6 rounded-[22px] shadow-sm flex flex-col justify-center">
                <p className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase mb-1">Total Expense</p>
                <p className="text-xl md:text-2xl font-bold text-red-500">$3,240</p>
            </div>
            <div className="bg-white border border-slate-100 p-6 rounded-[22px] shadow-sm flex flex-col justify-center">
                <p className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase mb-1">Total Savings</p>
                <p className="text-xl md:text-2xl font-bold text-emerald-500">$1,850</p>
            </div>
          </div>
        </section>

        {/* --- GRID LAYOUT FOR FEATURE CATEGORIES --- */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-12 gap-y-16 mb-20">
          
          <CategorySection title="AI-Powered Insights" icon={<Brain className="w-4 h-4" />}>
            <FeatureRow icon={<Lightbulb className="w-5 h-5 text-blue-600" />} title="Daily AI Tips" desc="Personalized bite-sized advice delivered every morning based on your recent spending." />
            <FeatureRow icon={<Mail className="w-5 h-5 text-blue-600" />} title="Monthly Email Insights" desc="Comprehensive monthly reports sent directly to your inbox with deep trend analysis." />
            <FeatureRow icon={<Bell className="w-5 h-5 text-blue-600" />} title="Budget Alerts" desc="Real-time notifications when you're approaching or exceeding category limits." />
            <FeatureRow icon={<Smile className="w-5 h-5 text-blue-600" />} title="Spending Personality Test" desc="AI analyzes your habits to determine your financial archetype and psychological triggers." />
            <FeatureRow icon={<UserCircle className="w-5 h-5 text-blue-600" />} title="AI Tips Generator with Character" desc="Choose a coaching persona from 'Gentle Mentor' to 'Strict Accountant' for your advice." />
          </CategorySection>

          <CategorySection title="Budgeting & Progress" icon={<TrendingUp className="w-4 h-4" />}>
            <FeatureRow icon={<Timer className="w-5 h-5 text-blue-600" />} title="Expense Limiter" desc="Set hard caps on non-essential spending categories to force savings habits." />
            <FeatureRow icon={<TrendingUp className="w-5 h-5 text-blue-600" />} title="Savings Timeline Chart" desc="Visualize your wealth growth over time with interactive forecasting tools." />
            <FeatureRow icon={<Target className="w-5 h-5 text-blue-600" />} title="Goal Tracking" desc="Define specific financial milestones and track your percentage to completion." />
          </CategorySection>

          <CategorySection title="Transaction Management" icon={<ClipboardList className="w-4 h-4" />}>
            <FeatureRow icon={<Table className="w-5 h-5 text-blue-600" />} title="Transaction Table" desc="A powerful, sortable list with advanced search and multi-layer filtering." />
            <FeatureRow icon={<Edit3 className="w-5 h-5 text-blue-600" />} title="Bulk Editing" desc="Update categories or tags for multiple transactions at once to save time." />
            <FeatureRow icon={<PlusCircle className="w-5 h-5 text-blue-600" />} title="Manual Entry" desc="Quickly add cash transactions or offline expenses on the go." />
            <FeatureRow icon={<Scan className="w-5 h-5 text-blue-600" />} title="AI Image Scanner" desc="Snap a photo of any receipt and let AI extract data and categorize it instantly." />
          </CategorySection>

          <section className="mt-4 lg:mt-0 relative">
            <div className="flex items-center gap-2 text-blue-600 font-bold text-[10px] tracking-widest uppercase mb-4">
               <Target className="w-4 h-4" /> New Updates
            </div>
            {/* Added relative z-0 to ensure it doesn't fight with the sticky footer */}
            <div className="bg-blue-50/50 border border-blue-100 rounded-[28px] p-6 h-full relative z-0 group overflow-hidden flex flex-col justify-center">
              <div className="bg-blue-600 w-12 h-12 rounded-[16px] flex items-center justify-center mb-4 shadow-lg shadow-blue-200">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <h4 className="text-lg md:text-xl font-bold text-slate-900 mb-2">Note-taking AI</h4>
              <p className="text-[13px] md:text-sm text-slate-500 leading-relaxed mb-4">
                Jot down financial thoughts or meeting notes. Our AI automatically <span className="text-blue-600 font-semibold underline decoration-blue-200">summarizes</span> and <span className="text-blue-600 font-semibold underline decoration-blue-200">categorizes</span> them into your planning board.
              </p>
            </div>
          </section>
        </div>

        {/* --- FIXED STICKY FOOTER --- */}
        {/* Added h-32 to the container and a gradient to hide background elements */}
        <div className="fixed sm:sticky bottom-0 left-0 right-0 sm:bottom-6 z-[60] flex justify-center p-6 sm:p-0 bg-gradient-to-t from-[#fcfdfe] via-[#fcfdfe] to-transparent sm:bg-none">
          <Link href="/dashboard" className="w-full max-w-sm">
            <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-[20px] h-14 md:h-16 text-sm md:text-base font-bold shadow-2xl shadow-blue-200 transition-transform active:scale-[0.98]">
              Start Your Journey
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

function CategorySection({ title, icon, children }) {
  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-2 text-blue-600 font-bold text-[10px] tracking-widest uppercase mb-5 ml-1">
        {icon} {title}
      </div>
      <div className="space-y-3">
        {children}
      </div>
    </div>
  );
}

function FeatureRow({ icon, title, desc }) {
  return (
    <div className="flex items-start gap-4 bg-white p-4 rounded-[22px] border border-slate-100 shadow-sm transition-all duration-300 hover:border-blue-200 md:hover:shadow-md active:bg-slate-50">
      <div className="bg-blue-50 p-2.5 rounded-[16px] flex-shrink-0">
        {icon}
      </div>
      <div>
        <h4 className="font-bold text-slate-900 text-[14px] md:text-base leading-tight mb-1">{title}</h4>
        <p className="text-[12px] md:text-[13px] text-slate-500 leading-normal">{desc}</p>
      </div>
    </div>
  );
}