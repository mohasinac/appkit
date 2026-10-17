/*
 * WHY: Authored six-part procedures for content-discovery/authenticity-checker.
 * WHAT: 13 cases, keyed by full checklist id.
 *
 * 🛑 EVERY CASE IS WRITTEN AS BEFORE → AFTER, because this feature's whole
 * failure mode is a confident, plausible, wrong answer returned with HTTP 200. A
 * case reading "check the authenticity tool works" passes against all of these:
 *
 *   1. A two-state sign-in gate. `SessionProvider` mounts `initialUser={null}`,
 *      so `loading` starts true for SIGNED-IN users too — the page flashed "sign
 *      in to run a lookup" at an authenticated collector on every hard load.
 *   2. A verdict with no hedge. The engine can match a midfake batch code; the
 *      wrong version of that screen reads as an accusation against the seller.
 *   3. One date printed as fact. Two decodings of a Metal Fight box code
 *      circulate and Takara Tomy has published neither.
 *   4. Treating a real product code as evidence. A counterfeit catalogue
 *      measured for this site carried 900+ genuine Takara Tomy codes.
 *   5. Picking one bey when the typed name matches a dozen.
 *   6. Calling a legitimate spelling a fake tell — Takara Tomy romanises the
 *      line as "Pegasis" while Hasbro prints "Pegasus", and an earlier draft of
 *      the checker flagged the TT spelling as trademark evasion.
 *   7. Calling Funskool a fake. It is a licensed Indian importer.
 *   8. A sign-in wall with no public content, which is thin content to a crawler
 *      and useless to someone who arrived from search.
 *
 * So each case names what the wrong answer LOOKED like, and several assert the
 * presence of a hedge rather than the presence of a result.
 *
 * @tag domain:tester
 * @tag layer:seed
 * @tag pattern:none
 * @tag access:server-only
 * @tag consumers:seed-data/authored/index.ts
 * @tag sideEffects:none
 */

import type { AuthoredCase } from "./_types";

