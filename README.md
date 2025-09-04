# **Pawer** — MacOS battery tracker with Telegram notifications

## Stack
- **Frontend**: SwiftUI
- **Backend**: Node.js, Fastify + websocket plugin, zod

## Achievements
### ✓ Database-less architecture
  - Initially used SQLite to map `UID + Telegram chat_id`, exposing CRUD endpoints for `/users/{uid}` and `/notifications/{uid}`.
  - Optimized by shifting `chat_id` storage to the client, eliminating the need for a database lookups and removing the database layer.

**Result** → simpler architecture, fewer server hits, and faster request handling.

### ✓ Instant telegram linking via WebSocket
  - Replaced polling with WebSocket connection.
  - Connection is established before redirecting user to the Telegram bot
  - Server can instantly push the data from Telegram webhook response back.

**Result** → near-zero latency on linking, smoother UX.

## What needs improvement
  - WebSocket connection handling. Right now, it’s just a plain `Map` with no cleanup for dead/hanging sockets and no connection limits.

## How to try

Server is deployed on render.com, so just:

```bash
git clone https://github.com/viksync/pawer
cd pawer/client
xcodebuild -scheme Pawer -configuration Debug -derivedDataPath build/
open build/Build/Products/Debug/Pawer.app
``` 
