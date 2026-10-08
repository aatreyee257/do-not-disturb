# Don't Get Distracted

A tiny Chrome extension that blocks distracting sites while you're supposed to be working, and makes quitting early just annoying enough that you don't.

## What it does

- **Focus sessions.** Pick 25, 50 or 90 minutes (or any length up to 10 hours) and hit start.
- **Blocking.** Any site on your list redirects to a "Not right now." page with a countdown until it unlocks.
- **A parking spot for the urge.** The blocked page has a box to write down whatever you were about to look up, so you can come back to it later instead of now.
- **Quitting costs effort.** To end a session early you have to type a sentence like *"I am choosing distraction over my goals right now"* by hand. Pasting is disabled. Most of the time the urge is gone before you finish typing.
- **No take-backs.** During a session you can add sites to the list, but you can't remove them.
- **Little stats.** Completed sessions, total focus minutes, and how many times it caught you.


## Install

It isn't on the Chrome Web Store, so you load it manually. It takes about a minute.

1. Download this repo (green **Code** button → **Download ZIP**) and unzip it.
2. Open `chrome://extensions` in Chrome.
3. Turn on **Developer mode** (top right).
4. Click **Load unpacked** and select the unzipped folder, the one with `manifest.json` directly inside it.
5. Pin it from the puzzle-piece icon in the toolbar, then click it to start a session.

Don't delete or move the folder afterwards. Chrome loads the extension from there.

**Default blocklist:** youtube.com, instagram.com, facebook.com, x.com, twitter.com, reddit.com, tiktok.com, netflix.com. Edit it from the popup when no session is running. Subdomains are covered automatically, so `youtube.com` also blocks `m.youtube.com`.

## How it works

Built on Chrome's Manifest V3.

- **Blocking** uses `declarativeNetRequest` redirect rules. Chrome stops the request before the page loads, so you never get a flash of the feed. The rules keep working even while the extension's background script is asleep.
- **The timer** uses `chrome.alarms`, not `setTimeout`. MV3 background service workers are shut down after about 30 seconds idle, so a 50-minute `setTimeout` would silently never fire.
- **State** (blocklist, active session, stats) lives in `chrome.storage.local`. On browser startup the extension reconciles that state, so a session that ended while Chrome was closed gets cleaned up properly.

```
manifest.json   extension config and permissions
background.js   service worker: sessions, blocking rules, alarms
popup.html/js   the toolbar popup
blocked.html/js the "Not right now." page
style.css       shared styles, with light and dark mode
```

## Honest limitations

This is friction, not a prison. You can always disable the extension at `chrome://extensions`, and Chrome doesn't let any extension prevent that. It also doesn't cover Incognito unless you allow it on the extension's details page, or other browsers. If you need a hard lock, use OS-level blocking.

## Ideas for later

- Scheduled blocking (e.g. weekdays 9 to 5)
- A weekly focus chart
- A plant that grows with every completed session
