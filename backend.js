// ─── FestFlow Backend ─────────────────────────────────────────────────────────
const FIREBASE_URL = "https://festflow-68a2f-default-rtdb.firebaseio.com";
const GEMINI_KEY   = "AIzaSyAb8RN6I4rMQ-UdIw9BnXKBqXWKHa1sJgIuFC6k_2O5M-FGNtnw";
const GEMINI_MODEL = "gemini-2.0-flash";

// ── Firebase REST helpers ─────────────────────────────────────────────────────
export const fb = {
  async get(path) {
    const r = await fetch(`${FIREBASE_URL}/${path}.json`);
    return r.ok ? r.json() : null;
  },
  async set(path, data) {
    await fetch(`${FIREBASE_URL}/${path}.json`, {
      method:"PUT", headers:{"Content-Type":"application/json"},
      body: JSON.stringify(data)
    });
  },
  async push(path, data) {
    const r = await fetch(`${FIREBASE_URL}/${path}.json`, {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify(data)
    });
    const j = await r.json();
    return j.name;
  },
  async patch(path, data) {
    await fetch(`${FIREBASE_URL}/${path}.json`, {
      method:"PATCH", headers:{"Content-Type":"application/json"},
      body: JSON.stringify(data)
    });
  },
  async del(path) {
    await fetch(`${FIREBASE_URL}/${path}.json`, { method:"DELETE" });
  }
};

