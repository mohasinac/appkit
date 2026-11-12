/**
 * Prove the three entry-surface fixes against the BUILT dist.
 *
 * Not a typecheck: every one of these is invisible to tsc.
 *   - a conditional JSX branch (the CTA) compiles whether or not it renders
 *   - a prop default (`fit="cover"`) is type-correct while being wrong
 *   - a counter string is type-correct in every wording
 *
 * Each check must be able to FAIL — the sabotage runs are noted in the report.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

/*
 * 🛑 Resolved from THIS file, never a hardcoded absolute path. The first draft
 * carried `file:///D:/proj/letitrip.in/appkit/dist`, which runs on exactly one
 * machine and reports a missing module everywhere else — i.e. it would fail in
 * CI for a reason that has nothing to do with the code under test.
 */
const DIST = new URL("../dist/", import.meta.url).href;

const note = await import(`${DIST}features/events/schemas/firestore.js`);
const listMod = await import(
  `${DIST}features/events/components/EventEntriesListView.js`
);

let fails = 0;
let oks = 0;
/**
 * 🛑 The predicate is called INSIDE a try, and a throw counts as a FAILURE.
 *
 * Found by sabotaging the dist: a broken build made `describeEntryNoteCount`
 * return `undefined`, `c1.startsWith(...)` threw, and the script died mid-run
 * — so the summary line never printed and `process.exit(1)` never ran. Piped
 * into `tail`, the shell then reported exit 0. A checker that CRASHES on the
 * defect it exists to catch is worse than one that misses it, because the
 * crash looks like tooling noise while the pipeline reads as success.
 *
 * CLAUDE.md records this as a repeating class — *"verify the checker before
 * the code"* — and the fix is the same every time: the checker must have no
 * path to a silent exit.
 */
function check(name, predicate, detail = "") {
  let pass = false;
  let threw = "";
  try {
    pass = typeof predicate === "function" ? predicate() === true : predicate === true;
  } catch (error) {
    threw = error instanceof Error ? error.message : String(error);
  }
  if (pass) {
    oks += 1;
    console.log(`  ok   ${name}`);
  } else {
    fails += 1;
    const why = threw ? `threw: ${threw}` : detail;
    console.log(`  FAIL ${name}${why ? ` — ${why}` : ""}`);
  }
}

// ── 1. the counter reads as a MAXIMUM, in all three states ──────────────────
console.log("\n[1] describeEntryNoteCount — the wording the owner reported");
/*
 * 🛑 Even the SETUP cannot be allowed to throw. A dist missing the export
 * entirely — the state right after someone deletes it — would otherwise kill
 * the script before a single check printed, which is the same silent-exit
 * failure the `check` wrapper above exists to close.
 */
const count = (n) => {
  try {
    return String(note.describeEntryNoteCount(n));
  } catch (error) {
    return `<<threw: ${error instanceof Error ? error.message : error}>>`;
  }
};
const c0 = count(0);
const c1 = count(1);
const c18 = count(18);
const c100 = count(100);
const c118 = count(118);
console.log(`       0   -> "${c0}"`);
console.log(`       1   -> "${c1}"`);
console.log(`      18   -> "${c18}"`);
console.log(`     100   -> "${c100}"`);
console.log(`     118   -> "${c118}"`);

check("empty state says OPTIONAL", () => /optional/i.test(c0));
check("empty state says UP TO 100", () => /up to 100/i.test(c0));
check("1 word is singular", () => c1.startsWith("1 word ") && !c1.includes("1 words"));
check("in-range states a MAX", () => /100 max/.test(c18));
check(
  "no `n / 100` progress grammar in ANY state",
  () =>
    [c0, c1, c18, c100, c118].every((s) => typeof s === "string") &&
    ![c0, c1, c18, c100, c118].some((s) => /\d+\s*\/\s*\d+/.test(s)),
  "the `n / max` shape is the whole defect",
);
check("at the cap is still accepted wording", () => /100 max/.test(c100));
check("over the cap names the overage", () => /18 over the 100-word limit/.test(c118));

