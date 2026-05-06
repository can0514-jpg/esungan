/**
 * 사주 계산 유틸
 * 생년월일 → 년주·월주·일주 천간지지 계산
 */

const CHEONGAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const JIJI     = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
const CG_NAME  = ['갑','을','병','정','무','기','경','신','임','계'];
// const JJ_NAME = ['자','축','인','묘','진','사','오','미','신','유','술','해']; // reserved

// 오행
const OHENG: Record<string, string> = {
  甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土',
  己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水',
};

// 일간별 대인관계 성향
const ILGAN_PROFILE: Record<string, {
  character: string; strength: string; weakness: string;
  talkStyle: string; watchOut: string;
}> = {
  甲: { character: '직선적이고 추진력 강함. 리더십 있지만 고집스럽게 보일 수 있음', strength: '결단력, 신뢰감, 솔직함', weakness: '유연성 부족, 자기 페이스 강요', talkStyle: '간결하고 직접적으로 말하는 편', watchOut: '상대 의견 무시하거나 결론 먼저 말하기' },
  乙: { character: '부드럽고 눈치 빠름. 상황 적응력 뛰어나지만 우유부단해 보일 수 있음', strength: '공감능력, 유연함, 조화', weakness: '우유부단, 자기 의견 숨기기', talkStyle: '상대 말을 잘 듣고 맞춰주는 편', watchOut: '의견 없이 동조만 하거나 이중적으로 보이기' },
  丙: { character: '밝고 열정적. 분위기 주도하지만 산만해 보일 수 있음', strength: '에너지, 설득력, 긍정성', weakness: '감정 조절 어려움, 경솔함', talkStyle: '활기차고 표현력 풍부', watchOut: '과장하거나 말이 너무 많아지기' },
  丁: { character: '섬세하고 직관적. 깊이 있지만 예민해 보일 수 있음', strength: '통찰력, 집중력, 진심', weakness: '예민함, 감정 소진', talkStyle: '신중하게 말하고 감정 표현이 풍부', watchOut: '너무 진지하게 받아들이거나 감정 드러내기' },
  戊: { character: '신뢰감 있고 안정적. 믿음직하지만 변화에 느릴 수 있음', strength: '신뢰, 책임감, 묵묵함', weakness: '변화 거부, 고집', talkStyle: '말수 적고 신중함', watchOut: '의견 없이 침묵하거나 답답하게 보이기' },
  己: { character: '세심하고 현실적. 꼼꼼하지만 소심해 보일 수 있음', strength: '실용성, 세심함, 성실함', weakness: '소심함, 지나친 걱정', talkStyle: '조심스럽고 구체적으로 말하는 편', watchOut: '너무 따지거나 부정적으로 보이기' },
  庚: { character: '강단 있고 원칙적. 카리스마 있지만 차갑게 보일 수 있음', strength: '결단력, 원칙, 카리스마', weakness: '냉정함, 감정 공유 부족', talkStyle: '단호하고 논리적', watchOut: '감정 없이 말하거나 독단적으로 보이기' },
  辛: { character: '완벽주의적이고 날카로움. 정확하지만 까다롭게 보일 수 있음', strength: '정확성, 미적 감각, 날카로움', weakness: '완벽주의, 비판적', talkStyle: '정확하고 신중하게 말함', watchOut: '잘못을 콕 집어내거나 비판적으로 보이기' },
  壬: { character: '유연하고 아이디어 풍부. 창의적이지만 일관성 없어 보일 수 있음', strength: '유연함, 창의성, 포용력', weakness: '일관성 부족, 집중력 산만', talkStyle: '다양한 관점을 넓게 이야기하는 편', watchOut: '말이 돌아가거나 핵심이 없어 보이기' },
  癸: { character: '깊고 감수성 풍부. 통찰력 있지만 내성적으로 보일 수 있음', strength: '직관, 감수성, 깊이', weakness: '내성적, 감정 표현 어려움', talkStyle: '조용하지만 한마디 한마디가 의미 있음', watchOut: '속내를 안 드러내거나 무관심하게 보이기' },
};

export interface SajuCalcResult {
  yearJu:  string; // 년주 (예: 甲子)
  monthJu: string; // 월주 (예: 乙丑)
  dayJu:   string; // 일주 (예: 丙寅)
  ilgan:   string; // 일간 (예: 甲)
  ilganName: string; // 일간 이름 (예: 甲木)
  oheng:   string; // 오행
  profile: typeof ILGAN_PROFILE[string];
}

