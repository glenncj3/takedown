# Multiplayer setup (Supabase)

The networking code is already wired — `src/net/{supabase,room,channel,events}.ts`,
the Host/Join lobbies, the Zustand store hooks, and the desync detector are all
in place. What's left is the Supabase-side config and the local `.env` so the
multiplayer screens can actually reach a backend.

## What Supabase is doing for this game

Two responsibilities, nothing more:

1. **A `rooms` table** — a tiny lobby record so the joiner can look up a host
   by 6-char room code (`supabase/migrations/001_rooms.sql`).
2. **Realtime Broadcast channels** — once both clients know the room code,
   they exchange `init` / `move` / `hash` / `ready` messages on
   `room:<code>` (`src/net/channel.ts`). Game state itself never touches the
   database.

Trust model: clients trust each other. There's no server-side rules engine;
mismatches are detected by exchanging hashes after every move and routing to
the desync screen.

---

## Step 1 — Create a Supabase project

1. Go to <https://supabase.com> and sign in (free tier is fine).
2. **New project**. Pick:
   - **Name:** `takedown` (whatever you like).
   - **Database password:** save it in a password manager, but you won't
     actually need it for this game — anon-key access is all the app uses.
   - **Region:** closest to where you and your friend will play.
   - **Plan:** Free.
3. Wait ~2 minutes for provisioning.

## Step 2 — Run the migration

The migration creates the `rooms` table plus the RLS policies that let the
anon key insert/select/update.

1. In the Supabase dashboard sidebar: **SQL Editor** → **New query**.
2. Open `supabase/migrations/001_rooms.sql` from this repo, copy the whole
   file, paste it into the editor.
3. Click **Run**. You should see `Success. No rows returned`.
4. Verify in **Table Editor** → `rooms` exists with columns `code`,
   `host_name`, `joiner_name`, `status`, `created_at`.

## Step 3 — Enable Realtime on the rooms table (and verify Broadcast)

Broadcast channels (which is what the game actually uses) work out of the box
on every Supabase project — no toggle required. But making sure Realtime is
healthy is worth a quick check:

1. **Database** → **Replication** → confirm **Realtime** is enabled for the
   project (it is by default on new projects).
2. You do NOT need to enable `postgres_changes` for the `rooms` table — the
   lobby polls/queries `rooms` directly, and gameplay traffic is pure
   Broadcast.

## Step 4 — Grab the API credentials

1. **Project Settings** (gear icon) → **API**.
2. Copy two values:
   - **Project URL** → looks like `https://abcdefghijk.supabase.co`.
   - **anon / public key** → a long JWT starting with `eyJ…`. (Do NOT use the
     `service_role` key — that bypasses RLS and shouldn't ship to the
     browser.)

## Step 5 — Wire them into the local app

```bash
cp .env.example .env
```

Edit `.env`:

```
VITE_SUPABASE_URL=https://abcdefghijk.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...your-anon-key...
```

`.env` is gitignored. The vars are read lazily in `src/net/supabase.ts:9` —
single-player still works without them, so a missing/typo'd value only blows
up when you click Host or Join.

## Step 6 — Restart Vite and smoke-test locally

Vite only reads `.env` at startup; if `npm run dev` was already running, stop
it.

```bash
npm run dev
```

Open **two browser windows** (use one normal + one private/incognito so they
have separate localStorage):

1. Window A → **Host** → enter a name → **Create room** → copy the 6-char
   code.
2. Window B → **Join** → paste the code → enter a name → **Join**.
3. Both windows should land on the game board, with the host on the bottom
   and the joiner on top (rotated). Place a card; the other window should
   reflect it within ~200ms.

If both windows go to the **Desync** screen, your two clients computed
different hashes for the same move. Almost always this means one window has
stale code — hard-reload both.

## Step 7 — Play with a friend over the internet

There's no extra server config; the same `.env` works whether you're on
`localhost` or a deployed URL. Ship the dev/preview build however you like:

- **Quick share via Vite preview + tunnel:**
  ```bash
  npm run build && npm run preview
  # in another shell:
  npx localtunnel --port 4173    # or ngrok http 4173
  ```
- **Deploy to Vercel / Netlify / Cloudflare Pages:** point at this repo, set
  `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in the host's
  environment-variables panel, and run `npm run build` (output dir `dist/`).

Both players hit your deployed URL; the room code is the only thing they need
to share.

## Step 8 — Optional: stale-room cleanup

The `rooms` table grows by one row per hosted game. There's no security
boundary, so you can ignore it indefinitely, but if you want to keep it
clean, run this in the SQL editor (or schedule it via **Database** →
**Cron**):

```sql
delete from public.rooms
where created_at < now() - interval '1 hour'
  and status <> 'in-progress';
```

## Troubleshooting

| Symptom | Likely cause |
| --- | --- |
| `Supabase env vars are missing` toast on Host/Join | `.env` not present, or Vite wasn't restarted after editing it. |
| `Channel CHANNEL_ERROR` or `TIMED_OUT` thrown when hosting | Realtime is disabled at the project level, or the anon key is the `service_role` key by mistake. |
| Joiner sees `Room <code> not found` | Code typo, or the host's `createRoom` call failed silently — check the host's browser console for an RLS rejection. |
| Both clients land on the Desync screen on the first move | Code mismatch between the two windows — hard-reload both so they run the same engine. |
| `new row violates row-level security policy` in console | The migration didn't run cleanly; re-run `001_rooms.sql` and confirm the three `rooms_anon_*` policies exist under **Authentication → Policies → rooms**. |

That's the whole loop: project → migration → Realtime → anon key → `.env` →
restart → host + join.
