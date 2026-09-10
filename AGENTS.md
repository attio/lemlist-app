# AGENTS.md

This file provides guidance to AI agents working on the lemlist Attio app.

## Context

This is an Attio App SDK app. It integrates Attio CRM with lemlist (sales engagement platform), enabling:

- Adding people to lemlist campaigns from Attio records (single + bulk)
- Workflow blocks for lemlist actions (add to campaign, create task, find email, verify email, etc.)
- Lemlist webhook events as Attio workflow triggers
- Enrichment blocks (find email, find phone, get LinkedIn data)

## File and folder structure

| Path                              | Description                                                                      |
| --------------------------------- | -------------------------------------------------------------------------------- |
| `src/app/blocks/`                 | Workflow blocks, one folder per block, files kept together                       |
| `src/app/extensions/`             | Record actions and bulk actions, one folder each                                 |
| `src/app/events/`                 | Connection lifecycle handlers                                                    |
| `src/app/webhooks/`               | Inbound webhook handlers                                                         |
| `src/app/server-functions/`       | `.server.ts` bridges between client code and lemlist-api                         |
| `src/app/settings/`               | Workspace settings schema and page                                               |
| `src/lemlist-api/`                | One file per lemlist resource, each owning its request, schema and error meaning |
| `src/lemlist-api/transport/`      | HTTP client, auth, URLs, and error classification. No app behaviour              |
| `src/attio/`                      | Attio REST API access and record mapping                                         |
| `src/services/enrichment/`        | Enrichment work that spans several lemlist-api calls                             |
| `src/common/`                     | Generic reused code with no lemlist knowledge (logging, string helpers)          |
| `src/hooks/`                      | Combobox option providers used by configurators                                  |
| `src/record/`                     | UI and mapping behind the record and bulk actions                                |
| `src/graphql/`                    | GraphQL queries for the Attio GraphQL API                                        |
| `test/`                           | Vitest helpers and mocks; specs live next to the code as `*.spec.ts`             |

## Workflow blocks

| Block                | Type    | Description                                              |
| -------------------- | ------- | -------------------------------------------------------- |
| `add-to-campaign`    | step    | Add a person as a lead in a lemlist campaign             |
| `create-task`        | step    | Create a task in lemlist                                 |
| `find-email`         | step    | Find email address via lemlist enrichment                |
| `find-phone-number`  | step    | Find phone number via lemlist enrichment                 |
| `get-leads-by-email` | step    | Fetch lemlist leads matching an email                    |
| `get-linkedin-data`  | step    | Enrich person with LinkedIn data                         |
| `verify-email`       | step    | Verify an email address via lemlist                      |
| `lemlist-activity`   | trigger | Subscribe to lemlist webhook events as workflow triggers |
| `pause-lead`         | step    | Pause a lead in a lemlist campaign                       |

### Enrichment webhooks

lemlist caps an account at **200 webhooks**, counting ones it has disabled. Registering one per
enrichment exhausted that cap and broke every enrichment step for the account (APP-96), so the
four enrichment blocks now share one webhook per install instead.

| File                                               | Role                                                                      |
| -------------------------------------------------- | ------------------------------------------------------------------------- |
| `src/services/enrichment/register-webhooks.ts`     | Registers the shared webhooks and tracks them in KV                       |
| `src/services/enrichment/orphaned-webhooks.ts`     | Disabled-webhook detection all enrichment webhook cleanup uses            |
| `src/services/enrichment/callback-store.ts`        | Maps a lemlist enrichment id to the run's `finishCallbackUrl`             |
| `src/services/enrichment/execute-enrichment.ts`    | Starts an enrichment and records where its result should go               |
| `src/services/enrichment/parse-enrichment-finish.ts` | Reads the payload a `finish.ts` handler receives                        |
| `src/services/enrichment/deliver.ts`               | Posts a finished enrichment back to the run waiting on it                 |
| `src/app/webhooks/enrichment.webhook.ts`           | Receives every enrichment result and forwards it to the run waiting on it |

`ensureEnrichmentWebhooks` runs before each enrichment starts and costs a KV read, plus at
most one `GET /hooks` per minute. That listing checks the stored registrations are still live,
so a webhook lemlist has disabled gets replaced instead of silently dropping every later
run, and deletes any disabled webhook matching our pattern along the way. If nothing is
stored yet, the first run stamps `verified-at` and creates the pair. Any other run in that
minute waits up to the cleanup budget and re-reads KV instead of minting its own webhooks,
so a bulk cannot refill the 200 cap. If the pair is still missing after that wait, the run is
retryable rather than creating. The winner still lists before creating, so an
already-littered account gets cleaned before its first create attempt. A badly littered
account just takes more than one pass to come fully clean.

