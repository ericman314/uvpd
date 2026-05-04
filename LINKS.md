# Related repos (not vendored)

- **https://github.com/ericman314/pinewood-server** — 2024-08 in-progress rewrite of the cloud API with JWT auth, bcrypt passwords, and a `/api/v4/user/*` surface. The repo is named `pinewood-server` but its main file is `uvpd-v4.js`. Never deployed. The live cloud API in this monorepo (`cloud-api/uvpd.js`) is the older v3 logic without those features. If we ever want to bring user/auth into the system, start from that repo's `uvpd-v4.js`.

- **https://github.com/ericman314/pinewood-bluetooth** — 2021-05 attempt at a complete rewrite. React client, Web Bluetooth API talking to the track directly (skipping the serial-port-on-Pi architecture entirely), backed by the v4 API server above. Unfinished; abandoned. Includes an `arduino-pinewood-bluetooth.ino` sketch for a BLE-peripheral version of the timer.
