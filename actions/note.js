"use server";

import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function getNoteById(id) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) throw new Error("Unauthorized");

    const note = await db.note.findUnique({
      where: { id },
      include: {
        todoItems: {
          orderBy: { order: "asc" },
        },
      },
    });

    if (!note) return null;
    return note;
  } catch (error) {
    console.error("Fetch error:", error);
    return null;
  }
}

// Helper for initial calculation
function calculateNextDate(interval) {
  const now = new Date();
  switch (interval) {
    case "DAILY": now.setDate(now.getDate() + 1); break;
    case "WEEKLY": now.setDate(now.getDate() + 7); break;
    case "MONTHLY": now.setMonth(now.getMonth() + 1); break;
    case "YEARLY": now.setFullYear(now.getFullYear() + 1); break;
    default: now.setDate(now.getDate() + 1);
  }
  return now;
}

export async function upsertNote(data) {
  let noteIdToRedirect = null;
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) throw new Error("Unauthorized");

    const user = await db.user.findUnique({ where: { clerkUserId } });
    if (!user) throw new Error("User not found");

    // Logic: If recurring is on and no date exists, set the first one
    let nextDate = null;
    if (data.isRecurring) {
        nextDate = calculateNextDate(data.recurringInterval);
    }

    const note = await db.$transaction(async (tx) => {
      if (data.id) {
        await tx.todoItem.deleteMany({ where: { noteId: data.id } });
      }

      const noteData = {
        title: data.title,
        content: data.content,
        priority: data.priority,
        isRecurring: data.isRecurring,
        recurringInterval: data.isRecurring ? data.recurringInterval : null,
        nextRecurringDate: data.isRecurring ? nextDate : null,
        category: data.category || "General",
        todoItems: {
          create: data.todoItems?.map((item, index) => ({
            description: item.description,
            isAccomplished: item.isAccomplished || false,
            order: index,
            userId: user.id,
          })),
        },
      };

      return await tx.note.upsert({
        where: { id: data.id || "00000000-0000-0000-0000-000000000000" },
        update: noteData,
        create: { ...noteData, userId: user.id },
      });
    });

    noteIdToRedirect = note.id;
    revalidatePath("/note-taking");
  } catch (error) {
    return { success: false, error: error.message };
  }

  if (noteIdToRedirect) redirect(`/note-taking/view/${noteIdToRedirect}`);
}


export async function deleteNote(noteId) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) throw new Error("Unauthorized");
    
    await db.note.delete({ where: { id: noteId } });
    revalidatePath("/note-taking");
    // Return success instead of redirecting here to allow the UI to handle it
    return { success: true };
  } catch (error) {
    console.error("Delete Error:", error);
    return { success: false, error: error.message };
  }
  }

  export async function getNotes() {
    try {
      const { userId: clerkUserId } = await auth();
      if (!clerkUserId) throw new Error("Unauthorized");

      // FIND THE INTERNAL USER FIRST
      const user = await db.user.findUnique({
        where: { clerkUserId },
      });

      if (!user) return { success: true, data: [] };

      const notes = await db.note.findMany({
        where: {
          userId: user.id, // Use the internal DB ID, not the Clerk ID
        },
        include: {
          todoItems: true,
        },
        orderBy: [
          { priority: 'asc' },
          { updatedAt: 'desc' }
        ],
      });

      return { success: true, data: notes };
    } catch (error) {
      console.error("Fetch Notes Error:", error);
      return { success: false, error: error.message, data: [] };
    }
  }

 export async function deleteCategory(categoryName) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) throw new Error("Unauthorized");

    const user = await db.user.findUnique({
      where: { clerkUserId },
    });

    if (!user) throw new Error("User not found");

    // This will delete all notes where the category matches
    // Note: If your Prisma schema doesn't have "onDelete: Cascade" for todoItems, 
    // you might need to delete todoItems first.
    await db.note.deleteMany({
      where: {
        userId: user.id,
        category: categoryName,
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Delete Category Error:", error);
    return { success: false, error: error.message };
  }
}
export async function analyzeNoteCategory(categoryName, notes) {
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    // Using gemini-1.5-flash for speed and efficiency
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `
        You are an Intelligent Note Strategy Assistant. 
        Analyze the following collection of notes for the category: "${categoryName}".

        NOTES DATA:
        ${JSON.stringify(notes)}

        TASK:
        Provide a strategic summary report in JSON format.
        1. "Summary Outlook": What is this category mainly about based on the notes? (e.g., "This category focuses on inventory management and tracking recurring household needs.")
        2. "Recurring Patterns": Identify habits, repeated tasks, or timelines found in these notes.
        3. "Key Focus Areas": What should the user prioritize or keep an eye on within this category?

        STRICT JSON FORMAT:
        {
          "summary": "general overview text",
          "patterns": [
            { "title": "Pattern Name", "description": "how it manifests in the notes" }
          ],
          "focusPoints": ["priority 1", "priority 2"]
        }

        Do not include markdown, financial advice, or external commentary.
    `;

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    const cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();

    return JSON.parse(cleaned);
  } catch (error) {
    console.error("Analysis Error:", error);
    throw new Error("Failed to analyze your notes.");
  }
}

