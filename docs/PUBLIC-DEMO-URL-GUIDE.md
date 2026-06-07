# Public Demo URL Preparation Guide — Workshop OS

*A guide to turning the raw Vercel deployment into a clean, memorable, trustworthy
public link that a stranger can open with confidence from a Viber message.*

---

## 1. Why the URL itself matters

The objective is that someone receives a link and taps it without hesitation. A
long, random URL invites hesitation; a short, branded one invites a tap. So a small
amount of care on the URL pays off directly in how readily people open the demo.

## 2. From default URL to a clean one

The Vercel deployment gives a default address such as
`https://workshop-os-demo.vercel.app`. There are three levels of polish, in
increasing order:

The simplest is to rename the Vercel project so the default subdomain reads
cleanly — for example `asprint-workshop-os.vercel.app`. This costs nothing and is
usually enough for a pilot and a presentation.

The next level is a Vercel alias: assign a memorable alias to a specific deployment
so the link is stable even as you redeploy, and so a frozen presentation version has
its own address.

The most polished is a custom domain — for example `demo.a-sprint.si` or a
dedicated domain — pointed at the Vercel deployment via DNS. This makes the link
unmistakably A-SPRINT's and is worth doing before any external commercial
presentation. Vercel provisions the TLS certificate automatically.

## 3. Make the link safe to open and to share

Because the demo holds no data and connects to nothing, it is inherently safe to
share widely; there is no login to phish and no record to expose. Two touches make
that safety visible. First, confirm HTTPS is active (Vercel does this by default),
so the padlock reassures the recipient. Second, set a clear page title and, if
desired, an Open Graph preview image so that when the link is pasted into Viber or
WhatsApp it unfurls with the Workshop OS name and logo rather than a bare URL — the
manifest and metadata already supply the title and icons for this.

## 4. A QR code for in-person sharing

For the presentation and for the workshop itself, generate a QR code that encodes
the public URL. A person can point their phone camera at it and be in the demo
instantly — the physical-world equivalent of the one-tap link. Any QR generator
works; print it on a card for the A-SPRINT counter during the pilot.

## 5. Versioning the public link

Keep two links if it helps: a *latest* link that always points at the newest deploy
(for the team), and a *frozen* alias pointing at a tagged, known-good deployment
(for presentations), so a mid-presentation redeploy can never change what a client
sees.

## 6. Checklist

The public URL is ready when: the address is clean (renamed subdomain, alias, or
custom domain), HTTPS is active, the link unfurls with the Workshop OS title and
logo when pasted into a messenger, a QR code exists for in-person use, and opening
the link on a fresh phone lands directly on the signed-in launcher with no setup.
