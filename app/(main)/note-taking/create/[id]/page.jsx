// app/note-taking/create/[id]/page.jsx
import { getNoteById } from "@/actions/note";
import CreateNotePage from "../../_components/create";
import NotFound from "@/app/not-found";

export default async function EditPage({ params }) {
  const { id } = await params;
  const note = await getNoteById(id);

   if (!note) {
      NotFound();
    }   

  // We pass isReadOnly={false} because this is the CREATE/EDIT route
  return <CreateNotePage existingNote={note} initialReadOnly={false} />;
}