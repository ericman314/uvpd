# Utah Valley Pinewood Derby

Three components, one repo:

| Dir | Runs on | What it does |
|---|---|---|
| `track-server/` | The operator's laptop, brought to the venue | Talks USB-serial to the Arduino timer at 115200 baud. Serves the Angular operator UI on `localhost:8085`. After each race, the operator's browser pulls a `mysqldump` from this server and POSTs it to the cloud API. |
| `cloud-api/` | The cloud VM (`utahengineer-old:nodejs/utahvalleypinewoodderby/`), as `uvpd-v3.js` under `forever` | Public REST + socket.io API on port 3001. Receives mysqldumps from the track, serves event/car/result data to the public site, accepts check-ins and votes. |
| `public-site/` | nginx doc-root on the same cloud VM (`/var/www/utahvalleypinewoodderby/public_html/`) | Static HTML/SHTML site at https://utahvalleypinewoodderby.com — landing page, results, check-in, simulation. |

`infra/` holds the MySQL schema. `archive/` holds older code we don't want to lose but isn't running. See `docs/architecture.md` for data flow and notes.

## Architecture (one-liner)

```
Arduino timer ──serial──▶ track-server (laptop)  ◀── operator browser (Angular UI)
                                                  │
                                                  └── HTTPS POST mysqldump ──▶ cloud-api ──▶ MySQL
                                                                                 ▲
                                                                                 │ /api/v3/*
                                                                              public-site (nginx)
                                                                                 ▲
                                                                                 │ HTTPS
                                                                              spectators
```

## Deploy

Each component has its own `deploy.sh`. Run from inside that directory:

- `track-server/deploy.sh` — rsync to a Pi (`pi@track.utahvalleypinewoodderby.com`). **Abandoned plan; not currently used** — the track-server runs on a laptop directly. Kept for reference; revive if we ever finish the Pi setup.
- `cloud-api/deploy.sh` — rsync to the cloud VM, restart `forever`. *(To be written.)*
- `public-site/deploy.sh` — rsync to the cloud VM doc-root. *(To be written.)*

Real configs (`config.json`, `config.js`) are gitignored. Use the `*.example.*` files as templates and place real configs on each host manually.

## Related repos

There are two GitHub repos with abandoned/unfinished rewrites of pieces of this system. They are *not* vendored here — see `LINKS.md`.