// ── Gemini helper ─────────────────────────────────────────────────────────────
export async function gemini(system, user) {
  const r = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_KEY}`,
    {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({
        system_instruction:{ parts:[{ text:system }] },
        contents:[{ role:"user", parts:[{ text:user }] }],
        generationConfig:{ temperature:0.35, maxOutputTokens:1500 }
      })
    }
  );
  const d = await r.json();
  return d.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

// ── Seed data ─────────────────────────────────────────────────────────────────
export const SEED = {
  events:{
    "evt-001":{id:"evt-001",name:"TechFest 2025",date:"2025-09-20",venue:"NIT Campus"}
  },
  sessions:{
    "ses-001":{id:"ses-001",eventId:"evt-001",name:"Hackathon Kickoff",time:"09:00",duration:120,venue:"Auditorium A",requiredSkills:["hosting","tech-support"],minVol:2,maxVol:4,status:"active"},
    "ses-002":{id:"ses-002",eventId:"evt-001",name:"AI & ML Workshop",time:"11:00",duration:90,venue:"Lab 3",requiredSkills:["tech-support","registration"],minVol:2,maxVol:3,status:"active"},
    "ses-003":{id:"ses-003",eventId:"evt-001",name:"Cultural Night",time:"18:00",duration:180,venue:"Open Air Stage",requiredSkills:["hosting","logistics","crowd-management"],minVol:3,maxVol:6,status:"active"},
    "ses-004":{id:"ses-004",eventId:"evt-001",name:"Panel Discussion",time:"14:00",duration:60,venue:"Seminar Hall",requiredSkills:["hosting","registration"],minVol:2,maxVol:3,status:"active"},
    "ses-005":{id:"ses-005",eventId:"evt-001",name:"Robotics Demo",time:"13:00",duration:90,venue:"Workshop Block",requiredSkills:["tech-support","logistics"],minVol:2,maxVol:4,status:"active"}
  },
  volunteers:{
    "vol-001":{id:"vol-001",name:"Arjun Sharma",email:"arjun@college.edu",phone:"+91-9000000001",skills:["hosting","tech-support"],availability:["09:00","11:00","14:00"],status:"active",assignedSession:"ses-001",year:"3rd",branch:"CSE"},
    "vol-002":{id:"vol-002",name:"Priya Nair",email:"priya@college.edu",phone:"+91-9000000002",skills:["registration","logistics"],availability:["09:00","11:00","14:00","18:00"],status:"active",assignedSession:"ses-001",year:"2nd",branch:"ECE"},
    "vol-003":{id:"vol-003",name:"Rohit Mehta",email:"rohit@college.edu",phone:"+91-9000000003",skills:["tech-support","registration"],availability:["11:00","14:00"],status:"active",assignedSession:"ses-002",year:"4th",branch:"CSE"},
    "vol-004":{id:"vol-004",name:"Sneha Patel",email:"sneha@college.edu",phone:"+91-9000000004",skills:["hosting","crowd-management"],availability:["14:00","18:00"],status:"active",assignedSession:"ses-003",year:"3rd",branch:"IT"},
    "vol-005":{id:"vol-005",name:"Karan Iyer",email:"karan@college.edu",phone:"+91-9000000005",skills:["logistics","crowd-management"],availability:["18:00","13:00"],status:"active",assignedSession:"ses-003",year:"2nd",branch:"MECH"},
    "vol-006":{id:"vol-006",name:"Divya Reddy",email:"divya@college.edu",phone:"+91-9000000006",skills:["hosting","registration"],availability:["09:00","14:00","18:00"],status:"waitlist",assignedSession:null,year:"3rd",branch:"ECE"},
    "vol-007":{id:"vol-007",name:"Aditya Kumar",email:"aditya@college.edu",phone:"+91-9000000007",skills:["tech-support","logistics"],availability:["09:00","11:00","13:00"],status:"waitlist",assignedSession:null,year:"4th",branch:"CSE"},
    "vol-008":{id:"vol-008",name:"Meera Joshi",email:"meera@college.edu",phone:"+91-9000000008",skills:["registration","crowd-management","hosting"],availability:["11:00","14:00","18:00"],status:"waitlist",assignedSession:null,year:"2nd",branch:"IT"},
    "vol-009":{id:"vol-009",name:"Siddharth Rao",email:"sid@college.edu",phone:"+91-9000000009",skills:["hosting","logistics"],availability:["09:00","18:00","13:00"],status:"waitlist",assignedSession:null,year:"3rd",branch:"CIVIL"},
    "vol-010":{id:"vol-010",name:"Ananya Singh",email:"ananya@college.edu",phone:"+91-9000000010",skills:["tech-support","crowd-management"],availability:["14:00","18:00","13:00"],status:"active",assignedSession:"ses-004",year:"1st",branch:"CSE"},
    "vol-011":{id:"vol-011",name:"Vikram Nanda",email:"vikram@college.edu",phone:"+91-9000000011",skills:["tech-support","logistics"],availability:["13:00","11:00"],status:"active",assignedSession:"ses-005",year:"4th",branch:"EEE"},
    "vol-012":{id:"vol-012",name:"Pooja Verma",email:"pooja@college.edu",phone:"+91-9000000012",skills:["registration","hosting"],availability:["14:00","18:00"],status:"active",assignedSession:"ses-004",year:"3rd",branch:"MBA"}
  },
  assignments:{
    "asgn-001":{sessionId:"ses-001",volunteerId:"vol-001",role:"Lead Host"},
    "asgn-002":{sessionId:"ses-001",volunteerId:"vol-002",role:"Registrations"},
    "asgn-003":{sessionId:"ses-002",volunteerId:"vol-003",role:"Tech Support"},
    "asgn-004":{sessionId:"ses-003",volunteerId:"vol-004",role:"MC"},
    "asgn-005":{sessionId:"ses-003",volunteerId:"vol-005",role:"Logistics Head"},
    "asgn-006":{sessionId:"ses-004",volunteerId:"vol-010",role:"Support"},
    "asgn-007":{sessionId:"ses-004",volunteerId:"vol-012",role:"Registrations"},
    "asgn-008":{sessionId:"ses-005",volunteerId:"vol-011",role:"Tech Lead"}
  },
  participants:{
    "par-001":{id:"par-001",name:"Rahul Gupta",email:"rahul.g@student.edu",phone:"+91-8800000001",college:"NIT Warangal",events:["ses-001","ses-002"],registeredAt:"2025-09-10T10:00:00Z"},
    "par-002":{id:"par-002",name:"Isha Kapoor",email:"isha.k@student.edu",phone:"+91-8800000002",college:"BITS Hyderabad",events:["ses-003"],registeredAt:"2025-09-10T11:30:00Z"},
    "par-003":{id:"par-003",name:"Dev Malhotra",email:"dev.m@student.edu",phone:"+91-8800000003",college:"IIT Bombay",events:["ses-001","ses-004"],registeredAt:"2025-09-11T09:00:00Z"},
    "par-004":{id:"par-004",name:"Nisha Pillai",email:"nisha.p@student.edu",phone:"+91-8800000004",college:"VIT Vellore",events:["ses-005"],registeredAt:"2025-09-11T14:00:00Z"},
    "par-005":{id:"par-005",name:"Aryan Shah",email:"aryan.s@student.edu",phone:"+91-8800000005",college:"IIIT Hyderabad",events:["ses-002","ses-003"],registeredAt:"2025-09-12T10:00:00Z"}
  }
};

export async function seedDatabase() {
  await fb.set("events",     SEED.events);
  await fb.set("sessions",   SEED.sessions);
  await fb.set("volunteers", SEED.volunteers);
  await fb.set("assignments",SEED.assignments);
  await fb.set("participants",SEED.participants);
  await fb.set("notifications",{});
  await fb.set("agentLog",{});
  await fb.set("reports",{});
  return true;
}

// ── Notification helpers ──────────────────────────────────────────────────────
export async function pushNotif(toId, toName, type, message, extra={}) {
  const n = { toId, toName, type, message, timestamp:new Date().toISOString(), read:false, ...extra };
  const id = await fb.push("notifications", n);
  return { id, ...n };
}

// ── Agent log helper ──────────────────────────────────────────────────────────
export async function logAction(action, details) {
  const e = { timestamp:new Date().toISOString(), action, details };
  await fb.push("agentLog", e);
  return e;
}

// ── AI: pick best replacement ─────────────────────────────────────────────────
export async function aiPickReplacement(dropped, session, candidates) {
  const sys = `You are FestFlow, an AI event-management agent. 
