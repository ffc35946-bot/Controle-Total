
import React, { useState, useMemo } from 'react';
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

const COLORS = ['#6366f1', '#f43f5e', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4'];

const Dashboard: React.FC<DashboardProps> = ({ 
  addiction, logs, onUpdateStrategy, onAddLog 
}) => {
  const [report, setReport] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showVictoryOverlay, setShowVictoryOverlay] = useState(false);

  // Cálculos de Status
  const stats = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const hasLogToday = logs.some(l => l.date.split('T')[0] === todayStr);
    
    // Streak (Sequência)
    let streak = 0;
    const sortedLogs = [...logs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    for (const log of sortedLogs) {
      if (log.amount <= addiction.dailyAverage) streak++;
      else break;
    }

    // Economia / Evitação
    const totalAvoided = logs.reduce((acc, log) => {
      const avoided = Math.max(0, addiction.dailyAverage - log.amount);
      return acc + avoided;
    }, 0);

    // Dados para o gráfico de pizza (Gatilhos)
    const triggersMap = logs.reduce((acc: any, log) => {
      if (!log.trigger || log.trigger === 'Nenhum') return acc;
      acc[log.trigger] = (acc[log.trigger] || 0) + 1;
      return acc;
    }, {});
    const triggerData = Object.keys(triggersMap).map(key => ({ name: key, value: triggersMap[key] }));

    // Dados para o gráfico de área (Histórico)
    const chartData = logs.slice(-7).map(log => ({
      name: new Date(log.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      valor: log.amount,
      limite: addiction.dailyAverage
    }));

    return { hasLogToday, streak, totalAvoided, triggerData, chartData };
  }, [logs, addiction]);

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
      note: 'Check-in manual',
      trigger: 'Nenhum'
    });
    setShowVictoryOverlay(true);
    setTimeout(() => setShowVictoryOverlay(false), 3000);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 custom-scrollbar p-4 md:p-8 space-y-8 pb-32">
      {showVictoryOverlay && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none">
           <div className="absolute inset-0 bg-indigo-600/20 backdrop-blur-sm animate-in fade-in"></div>
           <div className="relative z-10 bg-white p-10 rounded-[3rem] shadow-2xl border-4 border-emerald-400 text-center animate-in zoom-in">
              <span className="text-8xl block mb-4 animate-bounce">💎</span>
              <h2 className="text-3xl font-black text-slate-800 uppercase italic">Inquebrável</h2>
              <p className="text-emerald-600 font-black uppercase tracking-widest text-[10px] mt-2">+1 Dia de Sobriedade</p>
           </div>
        </div>
      )}

      {/* Header Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-between">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sequência</span>
          <div className="flex items-end gap-1 mt-2">
            <span className="text-4xl font-black text-indigo-600 leading-none">{stats.streak}</span>
            <span className="text-[10px] font-bold text-indigo-300 pb-1">DIAS</span>
          </div>
        </div>
        
        <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-between">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            {addiction.unit === 'reais' ? 'Economia' : 'Evitados'}
          </span>
          <div className="flex items-end gap-1 mt-2">
            <span className="text-3xl font-black text-emerald-600 leading-none">
              {addiction.unit === 'reais' ? `R$ ${stats.totalAvoided}` : stats.totalAvoided}
            </span>
            <span className="text-[10px] font-bold text-emerald-300 pb-1 uppercase">{addiction.unit}</span>
          </div>
        </div>

        <div className="col-span-2 bg-indigo-600 p-5 rounded-3xl shadow-lg shadow-indigo-100 flex items-center justify-between text-white">
          <div>
            <span className="text-[10px] font-black text-indigo-200 uppercase tracking-widest">Fase Atual</span>
            <h3 className="text-xl font-black italic">Mestre do Autocontrole</h3>
          </div>
          <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center font-black text-xl">
            {addiction.currentPhase}
          </div>
        </div>
      </div>

      {!stats.hasLogToday && (
        <div className="bg-gradient-to-br from-indigo-500 to-indigo-700 p-8 rounded-[2.5rem] shadow-xl text-white relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
            <svg className="w-32 h-32" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" /></svg>
          </div>
          <div className="relative z-10 space-y-4">
            <h2 className="text-3xl font-black leading-tight">Você venceu o <br/>impulso hoje?</h2>
            <p className="text-indigo-100 font-medium opacity-80">Registrar sua vitória diária fortalece sua jornada mental.</p>
            <button onClick={registerVictory} className="bg-white text-indigo-600 px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg active:scale-95 transition-all">
              SIM, EU VENCI! 🏆
            </button>
          </div>
        </div>
      )}

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Main Consumption Chart */}
        <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Evolução do Consumo</h3>
            <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">Últimos 7 registros</span>
          </div>
          <div className="h-64">
            {stats.chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.chartData}>
                  <defs>
                    <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{fill: '#94a3b8', fontSize: 10}} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip 
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    itemStyle={{ color: '#6366f1', fontWeight: 'bold' }}
                  />
                  <Area type="monotone" dataKey="valor" stroke="#6366f1" strokeWidth={4} fillOpacity={1} fill="url(#colorVal)" />
                  <Area type="step" dataKey="limite" stroke="#f43f5e" strokeWidth={2} strokeDasharray="5 5" fill="none" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-300 font-bold text-sm italic">Sem dados suficientes ainda.</div>
            )}
          </div>
        </div>

        {/* Triggers Pie Chart */}
        <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100">
           <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Gatilhos Recorrentes</h3>
           <div className="h-64 flex flex-col md:flex-row items-center">
             {stats.triggerData.length > 0 ? (
               <>
                 <div className="flex-1 h-full w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={stats.triggerData}
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {stats.triggerData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                 </div>
                 <div className="flex-1 space-y-2 mt-4 md:mt-0">
                    {stats.triggerData.map((t, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                        <span className="text-xs font-bold text-slate-600">{t.name}</span>
                        <span className="text-[10px] text-slate-400 ml-auto">{t.value}x</span>
                      </div>
                    ))}
                 </div>
               </>
             ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-300 font-bold text-sm italic">Mantenha-se limpo para não gerar gatilhos.</div>
             )}
           </div>
        </div>
      </div>

      {/* Strategies and AI Report */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100">
          <h3 className="text-[10px] font-black text-slate-400 uppercase mb-6">Metodologia</h3>
          <div className="space-y-3">
            {STRATEGIES.map(strat => (
              <button 
                key={strat.id} 
                onClick={() => onUpdateStrategy(strat.name)}
                className={`w-full text-left p-4 rounded-2xl border-2 font-black text-xs flex items-center gap-3 transition-all ${addiction.psychologicalStrategy === strat.name ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-slate-50 border-transparent text-slate-500'}`}
              >
                <span>{strat.icon}</span> {strat.name}
              </button>
            ))}
          </div>
        </div>

        <div className="md:col-span-2 bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div>
              <h3 className="text-2xl font-black text-slate-800 tracking-tight">Análise IA</h3>
              <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-1">Mentor de Recuperação Ativo</p>
            </div>
            <button 
              disabled={logs.length < 2 || isGenerating}
              onClick={handleGenerateReport}
              className="w-full md:w-auto px-6 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest disabled:opacity-20 hover:bg-black transition-all"
            >
              {isGenerating ? 'PROCESSANDO...' : 'GERAR INSIGHTS'}
            </button>
          </div>
          
          <div className="min-h-[150px] bg-slate-50 p-6 rounded-3xl border border-slate-100 relative">
            {report ? (
              <div className="prose prose-slate prose-sm font-medium text-slate-600 italic leading-relaxed">
                {report}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-300 text-center">
                <svg className="w-12 h-12 mb-3 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path></svg>
                <p className="font-bold text-xs uppercase tracking-widest">Aguardando mais logs para análise profunda</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
