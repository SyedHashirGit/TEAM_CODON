import {
  fb, seedDatabase, registerParticipant, registerVolunteer
} from './backend.js';

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
      toast("Registered!","Welcome to TechFest 2025 🎉","success");
    } else {
      const skills = [...document.querySelectorAll("#vol-skills .checkbox-chip.checked")].map(el=>el.dataset.value);
      const availability = [...document.querySelectorAll("#vol-avail .checkbox-chip.checked")].map(el=>el.dataset.value);
      const year   = document.getElementById("vol-year").value;
      const branch = document.getElementById("vol-branch").value;
      if (!skills.length || !availability.length) {
        toast("Required","Please select at least one skill and one availability slot","warning");
        btn.disabled=false; btn.textContent="🙋 Register as Volunteer"; return;
      }
      const res = await registerVolunteer({ name, email, phone, college, year, branch, skills, availability });
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
  document.getElementById("reg-form-wrap").style.display = "block";
  document.getElementById("reg-success").style.display   = "none";
  document.querySelectorAll(".checkbox-chip.checked").forEach(c=>c.classList.remove("checked"));
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
});
