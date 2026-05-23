"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { Search, SlidersHorizontal, Plus, Sparkles, MoveLeft, X, Zap } from "lucide-react";
import EmptyNotes from "@/components/empty-notes";
import { useRouter } from "next/navigation";
import { getNotes } from "@/actions/note";
import LibraryList from "./_components/library_list";
import {
  isWithinInterval,
  startOfDay,
  endOfDay,
  startOfWeek,
  startOfMonth
} from "date-fns";

const NoteLibrary = () => {
  const [notes, setNotes] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const searchInputRef = useRef(null);

  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [dateRange, setDateRange] = useState({ from: null, to: null });

  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const result = await getNotes();
      if (result.success) setNotes(result.data);
      setIsLoading(false);
    };
    fetchData();
  }, []);

  const categories = useMemo(() => {
    const cats = notes.map((n) => n.category).filter(Boolean);
    return ["All", ...new Set(cats)];
  }, [notes]);

  const applyQuickFilter = (type) => {
    const now = new Date();
    switch (type) {
      case "today":
        setDateRange({ from: startOfDay(now), to: endOfDay(now) });
        break;
      case "week":
        setDateRange({ from: startOfWeek(now), to: endOfDay(now) });
        break;
      case "month":
        setDateRange({ from: startOfMonth(now), to: endOfDay(now) });
        break;
      default:
        break;
    }
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    searchInputRef.current?.focus();
  };

  const filteredNotes = useMemo(() => {
    return notes.filter((note) => {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        note.title?.toLowerCase().includes(query) ||
        note.category?.toLowerCase().includes(query) ||
        note.todoItems?.some((t) => t.description.toLowerCase().includes(query));

      const matchesCategory =
        selectedCategory === "All" || note.category === selectedCategory;

      let matchesDate = true;
      if (dateRange.from && dateRange.to) {
        const noteDate = new Date(note.updatedAt);
        matchesDate = isWithinInterval(noteDate, {
          start: startOfDay(dateRange.from),
          end: endOfDay(dateRange.to),
        });
      }

      return matchesSearch && matchesCategory && matchesDate;
    });
  }, [searchQuery, notes, selectedCategory, dateRange]);

  const resetFilters = () => {
    setSelectedCategory("All");
    setDateRange({ from: null, to: null });
  };

  const hasActiveFilters = selectedCategory !== "All" || dateRange.from;

  return (
    <div className="min-h-screen bg-white pb-24 lg:pb-12">

      {/* Header */}
      <header className="px-4 sm:px-6 py-6 sm:py-8 max-w-7xl mx-auto flex items-center justify-between">
        <h1 className="text-2xl sm:text-3xl font-bold text-[#0a1128] tracking-tight">
          Note Library
        </h1>
        <button onClick={() => router.push("/dashboard")}>
          <MoveLeft className="w-8 h-8 sm:w-10 sm:h-10 text-slate-600 hover:text-blue-600 transition-colors" />
        </button>
      </header>

      {/* Search + Filter */}
      <div className="px-4 sm:px-6 max-w-7xl mx-auto mb-6 sm:mb-8 relative">
        <div className="flex gap-2 sm:gap-3">

          {/* Search input */}
          <div className="relative flex-1 group">
            <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search title, category, or task..."
              className="w-full pl-10 sm:pl-12 pr-10 sm:pr-12 py-3 sm:py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/20 transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                onClick={handleClearSearch}
                className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-200 rounded-full transition-colors text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Filter toggle button */}
          <button
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className={`w-11 h-11 sm:w-12 sm:h-12 flex-shrink-0 flex items-center justify-center rounded-2xl border transition-all ${
              isFilterOpen || hasActiveFilters
                ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200"
                : "bg-slate-50 border-slate-100 text-slate-600 hover:bg-slate-100"
            }`}
          >
            <SlidersHorizontal className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Active filter chips — shown below search on mobile */}
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-2 mt-3">
            {selectedCategory !== "All" && (
              <span className="flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-700 border border-blue-100 rounded-full text-xs font-semibold">
                {selectedCategory}
                <button onClick={() => setSelectedCategory("All")}>
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {dateRange.from && (
              <span className="flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-700 border border-blue-100 rounded-full text-xs font-semibold">
                Date filtered
                <button onClick={() => setDateRange({ from: null, to: null })}>
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
          </div>
        )}

        {/* Filter Card */}
        {isFilterOpen && (
          <>
            {/* Backdrop — closes filter on outside tap (mobile) */}
            <div
              className="fixed inset-0 z-[55] sm:hidden"
              onClick={() => setIsFilterOpen(false)}
            />

            <div className="absolute left-0 right-0 sm:left-auto sm:right-0 top-[56px] sm:top-16 mx-auto sm:mx-0 w-[calc(100%-0rem)] sm:w-80 bg-white border border-slate-200 shadow-2xl rounded-3xl z-[60] p-5 sm:p-6 animate-in fade-in zoom-in duration-200">

              <div className="flex items-center justify-between mb-5">
                <h3 className="font-bold text-slate-900">Filters</h3>
                <button
                  onClick={() => setIsFilterOpen(false)}
                  className="text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Quick Filters */}
              <div className="mb-5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                  <Zap className="w-3 h-3 text-amber-500 fill-amber-500" /> Quick Select
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {["today", "week", "month"].map((period) => (
                    <button
                      key={period}
                      onClick={() => applyQuickFilter(period)}
                      className="py-2 rounded-xl text-[10px] font-bold border border-slate-100 bg-slate-50 text-slate-600 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600 transition-all capitalize"
                    >
                      {period}
                    </button>
                  ))}
                </div>
              </div>

              {/* Category */}
              <div className="mb-5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 block">
                  Category
                </label>
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto pr-1">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all ${
                        selectedCategory === cat
                          ? "bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-100"
                          : "bg-white border-slate-100 text-slate-500 hover:border-slate-300"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Date Range */}
              <div className="mb-6">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 block">
                  Custom Range
                </label>
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  <input
                    type="date"
                    className="w-full p-2 sm:p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs focus:outline-none focus:border-blue-500 font-medium text-slate-600"
                    value={dateRange.from ? dateRange.from.toISOString().split("T")[0] : ""}
                    onChange={(e) =>
                      setDateRange((prev) => ({
                        ...prev,
                        from: e.target.value ? new Date(e.target.value) : null,
                      }))
                    }
                  />
                  <input
                    type="date"
                    className="w-full p-2 sm:p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs focus:outline-none focus:border-blue-500 font-medium text-slate-600"
                    value={dateRange.to ? dateRange.to.toISOString().split("T")[0] : ""}
                    onChange={(e) =>
                      setDateRange((prev) => ({
                        ...prev,
                        to: e.target.value ? new Date(e.target.value) : null,
                      }))
                    }
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-3 border-t border-slate-100">
                <button
                  onClick={resetFilters}
                  className="flex-1 py-3 text-xs font-bold text-slate-400 hover:text-rose-500 transition-colors"
                >
                  Reset
                </button>
                <button
                  onClick={() => setIsFilterOpen(false)}
                  className="flex-[2] py-3 bg-blue-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-100 hover:bg-blue-700 active:scale-[0.98] transition-all"
                >
                  Show {filteredNotes.length} Results
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : filteredNotes.length === 0 ? (
          <EmptyNotes />
        ) : (
          <LibraryList notes={filteredNotes} />
        )}
      </main>

      {/* FAB */}
      <button
        onClick={() => router.push("/note-taking/create")}
        className="fixed bottom-6 right-6 sm:bottom-8 sm:right-8 w-14 h-14 sm:w-16 sm:h-16 bg-blue-600 rounded-full shadow-xl flex items-center justify-center text-white hover:bg-blue-700 active:scale-90 transition-all z-50 group"
      >
        <div className="relative">
          <Plus className="w-7 h-7 sm:w-8 sm:h-8 group-hover:rotate-90 transition-transform duration-300" />
          <Sparkles className="absolute -top-1 -right-1 w-3 h-3 fill-white" />
        </div>
      </button>
    </div>
  );
};

export default NoteLibrary;