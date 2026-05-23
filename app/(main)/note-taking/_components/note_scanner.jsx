"use client";
import React, { useRef, useState } from 'react';
import { Camera, Loader2, ScanLine } from 'lucide-react';
import { scanNoteImage } from '@/actions/note';

const NoteScanner = ({ onScanComplete }) => {
  const fileInputRef = useRef();
  const [isScanning, setIsScanning] = useState(false);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsScanning(true);
    const result = await scanNoteImage(file);
    
    if (result.success) {
      onScanComplete(result.data);
    } else {
      alert(result.error);
    }
    setIsScanning(false);
  };

  return (
    <div className="relative group">
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept="image/*" 
        capture="environment" 
        onChange={handleFileChange} 
      />
      
      {/* Tooltip */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-800 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
        Scan Document with AI
      </div>

      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={isScanning}
        className="p-2 bg-gradient-to-tr from-blue-600 to-purple-600 text-white rounded-lg shadow-md hover:shadow-lg transition-all active:scale-95 disabled:opacity-50"
      >
        {isScanning ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Camera className="w-4 h-4" />
        )}
      </button>
    </div>
  );
};

export default NoteScanner;