"use client";

import React, { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { 
  ArrowLeft, Trash2, Check, RefreshCw, 
  Bold, Italic, ListTodo, Sparkles, Loader2, Undo2
} from "lucide-react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Placeholder from "@tiptap/extension-placeholder";
// Fixed: Imported 'motion' alongside AnimatePresence
import { AnimatePresence, motion } from "framer-motion";
import { upsertNote, enhanceNoteContent, deleteNote } from "@/actions/note";
import CategorySelector from "./category_selector";
import NoteScanner from "./note_scanner";

const CreateNotePage = ({ existingNote, initialReadOnly = false }) => {
  const router = useRouter();
  const [title, setTitle] = useState(existingNote?.title || "");
  const [priority, setPriority] = useState(
  existingNote?.priority 
    ? existingNote.priority.charAt(0) + existingNote.priority.slice(1).toLowerCase() 
    : "Medium"
);
  const [isRecurring, setIsRecurring] = useState(existingNote?.isRecurring || false);
  const [currentTime, setCurrentTime] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [previousContent, setPreviousContent] = useState("");
  const [aiContent, setAiContent] = useState(null); // Stores the AI result
  const [isShowingAI, setIsShowingAI] = useState(false); // Toggle state
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  const [category, setCategory] = useState(existingNote?.category || "General");
  const [isDirty, setIsDirty] = useState(false);
  const [isReadOnly, setIsReadOnly] = useState(initialReadOnly);
  const pathname = usePathname();
  const [recurringInterval, setRecurringInterval] = useState(existingNote?.recurringInterval || "DAILY");
  const [isSelectingInterval, setIsSelectingInterval] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);



  const handleScanComplete = (scannedData) => {
    console.log("AI Scanned Data:", scannedData);
  if (scannedData.title) setTitle(scannedData.title);
  if (scannedData.suggestedCategory) {
    // Ensure we take the AI suggestion and normalize it
    const newCat = scannedData.suggestedCategory.trim();
    setCategory(newCat);
  }
  // Format the scanned content and todos into HTML for the editor
  let todoHtml = '';
  if (scannedData.todoItems?.length > 0) {
    todoHtml = '<ul data-type="taskList">' + 
      scannedData.todoItems.map(item => 
        `<li data-type="taskItem" data-checked="false">
          <label><input type="checkbox"><span></span></label>
          <div><p>${item}</p></div>
        </li>`
      ).join('') + '</ul>';
  }

  const finalHtml = `${scannedData.content || ""}${todoHtml}`;
  if (editor) {
    editor.commands.setContent(finalHtml);
    // Explicitly set dirty to ensure the Save button appears
    setIsDirty(true); 
  }
};

  const handleDelete = async () => {
  if (!existingNote?.id) return;
  setIsDeleting(true);
  
  const result = await deleteNote(existingNote.id);
  
  if (result.success) {
    router.push("/note-taking");
  } else {
    alert(result.error || "Failed to delete note");
    setIsDeleting(false);
    setShowDeleteConfirm(false);
  }
};
  const handleBack = () => {
    if (pathname.includes("/view/")) {
      router.push("/note-taking");
    } else if (pathname.includes("/create/") && existingNote) {
      router.push(`/note-taking/view/${existingNote.id}`);
    } else {
      router.push("/note-taking");
    }
  };


useEffect(() => {
  const updateTime = () => {
    // 1. Determine which date to use
    // We prioritize existingNote.updatedAt if it exists (View/Edit mode)
    const dateSource = existingNote?.updatedAt 
      ? new Date(existingNote.updatedAt) 
      : new Date();

    const options = { 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    };

    const formattedDate = dateSource.toLocaleDateString('en-US', options).toUpperCase();
    
    // 2. Determine the Label
    // If it's an existing note, show "LAST UPDATED", otherwise show "TODAY"
    const prefix = existingNote ? "LAST UPDATED" : "TODAY";
    
    setCurrentTime(`${prefix}, ${formattedDate}`);
  };

  updateTime();

  // 3. Only set the interval if we are creating a NEW note
  // Existing notes don't need a ticking clock for a past updatedAt value
  if (!existingNote) {
    const timer = setInterval(updateTime, 60000);
    return () => clearInterval(timer);
  }
}, [existingNote]);


  const getParsedData = () => {
    const json = editor.getJSON();
    const todoItems = [];
    const paragraphNodes = [];

    json.content?.forEach((node) => {
      if (node.type === "taskList") {
        node.content?.forEach((item) => {
          // Extract text from the taskItem
          const text = item.content?.[0]?.content?.[0]?.text || "";
          if (text) todoItems.push({ description: text, isAccomplished: !!item.attrs?.checked });
        });
      } else {
        // Keep non-task items as paragraph content
        paragraphNodes.push(node);
      }
    });

    return {
      content: editor.getHTML(), // We keep HTML for the main view
      todoItems,
    };
  };

  const editor = useEditor({
    extensions: [
      StarterKit,
      TaskList.configure({ HTMLAttributes: { class: 'not-prose pl-0' } }),
      TaskItem.configure({ nested: true }),
      Placeholder.configure({ placeholder: "Start typing..." }),
    ],
    editable: !isReadOnly,
    content: existingNote?.content || "",
    immediatelyRender: false, 
    onFocus: () => setIsFocused(true),
    onBlur: () => setIsFocused(false),
    onUpdate: ({ editor, transaction }) => {
    // Only set dirty if the change comes from a user interaction
      if (transaction.docChanged) {
        setIsDirty(true);
      }
    },
    editorProps: {
      attributes: {
        class: "prose prose-sm focus:outline-none max-w-full min-h-[250px] pb-48 text-slate-800 text-base md:text-sm",
      },
    },
  });

  useEffect(() => {
    if (editor) {
      editor.setEditable(!isReadOnly);
    }
  }, [isReadOnly, editor]);

const handleEnhanceContent = async () => {
  if (!editor || isEnhancing) return;

  if (aiContent) {
    editor.commands.setContent(aiContent);
    setIsShowingAI(true);
    return;
  }

  const { content, todoItems } = getParsedData();
  setPreviousContent(editor.getHTML());
  setIsEnhancing(true);

  const result = await enhanceNoteContent({ title, content, todoItems });

  if (result.success) {
    if (result.data.suggestedCategory) {
      setCategory(result.data.suggestedCategory);
    }
    // 1. Ensure the enhanced content doesn't contain raw markdown headers 
    // that Tiptap might render as plain text.
    let enhancedBody = result.data.enhancedContent;

    // 2. Format the Task List specifically for Tiptap's schema
    let todoHtml = '';
    if (result.data.enhancedTodoItems?.length > 0) {
      todoHtml = '<ul data-type="taskList">' + 
        result.data.enhancedTodoItems.map(item => 
          `<li data-type="taskItem" data-checked="false">
            <label><input type="checkbox"><span></span></label>
            <div><p>${item}</p></div>
          </li>`
        ).join('') + '</ul>';
    }

    const finalAiHtml = `${enhancedBody}${todoHtml}`;

    // 3. Store and set content (Clear first to avoid state ghosting)
    setAiContent(finalAiHtml);
    editor.commands.clearContent(); // Clear existing content
    editor.commands.setContent(finalAiHtml);
    
    setIsShowingAI(true);
    setShowNotification(true);
  }
  setIsEnhancing(false);
};

  const toggleVersion = () => {
    if (!editor) return;
    if (isShowingAI) {
      editor.commands.setContent(previousContent);
      setIsShowingAI(false);
    } else {
      editor.commands.setContent(aiContent);
      setIsShowingAI(true);
    }
  };

  const handleSave = async () => {
  if (!title) return alert("Please add a title");
  setIsSaving(true);
  
  const { content, todoItems } = getParsedData();

  try {
    const result = await upsertNote({
      id: existingNote?.id,
      title,
      content,
      priority: priority.toUpperCase(),
      isRecurring,
      recurringInterval: recurringInterval.toUpperCase(),
      todoItems, 
      category,
    });

    if (result.success === false) { // Fixed your double negative logic here
      alert(result.error);
      setIsSaving(false);
    } else {
      setShowSaveSuccess(true);
      setTimeout(() => setIsDirty(false), 0);// <--- Hide the button after save
      setIsSaving(false);
    }
  } catch (error) {
    console.error(error);
    setIsSaving(false);
  }
};

  const handleUndo = () => {
    if (editor && previousContent) {
      editor.commands.setContent(previousContent);
      setShowNotification(false);
    }
  };

  return (
    <div className="min-h-screen bg-white relative overflow-x-hidden">
      <AnimatePresence>
        {aiContent && (
          <motion.div 
            initial={{ y: 20, opacity: 0 }} // Animate from bottom up
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            // Positioned above the bottom action bar (bottom-36 to bottom-44 range)
            className="fixed bottom-40 left-1/2 -translate-x-1/2 z-[60] w-max px-4"
          >
            <div className="bg-white/90 backdrop-blur-md border border-slate-200 shadow-2xl rounded-2xl p-1 flex items-center gap-1">
              <button 
                onClick={toggleVersion}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black transition-all ${
                  !isShowingAI ? "bg-[#0a1128] text-white shadow-sm" : "text-slate-500 hover:bg-slate-50"
                }`}
              >
                ORIGINAL
              </button>
              
              <button 
                onClick={toggleVersion}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black transition-all ${
                  isShowingAI ? "bg-blue-600 text-white shadow-sm" : "text-slate-500 hover:bg-slate-50"
                }`}
              >
                <Sparkles className={`w-3 h-3 ${isShowingAI ? "fill-white" : "fill-slate-400"}`} />
                AI VERSION
              </button>
              
              <div className="w-[1px] h-4 bg-slate-200 mx-1" />
              
              <button 
                onClick={() => { setAiContent(null); setPreviousContent(""); }}
                className="p-2 hover:bg-rose-50 text-rose-400 rounded-xl transition-colors"
                title="Discard AI suggestion"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <nav className="flex items-center justify-between px-4 py-3 border-b border-slate-50">
        <button 
          onClick={handleBack} 
          className="p-2 hover:bg-slate-100 rounded-full transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>
       
        <div className="flex gap-1.5 items-center">
            {existingNote && isReadOnly && (
                <button 
                  onClick={() => router.push(`/note-taking/create/${existingNote.id}`)} 
                  className="p-2 bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100 transition-all"
                >
                  <span className="text-xs font-bold px-2">EDIT</span>
                </button>
              )}
            
           {!isFocused && existingNote && (
              <button 
                onClick={() => setShowDeleteConfirm(true)}
                className="p-2 text-red-500 rounded-full hover:bg-red-50 transition-all"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}

            {/* --- 2. At the bottom of your JSX (before the closing </div> of the main container) --- */}
            <AnimatePresence>
              {showDeleteConfirm && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                  {/* Backdrop */}
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => !isDeleting && setShowDeleteConfirm(false)}
                    className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                  />
                  
                  {/* Modal Content */}
                  <motion.div 
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    className="relative bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl space-y-6"
                  >
                    <div className="space-y-2 text-center">
                      <div className="w-12 h-12 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Trash2 className="w-6 h-6" />
                      </div>
                      <h3 className="text-xl font-bold text-slate-900">Delete Note?</h3>
                      <p className="text-sm text-slate-500">
                        This action cannot be undone. All your content and task progress will be lost.
                      </p>
                    </div>

                    <div className="flex flex-col gap-2">
                      <button
                        disabled={isDeleting}
                        onClick={handleDelete}
                        className="w-full bg-red-500 hover:bg-red-600 text-white py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                      >
                        {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : "YES, DELETE NOTE"}
                      </button>
                      <button
                        disabled={isDeleting}
                        onClick={() => setShowDeleteConfirm(false)}
                        className="w-full bg-slate-50 hover:bg-slate-100 text-slate-600 py-3 rounded-2xl font-bold text-sm transition-colors"
                      >
                        CANCEL
                      </button>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {isDirty && (
                <motion.button 
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  onClick={handleSave}
                  disabled={isSaving} 
                  className="p-2 bg-[#0a1128] text-white rounded-full shadow-md active:scale-95 transition-transform"
                >
                  {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                </motion.button>
              )}
            </AnimatePresence>
          </div>
      </nav>

      <main className="max-w-2xl mx-auto px-5 py-6 space-y-6">
        <div className="space-y-1">
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{currentTime}</p>
          <input 
            type="text" 
            placeholder="Note Title" 
            value={title}
            readOnly={isReadOnly}
            onChange={(e) => {
             setTitle(e.target.value);
             setIsDirty(true); 
             }}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            className={`"w-full text-base md:text-4xl font-bold text-slate-900 border-none p-0 focus:ring-0 placeholder:text-slate-200 outline-none bg-transparent ${isReadOnly ? "pointer-events-none" : ""}`}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
         <div className="flex bg-slate-50 p-1 rounded-lg border border-slate-100">
            {["High", "Medium", "Low"].map((level) => (
              <button
                key={level}
                type="button" // Prevents accidental form submissions
                onClick={() => { 
                  if (!isReadOnly && priority !== level) {
                    setPriority(level); 
                    setIsDirty(true); 
                  }
                }}
                className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${
                  isReadOnly ? "cursor-default" : "cursor-pointer"
                } ${
                  priority === level 
                    ? "bg-white text-blue-600 shadow-sm border border-slate-100" 
                    : "text-slate-400 hover:text-slate-600"
                }`}
              >
                {level}
              </button>
            ))}
            
            </div>

            {/* Category */}
              {!isReadOnly ? (
                <CategorySelector 
                  value={category} 
                  onChange={(val) => {
                    setCategory(val);
                    setIsDirty(true);
                  }} 
                />
              ) : (
                category && category !== "General" && (
                  <motion.div 
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100 shadow-sm"
                  >
                    <Sparkles className="w-3 h-3 fill-blue-400" />
                    {category.toUpperCase()}
                  </motion.div>
                )
              )}

       {/* Recurring Selection Section */}
          {isReadOnly ? (
            isRecurring && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold bg-[#0a1128] text-white border border-[#0a1128] shadow-sm">
                {/* Added animate-spin here */}
                <RefreshCw className="w-3 h-3 animate-spin" style={{ animationDuration: '3s' }} />
                <span>RECURRING: {recurringInterval.toUpperCase()}</span>
              </div>
            )
          ) : (
            <div className="flex flex-col gap-2 w-full">
              <div className="flex flex-wrap items-center gap-2">
                <button 
                  type="button"
                  onClick={() => { 
                    setIsRecurring(!isRecurring); 
                    setIsDirty(true); 
                    if(!isRecurring) setIsSelectingInterval(true);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border shrink-0 ${
                    isRecurring 
                      ? "bg-[#0a1128] text-white border-[#0a1128]" 
                      : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {/* Conditional spin: only spins when isRecurring is true */}
                  <RefreshCw 
                    className={`w-3 h-3 ${isRecurring ? "animate-spin" : ""}`} 
                    style={isRecurring ? { animationDuration: '3s' } : {}}
                  />
                  {isRecurring ? "RECURRING" : "RECURRING OFF"}
                </button>

                {/* Segmented Selection with Wrap Fix */}
                <AnimatePresence mode="wait">
                  {isRecurring && (
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      // Added flex-wrap and max-w-full to prevent overflow
                      className="flex flex-wrap bg-slate-100/50 p-1 rounded-lg border border-slate-200 items-center gap-1 max-w-full"
                    >
                      {["Daily", "Weekly", "Monthly", "Yearly"].map((interval) => {
                        const isActive = recurringInterval.toLowerCase() === interval.toLowerCase();
                        // If we aren't "selecting", we only show the active one to save space
                        const shouldShow = isSelectingInterval || isActive;

                        if (!shouldShow) return null;

                        return (
                          <motion.button
                            layout
                            key={interval}
                            type="button"
                            onClick={() => {
                              setRecurringInterval(interval.toUpperCase());
                              setIsDirty(true);
                              setIsSelectingInterval(false); // Close selection after picking
                            }}
                            // Reduced px-2 to px-1.5 and text size for tighter fit
                            className={`px-1.5 py-1 rounded-md text-[9px] font-black transition-all whitespace-nowrap ${
                              isActive 
                                ? "bg-white text-blue-600 shadow-sm border border-slate-200/50" 
                                : "text-slate-400 hover:text-slate-600"
                            }`}
                          >
                            {interval.toUpperCase()}
                          </motion.button>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          )}
          
          
        </div>

        <div className="relative min-h-[300px]">
          <EditorContent editor={editor} />
        </div>

       {!isReadOnly && (   
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-full px-6 max-w-md space-y-3 z-50">
          <div className="flex items-end justify-between">
            <div className="bg-white/90 backdrop-blur-md border border-slate-200 rounded-xl p-1 flex items-center gap-1 shadow-lg">
              <button onClick={() => editor?.chain().focus().toggleTaskList().run()} className={`p-2 rounded-lg ${editor?.isActive('taskList') ? 'bg-blue-50 text-blue-600' : 'text-slate-400'}`}><ListTodo className="w-4 h-4" /></button>
              <button onClick={() => editor?.chain().focus().toggleBold().run()} className={`p-2 rounded-lg ${editor?.isActive('bold') ? 'bg-blue-50 text-blue-600' : 'text-slate-400'}`}><Bold className="w-4 h-4" /></button>
              <button onClick={() => editor?.chain().focus().toggleItalic().run()} className={`p-2 rounded-lg ${editor?.isActive('italic') ? 'bg-blue-50 text-blue-600' : 'text-slate-400'}`}><Italic className="w-4 h-4" /></button>

              <div className="w-[1px] h-4 bg-slate-200 mx-1" />
              <NoteScanner onScanComplete={handleScanComplete} />

            </div>

            {isEnhancing && (
              <div className="flex items-center gap-2 mb-2 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100 animate-pulse">
                <span className="text-[9px] font-black text-blue-600 tracking-tighter uppercase">AI ANALYZING</span>
              </div>
            )}
          </div>

          <button 
            disabled={isEnhancing}
            onClick={handleEnhanceContent}
            className="w-full bg-blue-600 active:bg-blue-700 disabled:bg-blue-300 text-white h-12 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-100 transition-all active:scale-[0.98]"
          >
            {isEnhancing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 fill-white" />}
            {isEnhancing ? "PROCESSING..." : "ENHANCE CONTENT"}
          </button>
        </div>
        )}
      </main>
    </div>
  );
};

export default CreateNotePage;