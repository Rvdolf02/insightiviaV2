"use client";

import React, { useMemo } from "react";
import { Clock, Pin, CheckCircle2, ChevronRight, Repeat } from "lucide-react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";

const LibraryList = ({ notes }) => {
  const router = useRouter();

  const themes = [
    { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-100", accent: "bg-amber-500" },
    { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-100", accent: "bg-emerald-500" },
    { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-100", accent: "bg-rose-500" },
    { bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-100", accent: "bg-indigo-500" },
    { bg: "bg-cyan-50", text: "text-cyan-700", border: "border-cyan-100", accent: "bg-cyan-500" },
    { bg: "bg-violet-50", text: "text-violet-700", border: "border-violet-100", accent: "bg-violet-500" },
  ];

const categoryHighlights = useMemo(() => {
    const groups = notes.reduce((acc, note) => {
      const cat = note.category || "General";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(note);
      return acc;
    }, {});

    return Object.entries(groups).map(([name, categoryNotes], index) => {
      const highPriority = categoryNotes.find((n) => n.priority === "HIGH");
      const mostRecent = [...categoryNotes].sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      )[0];

      // GATHER ALL IDS IN THIS CATEGORY
      const allIds = categoryNotes.map(n => n.id).join(",");

      return {
        name,
        count: categoryNotes.length,
        displayNote: highPriority || mostRecent,
        allIds, // Add this to the returned object
        theme: themes[index % themes.length],
      };
    });
  }, [notes]);

  return (
    <div className="px-4 md:px-6 max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 pb-20">
      {categoryHighlights.map(({ name, count, displayNote, allIds,theme }) => (
        <section key={name} className="flex flex-col group">
          {/* Header */}
          <div className="flex items-center justify-between mb-3 md:mb-4 px-1 md:px-2">
            <div className="flex items-center gap-2 md:gap-3">
              <div className={`w-1.5 md:w-2 h-5 md:h-6 rounded-full ${theme.accent}`} />
              <h2 className="text-lg md:text-xl font-extrabold text-slate-900 tracking-tight truncate max-w-[150px] md:max-w-none">
                {name}
              </h2>
              <span className={`px-2 py-0.5 rounded-full text-[9px] md:text-[10px] font-bold border ${theme.bg} ${theme.text} ${theme.border}`}>
                {count} {count === 1 ? 'Note' : 'Notes'}
              </span>
            </div>
          <button
              onClick={() => router.push(`/note-taking/category/${displayNote.id}?ids=${allIds}`)}
              className="group/btn flex items-center gap-1 text-slate-400 hover:text-blue-600 text-[10px] md:text-xs font-bold transition-colors"
            >
              See all <ChevronRight className="w-3 h-3 group-hover/btn:translate-x-0.5 transition-transform" />
            </button>
          </div>

          {/* Card */}
          <div
            onClick={() => router.push(`/note-taking/view/${displayNote.id}`)}
            className={`relative h-full bg-white border ${theme.border} rounded-[1.5rem] md:rounded-[2.5rem] p-5 md:p-8 shadow-sm hover:shadow-xl md:hover:-translate-y-1 transition-all duration-300 cursor-pointer overflow-hidden`}
          >
            {/* Absolute Badges */}
            <div className="absolute top-4 right-5 flex flex-col items-end gap-1.5 z-10">
              {displayNote.priority === "HIGH" && (
                <span className="flex items-center gap-1 px-2 py-0.5 bg-rose-100 text-rose-600 text-[8px] md:text-[9px] font-black rounded border border-rose-200 uppercase shadow-sm">
                  <Pin className="w-2.5 h-2.5" /> High
                </span>
              )}
              {displayNote.isRecurring && (
                <span className="flex items-center gap-1 px-2 py-0.5 bg-indigo-100 text-indigo-600 text-[8px] md:text-[9px] font-black rounded border border-indigo-200 uppercase shadow-sm">
                  <Repeat className="w-2.5 h-2.5" /> Recurring
                </span>
              )}
            </div>

            {/* Decorative Background Element */}
            <div className={`absolute -right-4 -top-4 w-16 md:w-24 h-16 md:h-24 rounded-full opacity-10 blur-xl md:blur-2xl ${theme.accent}`} />

            <div className="flex flex-col justify-between items-start gap-3 mb-4 md:mb-6 pr-16">
              <div className="space-y-1 w-full">
                <h3 className="text-xl md:text-2xl font-bold text-slate-900 leading-tight group-hover:text-blue-600 transition-colors line-clamp-2">
                  {displayNote.title}
                </h3>
                <div className="flex items-center gap-2 text-slate-400 text-[9px] md:text-[11px] font-bold uppercase tracking-widest">
                  <Clock className="w-2.5 h-2.5 md:w-3 md:h-3" />
                  {formatDistanceToNow(new Date(displayNote.updatedAt))} ago
                </div>
              </div>
            </div>

            {/* Preview Content */}
            <div className="mb-6 md:mb-8 min-h-[60px] md:min-h-[80px]">
              {displayNote.todoItems?.length > 0 ? (
                <div className="space-y-2 md:space-y-3">
                  {displayNote.todoItems.slice(0, 2).map((todo, idx) => (
                    <div key={idx} className="flex items-center gap-2 md:gap-3">
                      <div className={`w-4 h-4 md:w-5 md:h-5 rounded-md md:rounded-lg flex items-center justify-center border-2 flex-shrink-0 ${
                        todo.isAccomplished ? 'bg-emerald-500 border-emerald-500' : 'border-slate-200'
                      }`}>
                        {todo.isAccomplished && <CheckCircle2 className="w-3 h-3 md:w-3.5 md:h-3.5 text-white" />}
                      </div>
                      <span className={`text-xs md:text-sm font-medium line-clamp-1 ${todo.isAccomplished ? 'text-slate-400 line-through' : 'text-slate-600'}`}>
                        {todo.description}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500 text-xs md:text-sm leading-relaxed line-clamp-3">
                  {displayNote.content?.replace(/<[^>]*>/g, '') || "No additional details..."}
                </p>
              )}
            </div>

            {/* Footer - Tags only, disappears if empty */}
            {displayNote.tags?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 md:gap-2 pt-4 border-t border-slate-50">
                {displayNote.tags.slice(0, 3).map(tag => (
                  <span key={tag} className="px-3 py-1 bg-slate-50 text-slate-600 text-[9px] md:text-[11px] font-bold rounded-full border border-slate-100">
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </section>
      ))}
    </div>
  );
};

export default LibraryList;