
import React, { useState, useEffect, useRef } from 'react';
import { AddictionData, DailyLog, ChatMessage, AppStep, ReminderConfig, Badge } from './types';
import { identifyAddiction, processChat } from './services/geminiService';
import Dashboard from './components/Dashboard';

const INITIAL_BADGES: Badge[] = [
  { id: 'first_log', name: 'Primeiro Passo', description: 'Realizou seu primeiro registro de progresso.', icon: 'medal', earned: false },
  { id: 'streak_3', name: 'Consistência', description: 'Manteve a meta por 3 dias seguidos.', icon: 'sparkles', earned: false },
  { id: 'streak_7', name: 'Inabalável', description: '7 dias sob controle absoluto.', icon: 'fire', earned: false },
  { id: 'level_up', name: 'Evolução', description: 'Subiu de nível na sua jornada.', icon: 'star', earned: false },
];

const TRIGGERS = [
  { id: 'stress', label: 'Estresse', icon: '⚡' },
  { id: 'boredom', label: 'Tédio', icon: '🥱' },
  { id: 'social', label: 'Social', icon: '👥' },
  { id: 'loneliness', label: 'Solidão', icon: '👤' },
  { id: 'habit', label: 'Hábito', icon: '🔄' },
];

const App: React.FC = () => {
  const [step, setStep] = useState<AppStep>(AppStep.INITIAL);
  const [addiction, setAddiction] = useState<AddictionData>({
    name: '', intensity: 5, initialIntensity: 5, dailyAverage: 0, unit: 'unidades',
    intensityQuestion: 'Qual o nível desse vício hoje?', frequencyQuestion: 'Qual o seu consumo diário?',
    psychologicalStrategy: 'Redução Gradual Assistida', currentPhase: 1, badges: INITIAL_BADGES
  });
  const [reminders, setReminders] = useState<ReminderConfig>({ enabled: true, time: '09:00', message: 'Lembre-se do seu propósito!' });
  const [userInput, setUserInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [view, setView] = useState<'chat' | 'dashboard'>('chat');
  const [pendingTriggerLog, setPendingTriggerLog] = useState<{amount: number} | null>(null);
  const [fastSelected, setFastSelected] = useState<string | null>(null);
  
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isTyping, pendingTriggerLog]);

  useEffect(() => {
    checkBadges();
  }, [logs, addiction.dailyAverage]);

  const checkBadges = () => {
    setAddiction(prev => {
      let updated = false;
      const newBadges = prev.badges.map(badge => {
        if (badge.earned) return badge;
        if (badge.id === 'first_log' && logs.length > 0) { updated = true; return { ...badge, earned: true }; }
        if (badge.id === 'streak_3' && logs.length >= 3) {
          const last3 = logs.slice(-3);
          if (last3.every(l => l.amount <= prev.dailyAverage)) { updated = true; return { ...badge, earned: true }; }
        }
        return badge;
      });
      return updated ? { ...prev, badges: newBadges } : prev;
    });
  };

  const handleInitialSubmit = async (e: React.FormEvent | null, value?: string) => {
    if (e) e.preventDefault();
    const finalInput = value || userInput;
    if (!finalInput.trim()) return;
    
    setIsTyping(true);
    try {
      const result = await identifyAddiction(finalInput);
      
      if (finalInput.toLowerCase().includes('tigrinho')) {
        result.frequencyQuestion = "Quanto você aposta por semana?";
        result.unit = "reais";
        result.name = "Apostas em Tigrinho";
      }

      setAddiction(prev => ({ ...prev, ...result, initialIntensity: prev.intensity }));
      setUserInput('');
      setStep(AppStep.INTENSITY);
    } catch (err) { 
      console.error(err); 
    } finally { 
      setIsTyping(false); 
      setFastSelected(null);
    }
  };

  const handleFastSelect = (label: string) => {
    setFastSelected(label);
    handleInitialSubmit(null, label);
  };

  const handleIntensityConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseInt(userInput);
    if (isNaN(val)) return;
    setAddiction(prev => ({ ...prev, intensity: Math.min(10, Math.max(1, val)) }));
    setUserInput('');
    setStep(AppStep.FREQUENCY);
  };

  const handleFrequencySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(userInput);
    if (isNaN(val)) return;
    setAddiction(prev => ({ ...prev, dailyAverage: val }));
    setUserInput('');
    setStep(AppStep.GUIDANCE);
  };

  const handleReduceGoal = () => {
    setAddiction(prev => ({
      ...prev,
      dailyAverage: Math.max(0, Math.floor(prev.dailyAverage * 0.9)),
      currentPhase: prev.currentPhase + 1
    }));
  };

  const handleUpdateStrategy = (strategy: string) => {
    setAddiction(prev => ({ ...prev, psychologicalStrategy: strategy }));
  };

  const handleAddLog = (log: DailyLog) => {
    setLogs(prev => [...prev, log]);
  };

  const handleChatSubmit = async (e: React.FormEvent | string) => {
    if (typeof e !== 'string') e.preventDefault();
    const input = typeof e === 'string' ? e : userInput;
    if (!input.trim()) return;
    
    setUserInput('');
    setMessages(prev => [...prev, { role: 'user', text: input, timestamp: new Date() }]);
    setIsTyping(true);
    try {
      const res = await processChat(messages, addiction, input);
      setMessages(prev => [...prev, { role: 'model', text: res.reply + (res.psychologicalTip ? `\n\n💡 ${res.psychologicalTip}` : ''), timestamp: new Date() }]);
      if (res.usedToday) setPendingTriggerLog({ amount: res.amount || 1 });
    } catch (err) { console.error(err); } finally { setIsTyping(false); }
  };

  const logWithTrigger = (triggerLabel: string) => {
    if (!pendingTriggerLog) return;
    setLogs(prev => [...prev, { date: new Date().toISOString(), amount: pendingTriggerLog.amount, trigger: triggerLabel, feeling: 'Recaída', note: 'Via Chat' }]);
    setPendingTriggerLog(null);
    setMessages(prev => [...prev, { role: 'model', text: `Entendi. Mapeamos o gatilho: "${triggerLabel}". Vamos seguir firmes.`, timestamp: new Date() }]);
  };

  const startApp = () => {
    setMessages([{ role: 'model', text: `Sua jornada oficial começou. Limite: ${addiction.dailyAverage} ${addiction.unit}. Como se sente agora?`, timestamp: new Date() }]);
    setStep(AppStep.MAIN_APP);
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 text-slate-900 overflow-hidden font-inter">
      {step === AppStep.MAIN_APP && (
        <nav className="bg-white/90 backdrop-blur-md border-b px-4 md:px-6 py-3 flex justify-between items-center sticky top-0 z-50">
          <div className="flex items-center gap-2">
             <div className="w-8 h-8 md:w-10 md:h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
                <svg className="w-5 h-5 md:w-6 md:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
             </div>
             <span className="font-black text-lg tracking-tighter hidden sm:block">Controle Total</span>
          </div>
          <div className="flex gap-1 p-1 bg-slate-100 rounded-xl">
            <button onClick={() => setView('chat')} className={`px-4 py-2 rounded-lg text-[10px] md:text-xs font-black transition-all ${view === 'chat' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400'}`}>CHAT</button>
            <button onClick={() => setView('dashboard')} className={`px-4 py-2 rounded-lg text-[10px] md:text-xs font-black transition-all ${view === 'dashboard' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400'}`}>DASHBOARD</button>
          </div>
        </nav>
      )}

      <main className="flex-1 overflow-hidden flex flex-col">
        {step === AppStep.INITIAL && (
          <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-8 animate-in fade-in zoom-in duration-700">
             <div className="max-w-md md:max-w-xl w-full text-center space-y-8 md:space-y-12">
                <div className="w-20 h-20 md:w-24 md:h-24 bg-indigo-100 text-indigo-600 rounded-[2rem] flex items-center justify-center mx-auto shadow-2xl animate-float">
                  <svg className="w-10 h-10 md:w-12 md:h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
                </div>
                
                <div className="space-y-4">
                  <h1 className="text-3xl md:text-5xl font-black text-slate-800 tracking-tight leading-tight">O primeiro passo <br/> é admitir.</h1>
                  <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Comece sua libertação agora</p>
                </div>

                {!fastSelected ? (
                  <div className="space-y-4 animate-in fade-in slide-in-from-top-4">
                    <form onSubmit={(e) => handleInitialSubmit(e)} className="space-y-4">
                       <input autoFocus type="text" value={userInput} onChange={(e) => setUserInput(e.target.value)} placeholder="Ex: Cigarro, Álcool, Redes Sociais..." className="w-full px-6 py-5 rounded-2xl border-4 border-slate-200 focus:border-indigo-500 text-lg md:text-xl font-bold shadow-xl outline-none transition-all" />
                       <button disabled={isTyping || !userInput.trim()} className="w-full bg-indigo-600 text-white py-5 rounded-2xl font-black text-lg hover:bg-indigo-700 active:scale-95 transition-all uppercase tracking-widest shadow-2xl">VAMOS COMEÇAR</button>
                    </form>
                    
                    <div className="flex flex-col items-center gap-4">
                      <div className="flex items-center gap-2 w-full">
                        <div className="h-px bg-slate-200 flex-1"></div>
                        <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest shrink-0">Opção Rápida</span>
                        <div className="h-px bg-slate-200 flex-1"></div>
                      </div>
                      <button 
                        onClick={() => handleFastSelect('Apostas em tigrinho')}
                        className="w-full bg-amber-500 text-white py-5 rounded-2xl font-black text-lg hover:bg-amber-600 active:scale-95 transition-all uppercase tracking-widest shadow-2xl flex items-center justify-center gap-3"
                      >
                        <span className="text-2xl">🎰</span>
                        <span>Apostas em tigrinho</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6 animate-in zoom-in duration-300">
                    <div className="inline-flex items-center gap-4 bg-white px-8 py-6 rounded-3xl shadow-2xl border-4 border-indigo-100">
                       <span className="text-4xl animate-bounce">🎰</span>
                       <div className="text-left">
                         <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Identificando suporte para</p>
                         <h3 className="text-xl font-black text-slate-800">Apostas em tigrinho</h3>
                       </div>
                    </div>
                    <div className="flex justify-center gap-1">
                       <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"></div>
                       <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                       <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                    </div>
                  </div>
                )}
             </div>
          </div>
        )}

        {step === AppStep.INTENSITY && (
          <div className="flex-1 flex flex-col items-center justify-center p-6 bg-white overflow-y-auto">
             <div className="max-w-md w-full text-center space-y-8">
               <h2 className="text-3xl font-black text-slate-800">{addiction.intensityQuestion}</h2>
               <form onSubmit={handleIntensityConfirm} className="space-y-6">
                  <input 
                    autoFocus 
                    type="number" 
                    min="1"
                    max="10"
                    value={userInput} 
                    onChange={(e) => setUserInput(e.target.value)} 
                    placeholder="1-10"
                    className="w-full px-6 py-6 rounded-2xl border-4 border-slate-200 focus:border-indigo-500 text-5xl font-black text-center outline-none" 
                  />
                  <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Digite um nível de 1 a 10</p>
                  <button className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-lg">PRÓXIMO</button>
               </form>
             </div>
          </div>
        )}

        {step === AppStep.FREQUENCY && (
          <div className="flex-1 flex flex-col items-center justify-center p-6 bg-white overflow-y-auto">
             <div className="max-w-md w-full text-center space-y-8">
               <h2 className="text-3xl font-black text-slate-800">{addiction.frequencyQuestion}</h2>
               <form onSubmit={handleFrequencySubmit} className="space-y-6">
                  <div className="relative">
                    {addiction.unit === 'reais' && (
                      <span className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 font-black text-3xl">R$</span>
                    )}
                    <input 
                      autoFocus 
                      type="number" 
                      value={userInput} 
                      onChange={(e) => setUserInput(e.target.value)} 
                      placeholder="0"
                      className={`w-full px-6 py-6 rounded-2xl border-4 border-slate-200 focus:border-indigo-500 text-5xl font-black text-center outline-none ${addiction.unit === 'reais' ? 'pl-16' : ''}`} 
                    />
                    <span className="absolute bottom-4 right-6 text-slate-300 font-black uppercase text-[10px]">{addiction.unit}</span>
                  </div>
                  <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Digite o valor exato acima</p>
                  <button className="w-full bg-indigo-600 text-white py-5 rounded-2xl font-black text-lg">CONTINUAR</button>
               </form>
             </div>
          </div>
        )}

        {step === AppStep.GUIDANCE && (
          <div className="flex-1 flex flex-col items-center justify-center p-6 bg-white overflow-y-auto">
             <div className="max-w-md w-full text-center space-y-8">
               <h2 className="text-3xl font-black text-slate-800">Sua Estratégia Ativa</h2>
               <div className="bg-slate-50 p-6 rounded-2xl border text-left space-y-4">
                 <p className="text-slate-600 font-medium leading-relaxed">Utilizaremos o método <strong>{addiction.psychologicalStrategy}</strong>. Teremos registros diários e suporte instantâneo via chat para auxiliar na sua recuperação.</p>
               </div>
               <button onClick={startApp} className="w-full bg-indigo-600 text-white py-5 rounded-2xl font-black text-lg shadow-xl">INICIAR AGORA</button>
             </div>
          </div>
        )}

        {step === AppStep.MAIN_APP && (
          <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden relative">
            {view === 'chat' ? (
              <div className="flex-1 flex flex-col h-full max-w-4xl mx-auto w-full overflow-hidden">
                <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 custom-scrollbar">
                  {messages.map((msg, i) => (
                    <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} animate-in slide-in-from-bottom-2 duration-300`}>
                      <div className={`max-w-[90%] md:max-w-[80%] p-4 rounded-2xl shadow-sm font-medium leading-relaxed whitespace-pre-wrap ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white border text-slate-700 rounded-tl-none'}`}>
                        {msg.text}
                      </div>
                      <span className="text-[8px] font-bold text-slate-300 mt-1 px-2 uppercase tracking-widest">{new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    </div>
                  ))}
                  {isTyping && <div className="text-[10px] font-black text-indigo-400 ml-4 animate-pulse uppercase tracking-widest">Mentor digitando...</div>}
                  
                  {pendingTriggerLog && (
                    <div className="bg-white p-5 rounded-2xl border-2 border-dashed border-indigo-100 animate-in fade-in duration-500 space-y-4 shadow-sm">
                      <p className="text-[10px] font-black text-indigo-900 uppercase tracking-widest text-center">Identificamos um uso. O que causou isso?</p>
                      <div className="flex flex-wrap gap-2 justify-center">
                        {TRIGGERS.map(t => (
                          <button key={t.id} onClick={() => logWithTrigger(t.label)} className="px-4 py-2 bg-slate-50 rounded-xl border border-transparent hover:border-indigo-400 active:bg-indigo-50 transition-all flex items-center gap-2 font-bold text-xs">
                            <span>{t.icon}</span> {t.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-4 md:p-6 bg-transparent flex flex-col">
                  <form onSubmit={handleChatSubmit} className="flex gap-2 bg-white p-1.5 rounded-2xl shadow-2xl border focus-within:border-indigo-400">
                    <input type="text" value={userInput} onChange={(e) => setUserInput(e.target.value)} placeholder="Como você está?" className="flex-1 bg-transparent px-4 py-3 outline-none font-bold text-sm" />
                    <button className="bg-indigo-600 text-white w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg active:scale-95"><svg className="w-5 h-5 rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg></button>
                  </form>
                </div>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto">
                <Dashboard 
                  addiction={addiction} 
                  logs={logs} 
                  reminders={reminders} 
                  onUpdateReminders={() => {}} 
                  onReduceGoal={handleReduceGoal} 
                  onUpdateStrategy={handleUpdateStrategy}
                  onAddLog={handleAddLog}
                />
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
