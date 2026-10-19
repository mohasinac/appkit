/*
 * WHY: Authored six-part procedures for content-discovery/authenticity-checker.
 * WHAT: 16 cases, keyed by full checklist id.
 *
 * 🛑 EVERY CASE IS WRITTEN AS BEFORE → AFTER, because this feature's whole
 * failure mode is a confident, plausible, wrong answer returned with HTTP 200. A
 * case reading "check the authenticity tool works" passes against all of these:
 *
 *   1. A sign-in wall on the one surface whose whole purpose is being consulted
 *      while standing in front of the item — and before that, a two-state gate
 *      that flashed "sign in to run a lookup" at collectors who WERE signed in,
 *      because `SessionProvider` mounts `initialUser={null}`.
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
 *   8. Picking a side on a code two compilations flatly disagree about, where
 *      either answer costs a real person money.
 *   9. Reporting a code its own source calls authentic as a reproduction,
 *      because it appears in a list whose subject is a TYPEFACE.
 *  10. Grading a Burst bey against the Metal Fight checklist in silence,
 *      because the generation selector arrives pre-set and nobody touched it.
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
      "Confirm the LOOKUP FORM itself is there and usable — Model name, Code on the box, Brand, Generation, How it was sold, and a 'Check it' button.",
      "Confirm there is no sign-in card and no 'Sign in to run a lookup' text anywhere on the page.",
      "Enter A0813 as the code and submit, still signed out.",
      "Confirm a real assessment comes back rather than an error or a prompt to sign in.",
      "Scroll past it and confirm the generation table renders — six rows, each naming years, code prefixes and licensed marques.",
      "Answer no if any part of the lookup asks for an account.",
    ],
    inputs: { code: "A0813" },
    expectedBehaviour:
      "BEFORE: the lookup required an account, so a buyer standing in a shop with the box in their hand was asked to register first — on the one surface whose whole purpose is being consulted at that moment, and the person most in need of it is the one least likely to have an account. AFTER: the entire page is public. What makes that safe is the shape of the output, not a gate: there is no 'counterfeit' verdict, the harshest outcome is 'likely reproduction', and every claim is about a production batch or a named brand rather than about a seller.",
    expectedUiState:
      "The form, then (after submitting) a verdict block, then the heading 'Which generation is it, and what does the box code mean' with six generation rows, then the universal checks, then 'Who is actually licensed'. No sign-in card at any point.",
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
      "Answer no if the words 'Sign in to run a lookup' or 'Checking your session…' appear at any point, or if the form is not usable immediately.",
    ],
    expectedBehaviour:
      "BEFORE: a two-state gate (`!user` → prompt) showed the sign-in card to signed-in users on every hard load, because the session provider mounts with a null user and resolves asynchronously; a three-state gate with a 'Checking your session…' placeholder fixed the flash. AFTER: the component reads no session at all, so neither string exists and there is nothing to resolve — the form is interactive on first paint.",
    expectedUiState: "The form, immediately. No session placeholder, no sign-in card.",
    endResult: "The form is present after reload. Nothing persists.",
  },

  "checklist-content-discovery-authenticity-checker-midfake-code-reads-as-batch-not-accusation": {
    roles: ["buyer"],
    startPage: "/tools/authenticity",
    steps: [
      "Open /tools/authenticity (no account needed).",
      "Enter A0813 in 'Code on the box' and leave the other fields as they are.",
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
      "Now set 'How it was sold' to 'In a Random Booster or a multi-pack' and submit again.",
      "Confirm the verdict is no longer a discrepancy and a signal says a mismatch is EXPECTED for a Random Booster.",
      "Answer no if the second submission still reports a discrepancy.",
    ],
    inputs: { name: "Storm Pegasus", code: "BB-105", randomBooster: true },
    expectedBehaviour:
      "BEFORE: flagging every name/code mismatch would flag a large class of genuine product, because a Random Booster box carries the BOOSTER's code and not the code of the bey inside — the reference table records several, e.g. Pisces DF145BS under F2810 marked 'Random Booster TT'. AFTER: the mismatch is reported as a question with the Random Booster explanation offered, and answering 'How it was sold' re-reads it as expected rather than suspicious. 🛑 That control is a THREE-option dropdown, not the checkbox it used to be: a checkbox could only express 'yes' and silence, and silence was read as a firm 'no' from a buyer who may simply not have the box in front of them.",
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
      "Enter L9999 as the code and submit (Generation is already on Metal Fight).",
      "Read the signal about the code.",
      "Confirm it says the code is NOT RECORDED and explicitly that this does not mean fake.",
      "Confirm it also states the size of the tables it searched, so 'not recorded' is reported against a known coverage rather than as a bare miss.",
      "Answer no if an unrecorded code is presented as evidence of a fake.",
    ],
    inputs: { code: "L9999", generation: "mfb" },
    expectedBehaviour:
      "BEFORE: an absent lookup result reads as a negative result. The tables are collectors' compilations from boxes they personally held — thorough at 495 original and 18 midfake codes across 45 models and 6 regions, and still not complete; new genuine codes surface regularly and an unphotographed regional batch is simply missing. AFTER: an unmatched code produces a neutral signal saying 'not recorded', with that reasoning and the coverage stated.",
    expectedUiState:
      "A neutral signal row saying L9999 is not in any of the tables, naming how many codes were searched, and saying an absent code means 'not recorded', not 'fake'. The verdict is 'Inconclusive', never 'Likely reproduction'.",
    expectedData: { verdict: "inconclusive" },
    endResult: "Nothing is changed.",
  },

  "checklist-content-discovery-authenticity-checker-asks-generation-when-nothing-inferable": {
    roles: ["buyer"],
    startPage: "/tools/authenticity",
    steps: [
      "Submit the form with every text field empty, leaving Generation on its Metal Fight default.",
      "Confirm the tool asks you to say what you are looking at rather than returning a verdict about an item it knows nothing about.",
      "Confirm it still shows the Metal Fight checklist, since that much IS known.",
      "Now set Generation to 'Not sure / something else', enter a name that matches nothing — 'zzzznope' — and submit.",
      "Confirm a question appears asking which generation it is, with six options each naming years and example code prefixes.",
      "Answer no if an empty submission returns a verdict such as 'Nothing contradicts it', or if the generation question never appears when no generation is set.",
    ],
    inputs: { name: "zzzznope" },
    expectedBehaviour:
      "BEFORE: guessing a generation hands the user a confidently wrong checklist — tri-wing screws mean something on Burst and nothing on a 2001 plastic bey, and the box date-code table only covers the Metal series. 🛑 And once the selector gained a Metal Fight default, every empty submission carried a generation, which was briefly enough to escape the 'nothing to go on' branch — so pressing Check with nothing typed answered 'Nothing contradicts it, and nothing confirms it either': a verdict, about no item, phrased as reassurance. AFTER: a generation alone is still nothing to go on, and the branch uses it for the checklist instead of treating it as an answer.",
    expectedUiState:
      "Empty submission → a 'Need a bit more' badge, 'Tell me what you are looking at.', and the Metal Fight checks. With Generation cleared and an unmatched name → a question headed 'Which generation is it?' with six buttons.",
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
      "Run: await fetch('/api/tools/authenticity', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: 'A0813' }) }).then(r => r.json())",
      "Confirm the response is a real assessment — it has a verdict and signals — and not a 401.",
      // audit-hardcoded-api-routes-ok: literal URL inside a manual test procedure
      "Now run the same fetch with an extra key the schema does not declare, e.g. body: JSON.stringify({ code: 'A0813', listingId: 'x' }), and read r.status.",
      "Confirm THAT one is refused with a 400 rather than quietly ignoring the unknown key.",
      "Answer no if the plain call is refused, or if the unknown-key call succeeds.",
    ],
    inputs: { code: "A0813" },
    expectedBehaviour:
      "BEFORE: the route required `auth: true`, so the endpoint refused an anonymous caller. The reasoning was that 'this matches a batch recorded as a midfake' is a quotable claim that should have an account behind it; in practice it put a registration wall in front of someone standing in a shop. AFTER: the route is public and the protection is in the output's shape instead — no 'counterfeit' rung, nothing said about a seller. The `.strict()` schema is still enforced, so an undeclared key is a 400 and never a confident assessment of a different, emptier question.",
    expectedUiState:
      "The console shows an object with a verdict and a signals array for the first call, and status 400 for the second.",
    expectedData: { status: 200 },
    endResult: "Nothing is written; the engine does zero I/O.",
  },

  "checklist-content-discovery-authenticity-checker-json-ld-declares-no-false-gate": {
    roles: ["guest"],
    startPage: "/tools/authenticity",
    steps: [
      "Signed out, view source on /tools/authenticity (Ctrl+U, not devtools' rendered DOM).",
      "Find the application/ld+json block with \"@type\": \"WebApplication\".",
      "Confirm it carries isAccessibleForFree true.",
      "Confirm there is NO hasPart entry, and no isAccessibleForFree false anywhere in the block.",
      "Search the page source for 'authenticity-gated-tool' and confirm it does not appear.",
      "Answer no if the markup still declares a paywalled region.",
    ],
    expectedBehaviour:
      "BEFORE: the lookup needed an account, and the page declared that honestly — `isAccessibleForFree: true` overall plus a `hasPart` node carving out the lookup by cssSelector as not free (the same pattern the guest-price gate uses). AFTER: the gate is gone, so the declaration had to go with it. A paywall node a crawler can see is false is worse than no node at all, and the class it named was deleted rather than left in the DOM as a selector nothing references — 🛑 Root Cause #93 is exactly that pair drifting apart.",
    expectedUiState:
      "A WebApplication JSON-LD block naming the tool with isAccessibleForFree true and no hasPart, plus a breadcrumb block.",
    expectedData: { hasPartNodes: 0 },
    endResult: "Nothing is changed; this case only reads.",
  },

  "checklist-content-discovery-authenticity-checker-defaults-to-metal-fight": {
    roles: ["guest"],
    startPage: "/tools/authenticity",
    steps: [
      "Open /tools/authenticity.",
      "Read the Generation control WITHOUT touching it — confirm it already shows Metal Fight.",
      "Enter L9999 as the code and submit without changing anything.",
      "Confirm the result is produced immediately and is NOT a 'Which generation is it?' question.",
      "Now enter B-174 as the code, leave Generation on Metal Fight, and submit.",
      "Confirm a signal appears saying Metal Fight is selected but this looks like Burst, and that it tells you to change the selector.",
      "Answer no if the default is absent, or if a Burst code is silently graded against the Metal Fight checklist with no mention of the mismatch.",
    ],
    inputs: { code: "B-174" },
    expectedBehaviour:
      "BEFORE: the tool opened with no generation and asked for one before it would say anything, which made the commonest question — 'what does this code on my Metal Fight box mean' — cost a selection first. Everything the box-code tables know is Metal-series. AFTER: the selector is pre-set to Metal Fight. 🛑 The risk a pre-set default creates is handled rather than ignored: a supplied generation still wins, because the user can see the box and the engine cannot, but a code or name implying a different generation raises a `generation-mismatch` signal naming both. A default that cannot be questioned is the thing to avoid.",
    expectedUiState:
      "The Generation control reads 'Metal Fight (Metal Fusion / Masters / Fury) — 2008–2012' on load. With B-174 submitted, a neutral signal headed 'You have Metal Fight … selected, but this looks like Burst'.",
    expectedData: { defaultGeneration: "mfb" },
    endResult: "Nothing is changed.",
  },

  "checklist-content-discovery-authenticity-checker-contested-code-reports-the-disagreement": {
    roles: ["guest"],
    startPage: "/tools/authenticity",
    steps: [
      "Enter I2211 as the code and submit.",
      "Confirm the verdict badge reads 'Discrepancy found' and NOT 'Likely reproduction' and NOT 'Consistent with an original'.",
      "Confirm the headline says the sources contradict each other about this code.",
      "Confirm a signal names BOTH sides — which compilation records it on genuine boxes and which lists it as a midfake.",
      "Answer no if the screen picks a side, or presents either reading as the answer.",
    ],
    inputs: { code: "I2211" },
    expectedBehaviour:
      "BEFORE: merging three code compilations put four codes (I0511, I2211, I2611, J2712) in two tables at once, and whichever table the lookup scanned first would have won. That is a coin flip with a person's money on it in both directions — the midfake reading accuses whoever is holding a genuine box, the original reading reassures whoever is holding a fake. AFTER: contested codes live in their own table, are checked before the precedence scan, and are reported as the disagreement they are.",
    expectedUiState:
      "A 'Discrepancy found' badge, the headline 'My sources contradict each other about this exact code.', and a signal row naming the model-by-model list and the 2021 reference post on one side and the midfake list on the other.",
    expectedData: { verdict: "discrepancy-found" },
    endResult: "Nothing is changed.",
  },

  "checklist-content-discovery-authenticity-checker-font-midfake-does-not-accuse": {
    roles: ["guest"],
    startPage: "/tools/authenticity",
    steps: [
      "Enter D0511 as the code and submit.",
      "Confirm the verdict is 'Discrepancy found' — NOT 'Likely reproduction'.",
      "Read the midfake signal and confirm it says the point is the TYPEFACE and that the source considers the code itself authentic.",
      "Now enter H3011 instead and submit.",
      "Confirm THAT one does reach 'Likely reproduction' and names the high-quality Sonokong fakes.",
      "Answer no if D0511 is reported as a reproduction, or if H3011 is not.",
    ],
    inputs: { code: "D0511" },
    expectedBehaviour:
      "BEFORE: every row in the midfake table drove the harshest verdict the engine has. Three of the Chinese rows carry their own author's words that *the code itself should be authentic* and only the printed font differs, so that verdict would have been the engine asserting something no source did, about someone's property, in the worst available direction. AFTER: a midfake row the source hedged on is still a concern — it lands on 'resolve this before you pay' with the font comparison spelled out — but only an unhedged row reaches 'likely reproduction'.",
    expectedUiState:
      "D0511 → 'Discrepancy found', with a signal explaining the typeface comparison. H3011 → 'Likely reproduction', with a signal about Korean boxes reproducing the importer panel and a Safety block.",
    expectedData: { d0511Verdict: "discrepancy-found", h3011Verdict: "likely-reproduction" },
    endResult: "Nothing is written either time.",
  },

  "checklist-content-discovery-authenticity-checker-regional-code-reads-as-regional": {
    roles: ["guest"],
    startPage: "/tools/authenticity",
    steps: [
      "Enter C2811 as the code and submit.",
      "Confirm the signal names the regions the code is recorded in, and that Korea (Sonokong) is among them.",
      "Now enter K2510 and submit.",
      "Confirm that one names Middle East (NewBoy), and that its source note says the 2021 post could only call it 'seems legit' while the later list records it as a genuine New Boy release.",
      "Answer no if a regional code comes back with no region, or is presented as unrecorded.",
    ],
    inputs: { code: "C2811" },
    expectedBehaviour:
      "BEFORE: the table was 90 Japanese-centric codes with no region data, so a buyer holding a Korean Sonokong or Middle-East New Boy box got 'not recorded' — which reads as a warning about a perfectly genuine regional release. AFTER: 495 codes across 45 models and 6 regions, and the signal says which region the code is recorded in. The five New Boy codes the 2021 post could only hedge about are resolved by the later list, carrying that history in their notes rather than being quietly upgraded.",
    expectedUiState:
      "C2811 → a supporting signal reading 'Recorded on … releases' naming Korea (Sonokong). K2510 → the same shape naming Middle East (NewBoy), plus the 'seems legit' history.",
    endResult: "Nothing is changed.",
  },
};

/*
 * ── Guards for the near-miss work (2026-10-19) ──────────────────────────
 *
 * 🛑 All four protect behaviour that is ALREADY CORRECT, and that is the
 * point of them. A "did you mean" affordance is precisely the change that
 * could turn an absent code into an accusation, and this tool's third rule
 * is that a false counterfeit accusation against a real seller is worse
 * than a missed one.
 *
 * Appended as a second export rather than merged into the map above, so the
 * diff shows what the near-miss change added and the original 21 cases stay
 * byte-identical.
 */
