# IGY6 — I Got Your Six

A sleek, minimalist MVP web app for an anonymous neighborhood watch network.

## What this app does

- Creates/join **anonymous neighborhood watch areas**.
- Uses **GPS** (or manual map pin) to set incident location.
- Lets neighbors push alert types for:
  - Fire
  - Burglary / Break-in
  - Medical
  - General emergency
- Displays a live local **map with incident pinpoints**.
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
- This build is intended as a foundation for future upgrades (secure auth, real-time network sync, dispatcher integrations, and verified emergency routing).