/**
 * 년주 계산
 * 기준: 1984년 = 甲子년
 */
function calcYearJu(year: number): string {
  const cg = CHEONGAN[(year - 4) % 10];
  const jj = JIJI[(year - 4) % 12];
  return cg + jj;
}

/**
 * 월주 계산 (절기 미반영 단순 계산)
 * 년간에 따른 월간 기산점 사용
 */
function calcMonthJu(year: number, month: number): string {
  const yearCgIdx = (year - 4) % 10;
  // 년간 기준 월간 시작점: 甲己년 = 丙寅월부터
  const monthCgStart = [2, 4, 6, 8, 0, 2, 4, 6, 8, 0][yearCgIdx];
  const cg = CHEONGAN[(monthCgStart + month - 1) % 10];
  // 1월 = 寅月(인월)부터
  const jj = JIJI[(month + 1) % 12];
  return cg + jj;
}

/**
 * 일주 계산
 * 기준일: 1900.1.1 = 甲戌일
 */
function calcDayJu(year: number, month: number, day: number): string {
  // 율리우스 적일 계산
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  const jdn = day + Math.floor((153 * m + 2) / 5) + 365 * y +
    Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
  // 기준일(1900.1.1) JDN = 2415021, 해당일 = 甲戌 (인덱스: 甲=0, 戌=10)
  const diff = jdn - 2415021;
  const cg = CHEONGAN[((diff % 10) + 10) % 10];
  const jj = JIJI[((diff % 12) + 12) % 12];
  return cg + jj;
}

export function calcSaju(year: number, month: number, day: number): SajuCalcResult {
  const yearJu  = calcYearJu(year);
  const monthJu = calcMonthJu(year, month);
  const dayJu   = calcDayJu(year, month, day);
  const ilgan   = dayJu[0]; // 일간은 일주의 천간
  const oheng   = OHENG[ilgan] || '木';
  const ilganName = `${ilgan}${oheng} (${CG_NAME[CHEONGAN.indexOf(ilgan)]}${oheng.toLowerCase()})`;
  const profile = ILGAN_PROFILE[ilgan] || ILGAN_PROFILE['甲'];

  return { yearJu, monthJu, dayJu, ilgan, ilganName, oheng, profile };
}

/** 시주 천간지지 */
export function hourJu(ilgan: string, hourStr: string): string {
  if (hourStr === '모름') return '時不明';
  const hourMap: Record<string, number> = {
    '자시': 0, '축시': 1, '인시': 2, '묘시': 3, '진시': 4,
    '사시': 5, '오시': 6, '미시': 7, '신시': 8, '유시': 9, '술시': 10, '해시': 11,
  };
  const key = hourStr.split(' ')[0];
  const jjIdx = hourMap[key] ?? 0;
  // 일간 기준 시간 천간 계산
  const ilganIdx = CHEONGAN.indexOf(ilgan);
  const cgStart = [0, 2, 4, 6, 8, 0, 2, 4, 6, 8][ilganIdx];
  const cg = CHEONGAN[(cgStart + jjIdx) % 10];
  return cg + JIJI[jjIdx];
}

/** 오늘 날짜의 일지(日支) 계산 */
export function todayJiji(): string {
  const now = new Date();
  return calcDayJu(now.getFullYear(), now.getMonth() + 1, now.getDate())[1];
}

/** 지지 한글 이름 변환 */
export function jijiName(jj: string): string {
  const map: Record<string, string> = {
    '子':'자수(子水)', '丑':'축토(丑土)', '寅':'인목(寅木)', '卯':'묘목(卯木)',
    '辰':'진토(辰土)', '巳':'사화(巳火)', '午':'오화(午火)', '未':'미토(未土)',
    '申':'신금(申金)', '酉':'유금(酉金)', '戌':'술토(戌土)', '亥':'해수(亥水)',
  };
  return map[jj] || jj;
}

/** 일간 한글 이름 변환 */
export function ilganName(ilgan: string): string {
  const map: Record<string, string> = {
    '甲':'갑목(甲木)', '乙':'을목(乙木)', '丙':'병화(丙火)', '丁':'정화(丁火)', '戊':'무토(戊土)',
    '己':'기토(己土)', '庚':'경금(庚金)', '辛':'신금(辛金)', '壬':'임수(壬水)', '癸':'계수(癸水)',
  };
  return map[ilgan] || ilgan;
}
