const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const bcrypt = require('bcrypt');

const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// [DB Connection Config]
const pool = new Pool({
  user: 'postgres',
  host: '10.200.0.159', 
  database: 'cloudops_db',
  password: '03474506', // [비밀번호 확인]
  port: 5432,
});

// [DB Connection Test & Init]
pool.connect(async (err, client, release) => {
  if (err) {
    console.error('Error acquiring client', err.stack);
    console.error('!!! DATABASE CONNECTION FAILED !!! - Check host, password, or network.');
  } else {
    console.log('>>> Database Connected Successfully to 10.200.0.159');
    
    // Auto-create memos table if not exists (For fresh setup only)
    try {
        await client.query(`
            CREATE TABLE IF NOT EXISTS memos (
                id VARCHAR(50) PRIMARY KEY,
                user_id INTEGER,
                content TEXT,
                color VARCHAR(20),
                x INTEGER DEFAULT 0,
                y INTEGER DEFAULT 0,
                width INTEGER DEFAULT 280,
                height INTEGER DEFAULT 280,
                created_at TIMESTAMP
            )
        `);
        console.log('>>> Memos Table Ready');
    } catch(tableErr) {
        console.error('Failed to create memos table', tableErr);
    }
    
    release();
  }
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
  } catch (err) { 
      console.error('Signup Error:', err);
      res.status(500).json({ error: err.message }); 
  }
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
  } catch (err) { 
      console.error('Login Error:', err);
      res.status(500).json({ error: err.message }); 
  }
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
  } catch (err) { 
      console.error('Get Tasks Error:', err);
      res.status(500).json([]); // Return empty array on error but log it
  }
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
    } catch(err) { 
        console.error('Save Task Error:', err);
        res.status(500).json({error: err.message}); 
    }
});

app.delete('/api/tasks/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM tasks WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch(err) { 
        console.error('Delete Task Error:', err);
        res.status(500).json({error: err.message}); 
    }
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
    } catch (err) { 
        console.error('Get Knowledge Error:', err);
        res.status(500).json([]); 
    }
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
    } catch(err) { 
        console.error('Save Knowledge Error:', err);
        res.status(500).json({error: err.message}); 
    }
});

app.delete('/api/knowledge/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM knowledge WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch(err) { 
        console.error('Delete Knowledge Error:', err);
        res.status(500).json({error: err.message}); 
    }
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
    } catch(err) { 
        console.error('Update Knowledge Error:', err);
        res.status(500).json({error: err.message}); 
    }
});

// --- Memos ---
app.get('/api/memos', async (req, res) => {
    const { userId } = req.query;
    try {
        const result = await pool.query('SELECT * FROM memos WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
        const formatted = result.rows.map(row => ({
            id: row.id,
            content: row.content,
            color: row.color,
            x: row.x || 0,
            y: row.y || 0,
            width: row.width || 280,
            height: row.height || 280,
            createdAt: row.created_at
        }));
        res.json(formatted);
    } catch (err) {
        console.error('Get Memos Error:', err);
        res.status(500).json([]);
    }
});

app.post('/api/memos', async (req, res) => {
    const { id, userId, content, color, x, y, width, height, createdAt } = req.body;
    try {
        await pool.query(
            `INSERT INTO memos (id, user_id, content, color, x, y, width, height, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             ON CONFLICT (id) DO UPDATE SET
               content=$3, color=$4, x=$5, y=$6, width=$7, height=$8`,
            [id, userId, content, color, x || 0, y || 0, width || 280, height || 280, createdAt]
        );
        res.json({ success: true });
    } catch(err) {
        console.error('Save Memo Error:', err);
        res.status(500).json({error: err.message});
    }
});

app.delete('/api/memos/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM memos WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch(err) {
        console.error('Delete Memo Error:', err);
        res.status(500).json({error: err.message});
    }
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

app.listen(3001, '0.0.0.0', () => console.log('Server running on 3001'));