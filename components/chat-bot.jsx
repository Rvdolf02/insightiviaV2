"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  MessageCircle, X, Send, Paperclip, 
  Bot, LayoutGrid, Settings, Wallet, Loader2 
} from "lucide-react";
import { chatBot } from "@/actions/chat-bot";

const ChatBot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([
    { role: "ai", content: "Hi! I am InsightivAI. I am here to help you navigate Insightivia. How can I assist you today?" }
  ]);
  
  const scrollRef = useRef(null);

  // Persistence: Load chat from session storage on mount
  useEffect(() => {
    const saved = sessionStorage.getItem("insightivia_support_chat");
    if (saved) setMessages(JSON.parse(saved));
  }, []);

  // Persistence & Auto-scroll: Save chat and scroll down on change
  useEffect(() => {
    sessionStorage.setItem("insightivia_support_chat", JSON.stringify(messages));
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e, customMsg = null) => {
    if (e) e.preventDefault();
    const text = customMsg || input;
    if (!text.trim() || loading) return;

    // 1. Create the new message object
    const userMsg = { role: "user", content: text };
    
    // 2. Update UI immediately
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      // 3. Prepare a clean array for the server (avoiding state reference issues)
      const historyForAI = [...messages]; 
      
      const data = await chatBot(text, historyForAI);
      
      if (data && data.response) {
        setMessages((prev) => [...prev, { role: "ai", content: data.response }]);
      }
    } catch (err) {
      console.error("Full Client Error:", err); // CHECK YOUR BROWSER CONSOLE FOR THIS
      setMessages((prev) => [...prev, { role: "ai", content: "System error. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <>
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 w-14 h-14 bg-blue-700 rounded-full shadow-2xl flex items-center justify-center text-white hover:bg-blue-800 transition-all z-[100] animate-bounce-subtle"
        >
          <MessageCircle className="w-7 h-7 fill-white" />
        </button>
      )}

      {isOpen && (
        <div className="fixed bottom-0 right-0 w-full sm:w-[400px] sm:bottom-6 sm:right-6 h-[100dvh] sm:h-[600px] bg-slate-50 flex flex-col shadow-2xl z-[100] sm:rounded-[32px] overflow-hidden border border-slate-200 animate-in slide-in-from-bottom-5 duration-300">
          
          {/* Header */}
          <div className="bg-[#0a1128] p-5 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center border border-white/10">
                <Bot className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-white font-bold text-sm leading-none">InsightivAI Support</h3>
                <div className="flex items-center gap-1.5 mt-1">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Always Online</span>
                </div>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-white/70 hover:text-white transition-colors">
              <X size={20} />
            </button>
          </div>

          {/* Chat Content */}
          <div className="flex-1 overflow-y-auto p-5 space-y-6">
            {messages.map((m, i) => (
              <div key={i} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`p-4 rounded-[22px] text-sm leading-relaxed shadow-sm max-w-[85%] animate-in fade-in slide-in-from-bottom-1 ${
                  m.role === 'ai' ? 'bg-white border border-slate-200 text-slate-700 rounded-tl-none' : 'bg-blue-600 text-white rounded-tr-none'
                }`}>
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex items-center gap-2 text-slate-400">
                <Loader2 size={14} className="animate-spin" />
                <span className="text-[10px] font-bold uppercase tracking-widest">Thinking...</span>
              </div>
            )}
            <div ref={scrollRef} />
          </div>

          {/* Footer & Suggestions */}
          <div className="p-4 bg-white border-t border-slate-100 shrink-0">
            {!loading && messages.length < 4 && (
              <div className="flex flex-wrap gap-2 mb-4">
                <SuggestionChip onClick={() => handleSend(null, "How do I scan a receipt?")} label="Scan Receipt" icon={<LayoutGrid size={12}/>} />
                <SuggestionChip onClick={() => handleSend(null, "Explain my Net Worth")} label="Net Worth" icon={<Wallet size={12}/>} />
              </div>
            )}

            <form onSubmit={handleSend} className="relative flex items-center bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2">
              <input 
                type="text" 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask me anything..." 
                className="flex-1 bg-transparent border-none text-sm focus:ring-0 placeholder:text-slate-400 h-10 outline-none"
              />
              <button 
                type="submit"
                disabled={loading || !input.trim()}
                className="ml-2 bg-[#0a1128] p-2.5 rounded-xl text-white hover:bg-blue-900 transition-all disabled:opacity-30 shadow-lg"
              >
                <Send size={16} />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

const SuggestionChip = ({ label, icon, onClick }) => (
  <button onClick={onClick} className="flex items-center gap-2 px-3 py-2 bg-white border border-blue-100 rounded-full text-[10px] font-bold text-blue-700 hover:bg-blue-50 transition-all shadow-sm">
    {icon} {label}
  </button>
);

export default ChatBot;