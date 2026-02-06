
import React from 'react';

interface IntensitySliderProps {
  value: number;
  onChange: (val: number) => void;
}

const IntensitySlider: React.FC<IntensitySliderProps> = ({ value, onChange }) => {
  const getColor = (val: number) => {
    if (val <= 3) return 'bg-emerald-500';
    if (val <= 6) return 'bg-amber-500';
    return 'bg-rose-600';
  };

  const getLabel = (val: number) => {
    if (val <= 3) return 'Leve / Controlável';
    if (val <= 6) return 'Moderado / Preocupante';
    return 'Grave / Crítico';
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-6 py-8">
      <div className="text-center">
        <span className={`text-4xl font-bold transition-colors duration-300 ${value > 6 ? 'text-rose-600' : value > 3 ? 'text-amber-500' : 'text-emerald-500'}`}>
          {value}
        </span>
        <p className="text-slate-500 mt-2 font-medium">{getLabel(value)}</p>
      </div>

      <div className="relative h-4 w-full bg-slate-200 rounded-full overflow-hidden">
        <div 
          className={`absolute top-0 left-0 h-full transition-all duration-300 ${getColor(value)}`}
          style={{ width: `${(value / 10) * 100}%` }}
        />
        <input
          type="range"
          min="1"
          max="10"
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value))}
          className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer appearance-none"
        />
      </div>
      
      <div className="flex justify-between text-xs text-slate-400 font-bold px-1">
        <span>0 (POUCO)</span>
        <span>10 (MUITO)</span>
      </div>
    </div>
  );
};

export default IntensitySlider;
