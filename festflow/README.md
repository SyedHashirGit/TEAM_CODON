# ⚡ FestFlow — AI Event Management

## Project Structure

```
festflow/
├── public/               # Frontend (open index.html in browser)
│   ├── index.html        # User portal (Home + Registration)
│   ├── admin.html        # Command Centre (login: admin/admin)
│   ├── css/
│   │   ├── styles.css
│   │   └── admin.css
│   └── js/
│       ├── config.js     # ← Put your API keys here (gitignored)
│       ├── backend.js    # Firebase + Gemini + Email logic
│       ├── user.js       # User portal JS
│       └── admin.js      # Admin dashboard JS
├── server/
│   └── index.js          # Node.js email server (nodemailer)
├── .env                  # Server env vars (gitignored)
├── .gitignore
└── package.json
```

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment variables
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

> ⚠️ Both `config.js` and `.env` are in `.gitignore`. Never commit them.

### 3. Start the email server
```bash
npm start
```

### 4. Open the frontend
Open `public/index.html` in your browser (or serve with any static server).

For the Command Centre, open `public/admin.html` or click the **🔐 Command Centre** button.

**Admin credentials:** `admin` / `admin`

## Features

### User Portal (`index.html`)
- Home page with feature overview
- **Unified Registration Portal** — register as Participant OR Volunteer in one form
- Participants pick sessions to attend
- Volunteers select skills, availability, and preferred events
- AI auto-assigns volunteers; briefing email sent on registration

### Command Centre (`admin.html`) — Login Required
- **Dashboard** — live stats, master schedule, AI agent log, dropout simulator
- **Volunteers** — view, add, edit, delete volunteers with full detail
- **Participants** — view, add, edit, delete participants
- **Events** — add, edit, delete/schedule sessions
- **Notifications** — click any notification to see full details including exact email sent to volunteer/participant
- **Dropout Simulation** — trigger AI-powered volunteer replacement with confidence scoring

## Email System
Briefing emails are sent via Gmail SMTP using Nodemailer. The email server runs at `http://localhost:3001`.

When you click "Send All Briefings" or when a dropout replacement is assigned, the AI generates a personalised briefing email (under 100 words) which is:
1. Saved to the notification store in Firebase
2. Sent to the volunteer's actual email address
3. Viewable in full detail by clicking the notification in the Command Centre
