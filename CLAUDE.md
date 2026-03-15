# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run setup        # First-time setup: install deps, generate Prisma client, run migrations
npm run dev          # Dev server with Turbopack on port 3000
npm run build        # Production build
npm run lint         # ESLint
npm run test         # Vitest unit tests (jsdom environment)
npm run db:reset     # Reset SQLite database
```

Requires an `ANTHROPIC_API_KEY` in `.env` for real AI generation; omitting it activates a mock provider.

## Architecture

**UIGen** is a Next.js 15 app where users describe React components in chat and Claude generates them with live preview.

### Data Flow

1. User message → `ChatInterface` → `/api/chat` (with serialized virtual file system state)
2. API route builds system prompt + tools, calls Claude via Vercel AI SDK
3. Claude generates code using two tools: `str_replace_editor` (view/create/edit files) and `file_manager` (rename/delete)
4. Tool results mutate the in-memory `VirtualFileSystem`
5. `PreviewFrame` re-renders the iframe when files change
6. On completion, authenticated users' projects (messages + file system) are saved to SQLite via Prisma

### Virtual File System (`src/lib/file-system.ts`)

All files live in memory — nothing is written to disk. The `VirtualFileSystem` class manages an in-memory tree and is serializable for database persistence. The AI always targets `/App.jsx` as the component entry point.

### Preview Pipeline (`src/lib/transform/jsx-transformer.ts`)

Three steps to turn virtual files into a live preview:
1. **`transformJSX()`** — Babel transpilation of JSX/TSX to JS
2. **`createImportMap()`** — Resolves local files to blob URLs and third-party packages via `esm.sh` CDN
3. **`createPreviewHTML()`** — Builds sandboxed iframe HTML with Tailwind, React ErrorBoundary, and the import map

### AI Integration (`src/lib/provider.ts`, `src/app/api/chat/route.ts`)

- Primary model: `claude-haiku-4-5`
- Falls back to `MockLanguageModel` (no API key) which returns canned demo components
- Up to 40 tool-call steps per generation (4 for mock)
- System prompt instructs Claude to style with Tailwind (no inline styles) and use `@/` for imports

### State Management

Two React contexts wrap the app:
- **`FileSystemContext`** — Virtual FS state + CRUD operations + tool-call execution bridge
- **`ChatContext`** — Wraps Vercel AI SDK `useChat`, wires tool results back to the file system

### Database Schema

The database schema is defined in `prisma/schema.prisma`. Reference this file any time you need to understand the structure of data stored in the database.

### Auth & Persistence

- JWT sessions in HTTP-only cookies (7-day expiry)
- Anonymous sessions: in-memory only; authenticated sessions: projects saved to SQLite
- Prisma schema: `User` (email/password) → `Project` (name, messages JSON, data JSON)
- Prisma client generated to `src/generated/prisma/`
- Middleware protects `/api/projects` and `/api/filesystem`

### Key Path Alias

`@/*` maps to `src/*` (tsconfig paths + Next.js).

## Coding Guidelines

- Use comments sparingly. Add comments only for complex or non-obvious code.
