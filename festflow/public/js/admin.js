import {
  fb, gemini, seedDatabase,
  registerParticipant, registerVolunteer,
  triggerDropout, sendAllBriefings,
  getMasterSchedule, getAllVolunteers, getAllParticipants,
  getNotifications, getAgentLog,
  getDashboardStats, markNotifRead, pushNotif, logAction, SEED
} from './backend.js';

// ── Auth ──────────────────────────────────────────────────────────────────────
const ADMIN_USER = "admin";
const ADMIN_PASS = "admin";

window.doLogin = function() {
  const u = document.getElementById("auth-user").value;
  const p = document.getElementById("auth-pass").value;
  if (u === ADMIN_USER && p === ADMIN_PASS) {
    sessionStorage.setItem("ff_auth","1");
    document.getElementById("auth-overlay").style.display = "none";
    document.getElementById("admin-app").style.display    = "block";
    initAdmin();
  } else {
    document.getElementById("auth-error").style.display = "block";
  }
};

window.doLogout = function() {
  sessionStorage.removeItem("ff_auth");
  window.location.href = "index.html";
};

// Allow Enter key in auth form
document.addEventListener("keydown", e=>{
  if (e.key==="Enter" && document.getElementById("auth-overlay").style.display!=="none") doLogin();
});

// ── Toast ─────────────────────────────────────────────────────────────────────
function toast(title, msg, type="info", duration=4000) {
  const icons = { info:"ℹ️", success:"✅", error:"❌", warning:"⚠️" };
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.innerHTML = `<div class="toast-icon">${icons[type]}</div>
    <div class="toast-body"><div class="toast-title">${title}</div><div class="toast-msg">${msg}</div></div>`;
  document.getElementById("toast-container").appendChild(el);
  setTimeout(()=>{ el.style.opacity="0"; el.style.transform="translateX(20px)"; el.style.transition="all .3s";
    setTimeout(()=>el.remove(),300); }, duration);
}

