/*
 * WHY: Authored six-part procedures for the sticker-sheet kiss-cut tracer.
 * WHAT: 16 case(s), keyed by full checklist id.
 *
 * 🛑 EVERY CASE IS AN EXPLICIT BEFORE → AFTER, because almost every defect this
 * feature can have returns HTTP 200 with plausible content. A case reading
 * "check the tracer works" would pass against the bug. The first three restate
 * the two failures that caused this feature to be built, as assertions.
 *
 * 🛑 THE FIXTURE IS /test-media/sticker-sheet-fixture.jpg AND ITS SIZE IS
 * LOAD-BEARING. It is the real 5024x3024 scan, and shrinking it was measured
 * and rejected: a 145 KB WebP traces into 237 fragments where the original
 * gives 15 (public/test-media/README.md carries the table). A case asserting a
 * part count against a shrunken fixture would fail for a reason that is not a
 * bug. Do not "optimise" it.
 *
 * 🛑 PART COUNTS ARE DELIBERATELY NOT ASSERTED AS EXACT NUMBERS. The probe
 * measured 15 at draft tier on this machine, but the count moves with tier and
 * with any tuning of the ridge thresholds — so the cases assert RELATIONS
 * ("more than one", "the same count twice", "fewer after raising the minimum")
 * which stay true across tuning. An exact number here would be a case that
 * fails every time somebody improves the detector.
 *
 * 🛑 The tracer is ADMIN-ONLY and /tools/sticker-tracer is server-gated, so the
 * buyer and guest cases assert the redirect rather than a hidden control.
 *
 * @tag domain:tester
 * @tag layer:seed
 * @tag pattern:none
 * @tag access:server-only
 * @tag consumers:seed-data/authored/index.ts
 * @tag sideEffects:none
 */

import type { AuthoredCase } from "./_types";

const ADMIN_SIGNIN = "Sign in as admin@letitrip.in / TempPass123!.";
const FIXTURE = "/test-media/sticker-sheet-fixture.jpg";

