import { Router, type IRouter } from "express";
import OpenAI from "openai";
import { z } from "zod";

const router: IRouter = Router();

const TranslateTextBody = z.object({
  text: z.string().min(1).max(6000),
  mode: z.literal("final"),
});

const TranslateTextResponse = z.object({
  translation: z.string(),
  original: z.string(),
});

const openai = new OpenAI({
  baseURL: process.env.OPENAI_BASE_URL,
  apiKey: process.env.OPENAI_API_KEY,
});

// ── Shared rules both modes follow ───────────────────────────────────────────
const SHARED_RULES = `
You are a real-time lecture translation assistant helping Chinese students understand an English-speaking professor.

Your only job: translate the English input into natural Simplified Chinese.

Non-negotiable rules:
- Output ONLY the Chinese translation. Nothing else — no English, no labels, no explanations.
- Do NOT translate proper nouns, technical terms, or names unless a standard Chinese equivalent exists.
- Do NOT add content not present in the input.
- If the input is empty or just punctuation, output a single dash: —
`.trim();

// ── FINAL MODE ───────────────────────────────────────────────────────────────
// The sentence is complete. The English is kept exactly as spoken (with any
// natural hesitations or repetitions). The Chinese should be clean, natural,
// and easy to read — the student's primary comprehension aid.
//
const FINAL_SYSTEM_PROMPT = `${SHARED_RULES}

This is a COMPLETE, finalized sentence from a lecture.
The English may include filler words ("um", "uh", "like"), repetitions, or
false starts — this is normal spoken English and you should IGNORE these in the
Chinese. Translate ONLY the intended meaning.
The Chinese should read as a fluent, natural sentence a Chinese student would
read without confusion.`;

async function translateAiFinal(text: string): Promise<string> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
    max_tokens: 256,
    messages: [
      { role: "system", content: FINAL_SYSTEM_PROMPT },
      { role: "user", content: text },
    ],
  });

  const result = completion.choices[0]?.message?.content?.trim();
  if (!result) throw new Error("Empty final translation response");
  return result;
}

// ── Route ─────────────────────────────────────────────────────────────────────
router.post("/translate", async (req, res) => {
  const parseResult = TranslateTextBody.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const { text, mode } = parseResult.data;
  if (!text || text.trim().length === 0) {
    res.status(400).json({ error: "Text is required" });
    return;
  }

  // Only final mode is used — live hints are generated locally in the frontend
  if (mode !== "final") {
    res.status(400).json({ error: "Only mode=final is supported" });
    return;
  }

  console.log(`[translate:final] start — "${text.slice(0, 60)}${text.length > 60 ? "…" : ""}"`);

  try {
    const translation = await translateAiFinal(text);
    console.log(`[translate:final] success — "${translation.slice(0, 60)}${translation.length > 60 ? "…" : ""}"`);
    const result = TranslateTextResponse.parse({ translation, original: text });
    res.json(result);
  } catch (err) {
    console.error(`[translate:final] error:`, err);
    res.status(500).json({ error: "Translation unavailable" });
  }
});

export default router;
