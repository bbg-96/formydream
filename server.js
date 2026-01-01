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
      await pop3.UIDL();
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
      
      // === Case 1: Initial Connection (No lastUid) ===
      if (!lastUid) {
          // Just get the last message's UID to set the cursor
          if (total > 0) {
              // Fetch only HEADER of the last message to be fast
              const lastMsg = await connection.fetch(`${total}:${total}`, { 
                  bodies: 'HEADER', 
                  markSeen: false 
              });
              if (lastMsg && lastMsg.length > 0) {
                  newLatestUid = lastMsg[0].attributes.uid;
              }
          } else {
              newLatestUid = 0;
          }
          // We return EMPTY emails list, just the UID.
          console.log(`[IMAP] Initial sync. Max UID: ${newLatestUid}. No emails fetched.`);
      
      } 
      // === Case 2: Refresh (Has lastUid) ===
      else {
          console.log(`[IMAP] Incremental sync. Fetching UID > ${lastUid}`);
          
          // Search for UIDs strictly greater than lastUid
          const searchCriteria = [['UID', `${Number(lastUid) + 1}:*`]];
          
          // Use imap-simple search
          const messages = await connection.search(searchCriteria, {
              bodies: ['HEADER', 'TEXT'],
              markSeen: false,
              struct: true
          });

          // Process the new messages
          if (messages.length > 0) {
              const parsePromises = messages.map(async (item) => {
                  const uid = item.attributes.uid;
                  // Update max UID
                  if (!newLatestUid || uid > newLatestUid) {
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

      // Get full UIDL list: [{ msgNumber: 1, uidl: '...' }, ...]
      const list = await pop3.UIDL(); 
      
      if (!lastUid) {
          // Case 1: Initial. Get last UIDL.
          if (list.length > 0) {
              newLatestUid = list[list.length - 1].uidl;
          }
          console.log(`[POP3] Initial sync. Last UIDL: ${newLatestUid}`);
      } else {
          // Case 2: Refresh. Find index of lastUid and fetch subsequent.
          const lastIndex = list.findIndex(item => item.uidl === lastUid);
          
          if (lastIndex !== -1 && lastIndex < list.length - 1) {
              // Fetch from lastIndex + 1 to end
              // POP3 indexes are 1-based, list is 0-based.
              // list[lastIndex] is the known one. We want list[lastIndex+1] which is msgNumber (lastIndex+2)
              
              for (let i = lastIndex + 1; i < list.length; i++) {
                  const msgNum = list[i].msgNumber;
                  const uidl = list[i].uidl;
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
                  } catch (e) { console.warn('POP3 fetch error', e); }
              }
          } else if (lastIndex === -1) {
              // UIDL not found (maybe deleted?), reset or fetch all?
              // For safety, let's just fetch the last few or do nothing.
              // Doing nothing to avoid dups.
          }
      }

      await pop3.QUIT();
    }

    // Sort Newest First (locally for the chunk)
    emails.sort((a, b) => new Date(b.receivedAt) - new Date(a.receivedAt));

    // Return object
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