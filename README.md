# lemlist

Attio app integrating with [lemlist](https://lemlist.com) — a sales engagement platform.

## What it does

- **Record actions** — add a person to a lemlist campaign or open them in lemlist, directly from an Attio record page
- **Bulk record actions** — add multiple people to a lemlist campaign at once
- **Workflow blocks** — lemlist steps and triggers usable in Attio automations (add to campaign, create task, find email, verify email, enrich with LinkedIn data, pause lead, etc.)
- **Webhook triggers** — subscribe to lemlist activity events as Attio workflow triggers

## Setup

```bash
pnpm install
```

## Development

```bash
pnpm run dev
```

## Commands

| Command                 | Description              |
| ----------------------- | ------------------------ |
| `pnpm run dev`          | Start dev server         |
| `pnpm run build`        | Build + type-check       |
| `pnpm run lint`         | Run ESLint               |
| `pnpm run lint:fix`     | Run ESLint with auto-fix |
| `pnpm run format`       | Format with Prettier     |
| `pnpm run format:check` | Check formatting         |
| `pnpm run test`         | Run tests                |
| `pnpm run knip`         | Check for dead code      |

## Structure

See [AGENTS.md](./AGENTS.md) for full folder structure, coding guidelines, and SDK usage notes.
