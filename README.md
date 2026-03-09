# Shards of Affinity

A turn-based dungeon crawler RPG with real-time battle mechanics.

## Main Features

- Dungeon runs with multiple rounds of enemies
- Turn-based combat with timeline-based battle events
- Shared game logic between frontend and backend for consistent combat rules
- Characters with progression-based stats like health, mana, level, and XP
- Spell system with mana costs, target rules, damage/healing logic, and effects
- Enemy definitions with reusable combat behavior and stat blocks
- Persistent dungeon state, participants, enemies, loot, and battle results
- Real-time battle updates over WebSockets via Durable Objects
- Authenticated player accounts using Clerk

## Technical Decisions

- **Monorepo with Bun workspaces**: keeps the client, server, and shared game engine in one repo while making local development and shared types straightforward.
- **Shared `apps/game` package**: combat logic lives in a pure TypeScript package so battles are not reimplemented differently on the client and server.
- **React + Vite on the client**: fast local iteration, simple build pipeline, and a lightweight setup for a game UI.
- **TanStack Router**: file-based routing with solid TypeScript support and predictable route organization.
- **TanStack Query + tRPC**: typed end-to-end API calls with good client-side caching and minimal API glue code.
- **Cloudflare Workers + Hono on the server**: low-overhead edge runtime with a small, fast HTTP framework.
- **Durable Objects for battle sessions**: a natural fit for real-time battle state and WebSocket coordination.
- **Drizzle ORM + PostgreSQL**: typed schema-driven database access without giving up SQL clarity.
- **Clerk for authentication**: offloads auth complexity and keeps the app focused on game systems.
- **Seeded RNG in battles**: deterministic battle behavior makes replays, debugging, and validation much easier.

## Project Structure

This is a monorepo with three main apps:

```text
apps/
├── client/   React frontend
├── server/   Cloudflare Workers API
└── game/     Shared game logic
```

## Tech Stack

### Client

- React 19
- Vite
- TanStack Router
- TanStack Query
- Zustand
- Tailwind CSS v4
- shadcn/ui
- tRPC client

### Server

- Cloudflare Workers
- Hono
- tRPC
- Drizzle ORM
- PostgreSQL
- Clerk
- Durable Objects

### Shared Game Engine

- TypeScript
- Battle system
- Spells, effects, enemies, items, and dungeon definitions

## Development

```bash
# Run everything
bun run dev

# Run apps individually
bun run dev:client
bun run dev:server

# Database commands
bun run db:push
bun run db:push:prod
bun run db:studio

# Deploy
bun run deploy
```

## Environment

- Doppler is used for secrets management
- Dev and production configs are supported
