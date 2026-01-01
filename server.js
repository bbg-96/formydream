const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const bcrypt = require('bcrypt');
const imaps = require('imap-simple');
const Pop3Command = require('node-pop3');
const simpleParser = require('mailparser').simpleParser;

const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const pool = new Pool({
  user: 'postgres',
  host: '10.200.0.159', 
  database: 'cloudops_db',
  password: '03474506', // [비밀번호 확인]
  port: 5432,
});

// --- Auth ---
app.post('/api/signup', async (req, res) => {
  const { name, email, password } = req.body;
  try {
    const check = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (check.rows.length > 0) return res.status(400).json({ message: "User exists" });
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role',
      [name, email, hashedPassword, 'Cloud Engineer']
    );
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) return res.status(401).json({ message: "Invalid credentials" });
    const user = result.rows[0];
    if (await bcrypt.compare(password, user.password)) {
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } else {
      res.status(401).json({ message: "Invalid credentials" });
    }
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- Tasks ---
app.get('/api/tasks', async (req, res) => {
  const { userId } = req.query;
  try {
    const result = await pool.query('SELECT * FROM tasks WHERE user_id = $1', [userId]);
    const formatted = result.rows.map(row => ({
        id: row.id,
        title: row.title,
        description: row.description,
        status: row.status,
        priority: row.priority,
        dueDate: row.due_date,
        tags: row.tags,
        subTasks: row.sub_tasks || [],
        createdAt: row.created_at
    }));
    res.json(formatted);
  } catch (err) { console.error(err); res.json([]); }
});

app.post('/api/tasks', async (req, res) => {
    const { id, userId, title, description, status, priority, dueDate, tags, subTasks, createdAt } = req.body;
    try {
        await pool.query(
            `INSERT INTO tasks (id, user_id, title, description, status, priority, due_date, tags, sub_tasks, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
             ON CONFLICT (id) DO UPDATE SET
               title=$3, description=$4, status=$5, priority=$6, due_date=$7, tags=$8, sub_tasks=$9`,
            [id, userId, title, description, status, priority, dueDate, tags, JSON.stringify(subTasks), createdAt]
        );
        res.json({ success: true });
    } catch(err) { console.error(err); res.status(500).json({error: err.message}); }
});

app.delete('/api/tasks/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM tasks WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch(err) { res.status(500).json({error: err.message}); }
});

// --- Knowledge ---
app.get('/api/knowledge', async (req, res) => {
    const { userId } = req.query;
    try {
        const result = await pool.query('SELECT * FROM knowledge WHERE user_id = $1', [userId]);
        const formatted = result.rows.map(row => ({
            id: row.id,
            title: row.title,
            content: row.content,
            category: row.category,
            tags: row.tags,
            isDraft: row.is_draft,
            createdAt: row.created_at
        }));
        res.json(formatted);
    } catch (err) { console.error(err); res.json([]); }
});

app.post('/api/knowledge', async (req, res) => {
    const { id, userId, title, content, category, tags, isDraft, createdAt } = req.body;
    try {
        await pool.query(
            `INSERT INTO knowledge (id, user_id, title, content, category, tags, is_draft, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             ON CONFLICT (id) DO UPDATE SET
               title=$3, content=$4, category=$5, tags=$6, is_draft=$7`,
            [id, userId, title, content, category, tags, isDraft, createdAt]
        );
        res.json({ success: true });
    } catch(err) { console.error(err); res.status(500).json({error: err.message}); }
});

app.delete('/api/knowledge/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM knowledge WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch(err) { res.status(500).json({error: err.message}); }
});

app.put('/api/knowledge/:id', async (req, res) => {
    const { id } = req.params;
    const { userId, title, content, category, tags, isDraft } = req.body;
    try {
        await pool.query(
             `UPDATE knowledge SET title=$1, content=$2, category=$3, tags=$4, is_draft=$5 WHERE id=$6`,
             [title, content, category, tags, isDraft, id]
        );
        res.json({ success: true });
    } catch(err) { res.status(500).json({error: err.message}); }
});

