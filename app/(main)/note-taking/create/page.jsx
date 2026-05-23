// app/note-taking/create/page.jsx

import CreateNotePage from "../_components/create";

export default function NewNotePage() {
  // We pass nothing for existingNote because it's a new entry
  return <CreateNotePage existingNote={null} initialReadOnly={false} />;
}