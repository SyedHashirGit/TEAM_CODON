import {
  fb, gemini, seedDatabase,
  registerParticipant, registerVolunteer,
  triggerDropout, sendAllBriefings,
  getMasterSchedule, getAllVolunteers, getAllParticipants,
  getNotifications, getAgentLog, getReports,
  getDashboardStats, markNotifRead, pushNotif, logAction, SEED
} from './backend.js';

// ── Toast system ──────────────────────────────────────────────────────────────
function toast(title, msg, type="info", duration=4000) {
  const icons = { info:"ℹ️", success:"✅", error:"❌", warning:"⚠️" };
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.innerHTML = `<div class="toast-icon">${icons[type]||"ℹ️"}</div>
    <div class="toast-body"><div class="toast-title">${title}</div><div class="toast-msg">${msg}</div></div>`;
  document.getElementById("toast-container").appendChild(el);
  setTimeout(()=>{ el.style.opacity="0"; el.style.transform="translateX(20px)"; el.style.transition="all .3s";
    setTimeout(()=>el.remove(), 300); }, duration);
}

// ── Router ─────────────────────────────────────────────────────────────────────
let currentPage = "landing";
function showPage(id) {
  document.querySelectorAll(".page").forEach(p=>p.classList.remove("active"));
  document.querySelectorAll(".nav-link").forEach(l=>l.classList.remove("active"));
  document.getElementById(`page-${id}`)?.classList.add("active");
  document.querySelector(`.nav-link[data-page="${id}"]`)?.classList.add("active");
  currentPage = id;
  if (id==="dashboard")    loadDashboard();
  if (id==="volunteers")   loadVolunteers();
  if (id==="participants") loadParticipants();
  if (id==="notifications")loadNotifications();
}
window.showPage = showPage;

// ── Avatar helper ─────────────────────────────────────────────────────────────
const AV_COLORS = ["av-blue","av-green","av-amber","av-cyan","av-purple","av-red"];
function avatarColor(name) { return AV_COLORS[name.charCodeAt(0)%AV_COLORS.length]; }
function initials(name) { return name.split(" ").map(w=>w[0]).join("").toUpperCase().slice(0,2); }

// ── Time formatter ────────────────────────────────────────────────────────────
function relTime(ts) {
  const diff = Date.now()-new Date(ts).getTime();
  if (diff<60000) return "just now";
  if (diff<3600000) return `${Math.floor(diff/60000)}m ago`;
  if (diff<86400000) return `${Math.floor(diff/3600000)}h ago`;
  return new Date(ts).toLocaleDateString();
}

// ── Coverage badge ────────────────────────────────────────────────────────────
function coverageBadge(status) {
  if (status==="full")         return `<span class="badge badge-blue">Full</span>`;
  if (status==="adequate")     return `<span class="badge badge-green">Adequate</span>`;
  if (status==="understaffed") return `<span class="badge badge-red">⚠ Short</span>`;
  return `<span class="badge badge-gray">${status}</span>`;
}

