"use client";

import React, { useState } from "react";
import { Tag, X } from "lucide-react";

const PREDEFINED_CATEGORIES = ["General", "Work", "Personal", "Study", "Ideas"];

const CategorySelector = ({ value, onChange }) => {
  const [isCustom, setIsCustom] = useState(!PREDEFINED_CATEGORIES.includes(value) && value !== "");

  const handleSelectChange = (e) => {
    const val = e.target.value;
    if (val === "Other") {
      setIsCustom(true);
      onChange(""); 
    } else {
      setIsCustom(false);
      onChange(val);
    }
  };

  return (
    <div className="flex items-center">
      {isCustom ? (
        <div className="flex items-center gap-1 bg-blue-50 border border-blue-100 rounded-lg px-2 py-1">
          <input
            type="text"
            autoFocus
            placeholder="Category..."
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="bg-transparent text-[10px] font-bold text-blue-700 outline-none w-20 placeholder:text-blue-300"
          />
          <button 
            onClick={() => { setIsCustom(false); onChange("General"); }}
            className="text-blue-400 hover:text-blue-600"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
          <Tag className="w-3 h-3 text-slate-400" />
          <select
            value={value}
            onChange={handleSelectChange}
            className="bg-transparent text-[10px] font-bold text-slate-600 outline-none cursor-pointer appearance-none uppercase"
          >
            {PREDEFINED_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
            <option value="Other">+ OTHER</option>
          </select>
        </div>
      )}
    </div>
  );
};

export default CategorySelector;