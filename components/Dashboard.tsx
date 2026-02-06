
import React, { useState } from 'react';
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
  addiction, logs, onUpdateStrategy, onAddLog 
}) => {
  const [report, setReport] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showVictoryOverlay, setShowVictoryOverlay] = useState(false);
  const [particles, setParticles] = useState<{ id: number, x: number, y: number, color: string }[]>([]);

  const todayStr = new Date().toISOString().split('T')[0];
  const hasLogToday = logs.some(l => l.date.split('T')[0] === todayStr);

  const triggerData = (logs || []).reduce((acc: any[], log) => {
    if (!log.trigger || log.trigger === 'Nenhum') return acc;
    const existing = acc.find(t => t.name === log.trigger);
    if (existing) existing.value += 1;
    else acc.push({ name: log.trigger, value: 1 });
    return acc;
  }, []);

  const chartData = (logs || []).map(log => ({
    name: new Date(log.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
    consumo: log.amount,
    limite: addiction.dailyAverage
  }));

  const totalDays = logs.length || 0;
  const successDays = logs.filter(l => l.amount <= addiction.dailyAverage).length;
  const successRate = totalDays > 0 ? Math.round((successDays / totalDays) * 100) : 0;

  const handleGenerateReport = async () => {
    if (logs.length === 0) return;
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

      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white p-6 md:p-10 rounded-2xl shadow-xl border border-white">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-indigo-600 text-white text-[9px] font-black rounded-full uppercase">Fase {addiction.currentPhase}</span>
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter">{addiction.name || 'Recuperação'}</h1>
          <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Meta: {addiction.dailyAverage} {addiction.unit}</p>
        </div>
        
        <button 
          disabled={logs.length < 1 || isGenerating}
          onClick={handleGenerateReport}
          className="w-full md:w-auto px-8 py-4 bg-slate-900 text-white rounded-3xl font-black text-sm hover:bg-black transition-all disabled:opacity-30 shadow-lg flex items-center justify-center gap-2"
        >
          {isGenerating ? 'ANALISANDO...' : 'RELATÓRIO IA'}
        </button>
      </header>

      {!hasLogToday && (
        <div className="bg-gradient-to-r from-emerald-500 to-teal-600 p-8 rounded-[2rem] text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-center md:text-left">
            <h2 className="text-2xl font-black">Venceu hoje?</h2>
            <p className="font-bold text-emerald-100 uppercase tracking-widest text-[10px]">Celebre sua vitória diária</p>
          </div>
          <button onClick={registerVictory} className="px-10 py-4 bg-white text-emerald-600 rounded-2xl font-black hover:scale-105 transition-transform uppercase text-sm">
            🏆 REGISTRAR
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-[2rem] shadow-md">
          <h3 className="text-[10px] font-black text-slate-400 uppercase mb-6">Estratégia Atual</h3>
          <div className="space-y-2">
            {STRATEGIES.map(strat => (
              <button 
                key={strat.id} 
                onClick={() => onUpdateStrategy(strat.name)}
                className={`w-full text-left p-4 rounded-xl border font-bold text-xs flex items-center gap-3 transition-all ${addiction.psychologicalStrategy === strat.name ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-slate-50 border-slate-100 text-slate-500'}`}
              >
                <span>{strat.icon}</span> {strat.name}
              </button>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-8 rounded-[2rem] shadow-md flex flex-col items-center justify-center">
            <span className="text-5xl font-black text-indigo-600">{successRate}%</span>
            <span className="text-[10px] font-black text-slate-400 uppercase mt-2">Sucesso no Controle</span>
          </div>
          <div className="bg-white p-8 rounded-[2rem] shadow-md flex flex-col items-center justify-center">
            <span className="text-5xl font-black text-emerald-600">{successDays}</span>
            <span className="text-[10px] font-black text-slate-400 uppercase mt-2">Dias Vitoriosos</span>
          </div>
        </div>
      </div>

      {chartData.length > 0 && (
        <div className="bg-white p-8 rounded-[2rem] shadow-md h-80">
          <h3 className="text-[10px] font-black text-slate-400 uppercase mb-8">Histórico de Consumo</h3>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{fill: '#94a3b8', fontSize: 10}} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip />
              <Area type="monotone" dataKey="consumo" stroke="#6366f1" fill="#6366f120" strokeWidth={3} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
