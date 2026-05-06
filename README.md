# 🧭 오늘의 나침반 — 앱인토스 미니앱

사주 기반 대인관계 조언 앱

---

## 구조

```
nahmban-ait/
├── src/              # React 프론트엔드
│   ├── App.tsx       # 메인 앱 (전체 화면 + 로직)
│   ├── auth.ts       # 토스 로그인 연동
│   ├── api.ts        # Claude AI API
│   └── types.ts      # 타입 정의
├── backend/
│   ├── server.js     # Node.js 백엔드
│   └── .env.example  # 환경변수 템플릿
├── granite.config.ts # 앱인토스 SDK 설정
└── dist/             # 빌드 결과물 (.ait 파일 업로드용)
```

---

## 로컬 실행

### 1. 백엔드

```bash
cd backend
cp .env.example .env   # .env 편집
npm install
npm start              # http://localhost:4000
```

### 2. 프론트엔드

```bash
npm install
npm run dev            # http://localhost:5173
```

---

## 앱인토스 출시 순서

### 1단계 — 사업자 등록
- 홈택스(hometax.go.kr)에서 개인사업자 신청
- 약 2~3일 후 발급

### 2단계 — 콘솔 가입
- https://apps-in-toss.toss.im 접속
- 토스 비즈니스 계정으로 가입
- 사업자등록증 제출 → 1~2일 승인

### 3단계 — 앱 등록 & 키 발급
- 콘솔에서 앱 등록
- appName을 `granite.config.ts`의 `appName`과 동일하게 설정
- 토스 로그인 활성화 → CLIENT_ID, CLIENT_SECRET 발급
- `.env`에 입력

### 4단계 — SDK 연동 확인
```bash
npm install @apps-in-toss/web-framework
npx ait init           # appName 입력
npm run dev            # 샌드박스앱에서 intoss://nahmban 으로 테스트
```

### 5단계 — 빌드 & 업로드
```bash
npm run build          # dist/ 생성
npx ait build          # .ait 파일 생성
# 콘솔에서 .ait 파일 업로드 → 검수 신청
```

---

## 토스 로그인 작동 방식

```
앱인토스 앱 실행
  → appLogin() 호출 (SDK)
  → 토스 로그인 창
  → authorizationCode 반환
  → 백엔드 POST /api/auth/toss
  → 토스 서버에서 액세스 토큰 발급
  → 유저 정보 저장
  → JWT 발급 → 앱에 저장
```

---

## 환경변수

| 키 | 설명 |
|---|---|
| PORT | 백엔드 포트 (기본 4000) |
| JWT_SECRET | JWT 서명 키 (배포 시 랜덤 문자열로 변경) |
| TOSS_CLIENT_ID | 콘솔에서 발급 |
| TOSS_CLIENT_SECRET | 콘솔에서 발급 |
