
import { GoogleGenAI, Type } from "@google/genai";
import { AddictionData, ChatMessage, DailyLog } from "../types";

// Inicialização direta conforme diretrizes
const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function identifyAddiction(userInput: string): Promise<{ 
  name: string; 
  unit: string; 
  intensityQuestion: string; 
  frequencyQuestion: string;
  psychologicalStrategy: string;
}> {
  try {
    const ai = getAI();
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

    const text = response.text;
    if (!text) throw new Error("Empty response");
    return JSON.parse(text);
  } catch (error) {
    console.error("Erro na identificação:", error);
    return {
      name: userInput,
      unit: "unidades",
      intensityQuestion: "Qual o nível desse vício hoje?",
      frequencyQuestion: "Qual o seu consumo diário?",
      psychologicalStrategy: "Apoio Cognitivo Comportamental"
    };
  }
}

export async function generateWeeklyAnalysis(logs: DailyLog[], addiction: AddictionData): Promise<string> {
  try {
    const ai = getAI();
    const logSummary = logs.map(l => `Data: ${l.date}, Qtd: ${l.amount}, Gatilho: ${l.trigger || 'N/A'}`).join('\n');
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Analise estes logs de recuperação de ${addiction.name}. 
      Logs:\n${logSummary}\n
      Estratégia: ${addiction.psychologicalStrategy}.
      Forneça um relatório motivador curto e direto, identifique o padrão de recaída e dê uma dica prática.`,
    });
    return response.text || "Continue focado na sua meta diária!";
  } catch (error) {
    console.error("Erro no relatório:", error);
    return "Mantenha o foco! Cada dia é uma nova vitória.";
  }
}

export async function processChat(
  history: ChatMessage[],
  addiction: AddictionData,
  userInput: string
): Promise<{ reply: string; usedToday: boolean; amount?: number; psychologicalTip?: string; detectedTrigger?: string }> {
  try {
    const ai = getAI();
    const systemPrompt = `Você é um Mentor TCC empático. Vício: ${addiction.name}. Meta diária: ${addiction.dailyAverage} ${addiction.unit}. 
    Se o usuário relatar uso, identifique a quantidade e o gatilho. Seja breve e encorajador. 
    Responda em JSON.`;

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

    const text = response.text;
    if (!text) throw new Error("Empty chat response");
    return JSON.parse(text);
  } catch (error) {
    console.error("Erro no chat:", error);
    return { 
      reply: "Estou aqui com você. Como podemos manter o controle hoje?", 
      usedToday: false,
      psychologicalTip: "Lembre-se: um deslize não é o fim da jornada."
    };
  }
}
