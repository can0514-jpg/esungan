/**
 * 구독 플랜 관리
 * - 무료: 하루 3회
 * - 하루권: 1,200원 · 당일 무제한
 * - 한달권: 7,900원 · 30일 무제한
 * - 1년권: 49,000원 · 365일 무제한
 * - 평생권: 99,000원 · 영구 무제한
 */

import type { UserPlan, PlanType } from './types';
import { FREE_DAILY_LIMIT } from './types';
import { API_URL } from './auth';

const PLAN_KEY  = 'nb_plan';
const COUNT_KEY = 'nb_count';
const DATE_KEY  = 'nb_date';

export const PLANS = [
  {
    id: 'day' as PlanType,
    name: '하루권',
    badge: '오늘만 필승',
    price: '1,200원',
    desc: '커피 한 잔보다 싸게',
    features: ['오늘 하루 무제한 사용', '1인 매칭 리포트 1회'],
    productId: 'esungan_day',
    amount: 1200,
    days: 1,
  },
  {
    id: 'month' as PlanType,
    name: '한달권',
    badge: '★ Best',
    price: '7,900원',
    origPrice: '15,000원',
    desc: '47% 할인 · 모든 기능 무제한 30일',
    features: ['30일 무제한 사용', '30일 패턴 분석', '골든타임 상세', '인스타 공유 카드'],
    productId: 'esungan_month',
    amount: 7900,
    days: 30,
  },
  {
    id: 'year' as PlanType,
    name: '1년권',
    badge: '올해 대운 분석',
    price: '49,000원',
    origPrice: '96,000원',
    desc: '올해 대운·귀인 분석 포함',
    features: ['365일 무제한 사용', '대운·귀인 분석', '모든 프리미엄 기능'],
    productId: 'esungan_year',
    amount: 49000,
    days: 365,
  },
  {
    id: 'lifetime' as PlanType,
    name: '평생 소장권',
    badge: '런칭 한정 VVIP',
    price: '99,000원',
    origPrice: '300,000원',
    desc: '평생 업데이트 + VVIP 리포트',
    features: ['평생 무제한 사용', 'VVIP 전용 리포트', '모든 신규 기능 영구 이용'],
    productId: 'esungan_lifetime',
    amount: 99000,
    days: 36500,
  },
];

export function loadPlan(): UserPlan {
  const today = new Date().toDateString();
  const savedDate = localStorage.getItem(DATE_KEY);

  if (savedDate !== today) {
    localStorage.setItem(DATE_KEY, today);
    localStorage.setItem(COUNT_KEY, '0');
  }

  const plan      = (localStorage.getItem(PLAN_KEY) || 'free') as PlanType;
  const dailyCount = parseInt(localStorage.getItem(COUNT_KEY) || '0');
  const expiresAt  = localStorage.getItem('nb_expires');

  if (plan !== 'free' && plan !== 'lifetime' && expiresAt && new Date(expiresAt) < new Date()) {
    localStorage.setItem(PLAN_KEY, 'free');
    return { plan: 'free', dailyCount, expiresAt: null };
  }

  return { plan, dailyCount, expiresAt: expiresAt || null };
}

export function incrementCount() {
  const cur = parseInt(localStorage.getItem(COUNT_KEY) || '0');
  localStorage.setItem(COUNT_KEY, String(cur + 1));
}

export function isPremium(plan: PlanType): boolean {
  return plan !== 'free';
}

export function canUse(planInfo: UserPlan): boolean {
  if (isPremium(planInfo.plan)) return true;
  return planInfo.dailyCount < FREE_DAILY_LIMIT;
}

export function remainingFree(planInfo: UserPlan): number {
  return Math.max(0, FREE_DAILY_LIMIT - planInfo.dailyCount);
}

export function activatePlan(planId: PlanType, days: number) {
  if (planId === 'lifetime') {
    localStorage.setItem(PLAN_KEY, 'lifetime');
    localStorage.removeItem('nb_expires');
  } else {
    const expires = new Date();
    expires.setDate(expires.getDate() + days);
    localStorage.setItem(PLAN_KEY, planId);
    localStorage.setItem('nb_expires', expires.toISOString());
  }
}

/** 앱인토스 IAP 결제 */
export async function purchasePlan(token: string, planId: PlanType): Promise<boolean> {
  const plan = PLANS.find(p => p.id === planId);
  if (!plan) return false;

  try {
    const sdk = await import('@apps-in-toss/web-framework');
    // @ts-ignore
    const result = await sdk.requestPayment?.({
      productId: plan.productId,
      productName: `이순간 ${plan.name}`,
      amount: plan.amount,
    });

    if (result?.paymentKey) {
      const r = await fetch(`${API_URL}/payment/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ paymentKey: result.paymentKey, planId }),
      });

      if (r.ok) {
        activatePlan(planId, plan.days);
        return true;
      }
    }
    return false;
  } catch {
    console.warn('앱인토스 결제 SDK 없음. 개발 환경에서는 테스트 활성화.');
    activatePlan(planId, plan.days);
    return true;
  }
}

/** 하위 호환 */
export async function purchasePremium(token: string): Promise<boolean> {
  return purchasePlan(token, 'month');
}

export function deactivatePlan() {
  localStorage.setItem(PLAN_KEY, 'free');
  localStorage.removeItem('nb_expires');
}
