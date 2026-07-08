# AGENTS.md

This file provides guidance to AI agents working on the lemlist Attio app.

## Context

This is an Attio App SDK app. It integrates Attio CRM with lemlist (sales engagement platform), enabling:

- Adding people to lemlist campaigns from Attio records (single + bulk)
- Workflow blocks for lemlist actions (add to campaign, create task, find email, verify email, etc.)
- Lemlist webhook events as Attio workflow triggers
- Enrichment blocks (find email, find phone, get LinkedIn data)

## File and folder structure

| Path                         | Description                                                                                             |
| ---------------------------- | ------------------------------------------------------------------------------------------------------- |
| `src/app.ts`                 | Main entrypoint — registers record actions, bulk actions, and app settings                              |
| `src/app.settings.ts`        | App-level settings schema (workspace settings)                                                          |
| `src/workspace-settings.tsx` | Workspace settings UI component                                                                         |
| `src/error-codes.ts`         | App-specific error code constants                                                                       |
| `src/attio/`                 | Attio REST API client and data mapping (people, companies, attribute values)                            |
| `src/lemlist-api/`           | Lemlist API client, Zod schemas, endpoint helpers, and error handling                                   |
| `src/blocks/`                | Workflow block definitions — each subfolder is one block (`block.ts`, `configurator.tsx`, `execute.ts`) |
| `src/record/actions/`        | Single-record actions rendered in Attio record pages                                                    |
| `src/record/bulk-actions/`   | Bulk record actions for operating on multiple records at once                                           |
| `src/utils/`                 | Shared utility functions and React hooks used across the app                                            |
| `src/graphql/`               | GraphQL queries for the Attio GraphQL API                                                               |
| `test/`                      | Vitest tests — mirrors `src/` structure                                                                 |

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
