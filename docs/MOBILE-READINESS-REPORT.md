# Mobile Readiness Report — Workshop OS

*This report verifies the mechanisms that make the demo work as a mobile,
installable, full-screen experience, and is honest about the one check that can
only be completed on physical devices.*

---

## 1. Cross-platform support (Android, iPhone, desktop)

The demo is a responsive Next.js web application, so it runs in any modern browser
on Android, iOS, and desktop without platform-specific builds. The same URL serves
all three; there is no app-store step. This is what makes the "tap one link and
you're in" objective achievable across the audience's devices.

## 2. Responsiveness

The interface is built mobile-first. Layouts use a constrained reading column
(`max-w-2xl`) that fills a phone screen and centres on a desktop, grids that collapse
to a single column on narrow screens, and the workshop-oriented design tokens
(large type in Archivo/IBM Plex, generous spacing). Touch targets use the
project's `tool-tap` and `rounded-tool` conventions sized for gloved workshop hands,
which also makes them comfortable on any phone.

## 3. Installability and full-screen experience

The mechanisms for "Add to Home Screen", PWA installation, and a full-screen launch
are all configured and verified in the manifest and the root layout's viewport:

The web manifest declares `display: standalone`, which launches the installed app
without browser chrome so it looks and feels like a native app, locked to
`portrait` orientation, with a `start_url` of `/` and the brand theme and background
colours (`#14181d`). It declares the icons Android needs at 192 and 512 pixels,
including a maskable variant so Android can crop the icon to the device's shape
without clipping. The root layout's viewport sets device width, `maximumScale: 1`,
and `viewportFit: cover`, so the app extends edge-to-edge under the notch on modern
phones and presents a true full-screen surface. The iOS home-screen icon and title
are declared in the layout metadata, so adding to the home screen on an iPhone
yields a branded icon and a chrome-free launch.

Together these mean: on Android the browser will offer "Install app" and the result
launches standalone; on iOS "Add to Home Screen" produces a branded, full-screen
icon; on desktop the browser offers an install affordance that opens the app in its
own window.

## 4. One-click sharing on mobile

The new Share card uses the platforms a phone already has. Viber and WhatsApp open
via their deep links with a pre-filled message and the live demo URL; email opens
the device mail composer; and where the device exposes the native share sheet, a
single "Share…" button fans the link out to every installed app at once. This is the
mechanism that turns "I have the demo open" into "the next person has it open too"
in one tap.

## 5. The one offline-unverifiable check

Everything above is verified at the configuration and code level, but how the app
actually renders and installs can only be confirmed on physical devices. The
recommended pass, to be done once before the presentation: open the deployed demo
URL on a real Android phone (install it, confirm the standalone launch and the
icon), on a real iPhone (Add to Home Screen, confirm the full-screen launch and the
notch handling), and on a desktop browser (confirm the install affordance and the
responsive layout), and exercise one full flow on each (for example a work order
through to an invoice). This is the mobile equivalent of the staging runtime gate:
quick, and the only thing that converts "configured correctly" into "seen working
on the device".

## 6. Verdict

**Mobile readiness is in place at the mechanism level and ready for a real-device
confirmation pass.** The app is responsive, installable, and full-screen by
configuration, and the sharing flow is built for phones. The single remaining step
is the physical-device walk in Section 5, which needs no code and takes minutes.
