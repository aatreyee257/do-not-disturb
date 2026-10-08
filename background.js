// Don't Get Distracted — service worker
// State lives in chrome.storage.local because MV3 service workers are killed when idle.
// Blocking is done by declarativeNetRequest rules, so it keeps working even while the worker sleeps.

const DEFAULT_SITES = [
  "youtube.com", "instagram.com", "facebook.com", "x.com", "twitter.com",
  "reddit.com", "tiktok.com", "netflix.com"
];
const ALARM = "dgd-session-end";

chrome.runtime.onInstalled.addListener(async () => {
  const { sites } = await chrome.storage.local.get("sites");
  if (!sites) await chrome.storage.local.set({ sites: DEFAULT_SITES, stats: { blocked: 0, sessions: 0, minutes: 0 } });
  await reconcile();
});

chrome.runtime.onStartup.addListener(reconcile);

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === ALARM) await endSession(true);
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  (async () => {
    switch (msg.type) {
      case "start":    sendResponse(await startSession(msg.minutes)); break;
      case "stop":     sendResponse(await endSession(false)); break;
      case "setSites": sendResponse(await setSites(msg.sites)); break;
      case "blockedHit": {
        const { stats } = await chrome.storage.local.get("stats");
        stats.blocked++;
        await chrome.storage.local.set({ stats });
        sendResponse(stats);
        break;
      }
      default: sendResponse({ error: "unknown message" });
    }
  })();
  return true; // keep channel open for async response
});

async function startSession(minutes) {
  minutes = Math.max(1, Math.min(600, Math.round(minutes)));
  const endsAt = Date.now() + minutes * 60_000;
  await chrome.storage.local.set({ session: { endsAt, minutes, startedAt: Date.now() } });
  await applyRules();
  await chrome.alarms.create(ALARM, { when: endsAt });
  await setBadge(true);
  return { ok: true, endsAt };
}

async function endSession(completed) {
  const { session, stats } = await chrome.storage.local.get(["session", "stats"]);
  if (session && completed) {
    stats.sessions++;
    stats.minutes += session.minutes;
    await chrome.storage.local.set({ stats });
  }
  await chrome.storage.local.remove("session");
  await chrome.alarms.clear(ALARM);
  await clearRules();
  await setBadge(false);
  return { ok: true };
}

async function setSites(sites) {
  const clean = [...new Set(sites.map(normalise).filter(Boolean))];
  await chrome.storage.local.set({ sites: clean });
  const { session } = await chrome.storage.local.get("session");
  if (session) await applyRules(); // live-update an active session (additions only matter; popup blocks removals)
  return { ok: true, sites: clean };
}

function normalise(input) {
  let s = String(input).trim().toLowerCase();
  if (!s) return null;
  s = s.replace(/^[a-z]+:\/\//, "").replace(/^www\./, "").split(/[\/?#:]/)[0];
  return /^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(s) ? s : null;
}

async function applyRules() {
  const { sites = [] } = await chrome.storage.local.get("sites");
  const existing = await chrome.declarativeNetRequest.getDynamicRules();
  const addRules = sites.map((domain, i) => ({
    id: i + 1,
    priority: 1,
    action: { type: "redirect", redirect: { extensionPath: `/blocked.html?site=${encodeURIComponent(domain)}` } },
    // requestDomains also matches subdomains, so "youtube.com" covers m.youtube.com, www.youtube.com, etc.
    condition: { requestDomains: [domain], resourceTypes: ["main_frame", "sub_frame"] }
  }));
  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: existing.map(r => r.id),
    addRules
  });
}

async function clearRules() {
  const existing = await chrome.declarativeNetRequest.getDynamicRules();
  await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: existing.map(r => r.id) });
}

// If Chrome was closed past the end time, the alarm may have been missed; fix state on startup.
async function reconcile() {
  const { session } = await chrome.storage.local.get("session");
  if (!session) { await clearRules(); await setBadge(false); return; }
  if (Date.now() >= session.endsAt) { await endSession(true); return; }
  await applyRules();
  await chrome.alarms.create(ALARM, { when: session.endsAt });
  await setBadge(true);
}

async function setBadge(on) {
  await chrome.action.setBadgeText({ text: on ? "ON" : "" });
  await chrome.action.setBadgeBackgroundColor({ color: "#d9480f" });
}
