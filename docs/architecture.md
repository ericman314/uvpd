# Architecture notes

## Hosts

- **Track laptop**: a regular laptop the operator brings to the venue. Runs `track-server/server.js` directly. Talks to the Arduino timer over USB serial. Operator opens `localhost:8085` in a browser to drive the race.
- **Cloud VM**: `utahengineer-old`. Runs `cloud-api/uvpd.js` under `forever` on port 3001, plus nginx serving `public-site/` at `utahvalleypinewoodderby.com`.

The original `deploy.sh` in `track-server/` rsyncs to `pi@track.utahvalleypinewoodderby.com` — that was an abandoned plan to host the track-server on a Raspberry Pi at the venue and have the operator's laptop connect to it via WiFi/browser only. It was never finished. Treat the Pi paths in `deploy.sh` as historical until/unless we revive the idea.

## Data flow

1. Operator opens `http://localhost:8085` on the track laptop. The Angular UI loads from `track-server/public/`.
2. Operator creates an event, registers cars (with photos), runs heats. The Arduino timer reports start-gate releases and lane finish times over USB-serial; the track-server forwards these via socket.io to the operator's browser.
3. Track results, cars, and metadata are written to the *local* MySQL DB on the laptop.
4. Periodically (and after each race) the operator's browser hits `GET /mysqldump` on the track-server, gets back a `mysqldump --no-create-info --replace` payload, then POSTs it (along with the shared `apiSecret`) to `https://utahvalleypinewoodderby.com/api/v3/mysqldump`. The cloud API pipes the SQL into its own MySQL via `mysql --database pinewood`, replicating the day's results.
5. The public site's pages call `/api/v3/*` on the cloud to render results, leaderboards, the home page event-detection (`/api/v3/events?dayStart=0&dayEnd=9`), etc.
6. Check-ins from spectators (parents photographing their car at a kiosk) hit the cloud's `POST /api/v3/checkin` directly; the operator imports them into the active event from the track-server UI later.

## Shared secret

`apiSecret` (track-server `config.json`) === `secret` (cloud-api `config.js`). It guards `POST /api/v3/mysqldump` and the admin-y `GET /api/v3/checkinlist` endpoint. Do not reuse the live value when rotating — generate a new random string and put the same value in both configs.

## Schema

See `infra/schema.sql`. Notable tables:

- `Events`, `Cars`, `Results`, `Achievements` — core race data.
- `CheckIn` — pre-race spectator check-ins (photos uploaded via `/api/v3/checkin`).
- `Votes` — favorite-car voting.
- `BestTimes` — pre-aggregated; not currently written by `cloud-api/uvpd.js`. Possibly stale.
- `Users` — created during the never-deployed JWT auth experiment (see `LINKS.md`). Empty in production. Safe to drop later if we don't bring auth in.
- `ResultsFromMongo` — leftover from the 2018 Mongo→MySQL migration. Safe to drop.

## Runtime data (not in repo)

- `cloud-api/cars/` (~3200 jpgs), `checkin/` (~1800 jpgs), `videos/` (~750 webms): user-uploaded photos and replay videos. Live on the cloud VM, backed up out of band.
- `track-server/public/cars/` and `track-server/videos/`: same idea, on the laptop. The track UI references `/cars/<id>.jpg`; this dir contains the master copies that get pushed to the cloud.

If we ever rebuild the cloud VM, copy these dirs across with rsync — they aren't reproducible from the database alone.
