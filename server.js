const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const imaps = require('imap-simple');
const Pop3Command = require('node-pop3');
const simpleParser = require('mailparser').simpleParser;

const app = express();
const PORT = 3001;

app.use(cors());
app.use(bodyParser.json());

// In-memory Mock DB (재시작 시 초기화됨)
let users = [{ id: 'u1', email: 'engineer@cloudops.com', password: 'password', name: 'Kim Engineer', role: 'Cloud Engineer' }];
let tasks = [];
let knowledgeBase = [];

// --- Auth Routes ---
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  const user = users.find(u => u.email === email && u.password === password);
  if (user) res.json(user);
  else res.status(401).json({ message: 'Invalid credentials' });
});

app.post('/api/signup', (req, res) => {
  const { name, email, password } = req.body;
  const newUser = { id: `u${Date.now()}`, name, email, password, role: 'Engineer' };
  users.push(newUser);
  res.json(newUser);
});

// ==========================================
// [Mail Integration Routes]
// 이 부분을 API 서버의 server.js에 추가하세요.
// ==========================================

// 1. Mail Connection Check (연동 테스트)
app.post('/api/mail/connect', async (req, res) => {
  console.log(`[Mail Connect Request] Protocol: ${req.body.protocol}, User: ${req.body.email}`);
  const { protocol, host, port, email, password, useSSL } = req.body;
  
  try {
    if (protocol === 'IMAP') {
      const config = {
        imap: {
          user: email,
          password: password,
          host: host,
          port: parseInt(port),
          tls: useSSL,
          authTimeout: 5000,
          tlsOptions: { rejectUnauthorized: false } // 사설 인증서 허용
        }
      };
      
      const connection = await imaps.connect(config);
      await connection.end();
      res.json({ success: true });
      
    } else if (protocol === 'POP3') {
      const pop3 = new Pop3Command({
        user: email,
        password: password,
        host: host,
        port: parseInt(port),
        tls: useSSL,
        timeout: 5000,
        tlsOptions: { rejectUnauthorized: false }
      });

      await pop3.UIDL(); // 간단한 명령어로 연결 확인
      await pop3.QUIT();
      res.json({ success: true });
    } else {
      res.status(400).json({ message: 'Unsupported protocol' });
    }
  } catch (error) {
    console.error('Mail Connection Error:', error.message);
    res.status(500).json({ message: 'Connection failed', error: error.message });
  }
});

// 2. Fetch Messages (메일 목록 가져오기)
app.post('/api/mail/messages', async (req, res) => {
  console.log(`[Mail Fetch Request] User: ${req.body.userId}`);
  const { config } = req.body;
  
  if (!config || !config.password) {
      return res.status(400).json({ message: 'Mail configuration missing' });
  }

  const { protocol, host, port, email, password, useSSL } = config;

  try {
    let emails = [];

    if (protocol === 'IMAP') {
      const imapConfig = {
        imap: {
          user: email,
          password: password,
          host: host,
          port: parseInt(port),
          tls: useSSL,
          authTimeout: 10000,
          tlsOptions: { rejectUnauthorized: false }
        }
      };

      const connection = await imaps.connect(imapConfig);
      await connection.openBox('INBOX');
      
      const searchCriteria = ['ALL'];
      const fetchOptions = {
        bodies: ['HEADER', 'TEXT'],
        markSeen: false,
        struct: true
      };
      
      // 최근 10개만 조회
      const messages = await connection.search(searchCriteria, fetchOptions);
      const recentMessages = messages.slice(-10).reverse();

      for (const item of recentMessages) {
        const all = item.parts.find(p => p.which === 'TEXT');
        const id = item.attributes.uid;
        const idHeader = "Imap-Id: "+id + "\r\n";
        
        // simpleParser를 사용하여 메일 파싱
        const parsed = await simpleParser(idHeader + (all.body || ""));
        
        emails.push({
          id: `imap-${id}`,
          senderName: parsed.from?.text || 'Unknown',
          senderAddress: parsed.from?.value?.[0]?.address || '',
          subject: parsed.subject || '(No Subject)',
          body: parsed.text || '(No Content)',
          receivedAt: parsed.date ? parsed.date.toISOString() : new Date().toISOString(),
          isRead: item.attributes.flags && item.attributes.flags.includes('\\Seen')
        });
      }
      
      await connection.end();

    } else if (protocol === 'POP3') {
       const pop3 = new Pop3Command({
        user: email,
        password: password,
        host: host,
        port: parseInt(port),
        tls: useSSL,
        timeout: 10000,
        tlsOptions: { rejectUnauthorized: false }
      });

      // LIST 명령어로 메일 목록 조회
      const list = await pop3.LIST();
      const total = list.length;
      const start = Math.max(1, total - 4); // 최근 5개 조회
      
      for (let i = total; i >= start; i--) {
        const raw = await pop3.RETR(i);
        const parsed = await simpleParser(raw);
        
        emails.push({
          id: `pop3-${i}`,
          senderName: parsed.from?.text || 'Unknown',
          senderAddress: parsed.from?.value?.[0]?.address || '',
          subject: parsed.subject || '(No Subject)',
          body: parsed.text || '(No Content)',
          receivedAt: parsed.date ? parsed.date.toISOString() : new Date().toISOString(),
          isRead: true 
        });
      }
      await pop3.QUIT();
    }

    res.json(emails);

  } catch (error) {
    console.error('Fetch Messages Error:', error);
    res.status(500).json({ message: 'Failed to fetch messages', error: error.message });
  }
});

// --- Other Routes (Tasks, Knowledge) ---
app.get('/api/tasks', (req, res) => {
  res.json(tasks.filter(t => String(t.userId) === String(req.query.userId)));
});

app.post('/api/tasks', (req, res) => {
  tasks.push(req.body);
  res.status(201).send();
});

app.delete('/api/tasks/:id', (req, res) => {
  tasks = tasks.filter(t => t.id !== req.params.id);
  res.send();
});

app.get('/api/knowledge', (req, res) => {
  res.json(knowledgeBase.filter(k => String(k.userId) === String(req.query.userId)));
});

app.post('/api/knowledge', (req, res) => {
  knowledgeBase.push(req.body);
  res.status(201).send();
});

app.delete('/api/knowledge/:id', (req, res) => {
  knowledgeBase = knowledgeBase.filter(k => k.id !== req.params.id);
  res.send();
});
app.put('/api/knowledge/:id', (req, res) => {
    const idx = knowledgeBase.findIndex(k => k.id === req.params.id);
    if(idx >= 0) {
        knowledgeBase[idx] = req.body;
        res.send();
    } else {
        res.status(404).send();
    }
});

// Update Password
app.put('/api/users/:id/password', (req, res) => {
    const user = users.find(u => String(u.id) === String(req.params.id));
    if(user) {
        user.password = req.body.password;
        res.send();
    } else {
        res.status(404).send();
    }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend Server running on port ${PORT}`);
});