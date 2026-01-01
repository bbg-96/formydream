import { GoogleGenAI, Type, Schema } from "@google/genai";
import { AIBreakdownResponse } from "../types";

// Helper to get the API client with the latest key
const getAIClient = (): GoogleGenAI | null => {
    const apiKey = localStorage.getItem('gemini_api_key') || process.env.API_KEY;
    
    if (!apiKey) {
        console.warn("Gemini API Key is missing. Please add it in My Page settings.");
        return null;
    }
    
    return new GoogleGenAI({ apiKey });
};

export const generateTaskBreakdown = async (taskTitle: string, taskDescription: string): Promise<AIBreakdownResponse | null> => {
  try {
    const ai = getAIClient();
    if (!ai) return null;

    const model = "gemini-3-flash-preview";
    
    const schema: Schema = {
      type: Type.OBJECT,
      properties: {
        subtasks: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "A list of actionable subtasks needed to complete the main task.",
        },
        suggestedTags: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "Relevant tags for a cloud engineering context (e.g., AWS, Migration, Security).",
        },
        prioritySuggestion: {
          type: Type.STRING,
          enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
          description: "Suggested priority level based on the urgency implied.",
        }
      },
      required: ["subtasks", "suggestedTags", "prioritySuggestion"],
    };

    const prompt = `
      You are an expert Senior Cloud Engineer assistant.
      Analyze the following task and break it down into technical steps.
      
      Task Title: ${taskTitle}
      Task Description: ${taskDescription}
      
      Provide a breakdown, relevant tags, and a priority suggestion.
    `;

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
      }
    });

    const text = response.text;
    if (!text) return null;

    return JSON.parse(text) as AIBreakdownResponse;

  } catch (error) {
    console.error("Error generating task breakdown:", error);
    return null;
  }
};

export const chatWithAssistant = async (message: string, context: string): Promise<string> => {
    try {
        const ai = getAIClient();
        if (!ai) return "Gemini API 키가 설정되지 않았습니다. 마이페이지에서 키를 등록해주세요.";

        const model = "gemini-3-flash-preview";
        const prompt = `
        Context regarding current tasks: ${context}
        
        User Query: ${message}
        
        You are a CloudOps assistant. Answer the user's query. If they ask about the context, refer to it. Keep answers concise and technical.
        `;

        const response = await ai.models.generateContent({
            model,
            contents: prompt,
        });

        return response.text || "죄송합니다. 응답을 생성할 수 없습니다.";
    } catch (e) {
        console.error("Chat error", e);
        return "AI 서비스 연결에 실패했습니다. API 키를 확인해주세요.";
    }
}