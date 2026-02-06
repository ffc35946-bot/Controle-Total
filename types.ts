
export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  earned: boolean;
}

export interface AddictionData {
  name: string;
  intensity: number;
  initialIntensity: number;
  dailyAverage: number;
  unit: string;
  intensityQuestion: string;
  frequencyQuestion: string;
  psychologicalStrategy: string;
  currentPhase: number;
  badges: Badge[];
}

export interface ReminderConfig {
  enabled: boolean;
  time: string;
  message: string;
}

export interface Trigger {
  id: string;
  label: string;
  count: number;
  icon: string;
}

export interface DailyLog {
  date: string;
  amount: number;
  feeling: string;
  note: string;
  trigger?: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

export enum AppStep {
  INITIAL = 'INITIAL',
  INTENSITY = 'INTENSITY',
  FREQUENCY = 'FREQUENCY',
  GUIDANCE = 'GUIDANCE',
  MAIN_APP = 'MAIN_APP'
}
