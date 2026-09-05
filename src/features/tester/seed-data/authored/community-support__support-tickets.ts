/*
 * WHY: Authored six-part procedures for the community-support/support-tickets page.
 * WHAT: 3 case(s), keyed by full checklist id.
 *
 * Written by hand, case by case, against the label each one states. There is no
 * generator: the authoring scripts were deleted once it was clear they were
 * scaffolding around work that is simply writing.
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
  "checklist-community-support-support-tickets-create-ticket": {
    roles: ["buyer"],
    startPage: "/user/support",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123!.",
      "Open /user/support.",
      "Click the control that starts a new ticket.",
      "Type 'QA Ticket create-ticket' in the subject field.",
      "Select 'Orders' as the category.",
      "Type 'Raised by the tester checklist to confirm ticket creation persists.' in the message field.",
      "Submit the ticket.",
      "Reload /user/support.",
    ],
    inputs: {
      subject: "QA Ticket create-ticket",
      category: "Orders",
      message: "Raised by the tester checklist to confirm ticket creation persists.",
    },
    expectedBehaviour:
      "A ticket document is created against this buyer with a ticket- prefixed id, an open status, and the first message stored as its opening entry rather than as a separate field the reply thread cannot see.",
    expectedUiState:
      "The list gains a row reading 'QA Ticket create-ticket' with an open status and the Orders category. Opening it shows the submitted message as the first entry in the thread.",
    expectedData: { subject: "QA Ticket create-ticket", status: "open" },
    endResult:
      "The row is still there after the reload. A ticket that appears once and is gone on refresh was written to component state, not to Firestore.",
  },
  "checklist-community-support-support-tickets-reply-ticket": {
    roles: ["buyer"],
    startPage: "/user/support",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123!.",
      "Open /user/support and open the ticket named 'QA Ticket create-ticket'.",
      "Read how many messages the thread holds.",
      "Type 'QA Reply reply-ticket — second message in the thread.' in the reply box.",
      "Submit the reply.",
      "Reload the page.",
    ],
    inputs: { reply: "QA Reply reply-ticket — second message in the thread." },
    expectedBehaviour:
      "The reply is appended to the ticket's own message array in a transaction, so two replies sent quickly cannot overwrite one another. An ordinary reply that carries no status change costs one write and no read — the ticket is only re-read when a status accompanies the message.",
    expectedUiState:
      "The thread gains a second entry with the typed text, attributed to the buyer and timestamped. The earlier message is still above it, unchanged. The ticket's status has not silently moved to resolved.",
    expectedData: { threadMessageCount: 2 },
    endResult:
      "Both messages survive the reload in the same order. A reply that replaces the first message rather than appending is the failure this case catches.",
  },
  "checklist-community-support-support-tickets-support-tickets-search-box": {
    roles: ["buyer"],
    startPage: "/user/support",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123!.",
      "Open /user/support and read the total number of rows.",
      "Type 'QA Ticket' in the search box.",
      "Read the rows.",
      "Clear the box and type 'zzzznope'.",
      "Read the rows.",
      "Clear the box, then use the status filter to select a status and read the rows.",
      "Toggle 'Hide resolved/closed' and read the rows.",
    ],
    inputs: { matchingQuery: "QA Ticket", nonsenseQuery: "zzzznope" },
    expectedBehaviour:
      "This list moved onto the shared listing scaffold, which supplies search over subject, id and category for free. The pre-existing status filter and the hide-resolved toggle have to keep working across that conversion — a migration that adds one affordance and quietly drops two is a net loss.",
    expectedUiState:
      "'QA Ticket' narrows the list to matching subjects. 'zzzznope' returns an empty state, not the full list — that is the control which proves the box filters rather than decorates. The status filter changes which rows appear, and the toggle removes resolved and closed rows.",
    expectedData: { nonsenseResultCount: 0 },
    endResult:
      "Nothing persists; search and filter state live in the URL, so reloading reproduces the same narrowed list.",
  },
};
