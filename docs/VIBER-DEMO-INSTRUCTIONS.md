# Sharing the demo through Viber

Once the demo is deployed (see `DEPLOY-DEMO-VERCEL.md`) you have one HTTPS link.
Here is the whole sharing flow, written for the exact scenario you described.

## Your steps

1. Copy the Vercel demo link (e.g. `https://workshop-os-xxxx.vercel.app`).
2. Open Viber and the chat with your brother.
3. Paste the link into a message and send it. Viber shows it as a tappable link
   and usually adds a small preview card — that is normal and fine.

## His steps (no setup, no installation)

1. He taps the link in Viber.
2. It opens in his phone's browser — Chrome on Android, Safari on iPhone. Viber
   may open its own in-app browser first; that works too, and on iPhone he can
   tap the "open in Safari" icon if he wants the full-screen install option.
3. The app loads straight into the A-SPRINT workshop screens. There is no login
   and no sign-up — the demo signs itself in automatically.
4. He can explore freely: the advisor's "Today" board, a work order with priced
   labour and parts, the parts picker, and the owner's profitability view. The
   data is realistic A-SPRINT demo data (a Slovenian and a Croatian haulier, a
   MAN truck brake job). Anything he changes is local to his phone and resets when
   he reloads — he cannot break anything.

## Optional: use it like an installed app

If he wants it to feel like a real app rather than a web page:

- **iPhone (Safari):** tap the Share button (the square with an up-arrow), then
  "Add to Home Screen", then "Add". A "Workshop OS" icon appears on his home
  screen; opening it launches full-screen with no Safari bars.
- **Android (Chrome):** tap the ⋮ menu, then "Add to Home screen" (or "Install
  app" if offered), then confirm. Same result — a home-screen icon that opens
  full-screen.

## Good to know

- It works on any reasonably recent Android phone or iPhone; nothing to install
  from an app store.
- It needs an internet connection to load the first time (it is a hosted web app),
  but once it is open it does not call any server — so it stays responsive even on
  a weak connection.
- The link is public, so treat it as a demo, not as confidential data. The demo
  contains only invented sample data, no real customer or financial records.
- If you ever want to take the demo down, pausing or deleting the Vercel project
  makes the link stop working immediately.
