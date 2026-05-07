const { GoogleGenAI } = require('@google/genai');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function detectRoadDamage(base64Image) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      console.warn('GEMINI_API_KEY not set, returning default analysis');
      return {
        issueType: 'Other',
        description: 'AI analysis not available. Please provide details manually.'
      };
    }

    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: base64Image.split(',')[1] || base64Image,
            },
          },
          {
            text: `Analyze this image of a road or traffic infrastructure. Detect if there is any damage or issue.
Return the result in JSON format with:
- 'issueType': one of 'Pothole', 'Crack', 'Broken Traffic Light', or 'Other'
- 'description': a brief description of what you see (max 100 characters)

If you don't see any obvious road damage, set issueType to 'Other'.`,
          },
        ],
      },
      config: {
        responseMimeType: 'application/json'
      }
    });

    const result = JSON.parse(response.text || '{}');
    return {
      issueType: result.issueType || 'Other',
      description: result.description || 'Analysis completed.',
    };
  } catch (error) {
    console.error('AI Detection failed:', error);
    return {
      issueType: 'Other',
      description: 'AI analysis failed. Please provide details manually.',
    };
  }
}

module.exports = {
  detectRoadDamage
};