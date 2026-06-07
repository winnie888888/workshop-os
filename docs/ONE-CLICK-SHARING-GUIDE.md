# One-Click Sharing Guide — Workshop OS Demo

*How the demo's sharing works, for the person presenting it and for anyone who
wants to understand the mechanism behind the "tap one link" objective.*

---

## 1. The idea

The whole demo strategy rests on a frictionless hand-off: the demo should travel
from one phone to the next in a single tap, on the messaging apps A-SPRINT's
audience actually uses. The Share card on the landing page is what makes that
happen. Whoever has the demo open can pass it on without typing or copying anything.

## 2. What the Share card offers

When the demo is open (the card appears on the landing launcher in demo mode), the
presenter sees five ways to share, each one tap:

Viber opens a forward composer with a friendly pre-filled message and the live demo
link, because Viber is the dominant messenger in the region and the channel the
objective names explicitly. WhatsApp does the same through its web share link, for
recipients who prefer it. Email opens the device's mail composer with a subject and
body already filled in. Where the device offers it, a single "Share…" button invokes
the phone's native share sheet, which fans the link out to every installed app at
once — the fastest path on a modern phone. And a "Copy link" button puts the URL on
the clipboard for pasting anywhere, with the link also shown in full as a fallback.

## 3. Why it always shares the right link

The card reads the live address from the browser at runtime rather than from a
hardcoded value, so it shares whatever URL the demo is actually deployed at. Rename
the Vercel project, add a custom domain, or move the deployment, and the Share card
automatically carries the new address with no change needed.

## 4. The recipient's experience

The person who receives the message taps the link and lands directly on the
signed-in A-SPRINT launcher — no login, no install, no setup. They can explore every
interface immediately, and if they want to pass it on, the same Share card is right
there for them. That is the loop the objective describes, working in both
directions.

## 5. A note on channels versus the email/SMS adapters

The Share card uses the device's own Viber, WhatsApp, and email apps, which always
work because they live on the phone. This is deliberately different from the
system's outbound email/SMS notification adapters (used for invoices and reminders),
which are still stubs awaiting implementation. Sharing the demo and notifying a
customer are two different mechanisms; the first is ready now, the second is on the
integration roadmap.

## 6. For in-person sharing

Pair the Share card with a QR code of the public URL (see the Public Demo URL Guide)
so that in a room or at the A-SPRINT counter, a person can point their camera and be
in the demo instantly — the same one-tap idea, in the physical world.
