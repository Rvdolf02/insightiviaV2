import { getNoteById } from "@/actions/note";
import CreateNotePage from "../../_components/create"; // Adjust path if needed
import NotFound from "@/app/not-found";


export default async function ViewNote({ params }) {
  const { id } = await params;
  
  // Fetch the data on the server
  const note = await getNoteById(id);

  if (!note) {
    NotFound();
  }   
      {/* Pass the fetched data to your existing component. 
          It will handle the state initialization for title, editor, and category badge.
      */}
     return <CreateNotePage existingNote={note}  initialReadOnly={true}/>;

}