Pick the BEST replacement volunteer. Respond ONLY in this JSON (no backticks):
{"chosen":"<id or null>","reasoning":"<2-3 sentences>","confidence":<0-1>,"alternatives":["<id>"]}`;
  const usr = `Dropped: ${JSON.stringify(dropped)}
Session: ${JSON.stringify(session)}
Candidates: ${JSON.stringify(candidates)}`;
  const raw = await gemini(sys, usr);
  try { return JSON.parse(raw.replace(/```json|```/g,"").trim()); }
  catch { return { chosen: candidates[0]?.id??null, reasoning:raw, confidence:0.5, alternatives:[] }; }
}

// ── AI: generate briefing ─────────────────────────────────────────────────────
export async function aiGenerateBriefing(volunteer, session, role) {
  const sys = `You are FestFlow. Write a warm, clear volunteer briefing. Max 4 sentences.`;
  const usr = `Volunteer: ${volunteer.name} | Skills: ${volunteer.skills.join(", ")}
Session: "${session.name}" at ${session.time} in ${session.venue}
Role: ${role}
Write a personalized pre-event briefing.`;
  return gemini(sys, usr);
}

// ── AI: smart assignment of new volunteer ─────────────────────────────────────
export async function aiAssignNewVolunteer(volunteer, sessions, assignments) {
  const sys = `You are FestFlow. Assign a new volunteer to the best-fitting session.
Respond ONLY in JSON (no backticks):
{"sessionId":"<id>","role":"<role>","reasoning":"<2 sentences>"}`;
  const usr = `New volunteer: ${JSON.stringify(volunteer)}
Available sessions needing volunteers: ${JSON.stringify(sessions)}
Current assignments: ${JSON.stringify(assignments)}`;
  const raw = await gemini(sys, usr);
  try { return JSON.parse(raw.replace(/```json|```/g,"").trim()); }
  catch { return { sessionId:sessions[0]?.id??null, role:"Support", reasoning:raw }; }
}

// ── CORE: Register participant ─────────────────────────────────────────────────
export async function registerParticipant(data) {
  const id = `par-${Date.now()}`;
  const participant = { id, ...data, registeredAt:new Date().toISOString() };
  await fb.set(`participants/${id}`, participant);
  await logAction("PARTICIPANT_REGISTERED", { id, name:data.name, events:data.events });
  await pushNotif(id, data.name, "registration_confirmed",
    `🎉 Welcome ${data.name}! You're registered for TechFest 2025. Your session details will be sent shortly.`);
  return participant;
}

// ── CORE: Register volunteer ──────────────────────────────────────────────────
export async function registerVolunteer(data) {
  await logAction("VOLUNTEER_REGISTRATION_START", { name:data.name });
  const id = `vol-${Date.now()}`;

  // Get under-staffed sessions
  const sessions   = await fb.get("sessions");
  const assignments= await fb.get("assignments");
  const volunteers = await fb.get("volunteers");

  const sessionArr = Object.values(sessions||{});
  const assignMap  = {};
  Object.values(assignments||{}).forEach(a => {
    assignMap[a.sessionId] = (assignMap[a.sessionId]||0)+1;
  });

  // Find understaffed sessions matching availability+skills
  const needSessions = sessionArr.filter(s => {
    const count = assignMap[s.id]||0;
    const available = data.availability.includes(s.time);
    const skilled   = s.requiredSkills.some(sk => data.skills.includes(sk));
    return count < s.maxVol && available && skilled;
  });

  let assignedSession = null;
  let assignedRole    = "Support";
  let reasoning       = "";

  if (needSessions.length > 0) {
    const ai = await aiAssignNewVolunteer(data, needSessions, assignments);
    if (ai.sessionId) {
      assignedSession = ai.sessionId;
      assignedRole    = ai.role;
      reasoning       = ai.reasoning;
      // Create assignment record
      const aKey = `asgn-${Date.now()}`;
      await fb.set(`assignments/${aKey}`, { sessionId:ai.sessionId, volunteerId:id, role:ai.role });
    }
  }

  const volunteer = {
    id, ...data,
    status: assignedSession ? "active" : "waitlist",
    assignedSession,
    registeredAt: new Date().toISOString()
  };
  await fb.set(`volunteers/${id}`, volunteer);

  // Generate briefing if assigned
  if (assignedSession) {
    const session = sessions[assignedSession];
    const briefing = await aiGenerateBriefing(volunteer, session, assignedRole);
    await pushNotif(id, data.name, "assignment_briefing", briefing,
      { sessionId:assignedSession, sessionName:session.name, role:assignedRole });
    await logAction("VOLUNTEER_ASSIGNED", { volunteerId:id, sessionId:assignedSession, role:assignedRole, reasoning });
  } else {
    await pushNotif(id, data.name, "waitlist_added",
      `Hi ${data.name}, you've been added to the TechFest 2025 volunteer waitlist. We'll notify you as slots open up!`);
    await logAction("VOLUNTEER_WAITLISTED", { volunteerId:id });
  }

  return { volunteer, assignedSession, assignedRole, reasoning };
}

