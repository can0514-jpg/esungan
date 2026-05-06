/**
 * 구독 플랜 관리
 * - 무료: 하루 3회
 * - 프리미엄: 무제한 + 30일 패턴 + 궁합 분석
 */

import type { UserPlan, PlanType } from './types';
import { FREE_DAILY_LIMIT } from './types';
import { API_URL } from './auth';

const PLAN_KEY  = 'nb_plan';
const COUNT_KEY = 'nb_count';
const DATE_KEY  = 'nb_date';

export function loadPlan(): UserPlan {
  const today = new Date().toDateString();
  const savedDate = localStorage.getItem(DATE_KEY);

  // 날짜 바뀌면 카운트 리셋
  if (savedDate !== today) {
    localStorage.setItem(DATE_KEY, today);
    localStorage.setItem(COUNT_KEY, '0');
  }

  const plan      = (localStorage.getItem(PLAN_KEY) || 'free') as PlanType;
  const dailyCount = parseInt(localStorage.getItem(COUNT_KEY) || '0');
  const expiresAt  = localStorage.getItem('nb_expires');

  // 만료 확인
  if (plan === 'premium' && expiresAt && new Date(expiresAt) < new Date()) {
    localStorage.setItem(PLAN_KEY, 'free');
    return { plan: 'free', dailyCount, expiresAt: null };
  }

  return { plan, dailyCount, expiresAt: expiresAt || null };
}

export function incrementCount() {
  const cur = parseInt(localStorage.getItem(COUNT_KEY) || '0');
  localStorage.setItem(COUNT_KEY, String(cur + 1));
}

export function canUse(planInfo: UserPlan): boolean {
  if (planInfo.plan === 'premium') return true;
  return planInfo.dailyCount < FREE_DAILY_LIMIT;
}

export function remainingFree(planInfo: UserPlan): number {
  return Math.max(0, FREE_DAILY_LIMIT - planInfo.dailyCount);
}

/** 토스페이 인앱결제 (앱인토스 IAP) */
export async function purchasePremium(token: string): Promise<boolean> {
  // 앱인토스 인앱결제 SDK 호출
  // 실제 환경에서만 작동 (샌드박스/실기기)
  try {
    const sdk = await import('@apps-in-toss/web-framework');
    // @ts-ignore - SDK 타입 정의 확인 필요
    const result = await sdk.requestPayment?.({
      productId: 'premium_monthly',
      productName: '오늘의 나침반 프리미엄 (1개월)',
      amount: 2900,
    });

    if (result?.paymentKey) {
      // 백엔드에서 결제 검증
      const r = await fetch(`${API_URL}/payment/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ paymentKey: result.paymentKey }),
      });

      if (r.ok) {
        activatePremium();
        return true;
      }
    }
    return false;
  } catch {
    // 브라우저 개발 환경 - 테스트용 활성화
    console.warn('앱인토스 결제 SDK 없음. 개발 환경에서는 테스트 활성화.');
    activatePremium();
    return true;
  }
}

export function activatePremium() {
  const expires = new Date();
  expires.setDate(expires.getDate() + 30);
  localStorage.setItem(PLAN_KEY, 'premium');
  localStorage.setItem('nb_expires', expires.toISOString());
}

export function deactivatePremium() {
  localStorage.setItem(PLAN_KEY, 'free');
  localStorage.removeItem('nb_expires');
}
