// The single seam between the client and the track-server.
//
// In dev, this is empty string: requests go to the same origin (:8086) and
// Vite's proxy forwards them to the track-server (:8085). This is the ONE place
// that changes if the client is later hosted apart from the track-server and
// must reach it over a different transport (a remote HTTP host, or a bridge in
// front of serial/Bluetooth/WiFi). Nothing else in the app should hardcode a
// host or port.
export const API_BASE = import.meta.env.VITE_TRACK_SERVER_URL ?? ''

// socket.io connects to the same base. Empty string means same-origin, which
// the Vite proxy upgrades to a websocket against the track-server.
export const SOCKET_URL = API_BASE