export const authored: Record<string, AuthoredCase> = {
  "checklist-content-discovery-authenticity-checker-guest-sees-reference-not-a-wall": {
    roles: ["guest"],
    startPage: "/tools/authenticity",
    steps: [
      "Open /tools/authenticity signed out.",
      "Confirm there is exactly ONE sign-in box, and it sits where the lookup form would be.",
      "Scroll past it and confirm the generation table renders — six rows, each naming years, code prefixes and licensed marques.",
      "Confirm the 'Checks that apply whatever the generation' list renders with real text in each row.",
      "Answer no if the page is only a sign-in prompt, or if the reference content is missing.",
    ],
    expectedBehaviour:
      "BEFORE: gating the page would have meant a signed-out visitor — and a crawler — getting nothing but 'please sign in', which is thin content and throws away the highest-intent query this site can answer. AFTER: only the LOOKUP is gated. The generation table, the box-code explanation, the universal checks and the licensed-marque list are server-rendered and public, identical for crawlers and humans.",
    expectedUiState:
      "One sign-in card reading 'Sign in to run a lookup', followed by the heading 'Which generation is it, and what does the box code mean' and six generation rows, then the universal checks, then 'Who is actually licensed'.",
    expectedData: { generationRows: 6 },
    endResult: "Nothing is changed; this case only reads.",
  },

  "checklist-content-discovery-authenticity-checker-no-signin-flash-when-authenticated": {
    roles: ["buyer"],
    startPage: "/tools/authenticity",
    steps: [
      "Sign in as a buyer.",
      "Hard-reload /tools/authenticity (Ctrl+F5, not a soft navigation).",
      "Watch the lookup area through the first second of the load.",
      "Answer no if the words 'Sign in to run a lookup' appear at any point.",
    ],
    expectedBehaviour:
      "BEFORE: a two-state gate (`!user` → prompt) showed the sign-in card to signed-in users on every hard load, because the session provider mounts with a null user and resolves asynchronously. AFTER: three states — while `loading` is true the area shows 'Checking your session…', and the prompt is reachable only once the session has resolved to no user.",
    expectedUiState:
      "Either 'Checking your session…' briefly, then the form. Never the sign-in card.",
    endResult: "The form is present after reload. Nothing persists.",
  },

  "checklist-content-discovery-authenticity-checker-midfake-code-reads-as-batch-not-accusation": {
    roles: ["buyer"],
    startPage: "/tools/authenticity",
    steps: [
      "Sign in and open /tools/authenticity.",
      "Enter A0813 in 'Code on the box' and leave everything else empty.",
      "Submit.",
      "Read the verdict block and the caveat directly beneath it.",
      "Answer no if the screen anywhere calls the item counterfeit, or accuses the seller, or omits the caveat.",
    ],
    inputs: { code: "A0813" },
    expectedBehaviour:
      "BEFORE: the obvious implementation of a code match is a boolean 'FAKE'. A0813 is a real recorded midfake batch code, and a midfake is Takara-Tomy-blueprint product of reduced quality — a statement about a production run, not about whoever is selling it. AFTER: the verdict is 'Likely reproduction', and the caveat in the same block says it is a statement about a batch or brand and not an accusation against the seller.",
    expectedUiState:
      "A 'Likely reproduction' badge, a one-sentence headline about matching a batch the community records as a midfake, and a caveat naming batch-or-brand rather than the seller. A Safety block about lead and cadmium is present.",
    expectedData: { verdict: "likely-reproduction" },
    endResult: "Nothing is written. Reloading clears the result.",
  },

  "checklist-content-discovery-authenticity-checker-date-code-shows-both-readings": {
    roles: ["buyer"],
    startPage: "/tools/authenticity",
    steps: [
      "Enter A0813 as the code and submit.",
      "Find the 'Reading A0813' panel.",
      "Confirm TWO readings are listed — one treating the letter as the month, one treating it as the factory with the digits as a week number.",
      "Confirm the panel says both circulate and that Takara Tomy has published neither.",
      "Answer no if only one date is shown, or if a date is stated without that hedge.",
    ],
    inputs: { code: "A0813" },
    expectedBehaviour:
      "BEFORE: the reference post states a month-day-year rule, so the obvious build prints '8 January 2013' as a fact. A factory/week/year reading also circulates and Takara Tomy has never published a decoding — the post itself says there is no official statement. AFTER: both readings render, labelled, with the disagreement stated.",
    expectedUiState:
      "'Reading A0813' with two labelled lines — '…letter = month…' → 8 January 2013, and '…letter = factory, next two digits = week…' → factory A, week 8 of 2013 — plus a sentence saying to treat the date as indicative.",
    endResult: "Nothing is changed.",
  },

  "checklist-content-discovery-authenticity-checker-real-product-code-is-not-evidence": {
    roles: ["buyer"],
    startPage: "/tools/authenticity",
    steps: [
      "Enter BB-105 in 'Code on the box', leave the name empty, and submit.",
      "Read the signal rows under 'What I checked'.",
      "Confirm one row says the code is a well-formed Metal Fight code AND that this says nothing about authenticity.",
      "Answer no if a valid product code is presented as supporting authenticity.",
    ],
    inputs: { code: "BB-105" },
    expectedBehaviour:
      "BEFORE: matching a code against a real product list reads as verification, and that is the single most misleading thing this tool could do — a counterfeit catalogue measured for this site printed 516 real B-xx, 189 BB-xx and 147 BX-xx codes across 1,277 unlicensed products. AFTER: a well-formed code establishes the GENERATION and is marked neutral, with the 900-codes measurement stated.",
    expectedUiState:
      "A neutral signal row (not a green/supporting one) saying BB-105 is a well-formed Metal Fight code and that unlicensed sellers print real codes routinely.",
    expectedData: { generation: "mfb" },
    endResult: "Nothing is changed.",
  },

  "checklist-content-discovery-authenticity-checker-name-code-mismatch-asks-rather-than-accuses": {
    roles: ["buyer"],
    startPage: "/tools/authenticity",
    steps: [
      "Enter 'Storm Pegasus' as the model name and BB-105 as the code. Submit.",
      "Confirm the verdict is 'Discrepancy found' and a signal explains that Storm Pegasus is BB-28 while BB-105 is a different release.",
      "Confirm the signal tells you a Random Booster or multi-pack is an innocent explanation.",
      "Now tick 'This came in a Random Booster or a multi-pack' and submit again.",
      "Confirm the verdict is no longer a discrepancy and a signal says a mismatch is EXPECTED for a Random Booster.",
      "Answer no if the second submission still reports a discrepancy.",
    ],
    inputs: { name: "Storm Pegasus", code: "BB-105", randomBooster: true },
    expectedBehaviour:
      "BEFORE: flagging every name/code mismatch would flag a large class of genuine product, because a Random Booster box carries the BOOSTER's code and not the code of the bey inside — the reference table records several, e.g. Pisces DF145BS under F2810 marked 'Random Booster TT'. AFTER: the mismatch is reported as a question with the Random Booster explanation offered, and ticking the box re-reads it as expected rather than suspicious.",
    expectedUiState:
      "First submission: 'Discrepancy found' plus a row naming both codes. Second: not a discrepancy, plus a row reading 'Code does not match the model — but you said this is a Random Booster'.",
    expectedData: { firstVerdict: "discrepancy-found", secondVerdict: "inconclusive" },
    endResult: "Nothing is written either time.",
  },

  "checklist-content-discovery-authenticity-checker-ambiguous-name-asks-which-model": {
    roles: ["buyer"],
    startPage: "/tools/authenticity",
    steps: [
      "Enter 'Valkyrie' as the model name, leave the code empty, and submit.",
      "Confirm the tool does NOT announce one specific release.",
      "Confirm a question appears asking which one, with several named options each showing its product code and generation.",
      "Pick one option.",
      "Confirm the result now names that release and the question is gone.",
      "Answer no if the first submission confidently names a single Valkyrie.",
    ],
    inputs: { name: "Valkyrie" },
    expectedBehaviour:
      "BEFORE: a best-match lookup picks the top scoring row and announces it — 'Matched Ultimate Valkyrie Legacy Variable'-9' — which is a confident answer to a question nobody asked, and every per-model fact after it (the expected product code above all) is then about the wrong bey. AFTER: several candidates at the same quality become a question; picking one pins it and re-runs.",
    expectedUiState:
      "A question headed 'Which one? \"Valkyrie\" matches N releases', with one button per candidate labelled by name and hinting its code and generation. After the pick, a signal naming the chosen release.",
    endResult: "Nothing is written. The pick is not remembered after reload.",
  },

  "checklist-content-discovery-authenticity-checker-takara-spelling-is-not-flagged": {
    roles: ["buyer"],
    startPage: "/tools/authenticity",
    steps: [
      "Enter 'Storm Pegasis' (Takara Tomy's own spelling, with an i) and submit.",
      "Confirm the bey resolves and NO signal suggests the spelling is a trademark-evasion tell.",
      "Now enter 'Scythee Kronos' (a genuine evasion spelling, doubled e) and submit.",
      "Confirm that one DOES carry the misspelling note.",
      "Answer no if 'Storm Pegasis' is flagged, or if 'Scythee Kronos' is not.",
    ],
    inputs: { name: "Storm Pegasis" },
    expectedBehaviour:
      "BEFORE: this project's counterfeit crawl lists `Pegasis` among the trademark-evasion spellings — true of that one catalogue, and NOT a general rule. Takara Tomy romanises the line as Pegasis (the corpus's own Japanese for Storm Pegasus is ストームペガシス) while Hasbro prints Pegasus. An earlier draft told the user that the spelling printed on a genuine Takara Tomy box was a sign of a fake. AFTER: the pair is registered as a legitimate variant, so it resolves as an alias and the warning stays silent; a real evasion spelling still trips it.",
    expectedUiState:
      "'Storm Pegasis' → a signal reading 'Matched Storm Pegasus 105RF' with no mention of evasion. 'Scythee Kronos' → a signal reading 'Read as \"Scythe Kronos T125EDS\"' that does mention trademark evasion.",
    endResult: "Nothing is changed.",
  },

  "checklist-content-discovery-authenticity-checker-funskool-is-not-a-fake-signal": {
    roles: ["buyer"],
    startPage: "/tools/authenticity",
    steps: [
      "Enter 'Funskool' in 'Brand printed on the box' and submit.",
      "Confirm the signal says Funskool is a LICENSED marque.",
      "Confirm the verdict is not 'Likely reproduction'.",
      "Now enter 'Rapidity' instead and submit.",
      "Confirm that one IS reported as a known unlicensed producer, with a Safety block.",
      "Answer no if Funskool is treated as a concern, or if Rapidity is not named.",
    ],
    inputs: { marque: "Funskool" },
    expectedBehaviour:
      "BEFORE: a tool that only knows 'Takara Tomy / Hasbro' tells an Indian buyer holding a legitimate Funskool box that the brand is unrecognised — a false positive against a licensed importer, in this marketplace's main market. AFTER: the licensed set includes Funskool (India), Mani (Hong Kong), Sheng Tai (Singapore), NewBoy (Middle East) and the rest, and only named unlicensed producers reach a reproduction verdict.",
    expectedUiState:
      "Funskool → a supporting signal naming it licensed and mentioning the regional importers. Rapidity → 'Likely reproduction', a signal naming Hongyi, and a Safety block about lead and cadmium.",
    expectedData: { funskoolVerdict: "inconclusive", rapidityVerdict: "likely-reproduction" },
    endResult: "Nothing is written either time.",
  },

  "checklist-content-discovery-authenticity-checker-unknown-code-is-not-called-fake": {
    roles: ["buyer"],
    startPage: "/tools/authenticity",
    steps: [
      "Enter L9999 as the code and submit.",
      "If asked which generation, choose Metal Fight.",
      "Read the signal about the code.",
      "Confirm it says the code is NOT RECORDED and explicitly that this does not mean fake.",
      "Answer no if an unrecorded code is presented as evidence of a fake.",
    ],
    inputs: { code: "L9999", generation: "mfb" },
    expectedBehaviour:
      "BEFORE: an absent lookup result reads as a negative result. The reference table is 90 distinct codes compiled by collectors from boxes they personally held, so it was never complete and new genuine codes surface regularly. AFTER: an unmatched code produces a neutral signal saying 'not recorded', with that reasoning stated.",
    expectedUiState:
      "A neutral signal row saying L9999 is not in either table and that an absent code means 'not recorded', not 'fake'. The verdict is 'Inconclusive', never 'Likely reproduction'.",
    expectedData: { verdict: "inconclusive" },
    endResult: "Nothing is changed.",
  },

  "checklist-content-discovery-authenticity-checker-asks-generation-when-nothing-inferable": {
    roles: ["buyer"],
    startPage: "/tools/authenticity",
    steps: [
      "Submit the form with every field empty.",
      "Confirm the tool asks for something rather than returning a verdict.",
      "Now enter a name that matches nothing — 'zzzznope' — and submit.",
      "Confirm a question appears asking which generation it is, with six options each naming years and example code prefixes.",
      "Answer no if the tool returns any verdict at all without being able to establish a generation.",
    ],
    inputs: { name: "zzzznope" },
    expectedBehaviour:
      "BEFORE: guessing a generation hands the user a confidently wrong checklist — tri-wing screws mean something on Burst and nothing on a 2001 plastic bey, and the box date-code table only covers the Metal series. AFTER: with no generation established the verdict is 'Need a bit more' and a question is asked, with the reason for asking stated.",
    expectedUiState:
      "A 'Need a bit more' badge and a question headed 'Which generation is it?' with six buttons, each labelled with the generation, its years and an example code shape.",
    expectedData: { verdict: "needs-input" },
    endResult: "Nothing is changed.",
  },

  "checklist-content-discovery-authenticity-checker-api-refuses-signed-out": {
    roles: ["guest"],
    startPage: "/tools/authenticity",
    steps: [
      "Signed out, open the browser devtools console on /tools/authenticity.",
      // A tester step is prose a human types into a devtools console: it cannot
      // import a constant, and calling the real URL signed out IS the case.
      // audit-hardcoded-api-routes-ok: literal URL inside a manual test procedure
      "Run: await fetch('/api/tools/authenticity', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: 'A0813' }) }).then(r => r.status)",
      "Confirm the status is 401 (or 403) and not 200.",
      "Confirm the response body contains no assessment — no verdict, no signals.",
      "Answer no if a signed-out call returns an assessment.",
    ],
    inputs: { code: "A0813" },
    expectedBehaviour:
      "BEFORE: gating only the UI leaves the endpoint open, and the endpoint is where the output actually comes from — 'this matches a batch recorded as a midfake' read off an anonymous API is a quotable claim with no account behind it. AFTER: `auth: true` on the route refuses the call before the engine runs.",
    expectedUiState:
      "The console shows 401 or 403. No verdict text appears anywhere in the response.",
    expectedData: { status: 401 },
    endResult: "Nothing is written; no assessment is produced.",
  },

  "checklist-content-discovery-authenticity-checker-json-ld-declares-the-gate": {
    roles: ["guest"],
    startPage: "/tools/authenticity",
    steps: [
      "Signed out, view source on /tools/authenticity (Ctrl+U, not devtools' rendered DOM).",
      "Find the application/ld+json block with \"@type\": \"WebApplication\".",
      "Confirm it carries isAccessibleForFree true at the top level and a hasPart entry with isAccessibleForFree FALSE and a cssSelector.",
      "Copy that cssSelector value and run document.querySelectorAll(<selector>).length in the console.",
      "Confirm the count is 1 — the selector matches a real element on the page.",
      "Answer no if the selector matches nothing, or if the gate is undeclared.",
    ],
    expectedBehaviour:
      "BEFORE: a page with gated content and no declaration is a structured-data mismatch — and the alternative mistake, serving the reference content only to crawler user-agents, is cloaking. AFTER: the page declares the gate exactly as the guest-price gate does: the free reference content is marked free, and the lookup region is carved out by selector as not free. 🛑 Root Cause #93 is the record of the failure this case exists to catch — a class name and a selector living as two literals in two files, where a rename points the crawler at a selector matching nothing and looks identical to making no declaration at all.",
    expectedUiState:
      "A WebApplication JSON-LD block naming the tool, plus a breadcrumb block. The hasPart cssSelector resolves to exactly one element in the live DOM.",
    expectedData: { gatedSelectorMatches: 1 },
    endResult: "Nothing is changed; this case only reads.",
  },
};