On top of that, a `409` from lemlist (its response when the account is full) triggers an
extra, unthrottled sweep right before the one retry, so a conflict recovers without waiting
on the once-a-minute cadence above. There is no "already cleaned" marker — sweeping is safe
to repeat, so both paths just do it every time they run.

Stamping `verified-at` before creating is a best-effort lock, not a hard one — `kv` has no
compare-and-swap, so two runs can both see it unset and both create a pair. Cleanup does
**not** try to catch that: an enabled `enrichmentDone`/`enrichmentError` webhook matching our
type, host, and workspace is not proof it came from our own registration code — someone
could point their own webhook at the same shape of URL — so it is never deleted just for
looking like an untracked duplicate. A race-created pair only clears once lemlist disables
one of them, which the disabled-webhook cleanup below then picks up. Until then it counts
against the 200 cap like any other webhook.

Two rules when working here:

- Never register a webhook per execution or per run.
- Cleanup only deletes `enrichmentDone` / `enrichmentError` webhooks on an Attio callback
  host that lemlist has disabled. It never deletes an enabled webhook, tracked or not —
  loosening that risks deleting a live webhook belonging to the customer, another
  workspace, or another integration that happens to share this lemlist account. The spec
  next to it pins this down.

`lemlist-activity` triggers are a separate system (`webhook-lifecycle.ts` beside that block): one webhook
per active trigger, removed on deactivation. Don't merge the two.

`parseEnrichmentFinishPayload` still accepts lemlist's raw per-run payload so enrichments
in flight at deploy can finish. That shim, and `uniqueExecutionId` / `no-op` on the four
`finish.ts` files, go away in the follow-up PR.

## Environment

### Client-side code

Runs in browser inside a sandboxed custom JS runtime. Constraints:

- MUST NOT render HTML tags directly (`<div>`, etc.) — use App SDK components only
- MUST NOT use custom CSS or styles
- MUST NOT call `fetch` directly — use server-side functions instead
- Files rendering React components MUST use `.tsx` extension

### Server-side code

Runs in files ending in `.server.ts`, `.webhook.ts`, `.event.ts`. Custom JS runtime (not Node.js) — some Node.js APIs are unavailable.

## Using the Attio App SDK

Three packages:

- `attio/client` — client-side imports
- `attio/server` — server-side imports
- `attio` — shared/environment-agnostic imports

Always verify imports against existing examples, TypeScript types, or SDK docs. Never guess.

## Architecture

Follows the shared Attio app docs: entry points in `app/`, lemlist HTTP in `lemlist-api/`
with transport split out, `services/` only where behaviour spans several API calls, and
`common/` for code with no lemlist knowledge. Data shaped for lemlist but reused across more
than one caller (e.g. `person-for-campaign.ts`) stays in `lemlist-api/` alongside the resource
files that consume it, rather than in `common/` — being reused by several callers is not the
same as being generic. There are no procedures here; lemlist-api operations are plain exported
functions returning `AsyncResult`.

Two rules the transport layer exists to protect:

- `getWorkspaceConnection()` is called outside the try/catch. It throws an `AttioError`
  that drives the connection dialog, and catching it shows a network failure instead.
- Errors gain meaning on the way up: HTTP status becomes a `LemlistErrorCode` in
  transport, and only presentation calls `lemlistErrorMessage`. Nothing below that builds
  a member-facing string, and status codes never leave transport.

## Coding guidelines

- Use Zod to validate data from external APIs (lemlist responses)
- Only include properties in Zod schemas that are explicitly needed
- Use `try/catch` around `.json()` calls
- Use `console.error` for unexpected errors — do NOT log sensitive data (emails, passwords)
- Handle API errors gracefully — return fallback UI in React components, never throw
- Prefer named arguments over positional when using 3+ args
- No `any` — type errors must be fixed properly

### Error messages (user-facing)

- Never dump raw JSON, HTTP status codes, or square brackets in UI error messages
- Never expose transport-layer details — say "An unexpected error occurred when calling lemlist's API" not "503 from lemlist"
- Auth errors must name the missing scope and tell the user where to configure it (e.g. "Your lemlist API key is missing the 'Campaigns: Read' permission. Update it at app.lemlist.com → Settings → API")
- Set the workflow `retryable` flag from `isRetryable`. Do not special-case creates. The client already retries 429s in-process against Retry-After.

## Validation commands

```bash
pnpm run build          # type-check via attio build
pnpm run lint           # eslint
pnpm run lint:fix       # eslint --fix
pnpm run format:check   # prettier check
pnpm run format         # prettier write
pnpm run test           # vitest run
pnpm run knip           # dead code check
```