// ── Status badge ──────────────────────────────────────────────────────────────
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

  // Stats
  document.getElementById("stat-participants").textContent = stats.totalParticipants;
  document.getElementById("stat-volunteers").textContent   = stats.activeVolunteers;
  document.getElementById("stat-waitlist").textContent     = stats.waitlistCount;
  document.getElementById("stat-reshuffles").textContent   = stats.reshufflesPerformed;
  document.getElementById("stat-briefings").textContent    = stats.briefingsSent;
  document.getElementById("stat-unread").textContent       = stats.unreadNotifications;

  // Schedule table
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

  // Dropout selector — only active volunteers
  const activeVols = vols.filter(v=>v.status==="active"&&v.assignedSession);
  const sel = document.getElementById("dropout-select");
  sel.innerHTML = `<option value="">— Choose a volunteer —</option>` +
    activeVols.map(v=>`<option value="${v.id}">${v.name} (${SEED.sessions?.[v.assignedSession]?.name||v.assignedSession})</option>`).join("");

  // Agent log
  const logEl = document.getElementById("agent-log-body");
  const logIcons = {
    DROPOUT_DETECTED:"🚨", VOLUNTEER_MARKED_DROPPED:"❌", AI_REASONING_START:"🤔",
    AI_REASONING_COMPLETE:"🧠", ASSIGNMENT_CREATED:"✅", RESHUFFLE_COMPLETE:"🔄",
    NO_REPLACEMENT_FOUND:"⚠️", PARTICIPANT_REGISTERED:"👤", VOLUNTEER_REGISTRATION_START:"🙋",
    VOLUNTEER_ASSIGNED:"📋", VOLUNTEER_WAITLISTED:"⏳", BULK_BRIEFINGS_SENT:"📨",
    VOLUNTEER_ADDED:"➕", DROPOUT_CONFIRMED:"🔇"
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

  // Notif feed
  renderNotifFeed(notifs, document.getElementById("notif-feed-dash"));

  // Reload dropout selector from live firebase data
  const liveVols = await getAllVolunteers();
  const activeForDropout = liveVols.filter(v=>v.status==="active"&&v.assignedSession);
  const sel2 = document.getElementById("dropout-select");
  sel2.innerHTML = `<option value="">— Choose a volunteer —</option>` +
    activeForDropout.map(v=>{
      const sesName = v.assignedSession;
      return `<option value="${v.id}">${v.name} → ${sesName}</option>`;
    }).join("");
}

function renderNotifFeed(notifs, container) {
  if (!container) return;
  container.innerHTML = notifs.length ? notifs.map(n=>{
    const typeLabel = {
      registration_confirmed:"Registered", assignment_briefing:"Briefing",
      new_assignment:"Assigned", dropout_confirmed:"Dropout", standby_notice:"Standby",
      waitlist_added:"Waitlisted", pre_event_briefing:"Briefing", critical_gap:"CRITICAL"
    }[n.type]||n.type;
    const tc = n.type==="critical_gap"?"badge-red": n.type==="new_assignment"?"badge-green": n.type==="standby_notice"?"badge-amber":"badge-cyan";
    return `<div class="notif-item ${n.read?"":"unread"}" data-id="${n.id}" onclick="markRead('${n.id}',this)">
      <div class="notif-name">${n.toName||"System"} <span class="notif-type-badge"><span class="badge ${tc}" style="font-size:.65rem">${typeLabel}</span></span></div>
      <div class="notif-msg">${n.message.slice(0,120)}${n.message.length>120?"…":""}</div>
      <div class="notif-time">${relTime(n.timestamp)}</div>
    </div>`;
  }).join("") : `<div class="empty-state"><div class="empty-icon">🔔</div><p>No notifications yet</p></div>`;
}

window.markRead = async function(id, el) {
  await markNotifRead(id);
  el?.classList.remove("unread");
};

// ── Dropout handler ───────────────────────────────────────────────────────────
window.handleDropout = async function() {
  const volId = document.getElementById("dropout-select").value;
  if (!volId) { toast("Select a volunteer","Please choose a volunteer to simulate dropout","warning"); return; }

  const btn = document.getElementById("dropout-btn");
  btn.disabled = true;
  btn.textContent = "Processing…";

  const thinking = document.getElementById("ai-thinking");
  const result   = document.getElementById("ai-result");
  thinking.classList.add("active");
  result.classList.remove("active");

  // Animated thinking steps
  const steps = ["Detecting gap in schedule…","Scanning waitlist candidates…","Analysing skill compatibility…","Running AI decision engine…","Generating replacement briefing…"];
  let si = 0;
  const stepEl = document.getElementById("thinking-step");
  const stepInterval = setInterval(()=>{ stepEl.textContent = steps[Math.min(si++, steps.length-1)]; }, 900);

  try {
    const res = await triggerDropout(volId);
    clearInterval(stepInterval);
    thinking.classList.remove("active");

    if (res.success) {
      result.classList.add("active");
      document.getElementById("ai-reasoning").textContent   = res.aiDecision.reasoning;
      document.getElementById("ai-replacement-name").textContent = res.replacement.name;
      const conf = Math.round((res.aiDecision.confidence||0.8)*100);
      document.getElementById("confidence-pct").textContent = `${conf}%`;
      document.getElementById("confidence-fill").style.width = `${conf}%`;
      toast("🔄 Reshuffle Complete!",`${res.replacement.name} assigned to ${res.session.name}`,"success",5000);
      setTimeout(loadDashboard, 1000);
    } else {
      toast("No Replacement Found", res.message||"AI could not find a suitable candidate","error");
    }
  } catch(e) {
    clearInterval(stepInterval);
    thinking.classList.remove("active");
    toast("Error", e.message, "error");
  }

  btn.disabled = false;
  btn.textContent = "⚡ Trigger Dropout";
};

