import type { InputState, AdviceResult } from './types';
import { calcSaju, hourJu, todayJiji, jijiName, ilganName } from './saju';

// ── 출력 타입 (프롬프트 응답) ──
export interface AdviceResultFull extends AdviceResult {
  todayEnergy:   string;   // 오늘의 기운 한 줄 요약
  goldenTime:    { morning: string; afternoon: string; evening: string };
  luckyItem:     string;   // 행운의 아이템/컬러
}

export async function fetchAdvice(s: InputState): Promise<AdviceResultFull> {
  const saju    = calcSaju(Number(s.year), Number(s.month), Number(s.day));
  const timeJu  = hourJu(saju.ilgan, s.hour);
  const todayJJ = todayJiji();
  const jjLabel = jijiName(todayJJ);
  const igLabel = ilganName(saju.ilgan);

  const prompt = `너는 사주 명리학 20년 경력이자, 현대적인 커뮤니케이션 전문가인 '오늘의 나침반' AI 가이드야.
아래 제공되는 [사용자 정보]와 [오늘의 일정]을 분석해서, 토스(Toss) 서비스처럼 친절하고 명확한 말투(~해요 체)로 맞춤 조언을 작성해줘.

### 분석 가이드라인
1. 사주 용어(천간, 지지, 격국 등)는 직접 노출하지 말고, 일상적인 비유로 풀어서 설명할 것.
2. 단순한 운세가 아니라, 오늘 일정에서 사용자가 취해야 할 '구체적인 태도'와 '대화법'에 집중할 것.
3. 유료 결제 사용자에게 제공되는 '프리미엄 급'의 디테일한 분석을 제공할 것.

### 사용자 정보
- 사용자의 일간(日干): ${igLabel}
- 오늘의 지지(地支): ${jjLabel}
- 사주팔자: ${saju.yearJu}년 / ${saju.monthJu}월 / ${saju.dayJu}일 / ${timeJu}시
- 타고난 성향: ${saju.profile.character}
- 강점: ${saju.profile.strength}
- 약점: ${saju.profile.weakness}
- 말하는 스타일: ${saju.profile.talkStyle}
- 오늘 장소: ${s.place}
- 만날 사람: ${s.person}
- 목적: ${s.purpose}
- 친밀도: ${s.intimacy}
- 컨디션: ${s.condition}
- 성별: ${s.gender}성

### 출력 형식 (JSON만 응답, 설명 없이)
{
  "todayEnergy": "현재 기운을 일상적 비유로 한 줄 표현. 예: '단단한 바위 위에 핀 꽃 같은 날이에요.'",
  "situation": "오늘 상황 한 줄 요약 (장소+사람+목적 연결)",
  "insight": "일간 특성이 오늘 상황에 작용하는 방식. 사주 용어 없이 비유로. 2줄. ~해요 체.",
  "advice": "오늘 일정에서 가장 유리한 행동 전략과 대화 팁. 구체적인 말투·태도 포함. 3-4줄. ~해요 체.",
  "goldenTime": {
    "morning":   "오전 골든타임 한 줄 + 하면 좋은 행동",
    "afternoon": "오후 골든타임 한 줄 + 하면 좋은 행동",
    "evening":   "저녁 골든타임 한 줄 + 하면 좋은 행동"
  },
  "luckyItem": "오늘 상대에게 좋은 인상을 줄 컬러 또는 소품 추천. 이유 포함. 한 줄.",
  "checkpoints": ["오늘 반드시 할 것 1", "할 것 2", "할 것 3"],
  "bans": ["오늘 하지 말 것 1 (이유 포함)", "하지 말 것 2 (이유 포함)"],
  "tension": "높음|중간|낮음",
  "advantage": "유리|불리|중립",
  "status": "상황 한두 단어",
  "tags": ["태그1", "태그2", "태그3"],
  "saju": {
    "ilgan":     "${saju.ilgan}${saju.oheng}",
    "character": "${saju.profile.character}",
    "strength":  "${saju.profile.strength}",
    "weakness":  "${saju.profile.weakness}"
  }
}`;

  // 백엔드 경유로 API 호출 (API 키 보호)
  const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
  const res = await fetch(`${backendUrl}/advice`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
  });

  const data = await res.json();
  const text = (data.content?.[0]?.text || '').replace(/```json|```/g, '').trim();

  try {
    const parsed = JSON.parse(text) as AdviceResultFull;
    // 사주 데이터는 계산값으로 고정
    parsed.saju = {
      ilgan:     `${saju.ilgan}${saju.oheng}`,
      character: saju.profile.character,
      strength:  saju.profile.strength,
      weakness:  saju.profile.weakness,
    };
    return parsed;
  } catch {
    return fallbackAdvice(s);
  }
}

