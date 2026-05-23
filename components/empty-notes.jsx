import React from "react";
import { FileText, Sparkles } from "lucide-react";

const EmptyNotes = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center animate-in fade-in zoom-in duration-500">
      <div className="relative mb-8">
        {/* Main Note Icon */}
        <div className="w-24 h-32 bg-blue-50 rounded-2xl flex items-center justify-center relative shadow-sm border border-blue-100">
          <FileText className="w-12 h-12 text-blue-500" />
          
          {/* Floating Sparkle Badge */}
          <div className="absolute -top-3 -right-3 w-10 h-10 bg-white rounded-full shadow-md flex items-center justify-center border border-slate-100">
            <Sparkles className="w-5 h-5 text-blue-600 fill-blue-600" />
          </div>
        </div>
      </div>

      <h2 className="text-2xl font-bold text-slate-900 mb-3 tracking-tight">
        No Notes Yet
      </h2>
      
      <p className="text-slate-500 max-w-[280px] sm:max-w-md leading-relaxed text-sm sm:text-base">
        Start capturing your financial thoughts. Your AI assistant will 
        automatically organize them for you.
      </p>
    </div>
  );
};

export default EmptyNotes;