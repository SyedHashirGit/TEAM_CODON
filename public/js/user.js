import {
  fb, seedDatabase, registerParticipant, registerVolunteer, getMasterSchedule
} from './backend.js';

// ── Theme Management ─────────────────────────────────────────────────────────
function initTheme() {
  const saved = localStorage.getItem("festflow-theme") || "dark";
  document.documentElement.setAttribute("data-theme", saved);
  updateThemeIcons(saved);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme");
  const next = current === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem("festflow-theme", next);
  updateThemeIcons(next);
}

function updateThemeIcons(theme) {
  const sun = document.getElementById("sun-icon");
  const moon = document.getElementById("moon-icon");
  if (!sun || !moon) return;
  if (theme === "dark") {
    sun.style.display = "block";
    moon.style.display = "none";
  } else {
    sun.style.display = "none";
    moon.style.display = "block";
  }
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function toast(title, msg, type="info", duration=4000) {
  const icons = { info:"ℹ️", success:"✅", error:"❌", warning:"⚠️" };
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.innerHTML = `<div class="toast-icon">${icons[type]||"ℹ️"}</div>
    <div class="toast-body"><div class="toast-title">${title}</div><div class="toast-msg">${msg}</div></div>`;
  document.getElementById("toast-container").appendChild(el);
  setTimeout(()=>{ el.style.opacity="0"; el.style.transform="translateX(20px)"; el.style.transition="all .3s";
    setTimeout(()=>el.remove(),300); }, duration);
}

// ── Router ────────────────────────────────────────────────────────────────────
window.showPage = function(id) {
  document.querySelectorAll(".page").forEach(p=>p.classList.remove("active"));
  document.querySelectorAll(".nav-link").forEach(l=>l.classList.remove("active"));
  document.getElementById(`page-${id}`)?.classList.add("active");
  document.querySelector(`.nav-link[data-page="${id}"]`)?.classList.add("active");
};

// ── Role toggle ───────────────────────────────────────────────────────────────
let currentRole = "participant";
window.setRole = function(role) {
  currentRole = role;
  document.getElementById("role-participant").classList.toggle("active", role==="participant");
  document.getElementById("role-volunteer").classList.toggle("active", role==="volunteer");
  document.getElementById("participant-fields").style.display = role==="participant" ? "block" : "none";
  document.getElementById("volunteer-fields").style.display   = role==="volunteer"   ? "block" : "none";
  document.getElementById("reg-submit").textContent = role==="participant" ? "🎟️ Register as Participant" : "🙋 Register as Volunteer";

  const panel = document.getElementById("vacancy-panel");
  if (panel) {
    panel.style.display = role === "volunteer" ? "flex" : "none";
    if (role === "volunteer") updateVacancyPanel();
  }
};

// ── Registration form submit ──────────────────────────────────────────────────
window.submitRegistration = async function(e) {
  e.preventDefault();
  const btn = document.getElementById("reg-submit");
  btn.disabled = true; btn.textContent = "Registering…";

  const name    = document.getElementById("reg-name").value;
  const email   = document.getElementById("reg-email").value;
  const phone   = document.getElementById("reg-phone").value;
  const college = document.getElementById("reg-college").value;

  try {
    if (currentRole === "participant") {
      const events = [...document.querySelectorAll("#par-events .checkbox-chip.checked")]
        .map(el=>el.dataset.value);
      if (!events.length) { toast("Select at least one session","","warning"); btn.disabled=false; btn.textContent="🎟️ Register as Participant"; return; }
      await registerParticipant({ name, email, phone, college, events });
      document.getElementById("reg-form-wrap").style.display = "none";
      document.getElementById("reg-success").style.display   = "block";
      document.getElementById("reg-success-name").textContent = name;
      document.getElementById("reg-success-detail").textContent = `You're registered for ${events.length} session(s). Check your email for confirmation!`;
      toast("Registered!","Welcome to TechFest 2026 🎉","success");
    } else {
      const skills = [...document.querySelectorAll("#vol-skills .checkbox-chip.checked")].map(el=>el.dataset.value);
      const year   = document.getElementById("vol-year").value;
      const branch = document.getElementById("vol-branch").value;
      if (!skills.length) {
        toast("Required","Please select at least one skill","warning");
        btn.disabled=false; btn.textContent="🙋 Register as Volunteer"; return;
      }
      const res = await registerVolunteer({ name, email, phone, college, year, branch, skills });
      document.getElementById("reg-form-wrap").style.display = "none";
      document.getElementById("reg-success").style.display   = "block";
      document.getElementById("reg-success-name").textContent = name;
      document.getElementById("reg-success-detail").textContent = res.assignedSession
        ? `✅ You've been assigned as ${res.assignedRole}! Check your email for your personalised briefing.`
        : `⏳ You're on the waitlist. We'll notify you by email when a slot opens.`;
      toast("Volunteer Registered!","AI is processing your assignment…","success");
    }
  } catch(err) {
    toast("Error", err.message, "error");
    btn.disabled=false;
    btn.textContent = currentRole==="participant" ? "🎟️ Register as Participant" : "🙋 Register as Volunteer";
  }
};

window.resetRegForm = function() {
  const btn = document.getElementById("reg-submit");
  if (btn) btn.disabled = false;
  
  document.getElementById("reg-form-wrap").style.display = "block";
  document.getElementById("reg-success").style.display   = "none";
  document.querySelectorAll(".checkbox-chip.checked").forEach(c=>c.classList.remove("checked"));
  document.querySelectorAll(".checkbox-chip input[type='checkbox']").forEach(i=>i.checked = false);
  document.querySelector("form")?.reset();
  setRole("participant");
};

// ── Checkbox chips ────────────────────────────────────────────────────────────
document.addEventListener("click", e=>{
  const chip = e.target.closest(".checkbox-chip");
  if (chip) chip.classList.toggle("checked");
});

// ── Nav wiring ────────────────────────────────────────────────────────────────
document.querySelectorAll(".nav-link[data-page]").forEach(l=>{
  l.addEventListener("click",()=>showPage(l.dataset.page));
});

// ── Init ──────────────────────────────────────────────────────────────────────
window.addEventListener("DOMContentLoaded", async()=>{
  initTheme();
  lucide.createIcons();

  document.getElementById("theme-toggle")?.addEventListener("click", toggleTheme);

  const loader = document.getElementById("loader");
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

  setRole("participant");
  initLiveFeed();
});

// ── Live Feed Demo ─────────────────────────────────────────────────────────────
function initLiveFeed() {
  const feed = document.getElementById("live-feed-demo");
  if (!feed) return;
  const events = [
    { text: "2 volunteers dropped from Stage Team", color: "var(--red)" },
    { text: "Replacement assigned in 3 seconds", color: "var(--green)" },
    { text: "12 briefings sent to Registration Team", color: "var(--accent)" },
    { text: "Coordinator confirmed 5 new shifts", color: "var(--green)" },
    { text: "Critical gap detected in Tech Support", color: "var(--amber)" },
    { text: "AI updated schedule for Workshop 2", color: "var(--accent2)" }
  ];
  let cur = 3;
  setInterval(() => {
    const item = events[cur % events.length];
    const div = document.createElement("div");
    div.className = "feed-item";
    div.innerHTML = `<div class="feed-dot" style="background:${item.color}"></div><div class="feed-text">${item.text}</div>`;
    feed.prepend(div);
    if (feed.children.length > 5) feed.lastElementChild.remove();
    cur++;
  }, 3500);
}

// ── Vacancy Panel logic ──────────────────────────────────────────────────────
async function updateVacancyPanel() {
  const list = document.getElementById("vacancy-list");
  if (!list) return;

  try {
    const schedule = await getMasterSchedule();
    const available = schedule.filter(s => s.coverage < s.maxVol);

    if (available.length === 0) {
      list.innerHTML = `<div class="empty-state" style="padding:1rem">
        <div style="font-size:1.5rem;margin-bottom:.5rem">🙌</div>
        <p style="font-size:.7rem">All volunteer slots are currently filled. You'll be added to the waitlist!</p>
      </div>`;
      return;
    }

    list.innerHTML = available.map(s => {
      const left = s.maxVol - s.coverage;
      const skills = s.requiredSkills || ["General Support"];
      const icon = s.id === "ses-001" ? "🚀" : s.id === "ses-002" ? "🤖" : s.id === "ses-003" ? "🎤" : "⚡";
      
      return `
        <div class="vacancy-card">
          <h4>${icon} ${s.name}</h4>
          <span class="v-time">${s.time} @ ${s.venue}</span>
          <div class="v-slots">
            <div class="status-dot" style="background:${left === 1 ? 'var(--amber)' : 'var(--green)'}"></div>
            <span style="color:${left === 1 ? 'var(--amber)' : 'var(--green)'}">${left} slot${left>1?'s':''} available</span>
          </div>
          <div class="vacancy-skills">
            ${skills.map(sk => `<span class="v-skill">${sk}</span>`).join('')}
          </div>
        </div>
      `;
    }).join('');
  } catch (e) {
    console.error("Vacancy update error:", e);
    list.innerHTML = `<p style="font-size:.7rem;color:var(--red)">Failed to load live data.</p>`;
  }
}