export const authoredNearMiss: Record<string, AuthoredCase> = {
  "checklist-content-discovery-authenticity-checker-authenticity-unknown-code-is-not-fake": {
    roles: ["guest"],
    startPage: "/tools/authenticity",
    steps: [
      "Open /tools/authenticity.",
      "Leave the model name empty.",
      "Enter Z9999 in the box-code field — well-formed (one letter, four digits) but in no table.",
      "Pick any generation.",
      "Run the check.",
      "Read the verdict chip, the headline and the caveat word for word.",
      "Read every row under 'What I checked' and note each row's direction.",
    ],
    inputs: { code: "Z9999" },
    expectedBehaviour:
      "An unmatched code is NOT evidence in either direction. New genuine codes appear regularly, and counterfeiters use real codes anyway — this project's own crawl found 516 real B-xx codes on one counterfeit catalogue.",
    expectedUiState:
      "The verdict is 'Inconclusive'. The code signal reads NEUTRAL, and its text says the code is not recorded rather than that the item is fake. No wording anywhere implies counterfeit, and no verdict more severe than inconclusive appears. Either of those is the failure.",
    endResult: "Read-only; nothing persists.",
  },
  "checklist-content-discovery-authenticity-checker-authenticity-near-miss-suggests": {
    roles: ["guest"],
    startPage: "/tools/authenticity",
    steps: [
      "Open /tools/authenticity.",
      "Find a code the tool recognises — A0813 is a known one.",
      "Enter A0831 instead: the same characters with one pair transposed.",
      "Run the check.",
      "Read the suggestion line and note where on the page it sits.",
      "Read every row under 'What I checked'.",
      "Write down the verdict.",
      "Run the check again with the transposition removed and compare the verdict.",
    ],
    inputs: { nearMiss: "A0831", realCode: "A0813" },
    expectedBehaviour:
      "A near-miss is INPUT CORRECTION, never evidence. It is ambiguous between a typo and a batch deliberately mimicking a real code, and an ambiguous signal must not become an accusation.",
    expectedUiState:
      "A neutral line offers 'did you mean A0813?'. It sits OUTSIDE the 'What I checked' list and does NOT appear as a signal row. No evasion or counterfeit warning fires. The verdict is identical to what the same input produced before the suggestion existed.",
    endResult: "Read-only; nothing persists.",
  },
  "checklist-content-discovery-authenticity-checker-authenticity-inconclusive-asks-for-more": {
    roles: ["guest"],
    startPage: "/tools/authenticity",
    steps: [
      "Open /tools/authenticity.",
      "Leave the model name EMPTY.",
      "Enter a plausible box code and pick a generation.",
      "Run the check.",
      "Read the caveat under the verdict word for word.",
      "Now fill in a model name as well and run it again.",
      "Compare the two caveats.",
    ],
    expectedBehaviour:
      "Name-against-code agreement is one of the engine's strongest signals and cannot be computed with only one of the two. The tool already asks which generation and already asks which model on an ambiguous name; asking for the missing half is the same mechanism one input over.",
    expectedUiState:
      "With no name, the caveat says that supplying the model name lets the tool cross-check it against the code, and offers asking the seller for a photo of the box bottom and the screws. With the name supplied, that prompt is gone. The VERDICT is 'Inconclusive' in both cases — only the caveat differs.",
    endResult: "Read-only; nothing persists.",
  },
  "checklist-content-discovery-authenticity-checker-authenticity-evasion-warning-survives": {
    roles: ["guest"],
    startPage: "/tools/authenticity",
    steps: [
      "Open /tools/authenticity.",
      "Type Pegasis in the model name field — note the spelling, 'sis' not 'sus'.",
      "If a typeahead offers canonical names, read them but do NOT pick one yet.",
      "Run the check and read every row under 'What I checked'.",
      "Note whether a trademark-evasion or fuzzy-spelling signal fired.",
      "Now clear the field, type Pegasis again, and this time PICK 'Storm Pegasus' from the typeahead.",
      "Run the check again and compare the signals.",
    ],
    inputs: { evasionSpelling: "Pegasis", canonical: "Storm Pegasus" },
    expectedBehaviour:
      "This is the hazard the whole separation exists for. The site search matcher deliberately treats 'Pegasis' as a match for 'Storm Pegasus' — its alias table is derived FROM a counterfeit seller's 1,277 titles, on the insight that an evasion spelling is the same string a buyer mistypes. This tool treats that same spelling as EVIDENCE. If picking a canonical name replaced what the user typed, the warning would be silenced by construction and the tool would confirm a fake using the exact spelling that indicates one.",
    expectedUiState:
      "The evasion/fuzzy signal fires in BOTH runs. A case asserting only 'the typeahead found it' would pass against precisely the bug this guards, so the second run is the one that matters.",
    endResult: "Read-only; nothing persists.",
  },
};