// ── Send all briefings ────────────────────────────────────────────────────────
window.sendBriefings = async function() {
  const btn = document.getElementById("briefings-btn");
  btn.disabled = true; btn.textContent = "Sending…";
  try {
    const results = await sendAllBriefings();
    toast("Briefings Sent!",`${results.length} personalised briefings dispatched via AI`,"success");
    setTimeout(loadDashboard,1000);
  } catch(e) { toast("Error",e.message,"error"); }
  btn.disabled = false; btn.textContent = "📨 Send All Briefings";
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
          <div><div class="vol-name">${v.name}</div>
               <div class="vol-meta">${v.year||""} · ${v.branch||""}</div></div>
        </div>
        <div class="vol-skills">${(v.skills||[]).map(s=>`<span class="skill-tag">${s}</span>`).join("")}</div>
        <div class="vol-footer">
          ${statusBadge(v.status)}
          <span class="text-muted text-sm">${v.assignedSession?`📋 ${sesName}`:""}</span>
        </div>
        <div style="margin-top:.6rem;font-size:.72rem;color:var(--text3)">
          📧 ${v.email||""} · 📱 ${v.phone||""}
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

  document.getElementById("vol-count").textContent = vols.length;
  document.getElementById("vol-active-count").textContent  = tabs.active.length;
  document.getElementById("vol-wait-count").textContent    = tabs.waitlist.length;
}

// ── Participants page ─────────────────────────────────────────────────────────
async function loadParticipants() {
  const parts = await getAllParticipants();
  const sessions = await fb.get("sessions");
  const el = document.getElementById("participants-list");
  
  if (parts.length > 0) {
    const tableRows = parts.map(p => {
      const av = avatarColor(p.name);
      const evtBadges = (p.events||[]).map(e=>`<span class="badge badge-cyan" style="font-size:.68rem">${sessions?.[e]?.name||e}</span>`).join(" ");
      const regDate = new Date(p.registeredAt).toLocaleDateString();
      return `<tr>
        <td>
          <div style="display:flex;align-items:center;gap:.75rem">
            <div class="par-avatar ${av}" style="width:32px;height:32px;font-size:.8rem;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff">${initials(p.name)}</div>
            <div style="font-weight:600">${p.name}</div>
          </div>
        </td>
        <td style="color:var(--text2)">${p.email||"N/A"}</td>
        <td style="color:var(--text2)">${p.college||"N/A"}</td>
        <td>${evtBadges}</td>
        <td style="color:var(--text3);font-size:.85rem">${regDate}</td>
      </tr>`;
    }).join("");

    el.innerHTML = `
      <div class="card" style="padding:0;overflow:auto">
        <table class="schedule-table" style="width:100%;text-align:left;border-collapse:collapse">
          <thead>
            <tr>
              <th style="padding:1rem">Participant</th>
              <th style="padding:1rem">Email</th>
              <th style="padding:1rem">College / Institute</th>
              <th style="padding:1rem">Registered Sessions</th>
              <th style="padding:1rem">Date</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
      </div>
    `;
  } else {
    el.innerHTML = `<div class="empty-state"><div class="empty-icon">👥</div><p>No participants yet</p></div>`;
  }

  document.getElementById("par-count").textContent = parts.length;
}

// ── Notifications page ────────────────────────────────────────────────────────
async function loadNotifications() {
  const notifs = await getNotifications(100);
  const el = document.getElementById("notifs-list");
  renderNotifFeed(notifs, el);
  document.getElementById("notif-count").textContent = notifs.length;
  document.getElementById("notif-unread").textContent = notifs.filter(n=>!n.read).length;
}

