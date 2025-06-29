require('dotenv').config();

const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');
const session = require('express-session');
const bcrypt = require('bcrypt');
const multer = require('multer');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true
}));

// Use a connection pool with promise support
const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
}).promise();

console.log('✅ MySQL Connection Pool created and ready for Railway.');

// Multer setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'public/uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });


// ----------------- ADMIN AUTH & USER MANAGEMENT -----------------

app.post('/api/admin-login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const [results] = await db.execute('SELECT * FROM users WHERE username = ?', [username]);
    
    if (results.length === 0) return res.json({ success: false });

    const user = results[0];
    const match = await bcrypt.compare(password, user.password_hash);

    if (match) {
      await db.execute('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);
      req.session.loggedIn = true;
      req.session.username = user.username;
      res.json({ success: true });
    } else {
      res.json({ success: false });
    }
  } catch (err) {
    res.json({ success: false });
  }
});

app.post('/api/admin-logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

app.get('/api/admins', async (req, res) => {
  if (!req.session.loggedIn) return res.status(401).json({ message: 'Unauthorized' });
  try {
    const [results] = await db.query('SELECT id, username, last_login FROM users ORDER BY username ASC');
    res.json(results);
  } catch (err) {
    res.status(500).json([]);
  }
});

app.post('/api/admin-create', async (req, res) => {
  if (!req.session.loggedIn) return res.status(401).json({ message: 'Unauthorized' });
  try {
    const { username, password } = req.body;
    const hash = await bcrypt.hash(password, 10);
    await db.execute('INSERT INTO users (username, password_hash) VALUES (?, ?)', [username, hash]);
    res.json({ message: 'Admin created successfully' });
  } catch (err) {
    res.json({ message: 'Error creating admin' });
  }
});

app.post('/api/admin-changepassword', async (req, res) => {
  if (!req.session.loggedIn) return res.status(401).json({ success: false, message: 'You are not logged in.' });
  try {
    const { oldPassword, newPassword } = req.body;
    const username = req.session.username;
    const [results] = await db.execute('SELECT * FROM users WHERE username = ?', [username]);

    if (results.length === 0) return res.json({ success: false, message: 'Could not find user.' });

    const user = results[0];
    const isMatch = await bcrypt.compare(oldPassword, user.password_hash);

    if (!isMatch) return res.json({ success: false, message: 'Incorrect current password.' });
    
    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    await db.execute('UPDATE users SET password_hash = ? WHERE id = ?', [newPasswordHash, user.id]);
    res.json({ success: true, message: 'Password changed successfully!' });
  } catch (err) {
    res.json({ success: false, message: 'Error updating password.' });
  }
});

// --- TEMPORARY: ONE-TIME ADMIN CREATION ROUTE ---
// !!! REMOVE THIS ENTIRE ROUTE AFTER YOU USE IT ONCE !!!
app.get('/api/setup-first-admin', async (req, res) => {
  try {
    // Define the first admin's credentials here
    const defaultAdminUsername = 'ark';
    const defaultAdminPassword = 'Stronger'; // IMPORTANT: Change this to a temporary password

    // Check if the admin already exists
    const [existing] = await db.execute('SELECT * FROM users WHERE username = ?', [defaultAdminUsername]);
    if (existing.length > 0) {
      return res.send('Admin user already exists. You can now remove this route from server.js');
    }

    // Hash the password and insert the new user
    const hashedPassword = await bcrypt.hash(defaultAdminPassword, 10);
    await db.execute('INSERT INTO users (username, password_hash) VALUES (?, ?)', [defaultAdminUsername, hashedPassword]);
    
    res.send(`<h1>Admin User Created!</h1><p>Username: ${defaultAdminUsername}</p><p>You can now log in. PLEASE REMOVE THE /api/setup-first-admin ROUTE FROM SERVER.JS NOW.</p>`);
  } catch (err) {
    res.status(500).send('Error creating admin user: ' + err.message);
  }
});


// ----------------- APPOINTMENTS MANAGEMENT -----------------

app.post('/api/appointment', async (req, res) => {
  try {
    const { fullname, email, contact, program, appt_date, appt_time } = req.body;

    const [existing] = await db.execute('SELECT * FROM appointments WHERE email = ? AND appt_date = ?', [email, appt_date]);
    if (existing.length > 0) {
      return res.json({ message: 'You already have an appointment scheduled for this date.' });
    }

    const dateObj = new Date(appt_date);
    if (dateObj.getUTCDay() === 0) {
      return res.json({ message: 'Appointments are only available Monday to Saturday.' });
    }

    await db.execute(
      'INSERT INTO appointments (fullname, email, contact, program, appt_date, appt_time) VALUES (?, ?, ?, ?, ?, ?)',
      [fullname, email, contact, program, appt_date, appt_time]
    );
    res.json({ message: 'Appointment submitted successfully!' });
  } catch (err) {
    res.json({ message: 'Error saving appointment' });
  }
});

app.get('/api/appointments', async (req, res) => {
  if (!req.session.loggedIn) return res.status(401).json({ message: 'Unauthorized' });
  try {
    const [results] = await db.query('SELECT * FROM appointments ORDER BY created_at DESC');
    res.json(results);
  } catch (err) {
    res.json([]);
  }
});

app.put('/api/appointment-status/:id', async (req, res) => {
  if (!req.session.loggedIn) return res.status(401).json({ message: 'Unauthorized' });
  try {
    const { status } = req.body;
    await db.execute('UPDATE appointments SET status = ? WHERE id = ?', [status, req.params.id]);
    res.json({ message: 'Status updated successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Error updating status' });
  }
});

app.delete('/api/appointment-delete/:id', async (req, res) => {
  if (!req.session.loggedIn) return res.status(401).json({ message: 'Unauthorized' });
  try {
    await db.execute('DELETE FROM appointments WHERE id=?', [req.params.id]);
    res.json({ message: 'Appointment deleted successfully' });
  } catch (err) {
    res.json({ message: 'Error deleting appointment' });
  }
});


// ----------------- NEWS MANAGEMENT -----------------

app.get('/api/news', async (req, res) => {
  try {
    const [results] = await db.query('SELECT * FROM news ORDER BY created_at DESC');
    res.json(results);
  } catch (err) {
    res.json([]);
  }
});

app.post('/api/news', upload.single('image'), async (req, res) => {
  if (!req.session.loggedIn) return res.status(401).json({ message: 'Unauthorized' });
  try {
    const { title, content } = req.body;
    const image = req.file ? `/uploads/${req.file.filename}` : null;
    await db.execute('INSERT INTO news (title, content, image) VALUES (?, ?, ?)', [title, content, image]);
    res.json({ message: 'News added successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Error adding news' });
  }
});

app.delete('/api/news/:id', async (req, res) => {
  if (!req.session.loggedIn) return res.status(401).json({ message: 'Unauthorized' });
  try {
    await db.execute('DELETE FROM news WHERE id=?', [req.params.id]);
    res.json({ message: 'News deleted successfully' });
  } catch (err) {
    res.json({ message: 'Error deleting news' });
  }
});


// ----------------- GALLERY MANAGEMENT -----------------

app.post('/api/gallery-upload', upload.array('photos', 10), (req, res) => {
  if (!req.session.loggedIn) return res.status(401).json({ message: 'Unauthorized' });
  if (!req.files || req.files.length === 0) return res.status(400).json({ message: 'No files uploaded.' });
  
  const caption = req.body.caption || '';
  const sql = 'INSERT INTO gallery (path, caption) VALUES (?, ?)';
  
  const insertPromises = req.files.map(file => {
    const filepath = `/uploads/${file.filename}`;
    return db.execute(sql, [filepath, caption]);
  });
  
  Promise.all(insertPromises)
    .then(() => res.json({ message: 'Photos uploaded successfully!' }))
    .catch(err => res.status(500).json({ message: 'Database error during upload.' }));
});

app.get('/api/gallery', async (req, res) => {
  try {
    const [results] = await db.query('SELECT * FROM gallery ORDER BY uploaded_at DESC');
    res.json(results);
  } catch (err) {
    res.json([]);
  }
});

app.delete('/api/gallery/:id', async (req, res) => {
  if (!req.session.loggedIn) return res.status(401).json({ message: 'Unauthorized' });
  try {
    await db.execute('DELETE FROM gallery WHERE id = ?', [req.params.id]);
    res.json({ message: 'Photo deleted' });
  } catch (err) {
    res.json({ message: 'Error deleting photo' });
  }
});


// ----------------- ABOUT CONTENT MANAGEMENT -----------------

app.get('/api/about', async (req, res) => {
  try {
    const [results] = await db.query('SELECT content FROM about_content WHERE id = 1');
    if (results.length === 0) return res.json({ content: 'Content not found.' });
    res.json(results[0]);
  } catch (err) {
    res.json({ content: 'Error loading content.' });
  }
});

app.put('/api/about', async (req, res) => {
  if (!req.session.loggedIn) return res.status(401).json({ message: 'Unauthorized' });
  try {
    const { content } = req.body;
    await db.execute('UPDATE about_content SET content = ? WHERE id = 1', [content]);
    res.json({ success: true, message: 'About content updated successfully!' });
  } catch (err) {
    res.json({ success: false, message: 'Failed to update content.' });
  }
});


// ----------------- SERVER -----------------
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});