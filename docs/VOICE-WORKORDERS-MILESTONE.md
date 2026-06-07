# Voice Work Orders — Milestone Report

## 1. What was built

This phase lets a mechanic or service advisor speak a note and have the system
draft a work order from it, which a human then reviews and confirms before
anything is saved. It is the same "airlock" pattern the OCR, plate-recognition,
and attendance-consistency work already established, applied to spoken language:
an untrusted input is interpreted by a model, the messy result is shown to a
person for review, and the irreversible act — here, creating or updating a work
order — happens only on confirmation and only through the existing work-order
workflow.

The new pieces are four, mirroring the earlier recognition phases. In the shared
core, a tested, dependency-free `voice-workorder` module turns whatever the model
extracted from a transcript into a validated, scored draft: it detects whether
the words describe a new job or work on an existing one (in English and
Slovenian), normalizes a spoken plate into canonical form, scores how complete
the draft is and names exactly what is missing, and shapes work performed and
recommendations into suggested lines. In the backend, the AI gateway gained a
speech-to-text `transcribe` seam (with a deterministic fixture), while field
extraction reuses the existing `complete` call with a work-order schema — keeping
speech-to-text and language-understanding cleanly separate as the spec lists
them. A voice service orchestrates transcribe → extract → assemble → resolve
customer and vehicle → detect open jobs, and exposes two human-confirmed actions
that delegate to the existing work-order create and addLine workflow. A migration
records each draft. In the frontend, a mobile-first record-and-review screen
captures audio, shows the transcript and the editable draft, lets the human pick
create-versus-update, and confirms.

## 2. Voice architecture

The pipeline has two model-driven stages and one deterministic stage, and the
separation is deliberate. The first model stage is speech-to-text: the gateway's
new `transcribe` seam gets the uploaded audio's bytes to a model and returns
text, under the same EU-residency guard and provenance logging as every other AI
call, with the audio treated as personal data because a spoken note can name
people, plates, and places. The second model stage is extraction: the transcript
is sent back through the gateway's `complete` call with a voice work-order schema,
which asks the model to pull out the customer, vehicle, complaint, work performed,
labour notes, recommendations, follow-ups, and odometer — explicitly instructed
not to invent prices or hours. Both stages are logged as separate interactions,
so the audit trail records the recording, the transcript, and the extraction
independently.

The deterministic stage is the tested shared core, and it is what makes the messy
model output safe to act on. It decides intent conservatively: when create and
update cues are balanced — as they are in a note that mentions both a complaint
and work already done — it returns "unclear" and defers the choice to the human
rather than guessing and risking an update to the wrong record. It normalizes a
spoken plate only when the hint actually looks like a plate, leaving a
description like "the white MAN" as a hint rather than a false plate. And it
scores completeness so a thin draft is flagged for review rather than presented
as ready. Saving never bypasses anything: confirm-create calls the existing
work-order create and then appends the spoken lines through the existing addLine
workflow, and confirm-update appends to an existing job the same way.

## 3. Human review workflow

The advisor taps Voice, records a note, and the screen transcribes and extracts
it. The review screen then shows the transcript verbatim, a clear warning when
the draft needs attention (with the missing fields named), and a create-versus-
update choice that defaults to the detected intent but is always the human's to
set — with the existing open jobs for the resolved vehicle offered as update
targets. The complaint and work-performed text are editable, the resolved
customer and vehicle are shown (with a chooser when several customers match), and
the lines that will be added are previewed with a plain note that the human
prices them afterwards. Follow-ups are shown for information but are not saved as
billable lines, because they are future actions rather than work done. Nothing is
saved until the confirm tap, and every step — drafting, creating, updating — is
written to the hash-chain audit.

## 4. Remaining risks

The standing environment caveat holds and is the most important to state plainly.
The shared logic and the end-to-end pipeline are proven by execution — 210 shared
tests and a 65-check dry run that takes the fixture transcript through the real
intent detection, normalization, and draft assembly — but the NestJS services and
the React screen are real production source verified by parse-checking and by
import and route cross-checks, not by execution against a live model, database,
or browser. The genuine final gate is deploying an instance, applying migration
0014, and walking the flow with a real microphone.

Three substantive risks deserve naming. The real EU-resident speech-to-text and
extraction models are not yet wired, so a deterministic fixture stands in; the
whole flow is exercisable offline and the airlock makes the fixture safe, but
real-world transcription accuracy on workshop noise, accents, and Slovenian
technical vocabulary is unmeasured. Intent detection and entity resolution are
heuristic and will sometimes be wrong, which is exactly why the human-confirm step
is mandatory and why "unclear" defers rather than guesses. And browser audio
capture via MediaRecorder varies across devices, so the screen offers a file-
upload fallback, but real device coverage is untested here.

## 5. Updated repository package

The repository now carries the voice phase end to end: the shared
`voice-workorder` module and its tests, the gateway `transcribe` seam and fixture,
the voice service, controller, and module registered in the application root,
migration 0014, the API client methods, the advisor voice screen with a command-
bar link, and the demo handlers. The full verification gate passes on every layer.

## 6. Voice readiness assessment

Against the seven success criteria, the phase meets them at the level this
environment can prove. The user records voice; speech is converted to text;
work-order information is extracted; a draft work order is created for review; the
user reviews and confirms; the work order is saved through the existing workflow
(create plus addLine, never a bypass); and demo mode supports the complete
workflow on a phone. The system extracts every requested field — customer,
vehicle, complaint, work performed, labour notes, recommendations, and follow-ups
— and the pipeline is proven end to end by execution against the fixture. The one
true blocker before real-world use is configuring real EU-resident speech-to-text
and extraction models behind the gateway's already-wired seams; until then the
airlock, the transcription and extraction seams, the draft logic, and the review
workflow are complete and correct, but transcription accuracy on real audio is
unmeasured.

No Vehicle Rental or AI Workshop Manager work was begun; this phase stayed focused
entirely on Voice Work Orders.
