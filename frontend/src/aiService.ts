
import { GoogleGenAI } from "@google/genai";
import { IssueType } from "./types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function detectRoadDamage(base64Image: string): Promise<{
  issueType: IssueType;
  description: string;
}> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: base64Image.split(',')[1] || base64Image,
            },
          },
          {
            text: "Analyze this image of a road. Detect if there is any damage like a pothole, crack, or broken traffic light. Return the result in JSON format with 'issueType' (one of: 'Pothole', 'Crack', 'Broken Traffic Light', 'Other') and a brief 'description'.",
          },
        ],
      },
      config: {
        responseMimeType: "application/json"
      }
    });

    const result = JSON.parse(response.text || "{}");
    return {
      issueType: result.issueType || "Other",
      description: result.description || "Damage detected via AI analysis.",
    };
  } catch (error) {
    console.error("AI Detection failed:", error);
    return {
      issueType: "Other",
      description: "AI analysis failed. Please provide details manually.",
    };
  }
}
