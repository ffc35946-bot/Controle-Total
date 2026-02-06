
import React, { useState, useMemo } from 'react';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, ReferenceLine 
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

const Dashboard: React.FC<DashboardProps> = ({ 
  addiction, logs 
}) => {
  const [report, setReport] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const stats = useMemo(() => {
    let streak = 0;
    const sortedLogs = [...logs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    for (const log of sortedLogs) {
      if (log.amount <= addiction.dailyAverage) streak++;
      else break;
    }

    const totalAvoided = logs.reduce((acc, log) => {
      return acc + Math.max(0, addiction.dailyAverage - log.amount);
    }, 0);

    const chartData = logs.slice(-7).map(log => ({
      name: new Date(log.date).toLocaleDateString('pt-BR', { day: '2-digit' }),
      valor: log.amount,
      limite: addiction.dailyAverage
    }));

    return { streak, totalAvoided, chartData };
  }, [logs, addiction]);

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 custom-scrollbar p-4 md:p-8 space-y-6 pb-32">
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sequência</span>
          <p className="text-3xl font-black text-indigo-600 mt-1">{stats.streak} <span className="text-xs text-indigo-300">DIAS</span></p>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Evitado</span>
          <p className="text-3xl font-black text-emerald-600 mt-1">{addiction.unit === 'reais' ? `R$${stats.totalAvoided}` : stats.totalAvoided}</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100">
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Medalhas do Juiz IA</h3>
        <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar">
          {addiction.badges.map(badge => (
            <div key={badge.id} className={`flex-shrink-0 w-20 h-24 rounded-2xl border-2 flex flex-col items-center justify-center transition-all ${badge.earned ? 'bg-indigo-50 border-indigo-200 shadow-lg shadow-indigo-100 scale-105' : 'bg-slate-50 border-transparent opacity-20 grayscale'}`}>
              <span className="text-3xl mb-1">{badge.icon}</span>
              <span className="text-[8px] font-black text-center px-1 uppercase leading-tight">{badge.name}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100">
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Controle Diário</h3>
        <div className="h-64 w-full">
          {stats.chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.chartData} margin={{ left: -20, right: 10 }}>
                <defs>
                  <linearGradient id="colorUsage" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{fontSize: 10, fontWeight: 'bold'}} axisLine={false} tickLine={false} />
                <YAxis tick={{fontSize: 10}} axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  labelStyle={{ fontWeight: 'black', color: '#1e293b' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="valor" 
                  stroke="#6366f1" 
                  strokeWidth={4} 
                  fill="url(#colorUsage)" 
                  dot={{ r: 5, fill: '#6366f1', strokeWidth: 2, stroke: '#fff' }} 
                />
                <ReferenceLine 
                  y={addiction.dailyAverage} 
                  stroke="#f43f5e" 
                  strokeDasharray="8 4" 
                  strokeWidth={2}
                  label={{ value: 'META', position: 'insideTopRight', fill: '#f43f5e', fontSize: 10, fontWeight: 'black' }} 
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-300 font-black text-xs uppercase tracking-widest text-center">Fale com seu mentor para <br/>iniciar o gráfico</div>
          )}
        </div>
      </div>

      <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100">
        <div className="flex justify-between items-center mb-4">
           <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Insights IA</h3>
           <button 
             onClick={async () => {
               setIsGenerating(true);
               const res = await generateWeeklyAnalysis(logs, addiction);
               setReport(res);
               setIsGenerating(false);
             }} 
             className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-4 py-2 rounded-full uppercase tracking-widest active:scale-95 transition-transform"
           >
             {isGenerating ? 'Analisando...' : 'Obter Feedback'}
           </button>
        </div>
        <div className="p-5 bg-slate-50 rounded-2xl text-xs text-slate-600 italic leading-relaxed border border-slate-100">
          {report || "A IA analisará seus logs assim que você registrar progresso no chat."}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
