import { io, type Socket } from 'socket.io-client'
import { SOCKET_URL } from './config'

// Server -> client events emitted by the track-server (see server.js
// handleSerialData): the live race/timer feed.
export type ServerToClient = {
  startingGateReleased: () => void
  trigger: (data: { lane: number; time: number; softwareTime: number }) => void
  readyForStart: () => void
  pinStateChange: (data: { lane: number; state: number }) => void
  arduinoError: (data: string) => void
  // Serial connection status the polling loop emits.
  serialState: (data: { connected: boolean; port?: string; err?: unknown }) => void
}

// Client -> server events the track-server listens for.
export type ClientToServer = {
  simulate: (data: string) => void
}

let socket: Socket<ServerToClient, ClientToServer> | null = null

// One shared connection for the whole app. Empty SOCKET_URL means same-origin,
// which the Vite proxy upgrades to a websocket against the track-server.
export function getSocket(): Socket<ServerToClient, ClientToServer> {
  if (!socket) {
    socket = io(SOCKET_URL, { autoConnect: true })
  }
  return socket
}