// ── 2. the rule itself: it was always a MAX, confirm no minimum crept in ────
console.log("\n[2] checkEntryNote — a ceiling, never a floor");
check("empty note passes", () => note.checkEntryNote("") === null);
check("undefined note passes", () => note.checkEntryNote(undefined) === null);
check("one word passes", () => note.checkEntryNote("hi") === null);
check(
  "exactly 100 passes",
  () => note.checkEntryNote(Array.from({ length: 100 }, (_, i) => `w${i}`).join(" ")) ===
    null,
);
check(
  "101 is refused",
  () => note.checkEntryNote(Array.from({ length: 101 }, (_, i) => `w${i}`).join(" ")) ===
    "Keep it to 100 words",
);
check(
  "label carries (optional)",
  () =>
    typeof note.ENTRY_NOTE_LABEL === "string" &&
    /\(optional\)/i.test(note.ENTRY_NOTE_LABEL),
);
check(
  "placeholder states a blank is allowed",
  () => /blank/i.test(note.ENTRY_NOTE_PLACEHOLDER),
);

// ── 3. the gallery: CTA on a POPULATED list, and a contained cover ──────────
console.log("\n[3] EventEntriesListView — rendered, populated, not empty");

const entry = (id) => ({
  id,
  rank: 1,
  entrantLabel: "Blader",
  userDisplayName: "Blader",
  note: "a short note",
  media: [{ url: "/media/abc", type: "image", alt: "entry" }],
  likes: 0,
  likeCount: 0,
  myVote: null,
  mine: false,
  reviewStatus: "approved",
});

const data = (items) => ({
  items,
  total: items.length,
  page: 1,
  pageSize: 12,
  totalPages: 1,
  truncated: false,
  canModerate: false,
  ranking: { rule: "ranking-most-likes", publicWording: "Most likes wins." },
});

function render(props) {
  return renderToStaticMarkup(
    React.createElement(listMod.EventEntriesListView, props),
  );
}

/*
 * A render that THROWS must become a reported failure, not a dead script.
 * Returns "" so every assertion below it still runs and reports — one broken
 * prop should not hide the other six answers.
 */
function safeRender(props) {
  try {
    return render(props);
  } catch (error) {
    console.log(`  (render threw: ${error instanceof Error ? error.message : error})`);
    return "";
  }
}

const POPULATED = {
  eventId: "e1",
  initialData: data([entry("e1:u1:1")]),
  entryHrefPrefix: "/e1/entries",
  canVote: true,
  participateHref: "/e1/participate",
  entryTitle: "Entry",
  eventTitle: "Diwali Photo Contest",
};

const populated = safeRender(POPULATED);
check(
  "populated gallery renders the participate CTA",
  () => populated.includes('href="/e1/participate"'),
  "this is the reported defect: CTA existed only on the EMPTY state",
);
check("CTA carries the enter label", () => populated.includes("Enter now"));
check(
  "cover is object-contain, not object-cover",
  () => populated.includes("object-contain") && !populated.includes("object-cover"),
  "the `fit` prop existed and no call site passed it",
);
check("the entry note still renders on the card", () => populated.includes("a short note"));

// the empty branch must NOT have regressed
const empty = safeRender({ ...POPULATED, initialData: data([]) });
check(
  "empty gallery keeps its CTA",
  () => empty.includes('href="/e1/participate"') && empty.includes("Enter now"),
);

// and a CLOSED event (host omits participateHref) must offer no way in
const closed = { ...POPULATED };
delete closed.participateHref;
const closedHtml = safeRender(closed);
check(
  "a finished event offers NO CTA but keeps the gallery",
  () => !closedHtml.includes("/e1/participate") && closedHtml.includes("object-contain"),
  "the active-window asymmetry must survive",
);

// an event configured cover must still be honoured — config, not a literal
const cropped = safeRender({ ...POPULATED, entryMedia: { fit: "cover" } });
check(
  "an event that configures fit:cover still crops",
  () => cropped.includes("object-cover") && !cropped.includes("object-contain"),
  "contain must come from CONFIG, not be hardcoded",
);

console.log(`\n${oks} ok · ${fails} failed`);
process.exit(fails > 0 ? 1 : 0);
