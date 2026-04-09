/**
 * @mohasinac/appkit/features/events/server
 *
 * Server-only entry point — exports only the API route handlers.
 */

export { GET as eventsGET, GET } from "./api/route";
export { GET as eventIdGET } from "./api/[id]/route";