// ── CORE: Trigger dropout ─────────────────────────────────────────────────────
export async function triggerDropout(volunteerId) {
  await logAction("DROPOUT_DETECTED", { volunteerId });

  const volunteer = await fb.get(`volunteers/${volunteerId}`);
  if (!volunteer) throw new Error("Volunteer not found");
  if (!volunteer.assignedSession) throw new Error("Volunteer has no session assigned");

  const sessionId = volunteer.assignedSession;
  const session   = await fb.get(`sessions/${sessionId}`);

  // Mark dropped
  await fb.patch(`volunteers/${volunteerId}`, { status:"dropped", assignedSession:null });

  // Remove their assignment
  const assignments = await fb.get("assignments");
  for (const [key,a] of Object.entries(assignments||{})) {
    if (a.volunteerId === volunteerId && a.sessionId === sessionId) {
      await fb.del(`assignments/${key}`); break;
    }
  }

  // Find waitlist candidates matching time + skills
  const allVols = await fb.get("volunteers");
  const candidates = Object.values(allVols||{}).filter(v =>
    v.status === "waitlist" &&
    !v.assignedSession &&
    v.availability.includes(session.time) &&
    session.requiredSkills.some(sk => v.skills.includes(sk))
  );

  if (candidates.length === 0) {
    await logAction("NO_REPLACEMENT_FOUND", { sessionId, volunteerId });
    await pushNotif("coordinator","Command Centre","critical_gap",
      `⚠️ CRITICAL: ${volunteer.name} dropped from "${session.name}" — NO waitlist candidates available! Manual intervention required.`,
      { sessionId, severity:"critical" });
    return { success:false, message:"No suitable replacement found", dropout:volunteer, session };
  }

  // AI picks the best
  await logAction("AI_REASONING_START", { sessionId, candidateCount:candidates.length });
  const aiDecision = await aiPickReplacement(volunteer, session, candidates);
  await logAction("AI_REASONING_COMPLETE", { ...aiDecision, sessionId });

  if (!aiDecision.chosen) {
    return { success:false, message:"AI could not decide on a replacement", aiDecision };
  }

  const replacement = allVols[aiDecision.chosen];

  // Assign replacement
  await fb.patch(`volunteers/${aiDecision.chosen}`, { status:"active", assignedSession:sessionId });
  const newKey = `asgn-${Date.now()}`;
  await fb.set(`assignments/${newKey}`, {
    sessionId, volunteerId:aiDecision.chosen, role:"Replacement",
    replacedVolunteerId:volunteerId, timestamp:new Date().toISOString()
  });

  // Briefing + notifications
  const briefing = await aiGenerateBriefing(replacement, session, "Replacement Volunteer");
  await pushNotif(aiDecision.chosen, replacement.name, "new_assignment", briefing,
    { sessionId, sessionName:session.name, role:"Replacement" });
  await pushNotif(volunteerId, volunteer.name, "dropout_confirmed",
    `You've been removed from "${session.name}". Take care and we hope to see you at future events!`);

  for (const altId of aiDecision.alternatives||[]) {
    const altV = allVols[altId];
    if (altV) await pushNotif(altId, altV.name, "standby_notice",
      `You're on standby for "${session.name}". We may need you soon — stay available!`, { sessionId });
  }

  // Save incident report
  const reportId = await fb.push("reports", {
    type:"reshuffle", timestamp:new Date().toISOString(),
    sessionId, sessionName:session.name,
    droppedVolunteerId:volunteerId, droppedName:volunteer.name,
    replacementVolunteerId:aiDecision.chosen, replacementName:replacement.name,
    aiReasoning:aiDecision.reasoning, confidence:aiDecision.confidence, briefing
  });

  await logAction("RESHUFFLE_COMPLETE", {
    sessionId, droppedVolunteerId:volunteerId, replacementVolunteerId:aiDecision.chosen,
    confidence:aiDecision.confidence
  });

  return { success:true, dropout:volunteer, replacement, session, aiDecision, briefing, reportId:newKey };
}

