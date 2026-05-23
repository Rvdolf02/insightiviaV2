import { getNotes } from "@/actions/note";
import CategoryList from "../../_components/category_list";

export default async function CategoryPage({ params, searchParams }) {
  const { id } = await params; // This is now a noteId, e.g., "efe-fdnsdfn"
  const { ids } = await searchParams;

  const result = await getNotes();

  if (!result.success) {
    return <div className="p-10 text-center">Error loading notes.</div>;
  }

  // 1. Find the specific note that matches the ID in the URL
  const referenceNote = result.data.find((note) => note.id === id);
  
  // 2. Get the category from that note (fallback to "General")
  const actualCategory = referenceNote?.category || "General";

  // 3. Filter all notes that share this category
  const categoryNotes = result.data.filter(
    (note) => (note.category || "General") === actualCategory
  );

  // 4. Collect all IDs for the Analysis Trigger
  const noteIds = categoryNotes.map(note => note.id);

  // --- THEME LOGIC ---
  const themes = [
    { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-100", accent: "bg-amber-500" },
    { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-100", accent: "bg-emerald-500" },
    { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-100", accent: "bg-rose-500" },
    { bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-100", accent: "bg-indigo-500" },
    { bg: "bg-cyan-50", text: "text-cyan-700", border: "border-cyan-100", accent: "bg-cyan-500" },
    { bg: "bg-violet-50", text: "text-violet-700", border: "border-violet-100", accent: "bg-violet-500" },
  ];

  const allCategories = [...new Set(result.data.map(n => n.category || "General"))];
  const categoryIndex = allCategories.indexOf(actualCategory);
  const theme = themes[categoryIndex % themes.length] || themes[0];

  return (
    <CategoryList 
      categoryName={actualCategory} 
      notes={categoryNotes} 
      noteIds={noteIds} // Passing all IDs in this category for the AI analysis
      theme={theme}
    />
  );
}