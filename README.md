# IGY6 — I Got Your Six

A sleek, minimalist MVP web app for anonymous neighborhood watch programs.

## What this app does

- Creates and switches between separate **watch programs / neighborhood areas**.
- Keeps users **anonymous by default**; they can optionally share a name only when sending a help alert.
- Uses **GPS** (or manual map pin) to set incident location.
- Lets neighbors push alert types with one-tap alert buttons for:
  - 🔥 Fire
  - 🚨 Burglary / Break-in
  - 🩺 Medical
  - ⚠️ General emergency
- Displays a local **map with incident pinpoints** and a live area feed.
- Shows a **red flashing update banner** whenever a new local alert is posted.
- Shows **active user count** in the current program in the top-right badge.
- Includes direct emergency actions:
  - `tel:911`
  - `sms:911` (where carrier/device supports it)
  - Optional critical alert flow that prompts immediate 911 call.

## Run locally

Because this is a static web app, you can run it with any static server:

```bash
python3 -m http.server 4173
```

Then open:

- <http://localhost:4173>

## Notes

- Data is currently stored in browser `localStorage` for MVP/demo behavior.
- Active user count is based on recent local presence heartbeats in storage for the selected program.
- This build is intended as a foundation for future upgrades (secure auth, real-time network sync, dispatcher integrations, and verified emergency routing).
