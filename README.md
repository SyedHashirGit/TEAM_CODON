# ⚡ FestFlow — AI Event Management

> **Team Name:** TEAM CODON  
> **Team Lead:** NAILAH MANAL  
> **Team Members:** NAILAH MANAL, MOHAMMED SUHAAN AHMED, SYED DILAWAR HASHIR

---

## 📋 Problem Statement: FestFlow
College fests and events are a coordination nightmare. Volunteers get assigned over WhatsApp, last-minute dropouts throw entire schedules off, and coordinators spend more time firefighting logistics than actually running the event. 

**FestFlow** handles the operational side of a college event end to end. It takes in participant registrations, maps volunteer availability/skills to event slots, and sends personalised AI briefings. When someone drops out, the system detects the gap, reshuffles assignments from a waitlist, notifies affected volunteers, and updates the master schedule automatically.

---

## 🛠️ Project Structure

```
festflow/
├── public/               # Frontend
│   ├── index.html        # User portal (Home + Registration)
│   ├── admin.html        # Command Centre (login: admin/admin)
│   ├── css/
│   │   ├── styles.css
│   │   └── admin.css
│   └── js/
│       ├── config.js     # ← API keys (gitignored)
│       ├── backend.js    # Firebase + Gemini + Email logic
│       ├── user.js       # User portal JS
│       └── admin.js      # Admin dashboard JS
├── server/
│   └── index.js          # Node.js email server (nodemailer)
├── .env                  # Server env vars (gitignored)
├── .gitignore
└── package.json
```

## 🚀 Setup & Installation

### 1. Install dependencies
```bash
npm install
```

### 2. Configure Environment
Edit **`public/js/config.js`** with your Firebase URL and Gemini API key:
```js
window.FESTFLOW_CONFIG = {
  FIREBASE_URL:   "https://your-db.firebaseio.com",
  GEMINI_API_KEY: "your-gemini-key",
  EMAIL_API:      "http://localhost:3001"
};
```

Edit **`.env`** for the email server:
```
FIREBASE_URL=https://your-db.firebaseio.com
GEMINI_API_KEY=your-gemini-key
GMAIL_USER=your@gmail.com
GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx
PORT=3001
```

> ⚠️ Both `config.js` and `.env` are in `.gitignore`. **Never commit them.**

### 3. Start the Email Server
```bash
npm start
```

### 4. Launch the App
Open `public/index.html` in your browser.  
For the Command Centre, open `public/admin.html` (Credentials: `admin` / `admin`).

---

## ✨ Features

### 🎟️ User Portal
- **Unified Registration** — Register as Participant OR Volunteer in one fluid form.
- **Live Vacancy Panel** — See real-time slots and skill requirements before signing up.
- **AI Assignments** — Volunteers are automatically mapped to roles based on skills.

### 🔐 Command Centre (Admin)
- **Live Dashboard** — Real-time stats, AI agent logs, and master schedule tracking.
- **Dropout Simulation** — Trigger AI-powered reshuffles with confidence scoring.
- **Audit Logs** — Track every administrative change and AI decision.
- **Personalised Briefings** — AI generates empathetic, concise emails for every role.

---

## 📧 Email System
Briefing emails are sent via Gmail SMTP. The AI generates personalised, human-like messages saved to Firebase and sent directly to the volunteer.

---

*Built with ❤️ for GDG [DEV ARENA] Hackathon*