// --- User Settings ---
app.put('/api/users/:id/password', async (req, res) => {
  const { id } = req.params;
  const { password } = req.body; 
  if (!password) return res.status(400).json({ message: "Password is required" });
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    await pool.query('UPDATE users SET password = $1 WHERE id = $2', [hashedPassword, id]);
    res.json({ success: true, message: "Password updated successfully" });
  } catch (err) {
    console.error('Password Update Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// =================================================================
// [Mail Integration]
// =================================================================

// 1. Connection Check
app.post('/api/mail/connect', async (req, res) => {
  const { protocol, host, port, email, password, useSSL } = req.body;
  console.log(`[Mail] Connecting to ${host}:${port} (${protocol}) for ${email}`);

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
          tlsOptions: { rejectUnauthorized: false }
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
      // Force STAT to ensure mailbox is refreshed
      await pop3.STAT();
      await pop3.QUIT();
      res.json({ success: true });
    } else {
      res.status(400).json({ message: 'Unsupported protocol' });
    }
  } catch (error) {
    console.error('Mail Connect Error:', error.message);
    res.status(500).json({ message: 'Connection failed', error: error.message });
  }
});

// 2. Fetch Messages (Incremental)
app.post('/api/mail/messages', async (req, res) => {
  const { config, lastUid } = req.body;
  
  if (!config || !config.password) {
      return res.status(400).json({ message: 'Mail credentials missing' });
  }

  const { protocol, host, port, email, password, useSSL } = config;

  try {
    let emails = [];
    let newLatestUid = lastUid;

    // Use specific check for "Initial" because lastUid could be empty string/0 which are valid states
    const isInitialSync = (lastUid === undefined || lastUid === null);

    if (protocol === 'IMAP') {
      const imapConfig = {
        imap: {
          user: email,
          password: password,
          host: host,
          port: parseInt(port),
          tls: useSSL,
          authTimeout: 30000,
          tlsOptions: { rejectUnauthorized: false }
        }
      };

      const connection = await imaps.connect(imapConfig);
      await connection.openBox('INBOX');
      
      const total = connection.box.messages.total;
      
      // === Case 1: Initial Connection ===
      if (isInitialSync) {
          // Fetch last 10 messages for context
          const fetchCount = 10;
          if (total > 0) {
              const fetchStart = Math.max(1, total - fetchCount + 1);
              console.log(`[IMAP] Initial sync. Fetching ${fetchStart}:${total}`);
              const messages = await connection.fetch(`${fetchStart}:${total}`, {
                  bodies: ['HEADER', 'TEXT'],
                  markSeen: false,
                  struct: true
              });
              
              if (messages.length > 0) {
                  // Process and add to emails list (copied logic from below)
                  const parsePromises = messages.map(async (item) => {
                      const uid = item.attributes.uid;
                      const numericUid = Number(uid);
                      const currentMax = Number(newLatestUid) || 0;
                      if (!newLatestUid || numericUid > currentMax) newLatestUid = uid;
                      
                      const all = item.parts.find(p => p.which === 'TEXT');
                      const idHeader = "Imap-Id: " + uid + "\r\n";
                      try {
                        const parsed = await simpleParser(idHeader + (all.body || ""));
                        return {
                            id: `imap-${uid}`,
                            senderName: parsed.from?.text || 'Unknown',
                            senderAddress: parsed.from?.value?.[0]?.address || '',
                            subject: parsed.subject || '(No Subject)',
                            body: parsed.text || '(No Content)',
                            receivedAt: parsed.date ? parsed.date.toISOString() : new Date().toISOString(),
                            isRead: item.attributes.flags && item.attributes.flags.includes('\\Seen')
                        };
                      } catch (e) { return null; }
                  });
                  const results = await Promise.all(parsePromises);
                  emails = results.filter(e => e !== null);
              }
          } else {
              newLatestUid = 'EMPTY_MAILBOX';
          }
      } 
      // === Case 2: Refresh ===
      else {
          console.log(`[IMAP] Incremental sync. Fetching UID > ${lastUid}`);
          let searchCriteria = [['UID', `${Number(lastUid) + 1}:*`]];
          
          if (lastUid === 'EMPTY_MAILBOX') {
             searchCriteria = [['ALL']];
          }

          const messages = await connection.search(searchCriteria, {
              bodies: ['HEADER', 'TEXT'],
              markSeen: false,
              struct: true
          });

          if (messages.length > 0) {
              const parsePromises = messages.map(async (item) => {
                  const uid = item.attributes.uid;
                  const numericUid = Number(uid);
                  const currentMax = Number(newLatestUid) || 0;
                  
                  if (!newLatestUid || numericUid > currentMax) {
                      newLatestUid = uid;
                  }

                  const all = item.parts.find(p => p.which === 'TEXT');
                  const idHeader = "Imap-Id: " + uid + "\r\n";
                  
                  try {
                    const parsed = await simpleParser(idHeader + (all.body || ""));
                    return {
                        id: `imap-${uid}`,
                        senderName: parsed.from?.text || 'Unknown',
                        senderAddress: parsed.from?.value?.[0]?.address || '',
                        subject: parsed.subject || '(No Subject)',
                        body: parsed.text || '(No Content)',
                        receivedAt: parsed.date ? parsed.date.toISOString() : new Date().toISOString(),
                        isRead: item.attributes.flags && item.attributes.flags.includes('\\Seen')
                    };
                  } catch (e) {
                      console.error('Parse error', e);
                      return null;
                  }
              });

              const results = await Promise.all(parsePromises);
              emails = results.filter(e => e !== null);
          }
      }
      
      await connection.end();

    } else if (protocol === 'POP3') {
       const pop3 = new Pop3Command({
        user: email,
        password: password,
        host: host,
        port: parseInt(port),
        tls: useSSL,
        timeout: 30000,
        tlsOptions: { rejectUnauthorized: false }
      });

      // Update 1: Force STAT to refresh mailbox state
      await pop3.STAT();

      const list = await pop3.UIDL(); 
      // Update 2: Sort by msgNumber to ensure order
      list.sort((a, b) => Number(a.msgNumber) - Number(b.msgNumber));

      console.log(`[POP3] UIDL List length: ${list.length}`);
      
      if (list.length > 0) {
          const lastActual = list[list.length - 1];
          const lastActualUid = (typeof lastActual === 'object' && lastActual.uidl) ? lastActual.uidl : lastActual;
          console.log(`[POP3] Server Latest UIDL is: ${lastActualUid}`);
      }

      if (isInitialSync) {
          // Case 1: Initial. Get LAST 10 emails.
          if (list.length > 0) {
              const fetchCount = 10;
              const startIndex = Math.max(0, list.length - fetchCount);
              console.log(`[POP3] Initial sync. Fetching last ${list.length - startIndex} messages.`);
              
              for (let i = startIndex; i < list.length; i++) {
                  const item = list[i];
                  const msgNum = item.msgNumber || (i + 1);
                  const uidl = (typeof item === 'object' && item.uidl) ? item.uidl : item;
                  
                  try {
                      const raw = await pop3.RETR(msgNum);
                      const parsed = await simpleParser(raw);
                      
                      emails.push({
                        id: `pop3-${msgNum}`,
                        senderName: parsed.from?.text || 'Unknown',
                        senderAddress: parsed.from?.value?.[0]?.address || '',
                        subject: parsed.subject || '(No Subject)',
                        body: parsed.text || '(No Content)',
                        receivedAt: parsed.date ? parsed.date.toISOString() : new Date().toISOString(),
                        isRead: true 
                      });
                      
                      newLatestUid = uidl;
                  } catch (e) { console.warn(`POP3 RETR error for msg ${msgNum}:`, e.message); }
              }
              console.log(`[POP3] Initial sync done. New Cursor: ${newLatestUid}`);
          } else {
              newLatestUid = 'EMPTY_MAILBOX';
              console.log(`[POP3] Initial sync. Mailbox is empty.`);
          }
      } else {
          // Case 2: Refresh. Find index of lastUid and fetch subsequent.
          console.log(`[POP3] Refreshing. Client has UIDL: ${lastUid}`);
          
          let lastIndex = -1;
          
          if (lastUid !== 'EMPTY_MAILBOX') {
             lastIndex = list.findIndex(item => {
                 const uid = (typeof item === 'object' && item.uidl) ? item.uidl : item;
                 return String(uid).trim() === String(lastUid).trim();
             });
          }
          
          if (lastIndex !== -1) {
              const startIndex = lastIndex + 1;
              if (startIndex < list.length) {
                  console.log(`[POP3] Found new messages. Fetching from index ${startIndex} to ${list.length - 1}`);
                  
                  for (let i = startIndex; i < list.length; i++) {
                      const item = list[i];
                      const msgNum = item.msgNumber || (i + 1);
                      const uidl = item.uidl || item;
                      
                      try {
                          const raw = await pop3.RETR(msgNum);
                          const parsed = await simpleParser(raw);
                          
                          emails.push({
                            id: `pop3-${msgNum}`,
                            senderName: parsed.from?.text || 'Unknown',
                            senderAddress: parsed.from?.value?.[0]?.address || '',
                            subject: parsed.subject || '(No Subject)',
                            body: parsed.text || '(No Content)',
                            receivedAt: parsed.date ? parsed.date.toISOString() : new Date().toISOString(),
                            isRead: true 
                          });
                          
                          // Update latest to current
                          newLatestUid = uidl;
                      } catch (e) { console.warn(`POP3 RETR error for msg ${msgNum}:`, e.message); }
                  }
              } else {
                  console.log(`[POP3] No new messages found (Index at end).`);
              }
          } else if (lastUid !== 'EMPTY_MAILBOX') {
               // UID not found. Sync lost.
               // HEALING: Fetch last 10 messages so user sees something and sync is restored.
               console.warn('[POP3] Last UID not found. Sync lost. Fetching last 10 messages to heal.');
               
               const fetchCount = 10;
               const startIndex = Math.max(0, list.length - fetchCount);
               
               if (list.length > 0) {
                    for (let i = startIndex; i < list.length; i++) {
                        const item = list[i];
                        const msgNum = item.msgNumber || (i + 1);
                        const uidl = (typeof item === 'object' && item.uidl) ? item.uidl : item;
                        try {
                            const raw = await pop3.RETR(msgNum);
                            const parsed = await simpleParser(raw);
                            emails.push({
                                id: `pop3-${msgNum}`,
                                senderName: parsed.from?.text || 'Unknown',
                                senderAddress: parsed.from?.value?.[0]?.address || '',
                                subject: parsed.subject || '(No Subject)',
                                body: parsed.text || '(No Content)',
                                receivedAt: parsed.date ? parsed.date.toISOString() : new Date().toISOString(),
                                isRead: true 
                            });
                            newLatestUid = uidl;
                        } catch (e) { console.warn(`POP3 healing error:`, e.message); }
                    }
               } else {
                   newLatestUid = 'EMPTY_MAILBOX';
               }
          }
      }

      await pop3.QUIT();
    }

    // Sort Newest First (locally for the chunk)
    emails.sort((a, b) => new Date(b.receivedAt) - new Date(a.receivedAt));

    // Fallback if still undefined
    if (newLatestUid === undefined || newLatestUid === null) {
        newLatestUid = 'EMPTY_MAILBOX';
    }

    res.json({
        emails: emails,
        latestUid: newLatestUid
    });

  } catch (error) {
    console.error('Mail Fetch Error:', error.message);
    res.status(500).json({ message: 'Failed to fetch messages', error: error.message });
  }
});

app.listen(3001, '0.0.0.0', () => console.log('Server running on 3001'));