// ── CORE: Send all briefings ──────────────────────────────────────────────────
export async function sendAllBriefings() {
  const [volunteers, sessions, assignments] = await Promise.all([
    fb.get("volunteers"), fb.get("sessions"), fb.get("assignments")
  ]);
  const results = [];
  for (const a of Object.values(assignments||{})) {
    const v = volunteers?.[a.volunteerId];
    const s = sessions?.[a.sessionId];
    if (!v || !s) continue;
    const briefing = await aiGenerateBriefing(v, s, a.role);
    await pushNotif(v.id, v.name, "pre_event_briefing", briefing,
      { sessionId:s.id, sessionName:s.name, role:a.role });
    results.push({ volunteerId:v.id, volunteerName:v.name, briefing });
  }
  await logAction("BULK_BRIEFINGS_SENT", { count:results.length });
  return results;
}

// ── READ helpers ──────────────────────────────────────────────────────────────
export async function getMasterSchedule() {
  const [sessions, volunteers, assignments] = await Promise.all([
    fb.get("sessions"), fb.get("volunteers"), fb.get("assignments")
  ]);
  return Object.values(sessions||{}).map(s => {
    const asgns = Object.entries(assignments||{})
      .filter(([_,a]) => a.sessionId===s.id)
      .map(([id,a]) => ({ assignmentId:id, volunteer:volunteers?.[a.volunteerId]??null, role:a.role, isReplacement:!!a.replacedVolunteerId }));
    const c = asgns.length;
    return {
      ...s, assignments:asgns, coverage:c,
      coverageStatus: c>=s.maxVol?"full": c>=s.minVol?"adequate":"understaffed"
    };
  }).sort((a,b)=>a.time.localeCompare(b.time));
}

export async function getAllVolunteers() {
  const v = await fb.get("volunteers");
  return Object.values(v||{});
}

export async function getAllParticipants() {
  const p = await fb.get("participants");
  return Object.values(p||{});
}

export async function getNotifications(limit=50) {
  const n = await fb.get("notifications");
  return Object.entries(n||{})
    .map(([id,v])=>({id,...v}))
    .sort((a,b)=>new Date(b.timestamp)-new Date(a.timestamp))
    .slice(0,limit);
}

export async function getAgentLog(limit=100) {
  const l = await fb.get("agentLog");
  return Object.entries(l||{})
    .map(([id,v])=>({id,...v}))
    .sort((a,b)=>new Date(b.timestamp)-new Date(a.timestamp))
    .slice(0,limit);
}

export async function getReports() {
  const r = await fb.get("reports");
  return Object.entries(r||{})
    .map(([id,v])=>({id,...v}))
    .sort((a,b)=>new Date(b.timestamp)-new Date(a.timestamp));
}

export async function getDashboardStats() {
  const [vols, parts, notifs, logs] = await Promise.all([
    fb.get("volunteers"), fb.get("participants"), fb.get("notifications"), fb.get("agentLog")
  ]);
  const va = Object.values(vols||{});
  const la = Object.values(logs||{});
  return {
    totalVolunteers:  va.length,
    activeVolunteers: va.filter(v=>v.status==="active").length,
    droppedVolunteers:va.filter(v=>v.status==="dropped").length,
    waitlistCount:    va.filter(v=>v.status==="waitlist").length,
    totalParticipants:Object.keys(parts||{}).length,
    totalNotifications:Object.keys(notifs||{}).length,
    unreadNotifications:Object.values(notifs||{}).filter(n=>!n.read).length,
    reshufflesPerformed:la.filter(l=>l.action==="RESHUFFLE_COMPLETE").length,
    aiDecisions:      la.filter(l=>l.action==="AI_REASONING_COMPLETE").length,
    briefingsSent:    Object.values(notifs||{}).filter(n=>n.type==="pre_event_briefing"||n.type==="assignment_briefing"||n.type==="new_assignment").length
  };
}

export async function markNotifRead(id) {
  await fb.patch(`notifications/${id}`, { read:true });
}
