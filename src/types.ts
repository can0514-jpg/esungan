export type Screen =
  | 'onboard'
  | 'login'
  | 'register'
  | 'occupation'
  | 'birth'
  | 'place'
  | 'person'
  | 'purpose'
  | 'loading'
  | 'result'
  | 'my'
  | 'paywall'
  | 'pattern';

export type PlanType = 'free' | 'day' | 'month' | 'year' | 'lifetime';

export interface UserPlan {
  plan: PlanType;
  dailyCount: number;
  expiresAt: string | null;
}

export const FREE_DAILY_LIMIT = 3;

export interface InputState {
  occupation: string;
  year: string;
  month: string;
  day: string;
  hour: string;
  gender: string;
  place: string;
  person: string;
  intimacy: string;
  purpose: string;
  condition: string;
}

export const defaultInput: InputState = {
  occupation: '',
  year: '',
  month: '',
  day: '',
  hour: '모름',
  gender: '',
  place: '',
  person: '',
  intimacy: '보통',
  purpose: '',
  condition: '보통',
};

export interface SajuProfile {
  ilgan: string;
  character: string;
  strength: string;
  weakness: string;
}

export type GoNoGo = 'go' | 'conditional' | 'nogo';

export interface AdviceResult {
  saju: SajuProfile;
  goNoGo: GoNoGo;
  goNoGoReason: string;
  situation: string;
  insight: string;
  tension: string;
  advantage: string;
  status: string;
  tags: string[];
  advice: string;
  checkpoints: string[];
  bans: string[];
}

export interface HistoryItem {
  id: string;
  place: string;
  person: string;
  purpose: string;
  situation: string;
  advice: string;
  createdAt: string;
}

export interface PatternData {
  totalCount: number;
  highTensionCount: number;
  mostFrequentPurpose: string;
  mostFrequentPerson: string;
  bestSituation: string;
  insight: string;
}
