# 🧭 오늘의 나침반 — 앱인토스 출시 매뉴얼

> 이 매뉴얼은 파일 구조 기준으로 **무엇을 언제 어디서** 하는지 단계별로 설명해요.

---

## 📁 현재 파일 구조

```
nahmban-ait/
├── src/
│   ├── App.tsx         ← 메인 앱 (화면 전체)
│   ├── App.css         ← 토스 스타일
│   ├── main.tsx        ← 진입점
│   ├── index.css       ← 글로벌 CSS
│   ├── auth.ts         ← 토스 로그인 연동
│   ├── api.ts          ← Claude AI API + 사주 프롬프트
│   ├── saju.ts         ← 천간지지 계산 + 일간 데이터
│   ├── plan.ts         ← 구독 플랜 (무료/프리미엄)
│   ├── pattern.ts      ← 30일 패턴 분석
│   └── types.ts        ← 타입 정의
├── backend/
│   ├── server.js       ← Node.js 백엔드
│   ├── package.json
│   └── .env.example    ← 환경변수 템플릿
├── granite.config.ts   ← 앱인토스 SDK 설정 ⚠️ appName 수정 필요
├── package.json
├── vite.config.ts
├── tsconfig.json
├── index.html
└── dist/               ← 빌드 결과물 (npm run build 후 생성)
```

---

## STEP 1 — 사업자 등록 (2~3일)

### 왜 필요한가요?
토스 로그인, 결제, 푸시 알림은 **사업자 인증 없이 사용 불가**해요.

### 어디서 하나요?
👉 https://hometax.go.kr

### 방법
1. 홈택스 접속 → 로그인
2. 상단 메뉴 `전체메뉴` → `증명·등록·신청` → `사업자등록증 신청`
3. **개인사업자** 선택 (법인 불필요)
4. 업태: `정보통신업` / 종목: `소프트웨어 개발 및 공급업`
5. 사업장 주소: 집 주소 가능
6. 제출 후 **2~3일 내 발급**

### 직장인도 가능한가요?
네. 부업으로 개인사업자 등록 가능해요. 세금 신고는 5월 종합소득세 때 별도 처리.

---

## STEP 2 — 앱인토스 콘솔 가입 (1일)

### 어디서 하나요?
👉 https://apps-in-toss.toss.im

### 방법
1. 위 URL 접속
2. `시작하기` 클릭
3. **토스 비즈니스 회원**으로 가입 (기존 토스 계정 사용)
4. 휴대폰으로 본인인증 (만 19세 이상)
5. 워크스페이스 이름 설정 (예: `나침반팀`)

### 사업자 정보 등록
1. 콘솔 왼쪽 메뉴 → `파트너 정보` → `사업자 정보` → `등록하기`
2. 사업자등록증 사진 업로드
3. **영업일 1~2일** 승인 대기

---

## STEP 3 — 앱 등록 + 키 발급 (1~2일)

### 앱 등록하기
1. 콘솔 왼쪽 메뉴 → `앱` → `+ 등록하기`
2. 아래 정보 입력:

| 항목 | 입력값 |
|------|--------|
| **앱 로고** | 600×600px PNG (배경색 필수) |
| **앱 이름** | 오늘의 나침반 |
| **앱 이름 (영문)** | Nahmban |
| **appName** | `nahmban` ⚠️ 한 번 정하면 변경 불가 |
| **사용 연령** | 만 19세 이상 |
| **고객센터 이메일** | 내 이메일 |
| **카테고리** | 생활 > 운세/심리 |
| **썸네일 (정방형)** | 1000×1000px PNG |
| **썸네일 (가로형)** | 1932×828px PNG |
| **부제** | 사주로 오늘 대인관계 미리 읽기 |

3. `검토 요청하기` 클릭 → **영업일 1~2일** 승인

### 토스 로그인 키 발급
1. 승인 후 콘솔 → 앱 선택 → `토스 로그인` 탭
2. 토스 로그인 활성화
3. **CLIENT_ID**, **CLIENT_SECRET** 복사
4. `backend/.env` 파일에 입력:

```env
TOSS_CLIENT_ID=발급받은_클라이언트_ID
TOSS_CLIENT_SECRET=발급받은_클라이언트_시크릿
```

### granite.config.ts 수정
```typescript
// nahmban-ait/granite.config.ts
export default defineConfig({
  appName: 'nahmban',  // 콘솔에서 등록한 appName과 동일하게
  brand: {
    displayName: '오늘의 나침반',
    primaryColor: '#191F28',
    icon: 'https://...',  // 콘솔에서 업로드한 로고 URL (우클릭 → 링크 복사)
  },
  ...
});
```

---

## STEP 4 — SDK 설치 + 로컬 테스트

### 샌드박스앱 설치
- Android: 콘솔 → `개발` → `샌드박스앱` → APK 다운로드
- iOS: TestFlight 링크 (콘솔에서 확인)

