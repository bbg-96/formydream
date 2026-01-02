import { GoogleGenAI, Type, Schema } from "@google/genai";
import { AIBreakdownResponse, KnowledgeItem } from "../types";

// Define available models for selection
export const AVAILABLE_MODELS = [
  { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash' },
  { id: 'gemini-3-pro-preview', name: 'Gemini 3 Pro' },
];

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

export const searchKnowledgeBaseWithAI = async (query: string, items: KnowledgeItem[]): Promise<string[]> => {
    try {
        const ai = getAIClient();
        if (!ai) return [];
        if (items.length === 0) return [];

        const model = "gemini-3-flash-preview";
        
        // Prepare simplified items list to save tokens, stripping HTML
        const itemsContext = items.map(item => {
            const cleanContent = item.content.replace(/<[^>]*>/g, '').substring(0, 300); // Limit content length
            return `ID: ${item.id}\nTitle: ${item.title}\nCategory: ${item.category}\nTags: ${item.tags.join(', ')}\nSnippet: ${cleanContent}\n---`;
        }).join('\n');

        const schema: Schema = {
            type: Type.OBJECT,
            properties: {
                relevantIds: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: "List of Knowledge Item IDs that are relevant to the user query.",
                }
            },
            required: ["relevantIds"]
        };

        const prompt = `
            You are a smart search engine for a Cloud DevOps Knowledge Base.
            
            User Query: "${query}"
            
            Here is the list of knowledge items:
            ${itemsContext}
            
            Analyze the user query and the knowledge items. 
            Return the IDs of items that are semantically relevant to the query.
            If the query is vague, select items that might be helpful.
            If nothing matches, return an empty array.
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
        if (!text) return [];

        const result = JSON.parse(text);
        return result.relevantIds || [];

    } catch (e) {
        console.error("AI Search Error", e);
        return [];
    }
};

export const chatWithAssistant = async (message: string, context: string, modelId: string = "gemini-3-flash-preview"): Promise<string> => {
    try {
        const ai = getAIClient();
        if (!ai) return "Gemini API 키가 설정되지 않았습니다. 마이페이지에서 키를 등록해주세요.";

        // Use the selected model
        const model = modelId;
        
        const prompt = `
        System Context (Tasks, Knowledge Base, etc.):
        ${context}
        
        User Query: ${message}
        
        You are a CloudOps assistant. Answer the user's query based on the provided context. 
        If the user asks what is in the knowledge base or tasks, list them from the context.
        Keep answers concise and technical.
        `;

        const response = await ai.models.generateContent({
            model,
            contents: prompt,
        });

        return response.text || "죄송합니다. 응답을 생성할 수 없습니다.";
    } catch (e) {
        console.error("Chat error", e);
        return "AI 서비스 연결에 실패했습니다. API 키를 확인해주세요. (또는 모델이 지원되지 않을 수 있습니다)";
    }
}