
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { AddictionData, ChatMessage, DailyLog } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function identifyAddiction(userInput: string): Promise<{ 
  name: string; 
  unit: string; 
  intensityQuestion: string; 
  frequencyQuestion: string;
  psychologicalStrategy: string;
}> {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `O usuário quer superar: "${userInput}". 
    1. Identifique o vício.
    2. Crie uma pergunta de intensidade.
    3. Crie uma pergunta de frequência.
    4. Defina uma ESTRATÉGIA PSICOLÓGICA (ex: Urge Surfing, TCC, Mindfulnes).
    Responda em JSON.`,
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
}

export async function generateWeeklyAnalysis(logs: DailyLog[], addiction: AddictionData): Promise<string> {
  const logSummary = logs.map(l => `Data: ${l.date}, Qtd: ${l.amount}, Gatilho: ${l.trigger || 'N/A'}`).join('\n');
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Analise estes logs de recuperação de vício em ${addiction.name}. 
    Logs:\n${logSummary}\n
    Estratégia: ${addiction.psychologicalStrategy}.
    Forneça um relatório motivador, identifique o gatilho mais perigoso e sugira uma mudança prática para a próxima semana. 
    Use tom de mentor sênior. Responda em Markdown.`,
  });
  return response.text || "Não foi possível gerar a análise no momento.";
}

export async function processChat(
  history: ChatMessage[],
  addiction: AddictionData,
  userInput: string
): Promise<{ reply: string; usedToday: boolean; amount?: number; psychologicalTip?: string; detectedTrigger?: string }> {
  const systemPrompt = `Você é o Mentor TCC. Vício: ${addiction.name}. Meta: ${addiction.dailyAverage}. 
  Identifique se o usuário usou a substância/hábito. Se sim, tente identificar o gatilho (Estresse, Tédio, Social, Solidão). 
  Responda em JSON.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: [
      { role: 'user', parts: [{ text: systemPrompt }] },
      ...history.slice(-10).map(m => ({ role: m.role, parts: [{ text: m.text }] })),
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
}
