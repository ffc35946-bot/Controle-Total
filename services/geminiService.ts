
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { AddictionData, ChatMessage, DailyLog } from "../types";

// Inicialização com a API Key do ambiente
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function identifyAddiction(userInput: string): Promise<{ 
  name: string; 
  unit: string; 
  intensityQuestion: string; 
  frequencyQuestion: string;
  psychologicalStrategy: string;
}> {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `O usuário quer superar: "${userInput}". 
      1. Identifique o vício de forma concisa.
      2. Crie uma pergunta curta sobre a intensidade emocional/vontade.
      3. Crie uma pergunta direta sobre o consumo ou valor gasto.
      4. Defina uma estratégia psicológica reconhecida.
      Responda estritamente em JSON.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            unit: { type: Type.STRING },
            intensityQuestion: { type: Type.STRING },
            frequencyQuestion: { type: Type.STRING },
            psychologicalStrategy: { type: Type.STRING }
          },
          required: ["name", "unit", "intensityQuestion", "frequencyQuestion", "psychologicalStrategy"]
        }
      }
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error("Erro na identificação:", error);
    // Fallback amigável
    return {
      name: userInput,
      unit: "vezes",
      intensityQuestion: "Como está sua vontade hoje?",
      frequencyQuestion: "Quantas vezes você usou hoje?",
      psychologicalStrategy: "Apoio Cognitivo Comportamental"
    };
  }
}

export async function generateWeeklyAnalysis(logs: DailyLog[], addiction: AddictionData): Promise<string> {
  const logSummary = logs.map(l => `Data: ${l.date}, Qtd: ${l.amount}, Gatilho: ${l.trigger || 'N/A'}`).join('\n');
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Analise estes logs de recuperação de ${addiction.name}. 
    Logs:\n${logSummary}\n
    Estratégia: ${addiction.psychologicalStrategy}.
    Forneça um relatório motivador curto e direto, identifique o padrão de recaída e dê uma dica prática.
    Responda em Markdown.`,
  });
  return response.text || "Continue focado na sua meta diária!";
}

export async function processChat(
  history: ChatMessage[],
  addiction: AddictionData,
  userInput: string
): Promise<{ reply: string; usedToday: boolean; amount?: number; psychologicalTip?: string; detectedTrigger?: string }> {
  const systemPrompt = `Você é um Mentor TCC empático. Vício: ${addiction.name}. Meta diária: ${addiction.dailyAverage} ${addiction.unit}. 
  Se o usuário relatar uso, identifique a quantidade e o gatilho. Seja breve e encorajador. 
  Responda em JSON.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [
        { role: 'user', parts: [{ text: systemPrompt }] },
        ...history.slice(-6).map(m => ({ role: m.role, parts: [{ text: m.text }] })),
        { role: 'user', parts: [{ text: userInput }] }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            reply: { type: Type.STRING },
            usedToday: { type: Type.BOOLEAN },
            amount: { type: Type.NUMBER },
            detectedTrigger: { type: Type.STRING },
            psychologicalTip: { type: Type.STRING }
          },
          required: ["reply", "usedToday"]
        }
      }
    });

    return JSON.parse(response.text);
  } catch (error) {
    return { 
      reply: "Estou aqui com você. Como posso ajudar no seu autocontrole agora?", 
      usedToday: false,
      psychologicalTip: "Respire fundo e lembre-se do seu 'porquê'."
    };
  }
}