// ── Router ────────────────────────────────────────────────────────────────────
window.showAdminPage = function(id) {
  document.querySelectorAll(".page").forEach(p=>p.classList.remove("active"));
  document.querySelectorAll(".nav-link").forEach(l=>l.classList.remove("active"));
  document.getElementById(`page-${id}`)?.classList.add("active");
  document.querySelector(`.nav-link[data-page="${id}"]`)?.classList.add("active");
  if (id==="dashboard")     loadDashboard();
  if (id==="volunteers")    loadVolunteers();
  if (id==="participants")  loadParticipants();
  if (id==="events")        loadEvents();
  if (id==="notifications") loadNotifications();
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const AV_COLORS = ["av-blue","av-green","av-amber","av-cyan","av-purple","av-red"];
function avatarColor(name) { return AV_COLORS[(name||"A").charCodeAt(0)%AV_COLORS.length]; }
function initials(name) { return (name||"?").split(" ").map(w=>w[0]).join("").toUpperCase().slice(0,2); }
function relTime(ts) {
  const diff = Date.now()-new Date(ts).getTime();
  if (diff<60000) return "just now";
  if (diff<3600000) return `${Math.floor(diff/60000)}m ago`;
  if (diff<86400000) return `${Math.floor(diff/3600000)}h ago`;
  return new Date(ts).toLocaleDateString();
}
function coverageBadge(status) {
  if (status==="full")         return `<span class="badge badge-blue">Full</span>`;
  if (status==="adequate")     return `<span class="badge badge-green">Adequate</span>`;
  if (status==="understaffed") return `<span class="badge badge-red">⚠ Short</span>`;
  return `<span class="badge badge-gray">${status}</span>`;
}
function statusBadge(status) {
  if (status==="active")   return `<span class="badge badge-green">Active</span>`;
  if (status==="waitlist") return `<span class="badge badge-amber">Waitlist</span>`;
  if (status==="dropped")  return `<span class="badge badge-red">Dropped</span>`;
  return `<span class="badge badge-gray">${status}</span>`;
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
async function loadDashboard() {
  const [stats, schedule, vols, notifs, logs] = await Promise.all([
    getDashboardStats(), getMasterSchedule(), getAllVolunteers(), getNotifications(20), getAgentLog(30)
  ]);

  document.getElementById("stat-participants").textContent = stats.totalParticipants;
  document.getElementById("stat-volunteers").textContent   = stats.activeVolunteers;
  document.getElementById("stat-waitlist").textContent     = stats.waitlistCount;
  document.getElementById("stat-reshuffles").textContent   = stats.reshufflesPerformed;
  document.getElementById("stat-briefings").textContent    = stats.briefingsSent;
  document.getElementById("stat-unread").textContent       = stats.unreadNotifications;

  const tbl = document.getElementById("schedule-body");
  tbl.innerHTML = schedule.map(s => {
    const volHtml = s.assignments.length
      ? s.assignments.map(a => {
          const n = a.volunteer?.name||"Unknown";
          return `<span class="vol-chip ${a.isReplacement?"replacement":""}">${a.isReplacement?"🔄 ":""}${n} <span style="opacity:.5;font-size:.7rem">${a.role}</span></span>`;
        }).join("")
      : `<span class="text-muted text-sm">No volunteers assigned</span>`;
    return `<tr>
      <td><div class="session-name">${s.name}</div><div class="session-time">⏰ ${s.time} · ${s.duration}min</div></td>
      <td><div class="session-venue">📍 ${s.venue}</div></td>
      <td>${coverageBadge(s.coverageStatus)} <span style="color:var(--text3);font-size:.72rem;margin-left:.3rem">${s.coverage}/${s.maxVol}</span></td>
      <td><div class="vol-chips">${volHtml}</div></td>
    </tr>`;
  }).join("");

  // Dropout selector
  const activeVols = vols.filter(v=>v.status==="active"&&v.assignedSession);
  const sel = document.getElementById("dropout-select");
  sel.innerHTML = `<option value="">— Choose a volunteer —</option>` +
    activeVols.map(v=>`<option value="${v.id}">${v.name} → ${v.assignedSession}</option>`).join("");

  // Agent log
  const logEl = document.getElementById("agent-log-body");
  const logIcons = {
    DROPOUT_DETECTED:"🚨",VOLUNTEER_MARKED_DROPPED:"❌",AI_REASONING_START:"🤔",
    AI_REASONING_COMPLETE:"🧠",ASSIGNMENT_CREATED:"✅",RESHUFFLE_COMPLETE:"🔄",
    NO_REPLACEMENT_FOUND:"⚠️",PARTICIPANT_REGISTERED:"👤",VOLUNTEER_REGISTRATION_START:"🙋",
    VOLUNTEER_ASSIGNED:"📋",VOLUNTEER_WAITLISTED:"⏳",BULK_BRIEFINGS_SENT:"📨"
  };
  logEl.innerHTML = logs.length ? logs.map(l=>{
    const icon = logIcons[l.action]||"📌";
    const detail = typeof l.details==="object" ? JSON.stringify(l.details).slice(0,80) : String(l.details||"");
    return `<div class="log-entry">
      <div class="log-icon">${icon}</div>
      <div><div class="log-action">${l.action.replace(/_/g," ")}</div>
           <div class="log-time">${relTime(l.timestamp)}</div>
           ${detail?`<div class="log-detail">${detail}</div>`:""}
      </div></div>`;
  }).join("") : `<div class="empty-state"><div class="empty-icon">🤖</div><p>No agent actions yet</p></div>`;

  renderNotifFeed(notifs, document.getElementById("notif-feed-dash"));
}

// ── Notification feed renderer ────────────────────────────────────────────────
function renderNotifFeed(notifs, container) {
  if (!container) return;
  const typeLabel = {
    registration_confirmed:"Registered", assignment_briefing:"Briefing",
    new_assignment:"Assigned", dropout_confirmed:"Dropout", standby_notice:"Standby",
    waitlist_added:"Waitlisted", pre_event_briefing:"Briefing", critical_gap:"CRITICAL"
  };
  const tc = n => n.type==="critical_gap"?"badge-red": n.type==="new_assignment"?"badge-green": n.type==="standby_notice"?"badge-amber":"badge-cyan";
  container.innerHTML = notifs.length ? notifs.map(n=>`
    <div class="notif-item ${n.read?"":"unread"}" data-id="${n.id}" onclick="openNotifModal('${n.id}')">
      <div class="notif-name">${n.toName||"System"} <span class="notif-type-badge"><span class="badge ${tc(n)}" style="font-size:.65rem">${typeLabel[n.type]||n.type}</span></span></div>
      <div class="notif-msg">${(n.message||"").slice(0,120)}${(n.message||"").length>120?"…":""}</div>
      <div class="notif-time">${relTime(n.timestamp)}</div>
    </div>`).join("")
    : `<div class="empty-state"><div class="empty-icon">🔔</div><p>No notifications yet</p></div>`;
}

// ── Notification Detail Modal ─────────────────────────────────────────────────
let _allNotifs = [];
window.openNotifModal = async function(id) {
  if (!_allNotifs.length) _allNotifs = await getNotifications(200);
  const n = _allNotifs.find(x=>x.id===id);
  if (!n) return;
  await markNotifRead(id);
  document.querySelectorAll(`[data-id="${id}"]`).forEach(el=>el.classList.remove("unread"));

  const typeLabel = {
    registration_confirmed:"Registration Confirmed", assignment_briefing:"Volunteer Briefing",
    new_assignment:"New Assignment", dropout_confirmed:"Dropout Confirmed",
    standby_notice:"Standby Notice", waitlist_added:"Waitlist Added",
    pre_event_briefing:"Pre-Event Briefing", critical_gap:"Critical Gap"
  };

  const isBriefing = ["assignment_briefing","new_assignment","pre_event_briefing"].includes(n.type);

  document.getElementById("notif-modal-title").textContent = typeLabel[n.type] || n.type;
  document.getElementById("notif-modal-body").innerHTML = `
    <div style="margin-bottom:1rem;padding-bottom:1rem;border-bottom:1px solid var(--border)">
      <div style="display:flex;gap:.5rem;align-items:center;flex-wrap:wrap">
        <div class="par-avatar ${avatarColor(n.toName||'S')}" style="width:36px;height:36px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:.85rem">${initials(n.toName||"System")}</div>
        <div>
          <div style="font-weight:600;color:#fff">${n.toName||"System"}</div>
          <div style="color:var(--text2);font-size:.75rem">${new Date(n.timestamp).toLocaleString()}</div>
        </div>
      </div>
    </div>
    ${isBriefing && n.emailBody ? `
      <div style="margin-bottom:.75rem">
        <span class="badge badge-green" style="font-size:.72rem">📧 Email Sent</span>
        ${n.emailSent ? `<span style="color:var(--text2);font-size:.75rem;margin-left:.5rem">Email was dispatched to volunteer</span>` : ""}
      </div>
      <div style="background:var(--bg3);border:1px solid var(--border);border-radius:10px;padding:1.2rem;font-size:.88rem;line-height:1.7;color:var(--text)">
        <div style="font-size:.7rem;text-transform:uppercase;letter-spacing:.06em;color:var(--text3);margin-bottom:.75rem">📧 Email Content Sent to Volunteer</div>
        ${(n.emailBody||n.message).replace(/\n/g,"<br/>")}
      </div>
    ` : `
      <div style="background:var(--bg3);border:1px solid var(--border);border-radius:10px;padding:1.2rem;font-size:.88rem;line-height:1.7;color:var(--text)">
        ${(n.message||"").replace(/\n/g,"<br/>")}
      </div>
    `}
    ${n.sessionName ? `<div style="margin-top:1rem;font-size:.8rem;color:var(--text2)">📅 Session: <strong style="color:#fff">${n.sessionName}</strong></div>` : ""}
    ${n.role ? `<div style="font-size:.8rem;color:var(--text2)">🎭 Role: <strong style="color:#fff">${n.role}</strong></div>` : ""}
  `;
  document.getElementById("notif-modal").style.display = "flex";
};

window.closeNotifModal = function(e) {
  if (e.target.id==="notif-modal") document.getElementById("notif-modal").style.display="none";
};

// ── Dropout handler ───────────────────────────────────────────────────────────
window.handleDropout = async function() {
  const volId = document.getElementById("dropout-select").value;
  if (!volId) { toast("Select a volunteer","","warning"); return; }
  const btn = document.getElementById("dropout-btn");
  btn.disabled=true; btn.textContent="Processing…";
  const thinking = document.getElementById("ai-thinking");
  const result   = document.getElementById("ai-result");
  thinking.classList.add("active");
  result.classList.remove("active");
  const steps = ["Detecting gap in schedule…","Scanning waitlist candidates…","Analysing skill compatibility…","Running AI decision engine…","Generating replacement briefing…"];
  let si=0;
  const stepEl = document.getElementById("thinking-step");
  const stepInterval = setInterval(()=>{ stepEl.textContent=steps[Math.min(si++,steps.length-1)]; },900);
  try {
    const res = await triggerDropout(volId);
    clearInterval(stepInterval);
    thinking.classList.remove("active");
    if (res.success) {
      result.classList.add("active");
      document.getElementById("ai-reasoning").textContent = res.aiDecision.reasoning;
      document.getElementById("ai-replacement-name").textContent = res.replacement.name;
      const conf = Math.round((res.aiDecision.confidence||0.8)*100);
      document.getElementById("confidence-pct").textContent = `${conf}%`;
      document.getElementById("confidence-fill").style.width = `${conf}%`;
      toast("🔄 Reshuffle Complete!",`${res.replacement.name} assigned to ${res.session.name}`,"success",5000);
      setTimeout(loadDashboard,1000);
    } else {
      toast("No Replacement Found", res.message||"AI could not find a suitable candidate","error");
    }
  } catch(e) {
    clearInterval(stepInterval);
    thinking.classList.remove("active");
    toast("Error",e.message,"error");
  }
  btn.disabled=false; btn.textContent="⚡ Trigger Dropout";
};

// ── Send briefings ────────────────────────────────────────────────────────────
window.sendBriefings = async function() {
  const btn = document.getElementById("briefings-btn");
  btn.disabled=true; btn.textContent="Sending…";
  try {
    const results = await sendAllBriefings();
    toast("Briefings Sent!",`${results.length} personalised briefings dispatched & emailed`,"success");
    setTimeout(loadDashboard,1000);
  } catch(e) { toast("Error",e.message,"error"); }
  btn.disabled=false; btn.textContent="📨 Send All Briefings";
};

// ── Seed ──────────────────────────────────────────────────────────────────────
window.runSeed = async function() {
  try {
    await seedDatabase();
    toast("Database Reset!","Mock data loaded 🚀","success");
    setTimeout(loadDashboard,500);
  } catch(e) { toast("Seed Error",e.message,"error"); }
};

// ── Volunteers page ───────────────────────────────────────────────────────────
async function loadVolunteers() {
  const vols = await getAllVolunteers();
  const sessions = await fb.get("sessions");
  const tabs = { all:vols, active:vols.filter(v=>v.status==="active"),
    waitlist:vols.filter(v=>v.status==="waitlist"), dropped:vols.filter(v=>v.status==="dropped") };

  function render(list) {
    const el = document.getElementById("vol-grid");
    el.innerHTML = list.length ? list.map(v=>{
      const av = avatarColor(v.name);
      const sesName = v.assignedSession ? (sessions?.[v.assignedSession]?.name||v.assignedSession) : "—";
      return `<div class="vol-card">
        <div class="vol-card-top">
          <div class="vol-avatar ${av}">${initials(v.name)}</div>
          <div><div class="vol-name">${v.name}</div><div class="vol-meta">${v.year||""} · ${v.branch||""}</div></div>
        </div>
        <div class="vol-skills">${(v.skills||[]).map(s=>`<span class="skill-tag">${s}</span>`).join("")}</div>
        <div class="vol-footer">
          ${statusBadge(v.status)}
          <span class="text-muted text-sm">${v.assignedSession?`📋 ${sesName}`:""}</span>
        </div>
        <div style="margin-top:.6rem;font-size:.72rem;color:var(--text3)">📧 ${v.email||""} · 📱 ${v.phone||""}</div>
        <div style="display:flex;gap:.4rem;margin-top:.8rem">
          <button class="btn btn-secondary btn-sm" style="flex:1;justify-content:center" onclick="openEditVolunteer('${v.id}')">✏️ Edit</button>
          <button class="btn btn-danger btn-sm" onclick="deleteVolunteer('${v.id}','${v.name}')">🗑️</button>
        </div>
      </div>`;
    }).join("") : `<div class="empty-state col-span-all"><div class="empty-icon">🙋</div><p>No volunteers in this category</p></div>`;
  }

  render(tabs.all);
  document.querySelectorAll(".vol-tab").forEach(t=>{
    t.addEventListener("click",()=>{
      document.querySelectorAll(".vol-tab").forEach(x=>x.classList.remove("active"));
      t.classList.add("active");
      render(tabs[t.dataset.filter]||vols);
    });
  });
  document.getElementById("vol-count").textContent       = vols.length;
  document.getElementById("vol-active-count").textContent = tabs.active.length;
  document.getElementById("vol-wait-count").textContent   = tabs.waitlist.length;
}

// Add Volunteer modal
window.openAddVolunteer = function() {
  document.getElementById("vol-modal-title").textContent = "Add Volunteer";
  document.getElementById("vol-edit-id").value = "";
  document.getElementById("ve-name").value = "";
  document.getElementById("ve-email").value = "";
  document.getElementById("ve-phone").value = "";
  document.getElementById("ve-year").value = "";
  document.getElementById("ve-branch").value = "";
  document.getElementById("ve-status").value = "waitlist";
  document.querySelectorAll("#ve-skills .checkbox-chip, #ve-avail .checkbox-chip").forEach(c=>c.classList.remove("checked"));
  document.getElementById("vol-modal").style.display = "flex";
};

window.openEditVolunteer = async function(id) {
  const v = await fb.get(`volunteers/${id}`);
  if (!v) return;
  document.getElementById("vol-modal-title").textContent = "Edit Volunteer";
  document.getElementById("vol-edit-id").value  = id;
  document.getElementById("ve-name").value   = v.name||"";
  document.getElementById("ve-email").value  = v.email||"";
  document.getElementById("ve-phone").value  = v.phone||"";
  document.getElementById("ve-year").value   = v.year||"";
  document.getElementById("ve-branch").value = v.branch||"";
  document.getElementById("ve-status").value = v.status||"waitlist";
  document.querySelectorAll("#ve-skills .checkbox-chip").forEach(c=>{
    c.classList.toggle("checked",(v.skills||[]).includes(c.dataset.value));
  });
  document.querySelectorAll("#ve-avail .checkbox-chip").forEach(c=>{
    c.classList.toggle("checked",(v.availability||[]).includes(c.dataset.value));
  });
  document.getElementById("vol-modal").style.display = "flex";
};

window.saveVolunteer = async function(e) {
  e.preventDefault();
  const id   = document.getElementById("vol-edit-id").value;
  const skills = [...document.querySelectorAll("#ve-skills .checkbox-chip.checked")].map(c=>c.dataset.value);
  const avail  = [...document.querySelectorAll("#ve-avail .checkbox-chip.checked")].map(c=>c.dataset.value);
  const data = {
    name:  document.getElementById("ve-name").value,
    email: document.getElementById("ve-email").value,
    phone: document.getElementById("ve-phone").value,
    year:  document.getElementById("ve-year").value,
    branch:document.getElementById("ve-branch").value,
    status:document.getElementById("ve-status").value,
    skills, availability:avail
  };
  if (id) {
    await fb.patch(`volunteers/${id}`, data);
    toast("Volunteer Updated","Changes saved","success");
  } else {
    const newId = `vol-${Date.now()}`;
    await fb.set(`volunteers/${newId}`, { id:newId, ...data, assignedSession:null, registeredAt:new Date().toISOString() });
    toast("Volunteer Added","New volunteer created","success");
  }
  document.getElementById("vol-modal").style.display = "none";
  loadVolunteers();
};

let _deleteAction = null;
window.deleteVolunteer = function(id, name) {
  document.getElementById("confirm-title").textContent = `Delete ${name}?`;
  document.getElementById("confirm-msg").textContent = "This volunteer will be permanently removed.";
  _deleteAction = async()=>{
    await fb.del(`volunteers/${id}`);
    toast("Deleted",`${name} removed`,"success");
    loadVolunteers();
  };
  document.getElementById("confirm-modal").style.display = "flex";
};

window.confirmDeleteAction = async function() {
  document.getElementById("confirm-modal").style.display = "none";
  if (_deleteAction) { await _deleteAction(); _deleteAction=null; }
};

// ── Participants page ─────────────────────────────────────────────────────────
async function loadParticipants() {
  const parts = await getAllParticipants();
  const sessions = await fb.get("sessions");
  const el = document.getElementById("participants-list");
  el.innerHTML = parts.length ? parts.map(p=>{
    const av = avatarColor(p.name);
    const evtBadges = (p.events||[]).map(e=>`<span class="badge badge-cyan" style="font-size:.68rem">${sessions?.[e]?.name||e}</span>`).join("");
    return `<div class="par-row">
      <div class="par-avatar ${av}">${initials(p.name)}</div>
      <div><div class="par-name">${p.name}</div><div class="par-college">${p.college||""} · ${p.email||""}</div></div>
      <div class="par-events" style="margin-left:auto;display:flex;gap:.3rem;flex-wrap:wrap">${evtBadges}</div>
      <div style="display:flex;gap:.4rem;margin-left:1rem">
        <button class="btn btn-secondary btn-sm" onclick="openEditParticipant('${p.id}')">✏️ Edit</button>
        <button class="btn btn-danger btn-sm" onclick="deleteParticipant('${p.id}','${p.name}')">🗑️</button>
      </div>
    </div>`;
  }).join("") : `<div class="empty-state"><div class="empty-icon">👥</div><p>No participants yet</p></div>`;
  document.getElementById("par-count").textContent = parts.length;
}

window.openAddParticipant = function() {
  document.getElementById("par-modal-title").textContent = "Add Participant";
  document.getElementById("par-edit-id").value = "";
  document.getElementById("pe-name").value = "";
  document.getElementById("pe-email").value = "";
  document.getElementById("pe-phone").value = "";
  document.getElementById("pe-college").value = "";
  document.querySelectorAll("#pe-events .checkbox-chip").forEach(c=>c.classList.remove("checked"));
  document.getElementById("par-modal").style.display = "flex";
};

window.openEditParticipant = async function(id) {
  const p = await fb.get(`participants/${id}`);
  if (!p) return;
  document.getElementById("par-modal-title").textContent = "Edit Participant";
  document.getElementById("par-edit-id").value = id;
  document.getElementById("pe-name").value    = p.name||"";
  document.getElementById("pe-email").value   = p.email||"";
  document.getElementById("pe-phone").value   = p.phone||"";
  document.getElementById("pe-college").value = p.college||"";
  document.querySelectorAll("#pe-events .checkbox-chip").forEach(c=>{
    c.classList.toggle("checked",(p.events||[]).includes(c.dataset.value));
  });
  document.getElementById("par-modal").style.display = "flex";
};

window.saveParticipant = async function(e) {
  e.preventDefault();
  const id = document.getElementById("par-edit-id").value;
  const events = [...document.querySelectorAll("#pe-events .checkbox-chip.checked")].map(c=>c.dataset.value);
  const data = {
    name:   document.getElementById("pe-name").value,
    email:  document.getElementById("pe-email").value,
    phone:  document.getElementById("pe-phone").value,
    college:document.getElementById("pe-college").value,
    events
  };
  if (id) {
    await fb.patch(`participants/${id}`, data);
    toast("Participant Updated","","success");
  } else {
    const newId = `par-${Date.now()}`;
    await fb.set(`participants/${newId}`, { id:newId, ...data, registeredAt:new Date().toISOString() });
    toast("Participant Added","","success");
  }
  document.getElementById("par-modal").style.display = "none";
  loadParticipants();
};

window.deleteParticipant = function(id, name) {
  document.getElementById("confirm-title").textContent = `Delete ${name}?`;
  document.getElementById("confirm-msg").textContent   = "This participant will be permanently removed.";
  _deleteAction = async()=>{
    await fb.del(`participants/${id}`);
    toast("Deleted",`${name} removed`,"success");
    loadParticipants();
  };
  document.getElementById("confirm-modal").style.display = "flex";
};

// ── Events page ───────────────────────────────────────────────────────────────
async function loadEvents() {
  const sessions = await fb.get("sessions");
  const grid = document.getElementById("events-grid");
  const arr = Object.values(sessions||{}).sort((a,b)=>a.time.localeCompare(b.time));
  grid.innerHTML = arr.length ? arr.map(s=>`
    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:.75rem">
        <div>
          <div style="font-weight:700;color:#fff;font-size:1rem">${s.name}</div>
          <div style="color:var(--text2);font-size:.78rem;margin-top:.2rem">⏰ ${s.time} · ${s.duration}min</div>
        </div>
        <div style="display:flex;gap:.3rem">
          <button class="btn btn-secondary btn-sm" onclick="openEditSession('${s.id}')">✏️</button>
          <button class="btn btn-danger btn-sm" onclick="deleteSession('${s.id}','${s.name}')">🗑️</button>
        </div>
      </div>
      <div style="font-size:.8rem;color:var(--text2);margin-bottom:.6rem">📍 ${s.venue}</div>
      <div style="font-size:.78rem;color:var(--text3)">Volunteers: ${s.minVol}–${s.maxVol}</div>
      <div style="display:flex;flex-wrap:wrap;gap:.3rem;margin-top:.75rem">
        ${(s.requiredSkills||[]).map(sk=>`<span class="skill-tag">${sk}</span>`).join("")}
      </div>
    </div>
  `).join("") : `<div class="empty-state"><div class="empty-icon">📅</div><p>No sessions yet</p></div>`;
}

window.openAddSession = function() {
  document.getElementById("ses-modal-title").textContent = "Add Session";
  document.getElementById("ses-edit-id").value = "";
  document.getElementById("se-name").value = "";
  document.getElementById("se-venue").value = "";
  document.getElementById("se-time").value = "";
  document.getElementById("se-duration").value = "";
  document.getElementById("se-minvol").value = "2";
  document.getElementById("se-maxvol").value = "4";
  document.querySelectorAll("#se-skills .checkbox-chip").forEach(c=>c.classList.remove("checked"));
  document.getElementById("ses-modal").style.display = "flex";
};

window.openEditSession = async function(id) {
  const s = await fb.get(`sessions/${id}`);
  if (!s) return;
  document.getElementById("ses-modal-title").textContent = "Edit Session";
  document.getElementById("ses-edit-id").value   = id;
  document.getElementById("se-name").value       = s.name||"";
  document.getElementById("se-venue").value      = s.venue||"";
  document.getElementById("se-time").value       = s.time||"";
  document.getElementById("se-duration").value   = s.duration||"";
  document.getElementById("se-minvol").value     = s.minVol||2;
  document.getElementById("se-maxvol").value     = s.maxVol||4;
  document.querySelectorAll("#se-skills .checkbox-chip").forEach(c=>{
    c.classList.toggle("checked",(s.requiredSkills||[]).includes(c.dataset.value));
  });
  document.getElementById("ses-modal").style.display = "flex";
};

window.saveSession = async function(e) {
  e.preventDefault();
  const id = document.getElementById("ses-edit-id").value;
  const requiredSkills = [...document.querySelectorAll("#se-skills .checkbox-chip.checked")].map(c=>c.dataset.value);
  const data = {
    name:     document.getElementById("se-name").value,
    venue:    document.getElementById("se-venue").value,
    time:     document.getElementById("se-time").value,
    duration: parseInt(document.getElementById("se-duration").value)||90,
    minVol:   parseInt(document.getElementById("se-minvol").value)||2,
    maxVol:   parseInt(document.getElementById("se-maxvol").value)||4,
    requiredSkills, status:"active", eventId:"evt-001"
  };
  if (id) {
    await fb.patch(`sessions/${id}`, data);
    toast("Session Updated","","success");
  } else {
    const newId = `ses-${Date.now()}`;
    await fb.set(`sessions/${newId}`, { id:newId, ...data });
    toast("Session Added","","success");
  }
  document.getElementById("ses-modal").style.display = "none";
  loadEvents();
};

window.deleteSession = function(id, name) {
  document.getElementById("confirm-title").textContent = `Delete "${name}"?`;
  document.getElementById("confirm-msg").textContent   = "This session and its assignments will be removed.";
  _deleteAction = async()=>{
    await fb.del(`sessions/${id}`);
    // Remove related assignments
    const assignments = await fb.get("assignments");
    for (const [key,a] of Object.entries(assignments||{})) {
      if (a.sessionId===id) await fb.del(`assignments/${key}`);
    }
    toast("Session Deleted","","success");
    loadEvents();
  };
  document.getElementById("confirm-modal").style.display = "flex";
};

// ── Notifications page ────────────────────────────────────────────────────────
async function loadNotifications() {
  _allNotifs = await getNotifications(100);
  const el = document.getElementById("notifs-list");
  renderNotifFeed(_allNotifs, el);
  document.getElementById("notif-count").textContent  = _allNotifs.length;
  document.getElementById("notif-unread").textContent = _allNotifs.filter(n=>!n.read).length;
}

// ── Modal helpers ─────────────────────────────────────────────────────────────
window.closeModal = function(id, e) {
  if (e.target.id===id) document.getElementById(id).style.display="none";
};

// ── Checkbox chip toggles ─────────────────────────────────────────────────────
document.addEventListener("click", e=>{
  const chip = e.target.closest(".checkbox-chip");
  if (chip && !chip.closest("form[onsubmit]")?.id) return; // handled by form
  if (chip) chip.classList.toggle("checked");
});
// Re-enable for all chips globally
document.addEventListener("click", e=>{
  const chip = e.target.closest(".checkbox-chip");
  if (chip) chip.classList.toggle("checked");
}, true);

// ── Init ──────────────────────────────────────────────────────────────────────
async function initAdmin() {
  const loader = document.getElementById("loader");
  try {
    const existing = await fb.get("sessions");
    if (!existing || Object.keys(existing).length===0) {
      await seedDatabase();
    }
  } catch(e) { console.error(e); }

  setTimeout(()=>{
    loader.style.opacity="0"; loader.style.transition="opacity .4s";
    setTimeout(()=>{ loader.style.display="none"; showAdminPage("dashboard"); },400);
  },1200);
}

// Check auth on load
window.addEventListener("DOMContentLoaded", ()=>{
  if (sessionStorage.getItem("ff_auth")==="1") {
    document.getElementById("auth-overlay").style.display = "none";
    document.getElementById("admin-app").style.display    = "block";
    initAdmin();
  }
  // Enter key on auth
  document.getElementById("auth-pass").addEventListener("keydown",e=>{
    if(e.key==="Enter") doLogin();
  });
  document.getElementById("auth-user").addEventListener("keydown",e=>{
    if(e.key==="Enter") doLogin();
  });
});