export const authored: Record<string, AuthoredCase> = {
  /* ---- the two reported failures, restated as assertions ---------------- */

  "checklist-tools-sticker-tracer-enclosed-region-opaque": {
    roles: ["admin"],
    startPage: "/tools/sticker-tracer",
    steps: [
      ADMIN_SIGNIN,
      `Download ${FIXTURE} and choose it with "Choose a scan".`,
      "Wait for the outlines to draw over the preview.",
      "Find a sticker that contains an enclosed area the same colour as the paper around the sheet — on the Driger G sheet the lighter interior panels.",
      "Zoom the browser to 200% and look at whether that interior area is covered by the outline or cut out of it.",
    ],
    expectedBehaviour:
      "Opacity is decided by REACHABILITY from the sheet border, not by colour. The flood fills inward from the edge and a sticker is whatever the flood could not reach — so an enclosed region is inside the outline no matter what colour it is.",
    expectedUiState:
      "The magenta outline runs around the sticker's silhouette only. It does not loop around interior light-coloured areas, and no interior region is excluded from the shape.",
    endResult:
      "BEFORE: the prior Python attempt thresholded colour, so a region matching the background was made transparent even inside a sticker. AFTER: interior regions stay part of the sticker. Nothing is persisted — this is the in-browser tuner.",
  },

  "checklist-tools-sticker-tracer-white-on-white-edge": {
    roles: ["admin"],
    startPage: "/tools/sticker-tracer",
    steps: [
      ADMIN_SIGNIN,
      `Choose ${FIXTURE}.`,
      "Find the winder sticker — the one whose top edge is near-white against the near-white paper.",
      "Zoom to 200% and check whether that top edge carries an outline.",
      "Read the Result card's part count.",
    ],
    expectedBehaviour:
      "The cut line is found from the EMBOSS RIDGE, which the plan measured at 10-20x above noise precisely where colour carries none. No per-sticker parameter is involved.",
    expectedUiState:
      "The white top edge has a magenta outline following it. The Result card shows more than one part.",
    endResult:
      "BEFORE: a colour threshold ate that edge, and the old script needed a hand-authored --cap flag naming one sticker's coordinates on one sheet. AFTER: it is found with the default parameters and no per-sticker tuning.",
  },

  "checklist-tools-sticker-tracer-background-model-named": {
    roles: ["admin"],
    startPage: "/tools/sticker-tracer",
    steps: [
      ADMIN_SIGNIN,
      `Choose ${FIXTURE}.`,
      "Read the line under the Result heading that begins 'background:'.",
      "Change 'Paper tolerance' from its default to 60 and watch the part count.",
      "Set it back to its default.",
    ],
    expectedBehaviour:
      "The tool states which of the two segmentation models ran. Paper floods inward from the sheet edge; art partitions on cut lines because there is no background to flood. Paper tolerance only affects the paper model, which is why knowing which ran is the difference between a parameter that does nothing and one that is simply set wrong.",
    expectedUiState:
      "The Result card reads 'background: paper' for this scan. Changing Paper tolerance changes the part count.",
    endResult:
      "BEFORE: there was no way to tell which model ran, so an operator adjusting paper tolerance on an art sheet saw no effect and no explanation. AFTER: the model is named on screen.",
  },

  /* ---- the mandatory name ---------------------------------------------- */

  "checklist-tools-sticker-tracer-name-required": {
    roles: ["admin"],
    startPage: "/tools/sticker-tracer",
    steps: [
      ADMIN_SIGNIN,
      `Choose ${FIXTURE} and scroll to "Commit this as a run".`,
      "Leave 'Name this sheet' EMPTY and try to press 'Upload and run'.",
      "Type a single space into the name and try again.",
      "Type 'QA tracer run 1' and press 'Upload and run'.",
    ],
    inputs: { name: "QA tracer run 1" },
    expectedBehaviour:
      "A name is mandatory and is enforced in three places — the disabled button, the route's schema, and requireName in the action. No sheet document and no Storage object is created while the name is empty.",
    expectedUiState:
      "'Upload and run' is disabled with the name empty and with a single space. It enables once real text is entered, then reads 'Uploading and starting…'.",
    expectedData: { sheetsCreatedWhileNameEmpty: 0 },
    endResult:
      "BEFORE: nothing stopped an unnamed attempt, and the whole point of keeping every run is being able to tell them apart later. AFTER: a run cannot exist without a name. The named run persists and appears under Attempts after a reload.",
  },

  /* ---- watermark + originals ------------------------------------------- */

  "checklist-tools-sticker-tracer-no-watermark-on-original": {
    roles: ["admin"],
    startPage: "/tools/sticker-tracer",
    steps: [
      ADMIN_SIGNIN,
      "Open a sheet whose run has finished and been accepted.",
      "In Attempts, press 'Preview' on the accepted run — it opens a new tab.",
      "Look at the opened image for a watermark, and copy its URL.",
      "Check the URL's host: it should be a storage.googleapis.com signed link, NOT a /media/ path on this site.",
    ],
    expectedBehaviour:
      "Tracer artifacts live under private/sticker-sheets/ and are served by 5-minute signed GCS URLs, which bypass /api/media/[...slug] — the proxy that always watermarks. The printable original must stay clean or the cut-out is ruined.",
    expectedUiState:
      "The opened image carries NO watermark. Its URL is on storage.googleapis.com with query parameters, not /media/<slug>.",
    endResult:
      "BEFORE: every image through the media proxy was watermarked, which would ruin a cut-out and the printed mosaic. AFTER: originals are unwatermarked and reachable only through a short-lived signed link.",
  },

  /* ---- live progress ---------------------------------------------------- */

  "checklist-tools-sticker-tracer-progress-names-stage": {
    roles: ["admin"],
    startPage: "/tools/sticker-tracer",
    steps: [
      ADMIN_SIGNIN,
      `Choose ${FIXTURE}, name the run 'QA progress', pick tier Standard and press 'Upload and run'.`,
      "Watch the card titled 'Running' without reloading.",
      "Write down two different stage names you see.",
    ],
    expectedBehaviour:
      "Progress is pushed over the run's own RTDB channel, not polled. The label names the STAGE because that is what distinguishes a halftone scan stuck in the detector from one stuck in the upload.",
    expectedUiState:
      "A 'Running' card shows text like 'ridge 22%' or 'parts 4/15' and ADVANCES. It is never a bare spinner and never only a percentage.",
    endResult:
      "BEFORE: a trace took minutes with nothing to look at. AFTER: the current stage is visible throughout. The card disappears when the run ends; the outcome persists in Attempts.",
  },

  "checklist-tools-sticker-tracer-failure-names-stage": {
    roles: ["admin"],
    startPage: "/tools/sticker-tracer",
    steps: [
      ADMIN_SIGNIN,
      "Find a sheet with a FAILED run in Attempts. If none exists, create one: commit a run with 'Minimum part area' set to 100000, which leaves nothing above the threshold.",
      "Read the failed row.",
      "Reload the page and read it again.",
    ],
    inputs: { minPartAreaMm2: 100000 },
    expectedBehaviour:
      "A failure records the stage it died in and a user-safe message, and the row survives. The requirement was 'even if we fail we know'.",
    expectedUiState:
      "The row shows a red 'failed' badge and a line beginning 'Failed at <stage>' with a readable message — never 'Something went wrong', and never a raw server error or a stack trace.",
    endResult:
      "BEFORE: a failed trace was indistinguishable from a hang. AFTER: the stage is named and the failed attempt stays in history after a reload.",
  },

  /* ---- history ---------------------------------------------------------- */

  "checklist-tools-sticker-tracer-runs-never-overwrite": {
    roles: ["admin"],
    startPage: "/tools/sticker-tracer",
    steps: [
      ADMIN_SIGNIN,
      `Choose ${FIXTURE}, name the run 'QA attempt A', tier Standard, and commit it.`,
      "Wait for it to finish.",
      "Commit a SECOND run on the same sheet named 'QA attempt B' at tier Precise.",
      "Reload the page and read the Attempts list.",
    ],
    inputs: { runA: "QA attempt A", runB: "QA attempt B" },
    expectedBehaviour:
      "A retry or a second run creates a NEW run document. Nothing overwrites an earlier attempt, which is what makes comparing tiers on one sheet possible weeks later.",
    expectedUiState:
      "Both 'QA attempt A' and 'QA attempt B' appear, newest first, each with its own tier label and its own part count. Both are still openable.",
    endResult:
      "BEFORE: there was nothing listing runs at all — the documents existed with no reader. AFTER: every attempt is listed by the name that was typed, and both survive a reload.",
  },

  "checklist-tools-sticker-tracer-accepted-differs-from-succeeded": {
    roles: ["admin"],
    startPage: "/tools/sticker-tracer",
    steps: [
      ADMIN_SIGNIN,
      "On a sheet with two successful runs, read the badges on both rows.",
      "Press 'Accept & render' on the one that is not currently accepted.",
      "Reload and read both rows again.",
    ],
    expectedBehaviour:
      "'succeeded' and 'accepted' are different facts: a run can succeed without being the sheet's current result, which is normal once three tiers have been tried. Accepting one moves the badge and starts the full-resolution render.",
    expectedUiState:
      "Both rows show a green 'succeeded' badge; exactly ONE shows 'accepted'. After accepting the other, exactly one still shows 'accepted' and it is the one just pressed.",
    expectedData: { acceptedRunsPerSheet: 1 },
    endResult:
      "BEFORE: isPromoted and activeRunId were read by the UI and written by nothing — promoteRun had zero callers. AFTER: accepting a run is a real action and the badge reflects it after a reload.",
  },

  /* ---- promote gates full-res ------------------------------------------- */

  "checklist-tools-sticker-tracer-fullres-only-after-accept": {
    roles: ["admin"],
    startPage: "/tools/sticker-tracer",
    steps: [
      ADMIN_SIGNIN,
      "Commit a fresh run and wait for it to succeed WITHOUT accepting it.",
      "Look for a 'Print & export' card on the page.",
      "Press 'Accept & render' on that run.",
      "Wait for the render, reload, and look again.",
    ],
    expectedBehaviour:
      "Full-resolution parts and the export surface exist only for an ACCEPTED run. An exploratory run costs about 1 MB; rendering full-res parts on every attempt costs roughly 500 MB a sheet — the difference between about 52 sheets inside 5 GB and about 8.",
    expectedUiState:
      "No 'Print & export' card before accepting. After accepting it appears, with a machine and page picker.",
    endResult:
      "BEFORE: nothing rendered full-resolution parts at all — the mode:\"full\" path had no caller. AFTER: they are rendered once, for the run actually chosen, and the export surface follows.",
  },

  /* ---- DPI honesty ------------------------------------------------------ */

  "checklist-tools-sticker-tracer-no-dpi-no-mm": {
    roles: ["admin"],
    startPage: "/tools/sticker-tracer",
    steps: [
      ADMIN_SIGNIN,
      "Open an accepted sheet whose scan declares no usable DPI — upload a screenshot or a web-saved image if none exists, since those declare 72 or 96.",
      "Open 'Print & export' and read what it says.",
      "Try to press 'Download cut file'.",
    ],
    expectedBehaviour:
      "Millimetres are WITHHELD when the DPI cannot be trusted. A cut file must be millimetre-true, so the export refuses rather than inventing a scale — a fabricated millimetre on a cut file is a physical production error, not a cosmetic one.",
    expectedUiState:
      "A warning reading that the scan has no confirmed DPI and that confirming it makes the export available. The download buttons are DISABLED. No plausible-looking millimetre figure appears anywhere.",
    endResult:
      "BEFORE: nothing distinguished a real DPI from the 72 that five of nine reference scans falsely declare. AFTER: the tool says so and refuses, naming the fix.",
  },

  /* ---- export refusals before download ---------------------------------- */

  "checklist-tools-sticker-tracer-oversized-named-not-scaled": {
    roles: ["admin"],
    startPage: "/tools/sticker-tracer",
    steps: [
      ADMIN_SIGNIN,
      "Open an accepted sheet with a confirmed DPI and scroll to 'Print & export'.",
      "Set Machine to 'Cricut Joy 2 — Print Then Cut' and Page to A4.",
      "Read the warning block listing parts.",
      "Switch Machine to 'Print shop (Roland / Graphtec)' and read the same area again.",
    ],
    expectedBehaviour:
      "A part wider than the machine's cut area is NAMED before export, never scaled. The Joy 2's A4 Print-Then-Cut area is a column about 78 mm wide, and several stickers on a typical sheet exceed it. Scaling would produce a cut file that looks correct and yields stickers the wrong physical size.",
    expectedUiState:
      "Under the Cricut PTC profile, a warning lists parts BY NAME with their measured width and a reason mentioning the cut width. Under the print-shop profile that warning is gone, because it has no width limit.",
    endResult:
      "BEFORE: there was no way to learn a part was too wide except by cutting it. AFTER: the refusal is on screen before the download, and the print-shop profile is offered as the alternative.",
  },

  "checklist-tools-sticker-tracer-node-budget-reported": {
    roles: ["admin"],
    startPage: "/tools/sticker-tracer",
    steps: [
      ADMIN_SIGNIN,
      "In 'Print & export', set Machine to a Cricut profile and read the badges under the pickers.",
      "Switch to 'Print shop' and read them again.",
    ],
    expectedBehaviour:
      "Export simplification is a SEPARATE budget from the trace's. A Cricut profile re-simplifies to its node ceiling and reports the resulting deviation in millimetres; the print-shop profile has no ceiling and so does not simplify.",
    expectedUiState:
      "A node-count badge is shown. Under a Cricut profile, when simplification occurred, a line reads 'Simplified from N nodes…' and states a worst-case deviation in mm. Under the print shop no deviation is claimed.",
    endResult:
      "BEFORE: a max-tier trace could silently produce a file Design Space cannot open. AFTER: the node count and the cost of fitting it are both on screen before export.",
  },

  /* ---- retry clamp ------------------------------------------------------ */

  "checklist-tools-sticker-tracer-retry-shows-clamp": {
    roles: ["admin"],
    startPage: "/tools/sticker-tracer",
    steps: [
      ADMIN_SIGNIN,
      "In Attempts, press 'Retry from this' on any finished run.",
      "In the retry form, open 'Where it restarts' and set 'Resume from' to 'parts'.",
      "Change Tier to a different one — this changes ridge parameters, which belong to an earlier stage.",
      "Read the message that appears in that section before submitting.",
    ],
    expectedBehaviour:
      "The resume point is clamped forward to the earliest stage whose parameters changed, and the clamp is SHOWN. Without it, a run resumed from 'parts' would carry artifacts generated under different parameters than the run records, with nothing anywhere contradicting it.",
    expectedUiState:
      "A warning reading that a parameter from an earlier stage changed, so the run restarts from that stage rather than resuming from 'parts'. It names both stages.",
    endResult:
      "BEFORE: explainResume() returned that sentence and nothing rendered it. AFTER: the operator sees the clamp before submitting, and the server applies the same decision.",
  },

  /* ---- access control ---------------------------------------------------- */

  "checklist-tools-sticker-tracer-buyer-redirected": {
    roles: ["buyer"],
    startPage: "/tools/sticker-tracer",
    steps: [
      "Sign in as a normal buyer account (not admin).",
      "Navigate directly to /tools/sticker-tracer by typing the URL.",
      "Open the Tools entry in the main navigation and read its children.",
      "Visit /tools and read the cards.",
    ],
    expectedBehaviour:
      "A non-admin is refused. MEASURED on production 2026-10-19: the response is a 200 carrying an Unauthorized state, NOT a 307 — but no tracer UI is served, which is the property that matters. The nav child is filtered client-side, which is presentation only.",
    expectedUiState:
      "An unauthorized / sign-in state, not the tracer. The phrase 'Choose a scan' appears nowhere on the page. The Tools dropdown does not list 'Sticker sheet tracer'. /tools itself renders normally with its other cards.",
    endResult:
      "BEFORE/AFTER is unchanged for a buyer — this case exists to prove the gate holds. Nothing is created or persisted.",
  },

  "checklist-tools-sticker-tracer-guest-redirected": {
    roles: ["guest"],
    startPage: "/tools/sticker-tracer",
    steps: [
      "Sign out completely, or use a private window.",
      "Navigate directly to /tools/sticker-tracer.",
      "Then visit /tools.",
      "View source on /tools/sticker-tracer's response and search for 'Choose a scan'.",
      "In the same source, confirm a <meta name=\"robots\" content=\"noindex, nofollow\"> tag is present.",
    ],
    expectedBehaviour:
      "A signed-out visitor gets no tracer UI. 🛑 MEASURED on production: a 200 with a sign-in state and `<title>Sticker sheet tracer</title>`, NOT a redirect — so the plan's premise that 'a crawler gets a redirect and there is no indexable content at that URL' is FALSE. What actually keeps it out of the index is the `noindex, nofollow` meta plus the robots.txt Disallow, both verified live. That is exactly why all three protections were specified as non-redundant.",
    expectedUiState:
      "A sign-in state rather than the tracer. `Choose a scan` appears NOWHERE in the response body — that absence is the real assertion. /tools renders normally and is unaffected.",
    endResult:
      "BEFORE/AFTER unchanged for a guest — this proves the gate is server-side rather than a hidden control. Nothing is persisted.",
  },

  "checklist-tools-sticker-tracer-storage-meter-honest": {
    roles: ["admin"],
    startPage: "/tools/sticker-tracer",
    steps: [
      ADMIN_SIGNIN,
      "Call GET /api/admin/sticker-sheets/usage in the browser address bar.",
      "Read the per-sheet rows: each carries bytes AND an object count.",
      "Compare the biggest sheet's byte figure against the number of runs it has.",
      "Check whether the response carries a 'truncated' field and what it says.",
    ],
    expectedBehaviour:
      "The meter reports object COUNT beside bytes, because GCS meters them separately — which is the entire reason review thumbnails are one sprite atlas rather than sixty files. It measures at most 25 sheets per call and says when it truncated.",
    expectedUiState:
      "JSON with rows sorted biggest-first, each having bytes and objects, plus totalBytes, totalObjects, measured and truncated.",
    expectedData: { truncatedReportedExplicitly: true },
    endResult:
      "BEFORE: storage cost was discoverable only in the GCP console, which is how the project was paused once before. AFTER: it is a route an operator can read, and a partial measurement says it is partial rather than understating the total.",
  },
};
