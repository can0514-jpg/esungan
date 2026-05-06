const express = require('express');
const cors    = require('cors');
const jwt     = require('jsonwebtoken');
const bcrypt  = require('bcryptjs');
const axios   = require('axios');
const fs      = require('fs');
const path    = require('path');
const https   = require('https');
require('dotenv').config();

const app = express();
app.use(cors({ origin: process.env.CLIENT_URL || '*', credentials: true }));
app.use(express.json());

// ── JSON DB ──
const DB_PATH = path.join(__dirname, 'db.json');
function getDB() {
  if (!fs.existsSync(DB_PATH))
    fs.writeFileSync(DB_PATH, JSON.stringify({ users: [], histories: [] }));
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
}
function saveDB(d) { fs.writeFileSync(DB_PATH, JSON.stringify(d, null, 2)); }

const SECRET = process.env.JWT_SECRET || 'nahmban-secret-change-in-prod';

function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: '인증 필요' });
  try { req.user = jwt.verify(token, SECRET); next(); }
  catch { res.status(401).json({ error: '토큰 만료' }); }
}

// ── mTLS 클라이언트 (앱인토스 API 전용) ──
function createTossClient() {
  const certPath = process.env.TOSS_CERT_PATH;
  const keyPath  = process.env.TOSS_KEY_PATH;
  if (!certPath || !keyPath) return null;
  try {
    const cert = fs.readFileSync(certPath);
    const key  = fs.readFileSync(keyPath);
    const agent = new https.Agent({ cert, key });
    return axios.create({
      httpsAgent: agent,
      baseURL: 'https://api.toss.im',
    });
  } catch { return null; }
}

// ──────────────────────────────────────────────
// 인증
// ──────────────────────────────────────────────

// 토스 로그인 (앱인토스 SDK authorizationCode → 액세스 토큰)
app.post('/api/auth/toss', async (req, res) => {
  const { authCode } = req.body;
  if (!authCode) return res.status(400).json({ error: 'authCode 없음' });

  const clientId     = process.env.TOSS_CLIENT_ID;
  const clientSecret = process.env.TOSS_CLIENT_SECRET;
  if (!clientId || !clientSecret)
    return res.status(500).json({ error: '토스 키 미설정. .env 확인.' });

  try {
    const tokenRes = await axios.post(
      'https://api.toss.im/v2/oauth2/token',
      new URLSearchParams({
        grant_type: 'authorization_code',
        code: authCode,
        client_id: clientId,
        client_secret: clientSecret,
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    const userRes = await axios.get('https://api.toss.im/v2/user/me', {
      headers: { Authorization: `Bearer ${tokenRes.data.access_token}` },
    });

    const tu = userRes.data;
    const tossId  = String(tu.id);
    const nickname = tu.name || '토스 유저';
    const email   = tu.email || `toss_${tossId}@nahmban.com`;

    const db = getDB();
    let user = db.users.find(u => u.provider === 'toss' && u.providerId === tossId);
    if (!user) {
      user = {
        id: `u_${Date.now()}`, email, nickname,
        provider: 'toss', providerId: tossId,
        tossAccessToken: tokenRes.data.access_token, // 푸시 발송용
        tossUserKey: tu.userKey || '',
        createdAt: new Date().toISOString(),
      };
      db.users.push(user);
    } else {
      // 토큰 갱신
      user.tossAccessToken = tokenRes.data.access_token;
      user.tossUserKey = tu.userKey || user.tossUserKey || '';
    }
    saveDB(db);

    const token = jwt.sign(
      { id: user.id, email: user.email, nickname: user.nickname },
      SECRET, { expiresIn: '30d' }
    );
    res.json({ token, user: { id: user.id, email: user.email, nickname: user.nickname, provider: 'toss' } });

  } catch (e) {
    console.error('토스 로그인 실패:', e.response?.data || e.message);
    res.status(500).json({ error: '토스 로그인 처리 실패' });
  }
});

// 이메일 회원가입
app.post('/api/auth/register', async (req, res) => {
  const { email, password, nickname } = req.body;
  if (!email || !password || !nickname)
    return res.status(400).json({ error: '필수 입력값 누락' });
  const db = getDB();
  if (db.users.find(u => u.email === email))
    return res.status(409).json({ error: '이미 사용 중인 이메일' });
  const hashed = await bcrypt.hash(password, 10);
  const user = {
    id: `u_${Date.now()}`, email, password: hashed, nickname,
    provider: 'email', createdAt: new Date().toISOString(),
  };
  db.users.push(user); saveDB(db);
  const token = jwt.sign({ id: user.id, email, nickname }, SECRET, { expiresIn: '30d' });
  res.json({ token, user: { id: user.id, email, nickname, provider: 'email' } });
});

// 이메일 로그인
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const db = getDB();
  const user = db.users.find(u => u.email === email && u.provider === 'email');
  if (!user) return res.status(401).json({ error: '이메일 또는 비밀번호 오류' });
  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return res.status(401).json({ error: '이메일 또는 비밀번호 오류' });
  const token = jwt.sign(
    { id: user.id, email: user.email, nickname: user.nickname },
    SECRET, { expiresIn: '30d' }
  );
  res.json({ token, user: { id: user.id, email: user.email, nickname: user.nickname, provider: 'email' } });
});

app.get('/api/auth/me', authMiddleware, (req, res) => {
  const db = getDB();
  const user = db.users.find(u => u.id === req.user.id);
  if (!user) return res.status(404).json({ error: '없음' });
  res.json({ id: user.id, email: user.email, nickname: user.nickname, provider: user.provider });
});

// ──────────────────────────────────────────────
// 히스토리
// ──────────────────────────────────────────────
app.post('/api/history', authMiddleware, (req, res) => {
  const { place, person, purpose, situation, advice, checkpoints, bans, sajuProfile } = req.body;
  const db = getDB();
  const item = {
    id: `h_${Date.now()}`, userId: req.user.id,
    place, person, purpose, situation, advice, checkpoints, bans, sajuProfile,
    createdAt: new Date().toISOString(),
  };
  db.histories.push(item); saveDB(db);
  res.json({ id: item.id });
});

app.get('/api/history', authMiddleware, (req, res) => {
  const db = getDB();
  const list = db.histories
    .filter(h => h.userId === req.user.id)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 30);
  res.json(list);
});