export async function getNotesByIds(ids) {
  try {
    const notes = await db.note.findMany({
      where: {
        id: { in: ids },
      },
      include: {
        todoItems: true, // This captures the "child lists" you mentioned
      },
    });
    return { success: true, data: notes };
  } catch (error) {
    console.error("Database Fetch Error:", error);
    return { success: false, error: "Failed to fetch notes for analysis." };
  }
}

export async function enhanceNoteContent({ title, content, todoItems }) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) throw new Error("Unauthorized");

    const user = await db.user.findUnique({ 
      where: { clerkUserId },
      include: { notes: { select: { category: true } } }
    });

    // Extract unique existing categories to help AI stay consistent
    const existingCategories = Array.from(new Set(user?.notes.map(n => n.category))).filter(Boolean);

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `
      You are an expert editor. Enhance the following note to be more professional, clear, and organized.
      
      TITLE: ${title}
      PARAGRAPH CONTENT (HTML): ${content || "None"}
      TODO ITEMS: ${todoItems?.map(i => i.description).join(", ") || "None"}

      Instructions:
      1. Fix grammar and tone.
      2. If PARAGRAPH CONTENT is provided, rewrite it to be more concise.
      3. If TODO ITEMS are provided, clarify the action points.
      4. CATEGORY RULES:
         - Review these existing categories used by the user: [${existingCategories.join(", ")}].
         - If the note fits one of these existing categories, use it.
         - If it does not fit, generate a new one-word category that describes the note.
      5. The "enhancedContent" field MUST be pure HTML paragraphs (e.g., <p>text</p>). 
      6. DO NOT include conversational filler like "Here is your enhanced note" or "Please acquire...". 
      7. Transform the content into a professional summary.
      Respond ONLY with valid JSON in this format:
      {
        "enhancedContent": "string",
        "enhancedTodoItems": ["string", "string"],
        "suggestedCategory": "string"
      }
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    
    // Improved cleaning logic to remove any AI-generated markdown wrappers
    let text = response.text();
    text = text.replace(/```json/g, "").replace(/```/g, "").trim();
    
    return { success: true, data: JSON.parse(text) };
  } catch (error) {
    console.error("AI Enhancement failed:", error);
    return { success: false, error: "Failed to enhance content" };
  }
}

export async function scanNoteImage(file) {
  try {
      const { userId: clerkUserId } = await auth();
    if (!clerkUserId) throw new Error("Unauthorized");

    const user = await db.user.findUnique({ 
      where: { clerkUserId },
      include: { notes: { select: { category: true } } }
    });

    // Extract unique existing categories to help AI stay consistent
    const existingCategories = Array.from(new Set(user?.notes.map(n => n.category))).filter(Boolean); 

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    
    // Convert File to GoogleGenerativeAI.Part
    const arrayBuffer = await file.arrayBuffer();
    const imagePart = {
      inlineData: {
        data: Buffer.from(arrayBuffer).toString("base64"),
        mimeType: file.type,
      },
    };

   const prompt = `
Analyze this image of a document. The image may contain:

- handwritten notes
- typed notes
- meeting notes
- lecture notes
- whiteboard writing
- a checklist
- a planner or to-do list
- a page of a book
- a document or letter
- a screenshot of text
- mixed text and bullet points

Your goal is to extract the information and organize it into a structured format.

STEP 1 — Understand the document:
First determine what type of document it is (notes, checklist, whiteboard, article, meeting notes, instructions, etc.).

STEP 2 — Extract the TITLE:
- If a clear title or heading exists, use it.
- If no title exists, generate a concise title summarizing the document's topic.

STEP 3 — Extract the MAIN CONTENT:
- Extract the readable text.
- Organize the body into logical paragraphs.
- Return the content strictly as HTML paragraphs only:
  Example: <p>text</p>
- If the text appears as bullet points or short notes, convert them into short paragraphs.

STEP 4 — Identify TODO ITEMS:
Extract checklist items or actionable tasks such as:
- items with checkboxes
- bullet lists of tasks
- lines starting with verbs (buy, finish, submit, call, review, etc.)
- numbered task lists

Return them as an array of short task strings.

STEP 5 — CATEGORY RULES:
Review the existing categories used by the user:
[${existingCategories.join(", ")}]

Category decision rules:
- If the document clearly fits one of the existing categories, use it.
- If it does not match any category, generate a NEW one-word category describing the topic.
- Prefer broad, reusable categories (example: school, work, meeting, ideas, research, planning).

IMPORTANT EXTRACTION RULES:
- Ignore decorative elements, logos, page numbers, and watermarks.
- Focus on meaningful text content.
- Preserve the original meaning of the text.
- If the document is mostly unreadable or contains no useful text, return empty content.

Respond ONLY with valid JSON:

{
  "title": "string",
  "content": "string",
  "todoItems": ["string"],
  "suggestedCategory": "string"
}
`;

    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    let text = response.text().replace(/```json/g, "").replace(/```/g, "").trim();
    
    return { success: true, data: JSON.parse(text) };
  } catch (error) {
    console.error("OCR Scanning failed:", error);
    return { success: false, error: "Failed to parse image" };
  }
}