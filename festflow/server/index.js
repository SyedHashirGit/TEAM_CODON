require('dotenv').config();
const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD
  }
});

// Reusable sendEmail function
async function sendEmail({ to, subject, html, text }) {
  const mailOptions = {
    from: `FestFlow <${process.env.GMAIL_USER}>`,
    to,
    subject,
    html,
    text
  };
  return transporter.sendMail(mailOptions);
}

// POST /api/send-briefing
// Body: { name, email, role, time, venue, sessionName, eventName }
app.post('/api/send-briefing', async (req, res) => {
  const { name, email, role, time, venue, sessionName, eventName, emailBody } = req.body;
  if (!name || !email) return res.status(400).json({ error: 'name and email required' });

  const subject = `Your Volunteer Briefing — ${eventName || 'TechFest 2026'}`;
  const html = emailBody
    ? `<div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:20px">
        <h2 style="color:#3b82f6">FestFlow Briefing</h2>
        <p>${emailBody.replace(/\n/g, '<br/>')}</p>
        <hr style="border:none;border-top:1px solid #eee;margin:20px 0"/>
        <p style="color:#888;font-size:12px">This is an automated message from FestFlow · TechFest 2026</p>
       </div>`
    : `<div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:20px">
        <h2 style="color:#3b82f6">FestFlow Briefing</h2>
        <p>Hi <strong>${name}</strong>,</p>
        <p>You are assigned to <strong>${role}</strong> for <strong>${sessionName}</strong> at <strong>${time}</strong>.</p>
        <p>📍 Venue: ${venue}</p>
        <p>Please report 15 minutes early. Contact your coordinator if needed.</p>
        <hr style="border:none;border-top:1px solid #eee;margin:20px 0"/>
        <p style="color:#888;font-size:12px">This is an automated message from FestFlow · TechFest 2026</p>
       </div>`;

  try {
    await sendEmail({ to: email, subject, html, text: emailBody || `Hi ${name}, you are assigned to ${role} for ${sessionName} at ${time}. Venue: ${venue}.` });
    res.json({ success: true, message: `Email sent to ${email}` });
  } catch (err) {
    console.error('Email error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/send-bulk-briefings
// Body: { volunteers: [{ name, email, role, time, venue, sessionName, emailBody }] }
app.post('/api/send-bulk-briefings', async (req, res) => {
  const { volunteers } = req.body;
  if (!Array.isArray(volunteers)) return res.status(400).json({ error: 'volunteers array required' });

  const results = [];
  for (const v of volunteers) {
    try {
      const subject = `Your Briefing — TechFest 2026`;
      const html = v.emailBody
        ? `<div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:20px">
            <h2 style="color:#3b82f6">FestFlow Briefing</h2>
            <p>${v.emailBody.replace(/\n/g, '<br/>')}</p>
            <hr style="border:none;border-top:1px solid #eee"/>
            <p style="color:#888;font-size:12px">FestFlow · TechFest 2026</p>
           </div>`
        : `<div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:20px">
            <h2 style="color:#3b82f6">FestFlow Briefing</h2>
            <p>Hi <strong>${v.name}</strong>,</p>
            <p>You are assigned to <strong>${v.role}</strong> for <strong>${v.sessionName}</strong> at <strong>${v.time}</strong>.</p>
            <p>📍 Venue: ${v.venue}</p>
            <p>Please report 15 minutes early.</p>
            <hr style="border:none;border-top:1px solid #eee"/>
            <p style="color:#888;font-size:12px">FestFlow · TechFest 2026</p>
           </div>`;
      await sendEmail({ to: v.email, subject, html, text: `Hi ${v.name}, assigned to ${v.role} at ${v.time}.` });
      results.push({ email: v.email, success: true });
    } catch (err) {
      results.push({ email: v.email, success: false, error: err.message });
    }
  }
  res.json({ results });
});

// POST /api/send-notification  (participant registration confirmations etc.)
app.post('/api/send-notification', async (req, res) => {
  const { name, email, type, message } = req.body;
  if (!email) return res.status(400).json({ error: 'email required' });

  const subjects = {
    registration_confirmed: 'Registration Confirmed — TechFest 2026',
    waitlist_added: 'You\'re on the Waitlist — TechFest 2026',
    new_assignment: 'New Volunteer Assignment — TechFest 2026',
    dropout_confirmed: 'Session Update — TechFest 2026',
    default: 'FestFlow Notification'
  };

  const subject = subjects[type] || subjects.default;
  const html = `<div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:20px">
    <h2 style="color:#3b82f6">FestFlow</h2>
    <p>Hi <strong>${name}</strong>,</p>
    <p>${message.replace(/\n/g, '<br/>')}</p>
    <hr style="border:none;border-top:1px solid #eee;margin:20px 0"/>
    <p style="color:#888;font-size:12px">FestFlow · TechFest 2026</p>
  </div>`;

  try {
    await sendEmail({ to: email, subject, html, text: message });
    res.json({ success: true });
  } catch (err) {
    console.error('Notification email error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`FestFlow email server running on http://localhost:${PORT}`));
