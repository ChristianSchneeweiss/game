# Loot Game

A turn-based dungeon crawler RPG with real-time battle mechanics.

## Project Structure

This is a monorepo using Bun workspaces with three packages:

```
apps/
├── client/     # React frontend (Vite, TanStack Router, tRPC client)
├── server/     # Cloudflare Workers backend (Hono, tRPC, Drizzle ORM)
└── game/       # Shared game logic (battle system, spells, enemies, items)
```

## Tech Stack

### Client (`@loot-game/client`)

- **Framework**: React 19 with Vite
- **Routing**: TanStack Router (file-based routes in `src/routes/`)
- **State**: Zustand, TanStack Query
- **Styling**: Tailwind CSS v4, shadcn/ui components
- **API**: tRPC client with superjson
- **Auth**: Clerk

### Server (`@loot-game/server`)

- **Runtime**: Cloudflare Workers with Wrangler
- **Framework**: Hono
- **API**: tRPC with Hono adapter
- **Database**: PostgreSQL via Drizzle ORM (Neon serverless)
- **Auth**: Clerk backend
- **Real-time**: Durable Objects for battle WebSockets

### Game (`@loot-game/game`)

- Pure TypeScript game logic, shared between client and server
- Battle system with turn-based combat
- Spell, effect, enemy, and item definitions

## Key Directories

- `apps/client/src/routes/` - TanStack Router file-based routes
- `apps/client/src/components/ui/` - shadcn/ui components
- `apps/server/src/routers/` - tRPC routers
- `apps/server/src/db/` - Drizzle schema and database utilities
- `apps/server/src/durable-objects/` - Cloudflare Durable Objects (battle WS)
- `apps/game/src/spells/` - Spell definitions
- `apps/game/src/enemies/` - Enemy definitions
- `apps/game/src/items/` - Item/equipment definitions
- `apps/game/src/effect/` - Status effect implementations
- `apps/game/src/dungeons/` - Dungeon configurations
- `apps/game/src/passive-skills/` - Passive skill definitions

## Development Commands

```bash
# Run all apps in dev mode
bun run dev

# Run individual apps
bun run dev:client    # Client on port 3001
bun run dev:server    # Server on port 3000

# Database (from apps/server)
bun run db:push       # Push schema to dev database
bun run db:push:prod  # Push schema to production
bun run db:studio     # Open Drizzle Studio

# Deploy
bun run deploy        # Build client + deploy server to Cloudflare
```

## Environment

- Uses Doppler for secrets management
- Dev and production configs available (`doppler run` vs `doppler run -c prd`)

## Game Concepts

### Entities

Characters and enemies are both `Entity` types with stats:

- Health, Mana
- Intelligence, Vitality, Agility, Strength
- Level, XP

### Battle System

- Turn-based combat managed by `BattleManager`
- Timeline events track all battle actions
- Seeded RNG via seedrandom for deterministic replays
- Effects: DOT, HOT, Shield, Stun, Armor debuff, etc.

### Spells

Located in `apps/game/src/spells/`. Each spell has:

- Type identifier
- Mana cost
- Target selection (self, enemy, ally, AOE)
- Damage/healing calculations
- Optional effect application

### Dungeons

Multiple rounds of enemies. Character progress persists between rounds.

## Database Schema

Key tables (defined in `apps/server/src/db/schema.ts`):

- `user` - Clerk user data
- `character` - Player characters with stats
- `spell_stats`, `passive_skill_stats`, `equipment_stats` - Owned/equipped items
- `dungeon_data`, `dungeon_participant`, `dungeon_enemy` - Dungeon state
- `battle_result` - Completed battle records with timeline data
- `loot` - Battle rewards
