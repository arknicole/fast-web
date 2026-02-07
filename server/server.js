require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg'); // Switched to PostgreSQL
const session = require('express-session');
const bcrypt = require('bcrypt');
const multer = require('multer');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback_secret',
  resave: false,
  saveUninitialized: true
}));

// PostgreSQL Connection Pool
const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false } // Required for Render
});

console.log('✅ PostgreSQL Connection Pool created for Render.');

// --- MULTER CONFIG ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'public/uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

// ----------------- STUDENT & FINANCE ROUTES -----------------

app.get('/api/admin/students', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM students ORDER BY name ASC');
    res.json(result.rows);
  } catch (err) { res.status(500).json([]); }
});

app.post('/api/admin/students', async (req, res) => {
  const { student_id, name, email, course, password } = req.body;
  try {
    const hash = await bcrypt.hash(password, 10);
    await db.query(
      'INSERT INTO students (student_id, name, email, course, password) VALUES ($1, $2, $3, $4, $5)',
      [student_id, name, email, course, hash]
    );
    res.json({ success: true });
  } catch (err) { res.status(500).json({ message: 'Error adding student' }); }
});

app.delete('/api/admin/students/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM students WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ message: 'Delete failed' }); }
});

app.post('/api/admin/assessments', async (req, res) => {
  const { student_id, tuition, registration, others, semester, school_year } = req.body;
  try {
    await db.query(
      'INSERT INTO assessments (student_id, tuition, registration, others, semester, school_year) VALUES ($1, $2, $3, $4, $5, $6)',
      [student_id, tuition, registration, others, semester, school_year]
    );
    res.json({ success: true });
  } catch (err) { res.status(500).json({ message: 'Assessment failed' }); }
});

app.post('/api/admin/payments', async (req, res) => {
  const { student_id, amount, date } = req.body;
  try {
    await db.query('INSERT INTO payments (student_id, amount, payment_date) VALUES ($1, $2, $3)', [student_id, amount, date]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ message: 'Payment failed' }); }
});

// ----------------- EXISTING ROUTES (News, Appts, etc.) -----------------
// (Ported to PostgreSQL syntax)

app.get('/api/news', async (req, res) => {
  const result = await db.query('SELECT * FROM news ORDER BY created_at DESC');
  res.json(result.rows);
});

app.post('/api/appointment', async (req, res) => {
  const { fullname, email, contact, program, appt_date, appt_time } = req.body;
  await db.query(
    'INSERT INTO appointments (fullname, email, contact, program, appt_date, appt_time) VALUES ($1, $2, $3, $4, $5, $6)',
    [fullname, email, contact, program, appt_date, appt_time]
  );
  res.json({ message: 'Success' });
});



app.get('/', (req, res) => res.send('FAST Aviation Server Live!'));

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));