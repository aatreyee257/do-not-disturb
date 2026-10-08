const $ = (id) => document.getElementById(id);
const send = (msg) => chrome.runtime.sendMessage(msg);

const PHRASES = [
  "I am choosing distraction over my goals right now",
  "this can wait until my session is over and I know it",
  "future me will be annoyed that I quit this session early"
];

let minutes = 25;
let tick = null;

async function render() {
  const { sites = [], session, stats = { sessions: 0, minutes: 0, blocked: 0 } } =
    await chrome.storage.local.get(["sites", "session", "stats"]);
  const active = !!session && session.endsAt > Date.now();

  $("idle").classList.toggle("hidden", active);
  $("active").classList.toggle("hidden", !active);
  $("lockNote").classList.toggle("hidden", !active);
  $("status").textContent = active ? "focusing" : "idle";
  $("status").style.color = active ? "var(--accent)" : "";

  $("siteList").innerHTML = "";
  for (const site of sites) {
    const li = document.createElement("li");
    li.innerHTML = `<span class="mono"></span>`;
    li.firstChild.textContent = site;
    if (!active) {
      const b = document.createElement("button");
      b.textContent = "remove";
      b.onclick = () => send({ type: "setSites", sites: sites.filter(s => s !== site) }).then(render);
      li.appendChild(b);
    }
    $("siteList").appendChild(li);
  }

  $("sSessions").textContent = stats.sessions;
  $("sMinutes").textContent = stats.minutes;
  $("sBlocked").textContent = stats.blocked;

  clearInterval(tick);
  if (active) {
    const update = () => {
      const left = Math.max(0, session.endsAt - Date.now());
      const h = Math.floor(left / 3.6e6), m = Math.floor(left / 6e4) % 60, s = Math.floor(left / 1000) % 60;
      $("timer").textContent = (h ? h + ":" : "") + String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
      if (left === 0) { clearInterval(tick); setTimeout(render, 1200); }
    };
    update();
    tick = setInterval(update, 1000);
  }
}

// Presets
$("presets").addEventListener("click", (e) => {
  const b = e.target.closest("button"); if (!b) return;
  [...$("presets").children].forEach(x => x.classList.toggle("sel", x === b));
  const custom = b.dataset.m === "custom";
  $("customRow").classList.toggle("hidden", !custom);
  if (custom) { $("customMin").focus(); minutes = Number($("customMin").value) || 0; }
  else minutes = Number(b.dataset.m);
  updateStartLabel();
});
$("customMin").addEventListener("input", () => { minutes = Number($("customMin").value) || 0; updateStartLabel(); });
function updateStartLabel() {
  const valid = minutes >= 1 && minutes <= 600;
  $("startBtn").disabled = !valid;
  $("startBtn").textContent = valid ? `Start focus · ${minutes} min` : "Enter 1–600 minutes";
}

$("startBtn").onclick = async () => { await send({ type: "start", minutes }); render(); };

// Quitting early: deliberate friction, no paste
$("quitBtn").onclick = () => {
  $("phrase").textContent = PHRASES[Math.floor(Math.random() * PHRASES.length)];
  $("quitBox").classList.remove("hidden");
  $("quitBtn").classList.add("hidden");
  $("phraseInput").value = "";
  $("phraseInput").focus();
};
$("phraseInput").addEventListener("paste", (e) => e.preventDefault());
$("phraseInput").addEventListener("drop", (e) => e.preventDefault());
$("phraseInput").addEventListener("input", () => {
  $("confirmQuit").disabled = $("phraseInput").value.trim() !== $("phrase").textContent;
});
$("confirmQuit").onclick = async () => {
  await send({ type: "stop" });
  $("quitBox").classList.add("hidden");
  $("quitBtn").classList.remove("hidden");
  render();
};

// Sites
async function addSite() {
  const raw = $("siteInput").value;
  if (!raw.trim()) return;
  const { sites = [] } = await chrome.storage.local.get("sites");
  const res = await send({ type: "setSites", sites: [...sites, raw] });
  if (res.sites.length === sites.length) {
    $("siteInput").style.outline = "2px solid #e03131";
    setTimeout(() => $("siteInput").style.outline = "", 800);
    return;
  }
  $("siteInput").value = "";
  render();
}
$("addBtn").onclick = addSite;
$("siteInput").addEventListener("keydown", (e) => { if (e.key === "Enter") addSite(); });

render();
