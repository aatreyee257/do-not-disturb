const params = new URLSearchParams(location.search);
const site = params.get("site") || "this site";
document.getElementById("site").innerHTML = `<span class="site"></span> is blocked`;
document.querySelector(".site").textContent = site;

chrome.runtime.sendMessage({ type: "blockedHit" });

async function init() {
  const { session, parked = "" } = await chrome.storage.local.get(["session", "parked"]);
  const note = document.getElementById("note");
  note.value = parked;
  let t;
  note.addEventListener("input", () => {
    clearTimeout(t);
    t = setTimeout(async () => {
      await chrome.storage.local.set({ parked: note.value });
      document.getElementById("saved").textContent = "Saved.";
    }, 400);
  });

  if (!session) { document.getElementById("left").textContent = "done"; return; }
  const update = () => {
    const left = Math.max(0, session.endsAt - Date.now());
    const h = Math.floor(left / 3.6e6), m = Math.floor(left / 6e4) % 60, s = Math.floor(left / 1000) % 60;
    document.getElementById("left").textContent = (h ? h + ":" : "") + String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
    if (left === 0) {
      document.getElementById("left").textContent = "done";
      document.querySelector("h2").textContent = "Session over. Go ahead.";
      clearInterval(iv);
    }
  };
  update();
  const iv = setInterval(update, 1000);
}
init();
