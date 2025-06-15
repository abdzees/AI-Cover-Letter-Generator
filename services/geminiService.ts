
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { GEMINI_MODEL_NAME } from '../constants';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.error("API_KEY environment variable not set.");
  // preventing API calls if the key is missing.
}

const ai = new GoogleGenAI({ apiKey: API_KEY || "MISSING_API_KEY" });

const generatePrompt = (cvText: string, jobDescription: string, letterHeader: string): string => {
  return `
You are an expert career advisor and professional writer.

Your task is to generate a **concise, sharply written, and highly tailored cover letter** based on the user's CV and a specific job description.

### Goals:
- Keep it short and impactful (target **250–300 words**)
- Use a **direct and confident tone**
- Avoid unnecessary adjectives, filler, or robotic-sounding phrases
- Do **not** list every skill — focus on **key achievements or experiences** directly relevant to the role

### Specific Instructions:
- If the job description includes a company mission or culture blurb, summarize any reference to it in **one brief line or omit it entirely**.
- The final paragraph should be **a single strong sentence** expressing enthusiasm and readiness to contribute.

### Structure:
- Begin with a strong, concise first paragraph referencing the job title and aligning motivation with the company's work.
- Middle paragraphs should focus on concrete projects, achievements, or relevant experiences.
- End with a one-line statement of enthusiasm and the required sign-off.

### Important:
- Only generate the **main body** of the letter (excluding the header or greeting).
- Output must be **plain text** (no markdown formatting).
- Avoid repeating exact phrases from the CV unless highly relevant.
- Avoid boilerplate or generic summaries.

### Input:

**Fixed Header (Provided by user, do not repeat this in your output):**
"""
${letterHeader || "No fixed header provided by user."}
"""

**CV Content:**
"""
${cvText}
"""

**Job Description:**
"""
${jobDescription}
"""

### Output:
Return only the **body** of the cover letter, starting directly with the first paragraph and ending with the sign-off.
`.trim();
};

export const generateCoverLetterBody = async (
  cvText: string,
  jobDescription: string,
  letterHeader: string
): Promise<string> => {
  if (!API_KEY) {
    throw new Error("API_KEY is not configured. Please set the API_KEY environment variable.");
  }

  const prompt = generatePrompt(cvText, jobDescription, letterHeader);

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: GEMINI_MODEL_NAME,
      contents: prompt,
      config: { temperature: 0.7 } // Optional: Adjust temperature for creativity
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