### 로컬 개발 서버 실행
```bash
# 터미널 1 — 백엔드
cd backend
cp .env.example .env   # 키 입력 후
npm install
node server.js         # http://localhost:4000

# 터미널 2 — 프론트엔드
npm install
npm run dev            # http://localhost:5173
```

### 샌드박스앱에서 테스트
1. 샌드박스앱 실행
2. 스킴 입력창에 `intoss://nahmban` 입력
3. 실행 버튼 클릭
4. 토스 로그인 → 사주 입력 → 결과 확인

### Android 실기기 연결
```bash
adb reverse tcp:8081 tcp:8081
adb reverse tcp:5173 tcp:5173
```

---

## STEP 5 — 백엔드 배포

앱인토스 프론트는 토스 CDN에 올라가지만, **백엔드는 직접 배포**해야 해요.

### 추천: Railway (무료 플랜 가능)

1. https://railway.app 가입
2. `New Project` → `Deploy from GitHub`
3. `backend/` 폴더를 GitHub에 올린 후 연결
4. 환경변수 설정:
   - `JWT_SECRET`
   - `TOSS_CLIENT_ID`
   - `TOSS_CLIENT_SECRET`
5. 배포 후 URL 복사 (예: `https://nahmban-backend.railway.app`)

### granite.config.ts에 백엔드 URL 반영
```typescript
// src/auth.ts 상단
export const API_URL = 'https://nahmban-backend.railway.app/api';
```

---

## STEP 6 — 빌드 + 업로드

### 빌드
```bash
# 프로젝트 루트에서
npm run build          # dist/ 폴더 생성
npx ait build          # .ait 파일 생성 (dist/ 기반)
```

> `npx ait build` 실행 시 `granite.config.ts`의 `appName`과 `icon`이 올바르게 설정되어 있어야 해요.

### 콘솔에 업로드
1. 콘솔 → 앱 선택 → `출시` → `번들 업로드`
2. 생성된 `.ait` 파일 업로드
3. 버전 메모 입력 (예: `v1.0.0 최초 출시`)
4. `검수 신청` 클릭

---

## STEP 7 — 검수 통과 체크리스트

검수에서 자주 반려되는 이유예요. 미리 확인하세요.

- [ ] 앱 로고: 600×600px, PNG, 배경색 있음 (투명 배경 불가)
- [ ] 썸네일: 규격 맞음 (1000×1000 / 1932×828)
- [ ] 고객센터 이메일 실제 작동
- [ ] 개인정보 처리방침 URL 등록 (간단한 노션 페이지도 가능)
- [ ] 서비스 이용약관 URL 등록
- [ ] 앱 실행 시 튕김 없음 (샌드박스에서 확인)
- [ ] 토스 로그인 정상 작동
- [ ] appName이 콘솔 등록값과 동일

---

## STEP 8 — 푸시 알림 설정 (출시 후 별도)

푸시 알림은 메시지 템플릿 검수가 **별도로 2~3일** 걸려요. 출시 후 진행하면 돼요.

### 방법
1. 콘솔 → 앱 선택 → `메시지` → `템플릿 등록`
2. 템플릿 코드: `morning_advice`
3. 내용 예시: `{nickname}님, 오늘 일정 입력하고 사주 조언 받아보세요`
4. 검수 신청 → 승인 후

5. mTLS 인증서 발급:
   - 콘솔 → `mTLS 인증서` → `+ 발급받기`
   - `cert.pem`, `key.pem` 다운로드
   - `backend/certs/` 폴더에 저장

6. `.env`에 추가:
```env
TOSS_APP_ID=콘솔에서-확인
TOSS_CERT_PATH=./certs/cert.pem
TOSS_KEY_PATH=./certs/key.pem
TOSS_MORNING_TEMPLATE=morning_advice
```

---

## STEP 9 — 구독 결제 설정

### 인앱결제(IAP) 활성화
1. 콘솔 → 앱 선택 → `수익화` → `인앱결제`
2. 상품 등록:
   - **상품 ID**: `premium_monthly`
   - **상품명**: 오늘의 나침반 프리미엄 1개월
   - **가격**: 2,900원
3. 검수 신청

---

## 전체 일정 요약

| 단계 | 작업 | 소요 시간 |
|------|------|-----------|
| 1 | 사업자 등록 | 2~3일 |
| 2 | 콘솔 가입 + 사업자 인증 | 1~2일 |
| 3 | 앱 등록 + 키 발급 | 1~2일 |
| 4 | SDK 연동 + 로컬 테스트 | 1~2일 |
| 5 | 백엔드 배포 | 반나절 |
| 6 | 빌드 + 업로드 + 검수 | 2~3일 |
| **합계** | | **약 10~14일** |

---

## 막히면

- 📖 개발자 센터: https://developers-apps-in-toss.toss.im
- 💬 개발자 커뮤니티: https://techchat-apps-in-toss.toss.im
- 📧 문의: 콘솔 우하단 채널톡 버튼
