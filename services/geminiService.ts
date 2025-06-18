
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { GEMINI_MODEL_NAME } from '../constants';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.error("API_KEY environment variable not set.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY || "MISSING_API_KEY" });

const generatePrompt = (cvText: string, jobDescription: string, letterHeader: string, companyName: string): string => {
  return `
Act as an expert career advisor, professional writer, and experienced editor. Your task is to generate a concise, sharply written, and highly tailored cover letter based on the user's CV and a specific job description. Refine AI-generated text to sound naturally human and genuinely engaging, always using British English.

### Follow these editorial principles:
- Replace em dashes with commas or restructure sentences for better flow.
- Avoid semicolons in casual writing. Use full stops or conjunctions like “and” or “but”.
- Remove ellipses unless conveying hesitation or a trailing thought.
- Minimise parenthetical asides by weaving information directly into the main sentence.
- Use colons sparingly.
- Eliminate hedging phrases like “however” or “it’s worth noting” – be clear and assertive.
- Avoid stock transitions such as “furthermore” unless absolutely necessary.
- Vary repetitive words and phrasing for rhythm.
- Use contractions in informal or conversational settings.
- Swap overly formal vocabulary (“utilise”, “ascertain”) for simpler alternatives (“use”, “find out”).
- Keep language concise and vary sentence length to maintain interest.
- Allow small imperfections in casual or creative writing.
- Stay true to the intended meaning, but always adapt tone and register to suit the audience.

### Cover letter goals:
- Keep it short and impactful (target 250 to 300 words).
- Use a direct and confident tone.
- Avoid unnecessary adjectives, filler, or robotic-sounding phrases.
- Do not list every skill, focus on key achievements or experiences directly relevant to the role.

### Specific instructions:
- If the job description mentions company mission or culture, reference it in one brief line or omit it.
- The final paragraph should be a single strong sentence expressing enthusiasm and readiness to contribute.

### Structure:
- Start with a strong, concise first paragraph referencing the job title and aligning motivation with the company’s work (the company is: ${companyName || 'the target company'}).
- Middle paragraphs should focus on concrete projects, achievements, or relevant experiences.
- End with a one-line statement of enthusiasm.

### Important:
- Only generate the main body of the letter (excluding the header or greeting). The application will add a greeting like "Dear ${companyName || 'Hiring'} Team," before your generated text.
- Output must be plain text (no markdown).
- Avoid repeating exact phrases from the CV unless highly relevant.
- Avoid boilerplate or generic summaries.

### Input Context:

**CV Content:**
"""
${cvText}
"""

**Job Description (for company: ${companyName || 'Not specified'}):**
"""
${jobDescription}
"""

**Fixed Header (Provided by user, do not repeat this in your output. This header will appear *before* the greeting and the main body you generate):**
"""
${letterHeader || "No fixed header provided by user."}
"""

### Output:
Return only the **main body** of the cover letter. This means starting with the first paragraph that would typically follow a greeting (e.g., "I am writing to express my keen interest...") and ending with the final concluding sentence before any valediction (like "Best Regards,"). Do not include any greeting, date, addresses, or the final sign-off (e.g., "Best Regards," or user's name).
`.trim();
};

export const generateCoverLetterBody = async (
  cvText: string,
  jobDescription: string,
  letterHeader: string,
  companyName: string
): Promise<string> => {
  if (!API_KEY) {
    throw new Error("API_KEY is not configured. Please set the API_KEY environment variable.");
  }

  const prompt = generatePrompt(cvText, jobDescription, letterHeader, companyName);

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: GEMINI_MODEL_NAME,
      contents: prompt,
      // config: { temperature: 0.6 } // Slightly lower temp for more focused output with new detailed prompt
    });
    
    const text = response.text;
    if (!text) {
      throw new Error("No text returned from API.");
    }
    return text.trim();
  } catch (error) {
    console.error("Error generating cover letter from Gemini API:", error);
    if (error instanceof Error) {
       throw new Error(`Failed to generate cover letter: ${error.message}`);
    }
    throw new Error("Failed to generate cover letter due to an unknown error.");
  }
};