export function fallbackAdvice(s: InputState): AdviceResultFull {
  const saju = calcSaju(Number(s.year), Number(s.month), Number(s.day));
  const p    = saju.profile;

  const byPurpose: Record<string, Pick<AdviceResultFull, 'advice' | 'checkpoints' | 'bans' | 'goldenTime' | 'luckyItem'>> = {
    '탐색/네트워킹': {
      advice: `${p.talkStyle}인 성향이 오늘은 오히려 장점이에요. 상대가 먼저 말하게 유도하고, 즉답보다는 "한번 생각해볼게요"로 여지를 남겨두세요. 속내를 드러내기 전에 상대의 의도를 먼저 파악하는 게 핵심이에요.`,
      checkpoints: ['상대 먼저 말하게 유도하기', '즉답 피하고 "생각해볼게요" 패턴 유지', '상대 관심사 파악 후 메모'],
      bans: ['연봉·이직 의사를 먼저 꺼내지 마세요 — 협상력이 사라져요', '결론 없는 말 길게 하기 — 핵심만 간결하게'],
      goldenTime: { morning: '오전 10시 전후 — 머리가 가장 맑을 때 준비사항 정리하세요', afternoon: '오후 2~4시 — 이야기 흐름이 자연스럽게 열리는 시간이에요', evening: '저녁 6시 이후 — 가벼운 마무리 대화로 인상을 남기기 좋아요' },
      luckyItem: '남색이나 짙은 파란색 소품 — 신뢰감과 안정감을 전달해요',
    },
    '업무 보고/논의': {
      advice: `결론부터 말하는 습관이 오늘 가장 중요해요. 배경 설명이 길어지면 핵심을 잃기 쉬운 날이에요. 문제를 얘기할 때는 해결책을 반드시 세트로 가져가세요. ${p.watchOut}을 특히 조심하세요.`,
      checkpoints: ['결론 먼저, 배경은 나중에', '문제엔 해결책 세트로 준비', '상대 말 끊지 않기'],
      bans: ['"잘 모르겠는데요" 식의 자신없는 말 — 신뢰도가 떨어져요', `${p.watchOut} — 오늘은 특히 역효과 나요`],
      goldenTime: { morning: '오전 9~11시 — 집중력이 가장 높은 시간이에요, 보고 준비 마무리하세요', afternoon: '오후 2~3시 — 의사결정이 잘 되는 시간, 핵심 안건 다루세요', evening: '저녁 7시 이후 — 오늘 대화 복기하고 다음 준비하기 좋아요' },
      luckyItem: '화이트나 라이트그레이 계열 — 깔끔하고 신뢰감 있는 인상을 줘요',
    },
    '부탁/협상': {
      advice: `이유를 여러 개 나열하면 오히려 설득력이 약해져요. 가장 강한 이유 하나만 써서 간결하게 전달하세요. 상대방의 상황을 먼저 챙기는 말로 시작하면 훨씬 좋은 반응을 얻을 수 있어요.`,
      checkpoints: ['가장 강한 이유 하나만 선택', '상대 상황 먼저 챙기는 말로 시작', '부탁은 짧고 명확하게'],
      bans: ['미리 포기하는 말 꺼내지 마세요 — 협상력이 0이 돼요', '이유를 3개 이상 나열하기 — 핵심이 흐려져요'],
      goldenTime: { morning: '오전은 준비에 집중하세요 — 상대 입장 미리 생각해보기', afternoon: '오후 1~3시 — 상대가 수용적인 상태가 되는 시간이에요', evening: '저녁은 마무리 분위기 — 결론이 안 났으면 다음 기회를 잡으세요' },
      luckyItem: '따뜻한 베이지나 카멜 톤 — 친근하면서도 진지한 인상을 줘요',
    },
    '갈등/해결': {
      advice: `상대 입장을 먼저 인정하는 말로 시작하는 게 핵심이에요. "맞아요, 그 부분은 제가 부족했어요"처럼 한 발 먼저 양보하면 대화가 훨씬 부드러워져요. 감정이 올라올 때는 결론을 내지 마세요.`,
      checkpoints: ['상대 입장 먼저 인정하기', '감정적일 땐 결론 미루기', '오늘은 방향만 잡고 마무리'],
      bans: ['감정 상태에서 최종 결론 내기 — 후회할 말이 나와요', '과거 잘못을 꺼내기 — 현재 문제 해결이 우선이에요'],
      goldenTime: { morning: '오전엔 마음 정리 — 내가 원하는 결과를 먼저 명확히 해두세요', afternoon: '오후 3~5시 — 대화가 가장 이성적으로 되는 시간이에요', evening: '저녁 후엔 화해 분위기 — 가볍게 마무리하기 좋아요' },
      luckyItem: '초록이나 민트 계열 — 평화롭고 안정적인 분위기를 만들어줘요',
    },
    '그냥 친목': {
      advice: `업무 얘기는 전체 대화의 30%를 넘기지 마세요. 상대방의 관심사를 먼저 물어보고 잘 들어주는 것만으로도 좋은 인상을 남길 수 있어요. 오늘은 그냥 사람으로 만나는 날이에요.`,
      checkpoints: ['업무 얘기 30% 이하로 제한', '상대 관심사 한 가지 물어보기', '폰 내려놓고 눈 맞추기'],
      bans: ['끝없는 회사·업무 불만 얘기 — 분위기가 무거워져요', '자기 얘기만 계속하기 — 상대가 지루해해요'],
      goldenTime: { morning: '오전엔 컨디션 관리 — 좋은 만남을 위해 충분히 쉬세요', afternoon: '오후 2~6시 — 대화가 자연스럽게 흐르는 골든타임이에요', evening: '저녁 7시 이후 — 분위기가 가장 무르익는 시간이에요' },
      luckyItem: '밝은 오렌지나 노란색 소품 — 활기차고 친근한 인상을 줘요',
    },
    '첫 만남': {
      advice: `첫인상은 처음 3분에서 결정돼요. 말을 잘하는 것보다 잘 들어주는 게 훨씬 좋은 인상을 남겨요. 상대방 이름을 대화 중에 한 번 불러주는 것만으로도 친근함이 크게 올라가요.`,
      checkpoints: ['첫 3분 집중 — 미소와 눈 맞춤', '상대 이름 대화 중 한 번 불러주기', '자기 자랑 자제하고 질문 위주로'],
      bans: ['과도한 자기 자랑 — 첫 만남에서 역효과예요', '너무 많은 질문 한꺼번에 — 심문받는 느낌이 들어요'],
      goldenTime: { morning: '오전엔 외모와 복장 준비 — 첫인상 60%는 비언어예요', afternoon: '오후 1~4시 — 긴장이 풀리고 자연스러운 대화가 나오는 시간이에요', evening: '저녁은 마무리의 기회 — 다음 약속으로 이어지기 좋아요' },
      luckyItem: '네이비나 버건디 계열 — 신뢰감과 매력을 동시에 전달해요',
    },
  };

  const fb = byPurpose[s.purpose] || byPurpose['탐색/네트워킹'];

  return {
    saju: {
      ilgan:     `${saju.ilgan}${saju.oheng}`,
      character: p.character,
      strength:  p.strength,
      weakness:  p.weakness,
    },
    todayEnergy: '오늘은 준비된 사람에게 기회가 열리는 날이에요. 천천히, 하지만 확실하게 가세요.',
    situation:   `${s.person}와 ${s.place} ${s.purpose}`,
    insight:     `${p.talkStyle}인 성향이 오늘 상황에서는 양날의 검이에요. 잘 쓰면 강점이고, 방심하면 ${p.watchOut}로 이어질 수 있어요.`,
    tension:     '중간',
    advantage:   '유리',
    status:      s.purpose,
    tags:        [s.place, s.person, s.purpose],
    ...fb,
  };
}
