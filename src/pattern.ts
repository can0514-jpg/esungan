/**
 * 30일 패턴 분석
 * 히스토리 데이터 → 개인 인사이트
 */

import type { HistoryItem, PatternData } from './types';

export function analyzePattern(histories: HistoryItem[]): PatternData {
  if (histories.length === 0) {
    return {
      totalCount: 0,
      highTensionCount: 0,
      mostFrequentPurpose: '—',
      mostFrequentPerson: '—',
      bestSituation: '—',
      insight: '아직 데이터가 부족해요. 조언을 더 받아보면 패턴이 보여요.',
    };
  }

  const totalCount = histories.length;

  // 목적 빈도
  const purposeMap: Record<string, number> = {};
  histories.forEach(h => {
    purposeMap[h.purpose] = (purposeMap[h.purpose] || 0) + 1;
  });
  const mostFrequentPurpose = Object.entries(purposeMap)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || '—';

  // 만난 사람 빈도
  const personMap: Record<string, number> = {};
  histories.forEach(h => {
    const key = h.person.split(' ')[0]; // 앞 단어만
    personMap[key] = (personMap[key] || 0) + 1;
  });
  const mostFrequentPerson = Object.entries(personMap)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || '—';

  // 가장 최근 상황
  const bestSituation = histories[0]?.situation || '—';

  // 인사이트 생성
  const insight = generateInsight(totalCount, mostFrequentPurpose, mostFrequentPerson);

  return {
    totalCount,
    highTensionCount: Math.floor(totalCount * 0.3), // 추후 실제 데이터로 교체
    mostFrequentPurpose,
    mostFrequentPerson,
    bestSituation,
    insight,
  };
}

function generateInsight(total: number, purpose: string, person: string): string {
  if (total < 3) return `${total}번 조언 받았어요. 10번 이상이면 패턴이 보여요.`;

  const insights: Record<string, string> = {
    '업무 보고/논의': `${total}번 중 보고 자리가 가장 많아요. 보고 전 결론 먼저 정리하는 습관이 중요해요.`,
    '탐색/네트워킹': `탐색 자리를 자주 가네요. 즉답 피하고 여지 남기는 패턴이 잘 맞아요.`,
    '부탁/협상': `협상 자리가 많아요. 이유 하나만 쓰는 전략이 계속 유효해요.`,
    '그냥 친목': `친목 자리가 많네요. 업무 얘기 30% 제한이 핵심이에요.`,
    '갈등/해결': `갈등 상황을 자주 마주치네요. 감정적일 때 결론 미루기가 제일 중요해요.`,
    '첫 만남': `새로운 사람을 자주 만나네요. 첫 3분 집중 전략이 제일 효과적이에요.`,
  };

  return insights[purpose] || `${total}번 조언을 받았어요. ${person}를 자주 만나네요.`;
}