// ──────────────────────────────────────────────
// 사주 정보
// ──────────────────────────────────────────────
app.post('/api/user/saju', authMiddleware, (req, res) => {
  const db = getDB();
  const user = db.users.find(u => u.id === req.user.id);
  if (!user) return res.status(404).json({ error: '없음' });
  user.saju = req.body; saveDB(db);
  res.json({ ok: true });
});

app.get('/api/user/saju', authMiddleware, (req, res) => {
  const db = getDB();
  const user = db.users.find(u => u.id === req.user.id);
  res.json(user?.saju || null);
});

// ──────────────────────────────────────────────
// 푸시 알림
// ──────────────────────────────────────────────

/**
 * 알림 구독 등록
 * 프론트에서 "매일 아침 알림 받기" 켜면 호출
 */
app.post('/api/push/subscribe', authMiddleware, (req, res) => {
  const { enabled } = req.body;
  const db = getDB();
  const user = db.users.find(u => u.id === req.user.id);
  if (!user) return res.status(404).json({ error: '없음' });
  user.pushEnabled = !!enabled;
  saveDB(db);
  res.json({ ok: true, pushEnabled: user.pushEnabled });
});

app.get('/api/push/status', authMiddleware, (req, res) => {
  const db = getDB();
  const user = db.users.find(u => u.id === req.user.id);
  res.json({ pushEnabled: user?.pushEnabled || false });
});

/**
 * 푸시 발송 (앱인토스 API)
 *
 * 앱인토스 푸시는 백엔드에서 mTLS로 발송해요.
 * 콘솔에서:
 *   1. 메시지 템플릿 등록 (검수 2~3일)
 *   2. mTLS 인증서 발급
 *   3. .env에 TOSS_CERT_PATH, TOSS_KEY_PATH, TOSS_APP_ID 설정
 *
 * 참고: https://developers-apps-in-toss.toss.im/push/develop.html
 */
app.post('/api/push/send', authMiddleware, async (req, res) => {
  const { templateSetCode, context } = req.body;
  const db = getDB();
  const user = db.users.find(u => u.id === req.user.id);
  if (!user) return res.status(404).json({ error: '없음' });

  const tossUserKey = user.tossUserKey;
  if (!tossUserKey)
    return res.status(400).json({ error: '토스 로그인이 필요해요' });

  const appId = process.env.TOSS_APP_ID;
  if (!appId)
    return res.status(500).json({ error: 'TOSS_APP_ID 미설정' });

  const client = createTossClient();
  if (!client)
    return res.status(500).json({ error: 'mTLS 인증서 미설정. TOSS_CERT_PATH, TOSS_KEY_PATH 확인.' });

  try {
    const r = await client.post(`/apps-in-toss/v1/apps/${appId}/messages/send`, {
      templateSetCode,
      receivers: [{ userKey: tossUserKey }],
      context: context || {},
    });
    res.json({ ok: true, result: r.data });
  } catch (e) {
    console.error('푸시 발송 실패:', e.response?.data || e.message);
    res.status(500).json({ error: '푸시 발송 실패', detail: e.response?.data });
  }
});

/**
 * 매일 아침 9시 푸시 (cron 대신 단순 interval)
 * 실제 배포 시엔 node-cron 또는 외부 스케줄러 사용 권장
 */
function scheduleMorningPush() {
  const appId = process.env.TOSS_APP_ID;
  const templateCode = process.env.TOSS_MORNING_TEMPLATE || 'morning_advice';
  if (!appId) return;

  setInterval(async () => {
    const now = new Date();
    if (now.getHours() !== 9 || now.getMinutes() !== 0) return;

    const client = createTossClient();
    if (!client) return;

    const db = getDB();
    const targets = db.users.filter(u => u.pushEnabled && u.tossUserKey);

    for (const user of targets) {
      try {
        await client.post(`/apps-in-toss/v1/apps/${appId}/messages/send`, {
          templateSetCode: templateCode,
          receivers: [{ userKey: user.tossUserKey }],
          context: { nickname: user.nickname },
        });
        console.log(`✅ 아침 푸시 발송: ${user.nickname}`);
      } catch (e) {
        console.error(`❌ 푸시 실패: ${user.nickname}`, e.response?.data);
      }
    }
  }, 60 * 1000); // 1분마다 체크
}

scheduleMorningPush();


// ──────────────────────────────────────────────
// AI 조언 API (Anthropic — 백엔드에서 안전하게 호출)
// ──────────────────────────────────────────────
app.post('/api/advice', async (req, res) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY 미설정. .env 확인.' });

  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: 'prompt 없음' });

  try {
    const r = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1800,
        messages: [{ role: 'user', content: prompt }],
      },
      {
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
      }
    );
    res.json(r.data);
  } catch (e) {
    console.error('AI API 오류:', e.response?.data || e.message);
    res.status(500).json({ error: 'AI API 호출 실패', detail: e.response?.data });
  }
});

// ──────────────────────────────────────────────
// 헬스체크
// ──────────────────────────────────────────────
app.get('/api/health', (_, res) => res.json({ ok: true, time: new Date().toISOString() }));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`🧭 나침반 서버: http://localhost:${PORT}`));
