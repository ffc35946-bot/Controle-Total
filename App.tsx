
import React, { useState, useEffect, useRef } from 'react';
import { AddictionData, DailyLog, ChatMessage, AppStep, Badge } from './types';
import { identifyAddiction, processChat } from './services/geminiService';
import Dashboard from './components/Dashboard';

const INITIAL_BADGES: Badge[] = [
  { id: 'first_log', name: 'Primeiro Passo', description: 'Início da jornada.', icon: '🏆', earned: false },
  { id: 'streak_3', name: 'Consistência', description: '3 dias de foco.', icon: '✨', earned: false },
  { id: 'streak_7', name: 'Inabalável', description: '7 dias de controle.', icon: '🔥', earned: false },
];

const STRATEGIES = [
  { id: 'gradual', name: 'Redução Gradual Assistida', icon: '📉', desc: 'Diminuir aos poucos.' },
  { id: 'triggers', name: 'Controle de Gatilhos', icon: '🧠', desc: 'Evitar estímulos.' },
  { id: 'tcc', name: 'Terapia Cognitiva', icon: '🛡️', desc: 'Mudar pensamentos.' }
];

const App: React.FC = () => {
  const [step, setStep] = useState<AppStep>(AppStep.AUTH);
  const [isLogin, setIsLogin] = useState(true);
  const [view, setView] = useState<'chat' | 'dashboard'>('chat');
  const [showReward, setShowReward] = useState<string | null>(null);
  const [addiction, setAddiction] = useState<AddictionData>({
    name: '', intensity: 5, initialIntensity: 5, dailyAverage: 0, unit: 'unidades',
    intensityQuestion: '', frequencyQuestion: '',
    psychologicalStrategy: STRATEGIES[0].name, currentPhase: 1, badges: INITIAL_BADGES
  });

  const [userInput, setUserInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isTyping]);

  useEffect(() => {
    if (step === AppStep.MAIN_APP && messages.length === 0) {
      setMessages([{
        role: 'model',
        text: `Olá! Sou seu mentor. Vamos vencer o vício em ${addiction.name}. Como você se sente agora?`,
        timestamp: new Date()
      }]);
    }
  }, [step]);

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    setStep(AppStep.INITIAL);
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
        result.name = "Tigrinho";
      }
      setAddiction(prev => ({ ...prev, ...result }));
      setUserInput('');
      setStep(AppStep.METHODOLOGY);
    } catch (err) { 
      setStep(AppStep.METHODOLOGY);
    } finally { 
      setIsTyping(false); 
    }
  };

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim()) return;
    const input = userInput;
    setUserInput('');
    setMessages(prev => [...prev, { role: 'user', text: input, timestamp: new Date() }]);
    setIsTyping(true);
    
    try {
      const daysClean = logs.filter(l => l.amount <= addiction.dailyAverage).length;
      const res = await processChat(messages, addiction, input, daysClean);
      
      setMessages(prev => [...prev, { role: 'model', text: res.reply, timestamp: new Date() }]);
      
      const newLog: DailyLog = {
        date: new Date().toISOString(),
        amount: res.usedToday ? (res.amount || addiction.dailyAverage + 1) : 0,
        feeling: res.usedToday ? 'Dificuldade' : 'Vencer',
        note: input,
        trigger: res.detectedTrigger || 'Nenhum'
      };
      setLogs(prev => [...prev, newLog]);

      if (res.grantBadgeId) {
        const badge = addiction.badges.find(b => b.id === res.grantBadgeId);
        if (badge && !badge.earned) {
          setShowReward(badge.name);
          setTimeout(() => setShowReward(null), 4000);
          setAddiction(prev => ({
            ...prev,
            badges: prev.badges.map(b => b.id === res.grantBadgeId ? { ...b, earned: true } : b)
          }));
        }
      }
      if (res.shouldAdvancePhase) {
        setAddiction(prev => ({ ...prev, currentPhase: prev.currentPhase + 1 }));
      }
    } catch (err) { 
      setMessages(prev => [...prev, { role: 'model', text: "Foco na meta, você consegue!", timestamp: new Date() }]);
    } finally { setIsTyping(false); }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 text-slate-900 overflow-hidden font-inter">
      {showReward && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl text-center border-4 border-indigo-500 animate-in zoom-in scale-110">
            <span className="text-6xl block mb-4">✨</span>
            <h3 className="text-xl font-black text-slate-900 uppercase">IA Concedeu Medalha!</h3>
            <p className="text-indigo-600 font-bold mt-1 uppercase tracking-widest text-[10px]">{showReward}</p>
          </div>
        </div>
      )}

      {step === AppStep.MAIN_APP && (
        <nav className="bg-white/90 backdrop-blur-md border-b px-4 py-3 flex justify-between items-center sticky top-0 z-50">
          <div className="flex items-center gap-2">
             <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
             </div>
             <span className="font-black text-lg">Controle Total</span>
          </div>
          <div className="flex gap-1 p-1 bg-slate-100 rounded-xl">
            <button onClick={() => setView('chat')} className={`px-4 py-2 rounded-lg text-[10px] font-black transition-all ${view === 'chat' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400'}`}>MENTOR</button>
            <button onClick={() => setView('dashboard')} className={`px-4 py-2 rounded-lg text-[10px] font-black transition-all ${view === 'dashboard' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400'}`}>STATUS</button>
          </div>
        </nav>
      )}

      <main className="flex-1 overflow-hidden flex flex-col">
        {step === AppStep.AUTH && (
          <div className="flex-1 flex flex-col items-center justify-center p-6 bg-white">
            <div className="max-w-md w-full space-y-8 text-center">
              <h1 className="text-4xl font-black text-slate-900">Bem-vindo</h1>
              <form onSubmit={handleAuth} className="space-y-4">
                <input type="email" placeholder="E-mail" className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-indigo-500 outline-none font-bold" />
                <button type="submit" className="w-full bg-indigo-600 text-white py-5 rounded-2xl font-black uppercase tracking-widest shadow-xl">ENTRAR</button>
              </form>
            </div>
          </div>
        )}

        {step === AppStep.INITIAL && (
          <div className="flex-1 flex flex-col items-center justify-center p-6 bg-white animate-in zoom-in">
             <div className="max-w-md w-full text-center space-y-12">
                <h2 className="text-3xl font-black text-slate-800 tracking-tight">O que você deseja <br/>superar?</h2>
                <div className="space-y-6">
                  <button onClick={() => handleInitialSubmit(null, 'Tigrinho')} className="w-full p-6 bg-amber-50 border-4 border-amber-200 rounded-3xl flex items-center justify-between group active:scale-95 transition-transform">
                    <div className="flex items-center gap-4 text-left">
                      <span className="text-4xl">🐯</span>
                      <div>
                        <h4 className="font-black text-amber-900 uppercase italic">Tigrinho</h4>
                        <p className="text-[10px] font-bold text-amber-600 uppercase">Apostas de Risco</p>
                      </div>
                    </div>
                  </button>
                  <form onSubmit={handleInitialSubmit} className="space-y-4">
                    <input autoFocus type="text" value={userInput} onChange={e => setUserInput(e.target.value)} placeholder="Outro vício..." className="w-full px-6 py-5 rounded-2xl border-4 border-slate-200 focus:border-indigo-500 text-xl font-bold outline-none" />
                    <button disabled={isTyping} className="w-full bg-indigo-600 text-white py-5 rounded-2xl font-black uppercase tracking-widest shadow-xl">CONTINUAR</button>
                  </form>
                </div>
             </div>
          </div>
        )}

        {step === AppStep.METHODOLOGY && (
          <div className="flex-1 flex flex-col p-6 bg-white animate-in slide-in-from-right overflow-y-auto">
            <div className="max-w-md w-full mx-auto space-y-8 py-8 text-center">
              <h2 className="text-3xl font-black text-slate-800">Caminho</h2>
              <div className="grid gap-4">
                {STRATEGIES.map(strat => (
                  <button key={strat.id} onClick={() => { setAddiction({...addiction, psychologicalStrategy: strat.name}); setStep(AppStep.INTENSITY); }} className="w-full text-left p-6 rounded-3xl border-2 border-slate-100 hover:border-indigo-500 transition-all">
                    <div className="flex items-center gap-4">
                      <span className="text-3xl">{strat.icon}</span>
                      <h4 className="font-black text-slate-800">{strat.name}</h4>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === AppStep.INTENSITY && (
          <div className="flex-1 flex flex-col items-center justify-center p-6 bg-white">
             <div className="max-w-md w-full text-center space-y-8">
               <h2 className="text-3xl font-black text-slate-800">Intensidade (1-10)?</h2>
               <form onSubmit={(e) => { e.preventDefault(); setStep(AppStep.FREQUENCY); setUserInput(''); }} className="space-y-6">
                  <input autoFocus type="number" min="1" max="10" value={userInput} onChange={e => { const val = parseInt(e.target.value); if(!isNaN(val)) setAddiction({...addiction, intensity: val}); setUserInput(e.target.value); }} className="w-full px-6 py-6 rounded-2xl border-4 border-slate-200 focus:border-indigo-500 text-5xl font-black text-center outline-none" />
                  <button className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black">PRÓXIMO</button>
               </form>
             </div>
          </div>
        )}

        {step === AppStep.FREQUENCY && (
          <div className="flex-1 flex flex-col items-center justify-center p-6 bg-white">
             <div className="max-w-md w-full text-center space-y-8">
               <h2 className="text-3xl font-black text-slate-800">Consumo médio?</h2>
               <form onSubmit={(e) => { e.preventDefault(); setStep(AppStep.GUIDANCE); }} className="space-y-6">
                  <input autoFocus type="number" value={userInput} onChange={e => { const val = parseFloat(e.target.value); if(!isNaN(val)) setAddiction({...addiction, dailyAverage: val}); setUserInput(e.target.value); }} className="w-full px-6 py-6 rounded-2xl border-4 border-slate-200 focus:border-indigo-500 text-5xl font-black text-center outline-none" />
                  <button className="w-full bg-indigo-600 text-white py-5 rounded-2xl font-black">FINALIZAR</button>
               </form>
             </div>
          </div>
        )}

        {step === AppStep.GUIDANCE && (
          <div className="flex-1 flex flex-col items-center justify-center p-6 bg-white text-center space-y-8">
             <h2 className="text-4xl font-black text-slate-900">Mentor Ativado.</h2>
             <p className="text-slate-500 font-medium max-w-xs mx-auto">Vou te guiar e te dar medalhas conforme você vence cada dia.</p>
             <button onClick={() => setStep(AppStep.MAIN_APP)} className="w-full max-w-md bg-indigo-600 text-white py-5 rounded-2xl font-black text-lg shadow-xl">INICIAR JORNADA</button>
          </div>
        )}

        {step === AppStep.MAIN_APP && (
          <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden relative">
            {view === 'chat' ? (
              <div className="flex-1 flex flex-col h-full max-w-2xl mx-auto w-full overflow-hidden">
                <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
                  {messages.map((msg, i) => (
                    <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} animate-in slide-in-from-bottom-2`}>
                      <div className={`max-w-[85%] p-4 rounded-2xl shadow-sm font-medium ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white border text-slate-700 rounded-tl-none'}`}>
                        {msg.text}
                      </div>
                    </div>
                  ))}
                  {isTyping && <div className="text-[10px] font-black text-indigo-400 ml-2 animate-pulse uppercase">O Juiz está analisando...</div>}
                </div>
                <div className="p-4">
                  <form onSubmit={handleChatSubmit} className="flex gap-2 bg-white p-1.5 rounded-2xl shadow-xl border">
                    <input type="text" value={userInput} onChange={e => setUserInput(e.target.value)} placeholder="Fale sobre seu dia..." className="flex-1 px-4 py-3 outline-none font-bold text-sm" />
                    <button type="submit" className="bg-indigo-600 text-white w-10 h-10 rounded-xl flex items-center justify-center shadow-lg active:scale-95"><svg className="w-5 h-5 rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg></button>
                  </form>
                </div>
              </div>
            ) : (
              <Dashboard addiction={addiction} logs={logs} reminders={{enabled: true, time: '', message: ''}} onUpdateReminders={() => {}} onReduceGoal={() => {}} onUpdateStrategy={(s) => setAddiction({...addiction, psychologicalStrategy: s})} onAddLog={l => setLogs([...logs, l])} />
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
