import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The track-client dev server runs on 8086 and proxies to the track-server on
// 8085. Everything the backend owns is forwarded so the React app behaves as if
// it were served same-origin. This proxy is the ONLY place the 8085 target is
// named — see src/api/config.ts for the single seam that lets the client later
// point somewhere other than same-origin (serial/BT/WiFi decoupling).
const TRACK_SERVER = 'http://localhost:8085'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 8086,
    proxy: {
      '/api': TRACK_SERVER,
      '/publicSiteUrl': TRACK_SERVER,
      '/mysqldump': TRACK_SERVER,
      // Car photos are served as static files by the track-server.
      '/cars': TRACK_SERVER,
      // socket.io needs websocket upgrade proxying, not just HTTP.
      '/socket.io': { target: TRACK_SERVER, ws: true },
    },
  },
})
