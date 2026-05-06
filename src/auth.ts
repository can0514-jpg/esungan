/**
 * 토스 로그인 연동
 *
 * 앱인토스 SDK의 appLogin() 함수를 통해 토스 로그인을 처리해요.
 * 콘솔에서 앱 키를 받으면 자동으로 작동해요.
 *
 * 참고: https://developers-apps-in-toss.toss.im/login/develop.html
 */

// ⚠️ 콘솔에서 발급받은 서버 URL로 교체하세요
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

export interface User {
  id: string;
  nickname: string;
  email?: string;
}

// 토스 SDK에서 appLogin 불러오기
// 실제 앱인토스 환경에서만 작동해요 (샌드박스/실기기)
async function getTossSDK() {
  try {
    const sdk = await import('@apps-in-toss/web-framework');
    return sdk;
  } catch {
    return null;
  }
}

/**
 * 토스 로그인 실행
 * 1. appLogin() → 인가 코드 수신
 * 2. 백엔드에 인가 코드 전달 → 액세스 토큰 + 사용자 정보 수신
 * 3. 로컬스토리지에 저장
 */
export async function tossLogin(): Promise<{ token: string; user: User } | null> {
  const sdk = await getTossSDK();

  if (!sdk) {
    // 브라우저 개발 환경 (샌드박스 외) — 이메일 로그인 폴백
    return null;
  }

  try {
    // 토스 로그인 창 열기 → 인가 코드 수신
    const result = await sdk.appLogin();

    if (!result?.authorizationCode) {
      throw new Error('인가 코드를 받지 못했어요');
    }

    const res = await fetch(`${API_URL}/auth/toss`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ authCode: result.authorizationCode }),
    });

    if (!res.ok) {
      throw new Error('토스 로그인 처리 실패');
    }

    const data = await res.json();
    saveAuth(data.token, data.user);
    return data;
  } catch (e) {
    console.error('토스 로그인 오류:', e);
    return null;
  }
}

export function saveAuth(token: string, user: User) {
  localStorage.setItem('nb_token', token);
  localStorage.setItem('nb_user', JSON.stringify(user));
}

export function loadAuth(): { token: string; user: User } | null {
  const token = localStorage.getItem('nb_token');
  const userStr = localStorage.getItem('nb_user');
  if (!token || !userStr) return null;
  try {
    return { token, user: JSON.parse(userStr) };
  } catch {
    return null;
  }
}

export function clearAuth() {
  localStorage.removeItem('nb_token');
  localStorage.removeItem('nb_user');
}