// ── Participant registration form ─────────────────────────────────────────────
window.submitParticipant = async function(e) {
  e.preventDefault();
  const btn = document.getElementById("par-submit");
  btn.disabled = true; btn.textContent = "Registering…";

  const events = [...document.querySelectorAll("#par-events .checkbox-chip.checked")]
    .map(el=>el.dataset.value);

  const data = {
    name:    document.getElementById("par-name").value,
    email:   document.getElementById("par-email").value,
    phone:   document.getElementById("par-phone").value,
    college: document.getElementById("par-college").value,
    events
  };

  try {
    await registerParticipant(data);
    document.getElementById("par-form-wrap").style.display = "none";
    document.getElementById("par-success").style.display   = "block";
    document.getElementById("par-success-name").textContent = data.name;
    toast("Registered!","You're all set for TechFest 2025 🎉","success");
  } catch(err) {
    toast("Error", err.message, "error");
    btn.disabled=false; btn.textContent="Complete Registration";
  }
};

// ── Volunteer registration form ───────────────────────────────────────────────
window.submitVolunteer = async function(e) {
  e.preventDefault();
  const btn = document.getElementById("vol-submit");
  btn.disabled = true; btn.textContent = "Registering…";

  const skills = [...document.querySelectorAll("#vol-skills .checkbox-chip.checked")]
    .map(el=>el.dataset.value);
  const availability = [...document.querySelectorAll("#vol-avail .checkbox-chip.checked")]
    .map(el=>el.dataset.value);

  const data = {
    name:  document.getElementById("vol-name").value,
    email: document.getElementById("vol-email").value,
    phone: document.getElementById("vol-phone").value,
    year:  document.getElementById("vol-year").value,
    branch:document.getElementById("vol-branch").value,
    skills, availability
  };

  try {
    const res = await registerVolunteer(data);
    document.getElementById("vol-form-wrap").style.display = "none";
    document.getElementById("vol-success").style.display   = "block";
    document.getElementById("vol-success-name").textContent = data.name;

    const assignMsg = res.assignedSession
      ? `You've been assigned to <strong>${res.assignedRole}</strong> for <strong>${res.assignedSession}</strong>. Briefing sent!`
      : `You're on the waitlist — we'll notify you when a slot opens.`;
    document.getElementById("vol-success-detail").innerHTML = assignMsg;
    toast("Volunteer Registered!","AI is processing your assignment…","success");
  } catch(err) {
    toast("Error", err.message, "error");
    btn.disabled=false; btn.textContent="Register as Volunteer";
  }
};

// ── Checkbox chip toggles ─────────────────────────────────────────────────────
document.addEventListener("click", e=>{
  const chip = e.target.closest(".checkbox-chip");
  if (chip) chip.classList.toggle("checked");
});

// ── Seed button ───────────────────────────────────────────────────────────────
window.runSeed = async function() {
  const btn = document.getElementById("seed-btn");
  btn.disabled = true; btn.textContent = "Seeding…";
  try {
    await seedDatabase();
    toast("Database Seeded!","Mock data loaded — ready to demo 🚀","success");
    if (currentPage==="dashboard") setTimeout(loadDashboard,500);
  } catch(e) { toast("Seed Error",e.message,"error"); }
  btn.disabled=false; btn.textContent="🌱 Seed Demo Data";
};

// ── Nav wiring ────────────────────────────────────────────────────────────────
document.querySelectorAll(".nav-link[data-page]").forEach(l=>{
  l.addEventListener("click",()=>showPage(l.dataset.page));
});

// ── Init ──────────────────────────────────────────────────────────────────────
window.addEventListener("DOMContentLoaded", async()=>{
  const loader = document.getElementById("loader");

  // Auto-seed if db is empty
  try {
    const existing = await fb.get("sessions");
    if (!existing || Object.keys(existing).length===0) {
      loader.querySelector("p").textContent = "First run — seeding demo data…";
      await seedDatabase();
    }
  } catch(e) { console.error("Init seed error:",e); }

  setTimeout(()=>{
    loader.style.opacity="0"; loader.style.transition="opacity .4s";
    setTimeout(()=>{ loader.style.display="none"; showPage("landing"); },400);
  },1200);
});
