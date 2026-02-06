
import React, { useState, useEffect } from 'react';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell 
} from 'recharts';
import { AddictionData, DailyLog, ReminderConfig } from '../types';
import { generateWeeklyAnalysis } from '../services/geminiService';

interface DashboardProps {
  addiction: AddictionData;
  logs: DailyLog[];
  reminders: ReminderConfig;
  onUpdateReminders: (config: ReminderConfig) => void;
  onReduceGoal: () => void;
  onUpdateStrategy: (strategy: string) => void;
  onAddLog: (log: DailyLog) => void;
}

const STRATEGIES = [
  { id: 'gradual', name: 'Redução Gradual Assistida', icon: '📉' },
  { id: 'triggers', name: 'Controle de Gatilhos', icon: '🧠' },
  { id: 'mindfulness', name: 'Mindfulness para Impulsos', icon: '🧘' },
  { id: 'tcc', name: 'Terapia Cognitiva', icon: '🛡️' }
];

const COLORS = ['#6366f1', '#f43f5e', '#10b981', '#f59e0b', '#8b5cf6'];

const Dashboard: React.FC<DashboardProps> = ({ 
  addiction, logs, onReduceGoal, onUpdateStrategy, onAddLog 
}) => {
  const [report, setReport] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showVictoryOverlay, setShowVictoryOverlay] = useState(false);
  const [particles, setParticles] = useState<{ id: number, x: number, y: number, color: string }[]>([]);

  const todayStr = new Date().toISOString().split('T')[0];
  const hasLogToday = logs.some(l => l.date.split('T')[0] === todayStr);

  const triggerData = logs.reduce((acc: any[], log) => {
    if (!log.trigger) return acc;
    const existing = acc.find(t => t.name === log.trigger);
    if (existing) existing.value += 1;
    else acc.push({ name: log.trigger, value: 1 });
    return acc;
  }, []);

  const chartData = logs.map(log => ({
    name: new Date(log.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
    consumo: log.amount,
    limite: addiction.dailyAverage
  }));

  const totalDays = logs.length || 1;
  const successDays = logs.filter(l => l.amount <= addiction.dailyAverage).length;
  const successRate = Math.round((successDays / totalDays) * 100);

  const handleGenerateReport = async () => {
    setIsGenerating(true);
    try {
      const result = await generateWeeklyAnalysis(logs, addiction);
      setReport(result);
    } catch (e) {
      console.error(e);
    } finally {
      setIsGenerating(false);
    }
  };

  const registerVictory = () => {
    onAddLog({
      date: new Date().toISOString(),
      amount: 0,
      feeling: 'Vitorioso',
      note: 'Check-in manual de vitória',
      trigger: 'Nenhum'
    });
    
    // Animação de partículas
    const newParticles = Array.from({ length: 20 }).map((_, i) => ({
      id: Math.random(),
      x: Math.random() * 100,
      y: Math.random() * 100,
      color: COLORS[Math.floor(Math.random() * COLORS.length)]
    }));
    setParticles(newParticles);
    setShowVictoryOverlay(true);
    
    setTimeout(() => {
      setShowVictoryOverlay(false);
      setParticles([]);
    }, 3000);
  };

  return (
    <div className="space-y-6 md:space-y-10 p-4 md:p-8 bg-slate-50 min-h-screen pb-40 max-w-7xl mx-auto relative overflow-hidden">
      
      {/* Victory Animation Overlay */}
      {showVictoryOverlay && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none">
           <div className="absolute inset-0 bg-indigo-600/10 backdrop-blur-[2px] animate-in fade-in duration-500"></div>
           <div className="relative z-10 bg-white p-8 rounded-[3rem] shadow-2xl border-4 border-emerald-400 flex flex-col items-center gap-4 animate-in zoom-in duration-500">
              <span className="text-7xl animate-bounce">🏆</span>
              <h2 className="text-3xl font-black text-slate-800 text-center">VITÓRIA REGISTRADA!</h2>
              <p className="text-emerald-600 font-bold uppercase tracking-widest text-xs">Mais um dia no controle.</p>
           </div>
           {particles.map(p => (
             <div 
               key={p.id}
               className="absolute w-3 h-3 rounded-full animate-ping opacity-70"
               style={{ 
                 left: `${p.x}%`, 
                 top: `${p.y}%`, 
                 backgroundColor: p.color,
                 animationDuration: `${Math.random() * 2 + 1}s`
               }}
             />
           ))}
        </div>
      )}

      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white p-6 md:p-10 rounded-2xl md:rounded-[3rem] shadow-xl border border-white relative overflow-hidden">
        <div className="flex flex-col gap-2 relative z-10">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-indigo-600 text-white text-[9px] md:text-[10px] font-black rounded-full uppercase">Fase {addiction.currentPhase}</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tighter">{addiction.name}</h1>
          <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Meta: {addiction.dailyAverage} {addiction.unit}</p>
        </div>
        
        <div className="flex gap-2 w-full md:w-auto relative z-10">
          <button 
            disabled={logs.length < 1}
            onClick={handleGenerateReport}
            className="flex-1 md:flex-none px-6 md:px-8 py-3 md:py-4 bg-slate-900 text-white rounded-xl md:rounded-3xl font-black text-xs md:text-sm hover:bg-black transition-all disabled:opacity-30 flex items-center justify-center gap-2 shadow-lg"
          >
            {isGenerating ? 'ANALISANDO...' : 'RELATÓRIO IA'}
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
          </button>
        </div>
      </header>

      {/* Check-in Diário de Vitória */}
      {!hasLogToday && (
        <div className="bg-gradient-to-r from-emerald-500 to-teal-600 p-6 md:p-10 rounded-2xl md:rounded-[3rem] text-white shadow-2xl shadow-emerald-200 border border-emerald-400/20 group relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-125 transition-transform duration-700">
             <svg className="w-40 h-40 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L9.19 8.63L2 9.24L7.46 13.97L5.82 21L12 17.27L18.18 21L16.54 13.97L22 9.24L14.81 8.63L12 2Z"/></svg>
          </div>
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-center md:text-left space-y-2">
              <h2 className="text-2xl md:text-3xl font-black tracking-tight">Venceu a tentação hoje?</h2>
              <p className="font-bold text-emerald-100 uppercase tracking-widest text-[10px]">Registre sua vitória agora mesmo</p>
            </div>
            <button 
              onClick={registerVictory}
              className="w-full md:w-auto px-10 py-5 bg-white text-emerald-600 rounded-2xl md:rounded-3xl font-black text-sm md:text-base hover:shadow-xl hover:-translate-y-1 active:scale-95 transition-all uppercase tracking-widest"
            >
              🏆 REGISTRAR VITÓRIA
            </button>
          </div>
        </div>
      )}

      {report && (
        <div className="bg-indigo-50 p-6 md:p-10 rounded-2xl md:rounded-[3rem] border border-indigo-100 animate-in fade-in zoom-in duration-500 relative">
          <button onClick={() => setReport(null)} className="absolute top-4 right-4 md:top-6 md:right-6 text-indigo-300 hover:text-indigo-600">
             <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"></path></svg>
          </button>
          <div className="flex items-center gap-4 mb-6">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-indigo-600 text-white rounded-xl md:rounded-2xl flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
            </div>
            <h2 className="text-xl md:text-2xl font-black text-indigo-900">Mentor IA Insights</h2>
          </div>
          <div className="prose prose-indigo max-w-none text-indigo-800 font-medium whitespace-pre-wrap text-sm md:text-base">
            {report}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-10">
        <div className="space-y-6 md:space-y-10">
          <div className="bg-slate-900 p-6 md:p-8 rounded-2xl md:rounded-[3rem] text-white">
            <h3 className="text-[10px] font-black uppercase text-indigo-400 mb-6">Estratégia</h3>
            <div className="space-y-2 md:space-y-3">
              {STRATEGIES.map(strat => (
                <button 
                  key={strat.id} 
                  onClick={() => onUpdateStrategy(strat.name)}
                  className={`w-full text-left p-4 rounded-xl md:rounded-2xl border transition-all text-xs md:text-sm font-bold flex items-center gap-3 active:scale-95 ${addiction.psychologicalStrategy === strat.name ? 'bg-indigo-600 border-indigo-400' : 'bg-white/5 border-white/5 text-slate-400'}`}
                >
                  <span className="text-lg md:text-xl">{strat.icon}</span> {strat.name}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white p-6 md:p-8 rounded-2xl md:rounded-[3rem] shadow-xl border border-white">
            <h3 className="text-[10px] font-black uppercase text-slate-400 mb-6 text-center">Gatilhos</h3>
            {triggerData.length > 0 ? (
              <div className="h-48 md:h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={triggerData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={8}>
                      {triggerData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-48 md:h-64 flex flex-col items-center justify-center text-slate-300 gap-3">
                <svg className="w-10 h-10 opacity-20" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd"></path></svg>
                <span className="text-[10px] font-black uppercase tracking-widest">Sem Gatilhos</span>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6 md:space-y-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">
            <div className="bg-white p-8 md:p-10 rounded-2xl md:rounded-[3rem] flex flex-col items-center justify-center text-center shadow-md">
              <h3 className="text-[10px] font-black text-slate-400 uppercase mb-4 md:mb-6">Domínio de Impulsos</h3>
              <div className="text-5xl md:text-6xl font-black text-indigo-600 transition-all duration-1000">{successRate}%</div>
              <p className="text-[10px] md:text-xs text-slate-400 mt-2 font-bold uppercase tracking-widest">Taxa de Sucesso</p>
            </div>

            <div className="bg-white p-8 md:p-10 rounded-2xl md:rounded-[3rem] space-y-6 shadow-md">
              <h3 className="text-[10px] font-black text-slate-400 uppercase">Resumo Semanal</h3>
              <div className="grid grid-cols-2 gap-4">
                 <div className="p-4 md:p-5 bg-slate-50 rounded-xl md:rounded-2xl border border-slate-100">
                    <span className="text-[9px] font-black text-slate-400 block mb-1">REGISTROS</span>
                    <span className="text-xl md:text-2xl font-black">{logs.length}</span>
                 </div>
                 <div className="p-4 md:p-5 bg-emerald-50 rounded-xl md:rounded-2xl border border-emerald-100 transition-all duration-1000">
                    <span className="text-[9px] font-black text-emerald-600 block mb-1 uppercase">Vitórias</span>
                    <span className="text-xl md:text-2xl font-black text-emerald-700">{successDays}</span>
                 </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 md:p-10 rounded-2xl md:rounded-[3rem] h-80 md:h-96 shadow-md">
             <h3 className="text-[10px] font-black text-slate-400 uppercase mb-8">Evolução do Consumo</h3>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 9}} />
                <YAxis hide />
                <Tooltip />
                <Area type="monotone" dataKey="consumo" stroke="#6366f1" strokeWidth={4} fill="#6366f115" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
