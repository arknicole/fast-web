require('dotenv').config();

const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');
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
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true
}));

// Use a connection pool with promise support
const db = mysql.createPool({
  host: process.env.MYSQLHOST,
  user: process.env.MYSQLUSER,
  password: process.env.MYSQLPASSWORD,
  database: process.env.MYSQLDATABASE,
  port: process.env.MYSQLPORT,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
}).promise();
console.log('✅ MySQL Connection Pool created and ready for Railway.');

// --- MULTER CONFIGURATION ---
// 1. Standard Image Storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'public/uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

// 2. Video Storage Configuration
const videoStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'public/uploads/'),
  filename: (req, file, cb) => cb(null, 'site-video' + path.extname(file.originalname))
});
const uploadVideo = multer({ storage: videoStorage });


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

// Health Check
app.get('/', (req, res) => {
  res.send('FAST Aviation Server is healthy and running!');
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





// ----------------- VIDEO CONTENT MANAGEMENT -----------------

app.get('/api/video', async (req, res) => {
  try {
    const [results] = await db.query('SELECT video_path FROM video_content WHERE id = 1');
    if (results.length === 0) {
      return res.json({ video_path: '' });
    }
    res.json(results[0]);
  } catch (err) {
    res.json({ video_path: '' });
  }
});
// Update endpoint: Accepts ONLY a file upload
app.put('/api/video', uploadVideo.single('video'), async (req, res) => {
  if (!req.session.loggedIn) return res.status(401).json({ message: 'Unauthorized' });
  
  // Strictly check for a file
  if (!req.file) {
    return res.json({ success: false, message: 'No video file was uploaded.' });
  }
  
  try {
    const videoPath = `/uploads/${req.file.filename}`;
    
    await db.execute(
      'UPDATE video_content SET video_path = ? WHERE id = 1',
      [videoPath]
    );
    res.json({ success: true, message: 'Video uploaded successfully!' });
  } catch (err) {
    console.error(err);
    res.json({ success: false, message: 'Failed to update video.' });
  }
});
// ----------------- ABOUT CONTENT MANAGEMENT -----------------

app.get('/api/about', async (req, res) => {
  try {
    const [results] = await db.query('SELECT courses_offered, fees_scholarships, requirements, application_note FROM about_content WHERE id = 1');
    if (results.length === 0) {
      return res.json({ 
        courses_offered: '',
        fees_scholarships: '',
        enrollment_requirements_freshmen: '',
        enrollment_requirements_transferees: '',
        application_note: ''
      });
    }
    
    const requirementsContent = results[0].requirements || '';
    const freshmenMatch = requirementsContent.match(/<h3>For Incoming Freshmen<\/h3>(.*?)<h3>For Transferees<\/h3>/s);
    const transfereesMatch = requirementsContent.match(/<h3>For Transferees<\/h3>(.*)/s);
    
    res.json({
        courses_offered: results[0].courses_offered,
        fees_scholarships: results[0].fees_scholarships,
        enrollment_requirements_freshmen: freshmenMatch ? freshmenMatch[1].trim() : '',
        enrollment_requirements_transferees: transfereesMatch ? transfereesMatch[1].trim().replace(/<\/?div.*?>/g, '') : '',
        application_note: results[0].application_note
    });
  } catch (err) {
    res.json({ content: 'Error loading content.' });
  }
});

app.put('/api/about', async (req, res) => {
  if (!req.session.loggedIn) return res.status(401).json({ message: 'Unauthorized' });
  try {
    const { coursesOffered, feesScholarships, enrollmentRequirementsFreshmen, enrollmentRequirementsTransferees, applicationNote } = req.body;
    
    const combinedRequirements = `
      <h3>For Incoming Freshmen</h3>${enrollmentRequirementsFreshmen}
      <h3>For Transferees</h3>${enrollmentRequirementsTransferees}
    `.trim();

    await db.execute(
      'UPDATE about_content SET courses_offered = ?, fees_scholarships = ?, requirements = ?, application_note = ? WHERE id = 1',
      [coursesOffered, feesScholarships, combinedRequirements, applicationNote]
    );

    res.json({ success: true, message: 'About content updated successfully!' });
  } catch (err) {
    console.error("PUT /api/about Database Error:", err);
    res.json({ success: false, message: 'Failed to update content. (Database error)' });
  }
});

// ----------------- SERVER -----------------
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});