"use client";

import React, { useState, useMemo } from "react";
import { MoveLeft, MoreHorizontal, Plus, ListFilter, Sparkles, Repeat, Trash2, AlertCircle, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { deleteCategory } from "@/actions/note"; 

const CategoryList = ({ categoryName, notes, noteIds, theme }) => {
  const router = useRouter();
  const [activePriority, setActivePriority] = useState("All");
  const [showMenu, setShowMenu] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleTriggerAnalysis = () => {
    // Navigate to the analysis page with the category and the list of IDs
    router.push(`/note-taking/category/analysis?category=${encodeURIComponent(categoryName)}&ids=${noteIds}`);
  };

  const filteredNotes = useMemo(() => {
    if (activePriority === "All") return notes;
    return notes.filter((note) => note.priority === activePriority.toUpperCase());
  }, [notes, activePriority]);

  const handleDelete = async () => {
    setIsDeleting(true);
    const result = await deleteCategory(categoryName);
    if (result.success) {
      router.push("/note-taking");
      router.refresh();
    } else {
      setIsDeleting(false);
      setShowConfirm(false);
    }
  };

  const priorityTabs = [
    { id: "All", icon: <ListFilter className="w-3.5 h-3.5" /> },
    { id: "High" },
    { id: "Medium" },
    { id: "Low" },
  ];

  return (
    <div className="min-h-screen bg-slate-50/50 pb-24 transition-all duration-300">
      {/* Reduced Header Height */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100 px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between relative">
          <button 
            onClick={() => router.back()} 
            className="p-1.5 hover:bg-slate-100 rounded-full transition-colors active:scale-90"
          >
            <MoveLeft className="w-5 h-5 text-slate-600" />
          </button>
          
          <h1 className={`text-base md:text-lg font-extrabold tracking-tight truncate px-2 ${theme.text}`}>
            {categoryName}
          </h1>

          <div className="relative">
            <button 
              onClick={() => setShowMenu(!showMenu)}
              className={`p-1.5 rounded-full transition-all active:scale-90 ${showMenu ? 'bg-slate-100' : 'hover:bg-slate-100'}`}
            >
              <MoreHorizontal className="w-5 h-5 text-slate-600" />
            </button>

            {showMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-100 rounded-xl shadow-xl z-20 py-1.5 animate-in fade-in zoom-in duration-200 origin-top-right">
                  <button 
                    onClick={() => { setShowConfirm(true); setShowMenu(false); }}
                    className="w-full px-3 py-2 text-left text-xs font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete Category
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>
      
      <main className="max-w-3xl mx-auto px-5 pt-6">
        {/* Scaled Down Priority Filter Tabs */}
        <div className="flex gap-1.5 mb-6 overflow-x-auto pb-1 no-scrollbar scroll-smooth">
          {priorityTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActivePriority(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap border ${
                activePriority === tab.id
                  ? "bg-[#0a1128] border-[#0a1128] text-white shadow-md active:scale-95"
                  : "bg-white border-slate-100 text-slate-500 hover:border-slate-300 active:scale-95"
              }`}
            >
              {tab.icon}
              {tab.id}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Recent Entries</h3>
          <span className="px-2 py-0.5 bg-slate-100 rounded-lg text-[9px] font-bold text-slate-500">
            {filteredNotes.length} {filteredNotes.length === 1 ? 'Note' : 'Notes'}
          </span>
        </div>

        {/* Notes List */}
        <div className="grid gap-3">
          {filteredNotes.map((note) => (
            <div
              key={note.id}
              onClick={() => router.push(`/note-taking/view/${note.id}`)}
              className="group bg-white border border-slate-100 rounded-[1.5rem] p-5 hover:shadow-lg transition-all cursor-pointer relative overflow-hidden active:scale-[0.98]"
            >
              <div className={`absolute left-0 top-0 bottom-0 w-1 ${theme?.accent || 'bg-blue-500'} opacity-0 group-hover:opacity-100 transition-opacity`} />
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-1.5 max-w-[70%]">
                  <h4 className="text-base font-bold text-slate-900 truncate">{note.title}</h4>
                  <Sparkles className="w-3.5 h-3.5 text-blue-500 fill-blue-500 flex-shrink-0" />
                </div>
                <span className="text-[9px] font-bold text-slate-400 uppercase">{formatDistanceToNow(new Date(note.updatedAt))}</span>
              </div>
              <p className="text-slate-500 text-xs leading-relaxed line-clamp-2 mb-4">
                {note.content?.replace(/<[^>]*>/g, '') || "No content..."}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {note.priority && (
                  <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider border ${
                    note.priority === 'HIGH' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                    note.priority === 'MEDIUM' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                    'bg-emerald-50 text-emerald-600 border-emerald-100'
                  }`}>
                    {note.priority}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Scaled Down Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => !isDeleting && setShowConfirm(false)} />
          <div className="relative bg-white w-full max-w-sm rounded-[2rem] p-6 md:p-8 shadow-2xl animate-in slide-in-from-bottom duration-400 origin-bottom">
            <div className="w-12 h-12 bg-rose-100 rounded-xl flex items-center justify-center mb-4 ring-4 ring-rose-50">
              <AlertCircle className="w-6 h-6 text-rose-600" />
            </div>
            <h2 className="text-xl font-black text-slate-900 mb-2">Delete category?</h2>
            <p className="text-slate-500 text-xs leading-relaxed mb-6">
              This will erase <span className="text-slate-900 font-bold italic">"{categoryName}"</span> and all {notes.length} notes permanently.
            </p>
            <div className="flex flex-col gap-2">
              <button 
                disabled={isDeleting}
                onClick={handleDelete}
                className="w-full py-3 bg-rose-600 text-white rounded-xl text-sm font-bold shadow-md hover:bg-rose-700 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete everything"}
              </button>
              <button 
                disabled={isDeleting}
                onClick={() => setShowConfirm(false)}
                className="w-full py-3 bg-slate-50 text-slate-500 rounded-xl text-sm font-bold hover:bg-slate-100 active:scale-95 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reduced Height Floating Action Bar */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-md px-6 flex gap-2.5 z-40">
        <button 
          onClick={() => router.push("/note-taking/create")}
          className="flex-1 h-12 bg-[#0a1128] text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-lg hover:bg-slate-800 active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4" /> New Note
        </button>
        <button 
          onClick={handleTriggerAnalysis}
          className="w-12 h-12 bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-lg hover:bg-blue-700 transition-all"
        >
          <Sparkles className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default CategoryList;