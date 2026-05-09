import { useState, useEffect, useCallback } from 'react';
import type { Screen, InputState, AdviceResult, UserPlan, PatternData } from './types';
import type { AdviceResultFull } from './api';
import { defaultInput } from './types';
import { tossLogin, saveAuth, loadAuth, clearAuth, API_URL, type User } from './auth';
import { fetchAdvice, fallbackAdvice } from './api';
import { loadPlan, canUse, incrementCount, remainingFree, isPremium, purchasePlan, PLANS } from './plan';
import { analyzePattern } from './pattern';
import './App.css';

function today() {
  const d = new Date();
  return `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}`;
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('onboard');
  const [auth, setAuth] = useState<{ token: string; user: User } | null>(null);
  const [s, setS] = useState<InputState>(defaultInput);
  const [result, setResult] = useState<AdviceResultFull | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [toast, setToast] = useState('');
  const [pushEnabled, setPushEnabled] = useState(false);
  const [planInfo, setPlanInfo] = useState<UserPlan>(() => loadPlan());
  const [patternData, setPatternData] = useState<PatternData | null>(null);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPw, setLoginPw] = useState('');
  const [regNick, setRegNick] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPw, setRegPw] = useState('');
  const [errMsg, setErrMsg] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<string>('month');

  useEffect(() => {
    const saved = loadAuth();
    if (saved) { setAuth(saved); go('occupation'); }
  }, []);

  function go(next: Screen) { setScreen(next); }
  function goHome() { go('occupation'); }

  // ── 인증 ──
  async function handleTossLogin() {
    const res = await tossLogin();
    if (res) { setAuth(res); showToast('로그인 완료!'); go('occupation'); }
    else { setErrMsg('앱인토스 샌드박스에서 실행해주세요. 이메일로 로그인할 수 있어요.'); }
  }

  async function handleEmailLogin() {
    if (!loginEmail || !loginPw) { setErrMsg('이메일과 비밀번호를 입력해주세요'); return; }
    try {
      const r = await fetch(`${API_URL}/auth/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPw }),
      });
      const d = await r.json();
      if (!r.ok) { setErrMsg(d.error); return; }
      saveAuth(d.token, d.user);
      setAuth(d);
      go('occupation');
    } catch {
      setErrMsg('서버에 연결할 수 없어요. 체험 모드로 계속해요.');
      go('occupation');
    }
  }

  async function handleRegister() {
    if (!regNick || !regEmail || !regPw) { setErrMsg('모두 입력해주세요'); return; }
    if (regPw.length < 6) { setErrMsg('비밀번호는 6자 이상이어야 해요'); return; }
    try {
      const r = await fetch(`${API_URL}/auth/register`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: regEmail, password: regPw, nickname: regNick }),
      });
      const d = await r.json();
      if (!r.ok) { setErrMsg(d.error); return; }
      saveAuth(d.token, d.user);
      setAuth(d);
      go('occupation');
    } catch { setErrMsg('서버에 연결할 수 없어요'); }
  }

  function handleLogout() { clearAuth(); setAuth(null); go('onboard'); }

  const upd = useCallback((key: keyof InputState, val: string) => {
    setS(p => ({ ...p, [key]: val }));
  }, []);

  // ── AI 분석 ──
  async function startAnalysis() {
    const latest = loadPlan();
    setPlanInfo(latest);
    if (!canUse(latest)) { go('paywall'); return; }
    incrementCount();
    setPlanInfo(loadPlan());
    go('loading');
    try {
      const r = await fetchAdvice(s);
      setResult(r);
      await saveHistory(r);
    } catch {
      setResult(fallbackAdvice(s));
    }
    go('result');
  }

  async function handlePurchase() {
    if (!auth?.token) { go('login'); return; }
    const planId = selectedPlan as any;
    const ok = await purchasePlan(auth.token, planId);
    if (ok) {
      setPlanInfo(loadPlan());
      const plan = PLANS.find(p => p.id === planId);
      showToast(`${plan?.name} 시작! 이순간을 마음껏 써봐요 ✨`);
      go('occupation');
    } else {
      showToast('결제에 실패했어. 다시 시도해줘.');
    }
  }

  async function loadPatternData() {
    if (!auth?.token) return;
    try {
      const r = await fetch(`${API_URL}/history`, { headers: { Authorization: `Bearer ${auth.token}` } });
      const list = await r.json();
      setPatternData(analyzePattern(list));
    } catch { setPatternData(null); }
  }

  async function saveHistory(r: AdviceResult) {
    if (!auth?.token) return;
    try {
      await fetch(`${API_URL}/history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.token}` },
        body: JSON.stringify({
          place: s.place, person: s.person, purpose: s.purpose, occupation: s.occupation,
          situation: r.situation, advice: r.advice,
          checkpoints: r.checkpoints, bans: r.bans, sajuProfile: r.saju,
        }),
      });
    } catch {}
  }

  async function loadHistory() {
    if (!auth?.token) return;
    try {
      const r = await fetch(`${API_URL}/history`, { headers: { Authorization: `Bearer ${auth.token}` } });
      const d = await r.json();
      setHistory(d);
    } catch { setHistory([]); }
  }

  async function togglePush() {
    if (!auth?.token) { go('login'); return; }
    const next = !pushEnabled;
    try {
      await fetch(`${API_URL}/push/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.token}` },
        body: JSON.stringify({ enabled: next }),
      });
      setPushEnabled(next);
      showToast(next ? '매일 아침 9시에 알림을 보내드릴게요' : '알림을 껐어요');
    } catch { showToast('설정 저장 실패'); }
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 2000);
  }

  const premium = isPremium(planInfo.plan);

  // ── 렌더 ──
  return (
    <div className="shell">

      {/* 온보딩 */}
      <div className={`screen ${screen === 'onboard' ? 'active' : ''}`}>
        <div className="hero">
          <div className="hero-icon">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <circle cx="16" cy="16" r="10" stroke="rgba(212,163,115,.5)" strokeWidth="1.5"/>
              <circle cx="16" cy="16" r="2.5" fill="var(--gold)"/>
              <path d="M16 8L18 13H14L16 8Z" fill="var(--gold)"/>
              <path d="M16 24L14 19H18L16 24Z" fill="rgba(212,163,115,.3)"/>
              <path d="M8 16L13 14V18L8 16Z" fill="rgba(212,163,115,.3)"/>
              <path d="M24 16L19 18V14L24 16Z" fill="rgba(212,163,115,.3)"/>
            </svg>
          </div>
          <h1 className="hero-title">이 순간,<br/>어떻게 해야 할지<br/>알려줄게</h1>
          <p className="hero-sub">사주 + 오늘 상황으로<br/>'가야 하나 말아야 하나' 판단해드려요</p>
        </div>
        <div className="feat-list">
          {[
            { title: 'Go / No-Go 즉시 판정', desc: '사주 일진 기반 오늘 이 상황 분석', icon: '🔮' },
            { title: '신분별 맞춤 전략', desc: '학생·직장인·자영업자별 다른 조언', icon: '🎯' },
            { title: '골든타임 + 행운 아이템', desc: '오전/오후/저녁 최적 행동 전략', icon: '⏰' },
            { title: '30일 패턴 분석', desc: '나만의 대인관계 인사이트', icon: '📊' },
          ].map((f, i) => (
            <div key={i} className="feat-row" style={{ animationDelay: `${i * 0.06}s` }}>
              <div className="feat-ic"><span style={{ fontSize: 22 }}>{f.icon}</span></div>
              <div>
                <div className="feat-title">{f.title}</div>
                <div className="feat-desc">{f.desc}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="cta-wrap">
          <button className="cta" onClick={() => go('login')}>무료로 시작하기</button>
          <button className="cta ghost" onClick={() => go('occupation')}>로그인 없이 체험</button>
        </div>
      </div>

      {/* 로그인 */}
      <div className={`screen ${screen === 'login' ? 'active' : ''}`}>
        <div className="status-bar"><span className="clock"><Clock /></span></div>
        <div className="auth-top">
          <div className="auth-logo">✨</div>
          <h2 className="auth-title">이순간</h2>
          <p className="auth-sub">가입 즉시 3회 무료 체험!</p>
        </div>
        <div className="auth-body">
          <button className="toss-login-btn" onClick={handleTossLogin}>
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <circle cx="11" cy="11" r="11" fill="#3182F6"/>
              <path d="M7 11l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            토스로 계속하기
          </button>
          <div className="or-line">또는 이메일로</div>
          <div className="t-wrap">
            <input className={`t-input ${loginEmail ? 'on' : ''}`} type="email" placeholder="이메일"
              value={loginEmail} onChange={e => setLoginEmail(e.target.value)} />
          </div>
          <div className="t-wrap">
            <input className={`t-input ${loginPw ? 'on' : ''}`} type="password" placeholder="비밀번호"
              value={loginPw} onChange={e => setLoginPw(e.target.value)} />
          </div>
          {errMsg && <p className="err-msg">{errMsg}</p>}
          <p className="auth-switch">계정이 없어? <span onClick={() => go('register')}>회원가입</span></p>
        </div>
        <div className="cta-wrap">
          <button className="cta" onClick={handleEmailLogin}>로그인</button>
          <button className="cta ghost" onClick={() => go('occupation')}>로그인 없이 체험</button>
        </div>
      </div>

      {/* 회원가입 */}
      <div className={`screen ${screen === 'register' ? 'active' : ''}`}>
        <div className="status-bar"></div>
        <NavBar title="회원가입" onBack={() => go('login')} />
        <div className="body-pad">
          <div className="t-wrap">
            <input className={`t-input ${regNick ? 'on' : ''}`} type="text" placeholder="닉네임"
              value={regNick} onChange={e => setRegNick(e.target.value)} />
          </div>
          <div className="t-wrap">
            <input className={`t-input ${regEmail ? 'on' : ''}`} type="email" placeholder="이메일"
              value={regEmail} onChange={e => setRegEmail(e.target.value)} />
          </div>
          <div className="t-wrap">
            <input className={`t-input ${regPw ? 'on' : ''}`} type="password" placeholder="비밀번호 (6자 이상)"
              value={regPw} onChange={e => setRegPw(e.target.value)} />
          </div>
          {errMsg && <p className="err-msg">{errMsg}</p>}
        </div>
        <div className="cta-wrap">
          <button className="cta" onClick={handleRegister}>가입하기</button>
        </div>
      </div>

      {/* ★ 신분 선택 (신규) */}
      <div className={`screen ${screen === 'occupation' ? 'active' : ''}`}>
        <div className="status-bar"></div>
        <NavBar onBack={() => go('login')} />
        <ProgBar step={0} total={5} />
        <div className="body-pad">
          <h2 className="page-title">언니,<br/>뭐 하는 사람이야?</h2>
          <p className="page-sub">신분에 맞는 전략을 짜줄게</p>
          <div className="occ-grid">
            {[
              { label: '학생', icon: '🎓' },
              { label: '직장인', icon: '💼' },
              { label: '자영업자', icon: '🏪' },
              { label: '취준생', icon: '📝' },
              { label: '주부', icon: '🏠' },
              { label: '프리랜서', icon: '💻' },
            ].map(o => (
              <button
                key={o.label}
                className={`occ-btn ${s.occupation === o.label ? 'on' : ''}`}
                onClick={() => upd('occupation', o.label)}
              >
                <div className="occ-icon">{o.icon}</div>
                <div className="occ-label">{o.label}</div>
              </button>
            ))}
          </div>
        </div>
        <div className="cta-wrap">
          <button className={`cta ${!s.occupation ? 'off' : ''}`} onClick={() => go('birth')}>다음</button>
        </div>
      </div>

      {/* 생년월일 */}
      <div className={`screen ${screen === 'birth' ? 'active' : ''}`}>
        <div className="status-bar"></div>
        <NavBar onBack={() => go('occupation')} />
        <ProgBar step={1} total={5} />
        <div className="body-pad">
          <h2 className="page-title">생년월일을<br/>알려줘</h2>
          <p className="page-sub">사주 분석에 사용해. 저장 안 해.</p>
          <BirthPicker s={s} upd={upd} />
          <p className="sec-label">태어난 시간</p>
          <ChipGroup
            options={['모름','자시','축시','인시','묘시','진시','사시','오시','미시','신시','유시','술시','해시']}
            values={['모름','자시 (23~1시)','축시 (1~3시)','인시 (3~5시)','묘시 (5~7시)','진시 (7~9시)','사시 (9~11시)','오시 (11~13시)','미시 (13~15시)','신시 (15~17시)','유시 (17~19시)','술시 (19~21시)','해시 (21~23시)']}
            selected={s.hour}
            onSelect={v => upd('hour', v)}
          />
          <p className="sec-label" style={{ marginTop: 20 }}>성별</p>
          <div className="g-row">
            <button className={`g-btn ${s.gender === '남' ? 'on' : ''}`} onClick={() => upd('gender', '남')}>남성</button>
            <button className={`g-btn ${s.gender === '여' ? 'on' : ''}`} onClick={() => upd('gender', '여')}>여성</button>
          </div>
        </div>
        <div className="cta-wrap">
          <button className={`cta ${!(s.year && s.month && s.day && s.gender) ? 'off' : ''}`}
            onClick={() => go('place')}>다음</button>
        </div>
      </div>

      {/* 장소 */}
      <div className={`screen ${screen === 'place' ? 'active' : ''}`}>
        <div className="status-bar"></div>
        <NavBar onBack={() => go('birth')} />
        <ProgBar step={2} total={5} />
        <div className="body-pad">
          <h2 className="page-title">오늘 어디<br/>가?</h2>
          <p className="page-sub">직접 입력하거나 아래에서 골라</p>
          <TextInput value={s.place} placeholder="예) 강남역 카페, 본사 회의실…" onChange={v => upd('place', v)} />
          <p className="sec-label">자주 가는 곳</p>
          <ChipGroup
            options={['회사/사무실','카페','회의실','식당','술자리','거래처','재택/집','발표장']}
            selected={s.place}
            onSelect={v => upd('place', v)}
          />
        </div>
        <div className="cta-wrap">
          <button className={`cta ${!s.place ? 'off' : ''}`} onClick={() => go('person')}>다음</button>
        </div>
      </div>

      {/* 사람 */}
      <div className={`screen ${screen === 'person' ? 'active' : ''}`}>
        <div className="status-bar"></div>
        <NavBar onBack={() => go('place')} />
        <ProgBar step={3} total={5} />
        <div className="body-pad">
          <h2 className="page-title">누구<br/>만나?</h2>
          <p className="page-sub">직접 입력하거나 아래에서 골라</p>
          <TextInput value={s.person} placeholder="예) 직속 팀장, 대학교 선배…" onChange={v => upd('person', v)} />
          <p className="sec-label">관계 유형</p>
          <ChipGroup
            options={['직속 상사','임원','동료','후배','클라이언트','거래처','학교 선배','소개팅 상대']}
            selected={s.person}
            onSelect={v => upd('person', v)}
          />
          <p className="sec-label">친밀도</p>
          <ChipGroup
            options={['어색함','보통','편함']}
            values={['어색한 사이','보통','편한 사이']}
            selected={s.intimacy}
            onSelect={v => upd('intimacy', v)}
          />
        </div>
        <div className="cta-wrap">
          <button className={`cta ${!s.person ? 'off' : ''}`} onClick={() => go('purpose')}>다음</button>
        </div>
      </div>

      {/* 목적 */}
      <div className={`screen ${screen === 'purpose' ? 'active' : ''}`}>
        <div className="status-bar"></div>
        <NavBar onBack={() => go('person')} />
        <ProgBar step={4} total={5} />
        <div className="body-pad">
          <h2 className="page-title">가야 하나<br/>말아야 해?</h2>
          <p className="page-sub alert">목적 골라줘 — 조언의 핵심이야</p>
          <ChipGroup
            options={['업무 보고/논의','탐색/네트워킹','부탁/협상','갈등/해결','그냥 친목','첫 만남']}
            selected={s.purpose}
            onSelect={v => upd('purpose', v)}
            large
          />
          <p className="sec-label">컨디션</p>
          <ChipGroup
            options={['좋음','보통','피곤해요']}
            values={['좋음','보통','피곤함']}
            selected={s.condition}
            onSelect={v => upd('condition', v)}
          />
        </div>
        <div className="cta-wrap">
          <button className={`cta ${!s.purpose ? 'off' : ''}`} onClick={startAnalysis}>판단 받기</button>
        </div>
      </div>

      {/* 로딩 */}
      <div className={`screen ${screen === 'loading' ? 'active' : ''}`}>
        <div className="status-bar"></div>
        <div style={{ padding: '20px 20px 0' }}>
          <div className="sum-card">
            {[
              ['신분', s.occupation],
              ['생년월일', `${s.year}.${s.month}.${s.day} ${s.gender}성`],
              ['장소', s.place],
              ['만날 사람', s.person],
              ['목적', s.purpose],
            ].map(([k, v]) => (
              <div key={k} className="sum-row">
                <span className="sum-k">{k}</span>
                <span className="sum-v">{v}</span>
              </div>
            ))}
          </div>
          <div className="spin-wrap">
            <div className="spin" />
            <p className="spin-title">사주 × 상황 분석 중</p>
            <p className="spin-sub">사주와 상대방의 기운을 매칭 중이야...</p>
          </div>
        </div>
      </div>

      {/* 결과 */}
      <div className={`screen ${screen === 'result' ? 'active' : ''}`}>
        <div className="status-bar"></div>
        <NavBar title="오늘의 판단" onBack={goHome} />
        {result && (
          <div className="body-pad" style={{ paddingTop: 0 }}>

            {/* ★ Go/No-Go 판정 카드 */}
            <GoNoGoCard result={result} />

            {/* 에너지바 */}
            <div className="energy-bar">
              <span className="energy-icon">✨</span>
              <span className="energy-text">{result.todayEnergy}</span>
            </div>

            {/* 결과 요약 */}
            <ResultCard result={result} input={s} />

            {/* ★ 블러 잠금 — 무료 사용자 */}
            {premium ? (
              <>
                <CheckCard checkpoints={result.checkpoints} />
                <BanCard bans={result.bans} />
                {result.goldenTime && <GoldenTimeCard gt={result.goldenTime} />}
                {result.luckyItem && (
                  <div className="lucky-card">
                    <p className="lc-head">오늘의 행운 아이템</p>
                    <p className="lc-text">{result.luckyItem}</p>
                  </div>
                )}
              </>
            ) : (
              <div className="blur-section">
                <div className="blur-overlay">
                  <CheckCard checkpoints={result.checkpoints} />
                  <BanCard bans={result.bans} />
                  {result.goldenTime && <GoldenTimeCard gt={result.goldenTime} />}
                </div>
                <div className="blur-lock">
                  <span className="blur-lock-icon">🔒</span>
                  <p className="blur-lock-text">결제 후 {s.person}을 사로잡을<br/>필승 전략을 확인해!</p>
                  <button className="blur-lock-btn" onClick={() => go('paywall')}>
                    지금 확인하기 →
                  </button>
                </div>
              </div>
            )}

            <SajuCard saju={result.saju} />
            <PushBanner auth={auth} onToggle={togglePush} pushOn={pushEnabled} />
            <div className="act-row" style={{ marginTop: 12 }}>
              <button className="act dark" onClick={goHome}>다시 받기</button>
              {!premium && <button className="act light" onClick={() => go('paywall')}>업그레이드</button>}
            </div>
          </div>
        )}
      </div>

      {/* ★ Paywall — 결제 4종 */}
      <div className={`screen ${screen === 'paywall' ? 'active' : ''}`}>
        <div className="status-bar" style={{ background: 'var(--navy)' }} />
        <div className="pw-hero">
          <button className="pw-back" onClick={goHome}>
            <svg width="10" height="18" viewBox="0 0 10 18" fill="none">
              <path d="M9 1L1 9L9 17" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <p className="pw-eyebrow">PREMIUM</p>
          <h2 className="pw-title">필승 전략 전체를<br/>확인해봐 🔮</h2>
          <p className="pw-sub">골든타임 · 행운 아이템 · 구체적 공략법<br/>모든 게 잠금 해제돼</p>
        </div>
        <div className="pw-body">
          <div className="plan-cards">
            {PLANS.map(plan => (
              <div
                key={plan.id}
                className={`plan-card ${selectedPlan === plan.id ? 'selected' : ''} ${plan.id === 'month' ? 'best' : ''}`}
                onClick={() => setSelectedPlan(plan.id)}
              >
                {plan.id === 'month' && <span className="plan-badge-tag">★ Best</span>}
                {plan.id === 'lifetime' && <span className="plan-badge-tag">런칭 한정</span>}
                <div className="plan-card-radio" />
                <div className="plan-card-info">
                  <p className="plan-card-name">{plan.name}</p>
                  <p className="plan-card-desc">{plan.desc}</p>
                </div>
                <div className="plan-card-price-wrap">
                  {plan.origPrice && <p className="plan-card-orig">{plan.origPrice}</p>}
                  <p className="plan-card-price">{plan.price}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="cta-wrap">
          <button className="pw-cta-btn" onClick={handlePurchase}>
            {PLANS.find(p => p.id === selectedPlan)?.name} 시작하기
          </button>
          <p className="pw-fine">언제든 해지 가능 · VAT 포함 · 자동 갱신</p>
        </div>
      </div>

      {/* 30일 패턴 */}
      <div className={`screen ${screen === 'pattern' ? 'active' : ''}`}>
        <div className="status-bar" style={{ background: 'var(--navy)' }}></div>
        <div className="pt-hero">
          <button className="pw-back" onClick={() => go('my')}>
            <svg width="10" height="18" viewBox="0 0 10 18" fill="none">
              <path d="M9 1L1 9L9 17" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <p className="pw-eyebrow" style={{ color: 'var(--gold)' }}>30일 패턴 분석</p>
          <p className="pt-insight">{patternData?.insight || '데이터 분석 중…'}</p>
        </div>
        {patternData && (
          <div className="body-pad">
            {[
              { k: '총 조언 횟수',   v: `${patternData.totalCount}회` },
              { k: '가장 많은 목적', v: patternData.mostFrequentPurpose },
              { k: '자주 만난 사람', v: patternData.mostFrequentPerson },
              { k: '최근 상황',      v: patternData.bestSituation },
            ].map(({ k, v }) => (
              <div key={k} className="pt-row">
                <span className="pt-k">{k}</span>
                <span className="pt-v">{v}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 마이페이지 */}
      <div className={`screen ${screen === 'my' ? 'active' : ''}`}>
        <div className="status-bar" style={{ background: 'var(--navy)' }} />
        <div className="my-top">
          <div className="my-avatar">✨</div>
          <p className="my-name">{auth?.user.nickname || '이순간 유저'}</p>
          <p className="my-email">{auth?.user.email || '게스트 모드'}</p>
        </div>
        <div className="my-body">
          <div className={`plan-badge ${premium ? 'premium' : ''}`}>
            {premium
              ? <><span className="pb-icon">✨</span><span>프리미엄 구독 중</span></>
              : <><span className="pb-icon">🆓</span><span>무료 · 오늘 {remainingFree(planInfo)}회 남음</span><a onClick={() => go('paywall')}>업그레이드</a></>
            }
          </div>
          {premium && (
            <button className="pattern-btn" onClick={() => { loadPatternData(); go('pattern'); }}>
              <span>📊 30일 패턴 분석 보기</span>
              <svg width="8" height="14" viewBox="0 0 8 14" fill="none">
                <path d="M1 1l6 6-6 6" stroke="var(--gold)" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
          )}
          <p className="my-label">최근 조언 기록</p>
          {history.length === 0
            ? <p style={{ fontSize: 14, color: 'var(--g400)', textAlign: 'center', padding: '24px 0' }}>조언을 받으면 여기에 쌓여요</p>
            : history.map(h => {
              const d = new Date(h.createdAt);
              return (
                <div key={h.id} className="hist-item">
                  <p className="hist-date">{d.getMonth() + 1}.{d.getDate()} · {h.place} · {h.person}</p>
                  <p className="hist-sit">{h.situation}</p>
                  <p className="hist-pre">{h.advice}</p>
                </div>
              );
            })
          }
          <button className="logout-btn" onClick={handleLogout}>로그아웃</button>
        </div>
        <div style={{ height: 80 }} />
      </div>

      {/* 하단 탭 */}
      <div className="tab-bar">
        <button className={`tab-item ${screen !== 'my' ? 'on' : ''}`} onClick={goHome}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.8"/>
            <circle cx="12" cy="12" r="2" fill="currentColor"/>
            <path d="M12 5.5v3M12 15.5v3M5.5 12h3M15.5 12h3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
          <span>이순간</span>
        </button>
        <button className={`tab-item ${screen === 'my' ? 'on' : ''}`}
          onClick={() => { loadHistory(); go('my'); }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.8"/>
            <path d="M4 20c0-4.418 3.582-8 8-8s8 3.582 8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
          <span>내 정보</span>
        </button>
      </div>

      {/* 토스트 */}
      <div className={`toast ${toast ? 'show' : ''}`}>{toast}</div>
    </div>
  );
}

// ── 서브 컴포넌트 ──

function Clock() {
  const [time, setTime] = useState(() => {
    const d = new Date(); return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
  });
  useEffect(() => {
    const t = setInterval(() => {
      const d = new Date(); setTime(`${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`);
    }, 30000);
    return () => clearInterval(t);
  }, []);
  return <>{time}</>;
}

function NavBar({ title, onBack }: { title?: string; onBack?: () => void }) {
  return (
    <div className="nav-bar">
      {onBack && (
        <button className="nav-back" onClick={onBack}>
          <svg width="10" height="18" viewBox="0 0 10 18" fill="none">
            <path d="M9 1L1 9L9 17" stroke="var(--g800)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      )}
      {title && <span className="nav-title">{title}</span>}
    </div>
  );
}

function ProgBar({ step, total }: { step: number; total: number }) {
  return (
    <div className="prog-row">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className={`prog-dot ${i <= step ? 'on' : ''}`} />
      ))}
    </div>
  );
}

function TextInput({ value, placeholder, onChange }: {
  value: string; placeholder: string; onChange: (v: string) => void;
}) {
  return (
    <div className="t-wrap">
      <input
        className={`t-input ${value ? 'on' : ''}`}
        type="text" placeholder={placeholder} value={value}
        onChange={e => onChange(e.target.value)} autoComplete="off"
      />
      {value && <button className="t-del" onClick={() => onChange('')}>✕</button>}
    </div>
  );
}

function ChipGroup({ options, values, selected, onSelect, large }: {
  options: string[]; values?: string[]; selected: string;
  onSelect: (v: string) => void; large?: boolean;
}) {
  return (
    <div className="chip-group">
      {options.map((opt, i) => {
        const val = values ? values[i] : opt;
        return (
          <button key={opt} className={`chip ${large ? 'lg' : ''} ${selected === val ? 'on' : ''}`}
            onClick={() => onSelect(val)}>{opt}</button>
        );
      })}
    </div>
  );
}

function BirthPicker({ s, upd }: { s: InputState; upd: (k: keyof InputState, v: string) => void }) {
  const years  = Array.from({ length: new Date().getFullYear() - 1929 }, (_, i) => new Date().getFullYear() - 10 - i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const days   = Array.from({ length: 31 }, (_, i) => i + 1);
  return (
    <div className="date-row">
      <select className="date-pick" value={s.year} onChange={e => upd('year', e.target.value)}>
        <option value="">년</option>
        {years.map(y => <option key={y} value={y}>{y}년</option>)}
      </select>
      <select className="date-pick" value={s.month} onChange={e => upd('month', e.target.value)}>
        <option value="">월</option>
        {months.map(m => <option key={m} value={m}>{m}월</option>)}
      </select>
      <select className="date-pick" value={s.day} onChange={e => upd('day', e.target.value)}>
        <option value="">일</option>
        {days.map(d => <option key={d} value={d}>{d}일</option>)}
      </select>
    </div>
  );
}

function GoNoGoCard({ result }: { result: AdviceResult }) {
  const map = {
    go:          { verdict: '가도 좋아! ✓',           label: 'GO',          class: 'go' },
    conditional: { verdict: '가되, 조심해야 해 △',    label: '조건부 GO',   class: 'conditional' },
    nogo:        { verdict: '안 가도 돼요 ✕',         label: 'NO GO',       class: 'nogo' },
  };
  const m = map[result.goNoGo] || map['conditional'];
  return (
    <div className={`gng-card ${m.class}`}>
      <p className="gng-label">{m.label}</p>
      <p className="gng-verdict">{m.verdict}</p>
      <p className="gng-reason">{result.goNoGoReason}</p>
    </div>
  );
}

function ResultCard({ result, input }: { result: AdviceResult; input: InputState }) {
  const heroBg = result.tension === '높음'
    ? 'linear-gradient(148deg, #1a0d0d 0%, #2d1515 50%, #1a0a0a 100%)'
    : result.tension === '낮음'
    ? 'linear-gradient(148deg, #0d1a12 0%, #152d1f 50%, #0a1a10 100%)'
    : 'linear-gradient(148deg, #1a1a2e 0%, #2d2d4a 50%, #1a1a2e 100%)';
  const tc = result.tension === '높음' ? '#FF9500' : result.tension === '낮음' ? '#6ee7b7' : '#D4A373';
  const ac = result.advantage === '유리' ? '#6ee7b7' : result.advantage === '불리' ? '#fca5a5' : '#9ca3af';
  return (
    <div className="res-hero" style={{ background: heroBg }}>
      <p className="rh-meta">{today()} · {input.year}년생 {input.gender}성 · {input.occupation} · 사주 기반</p>
      <div className="rh-tags">
        <span className="rh-tag hl">{result.saju.ilgan}</span>
        {result.tags.map(t => <span key={t} className="rh-tag">{t}</span>)}
      </div>
      <p className="rh-situation">{result.situation}</p>
      <div className="rh-insight">
        <p className="rh-i-label">사주 인사이트</p>
        <p className="rh-i-text">{result.insight}</p>
      </div>
      <div className="rh-line" />
      <p className="rh-advice">{result.advice}</p>
      <div className="rh-scores">
        <div className="rh-sc">
          <span className="rh-sc-v" style={{ color: tc }}>{result.tension}</span>
          <span className="rh-sc-l">긴장도</span>
        </div>
        <div className="rh-sc">
          <span className="rh-sc-v" style={{ color: ac }}>{result.advantage}</span>
          <span className="rh-sc-l">유리함</span>
        </div>
        <div className="rh-sc">
          <span className="rh-sc-v">{result.status}</span>
          <span className="rh-sc-l">상황</span>
        </div>
      </div>
    </div>
  );
}

function CheckCard({ checkpoints }: { checkpoints: string[] }) {
  return (
    <div className="info-card">
      <p className="ic-head">오늘의 체크포인트</p>
      {checkpoints.map(c => (
        <div key={c} className="ic-row">
          <span className="ic-mark" style={{ color: 'var(--green)' }}>✓</span>{c}
        </div>
      ))}
    </div>
  );
}

function BanCard({ bans }: { bans: string[] }) {
  return (
    <div className="info-card ban-card">
      <p className="ic-head r">오늘 하지 말 것</p>
      {bans.map(b => (
        <div key={b} className="ic-row">
          <span className="ic-mark" style={{ color: 'var(--red)' }}>✕</span>{b}
        </div>
      ))}
    </div>
  );
}

function GoldenTimeCard({ gt }: { gt: { morning: string; afternoon: string; evening: string } }) {
  return (
    <div className="info-card" style={{ marginBottom: 10 }}>
      <p className="ic-head">시간대별 골든타임 ⏰</p>
      {[
        { label: '오전', value: gt.morning,   icon: '🌅' },
        { label: '오후', value: gt.afternoon, icon: '☀️' },
        { label: '저녁', value: gt.evening,   icon: '🌙' },
      ].map(s => (
        <div key={s.label} className="gt-row">
          <span className="gt-icon">{s.icon}</span>
          <div>
            <span className="gt-label">{s.label}</span>
            <p className="gt-text">{s.value}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function SajuCard({ saju }: { saju: AdviceResult['saju'] }) {
  return (
    <div className="saju-card">
      <p className="saju-head">내 사주 대인관계 성향</p>
      {[['일간', saju.ilgan], ['성향', saju.character], ['강점', saju.strength], ['약점', saju.weakness]].map(([k, v]) => (
        <div key={k} className="saju-row">
          <span className="saju-k">{k}</span>
          <span className="saju-v">{v}</span>
        </div>
      ))}
    </div>
  );
}

function PushBanner({ auth, onToggle, pushOn }: {
  auth: { token: string; user: User } | null;
  onToggle: () => void;
  pushOn: boolean;
}) {
  if (pushOn) return (
    <div className="push-banner on">
      <div>
        <p className="pb-title">매일 아침 알림 켜짐 ✓</p>
        <p className="pb-sub">9시에 오늘 일정 입력하라고 알려줄게요</p>
      </div>
      <button className="pb-toggle on" onClick={onToggle}>끄기</button>
    </div>
  );
  return (
    <div className="push-banner">
      <div>
        <p className="pb-title">매일 아침 알림 받기</p>
        <p className="pb-sub">오전 9시 · 오늘 조언 챙기는 습관</p>
      </div>
      <button className="pb-toggle" onClick={onToggle}>{auth ? '켜기' : '로그인 후 설정'}</button>
    </div>
  );
}
