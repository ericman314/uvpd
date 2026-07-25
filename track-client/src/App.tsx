import { BrowserRouter, Routes, Route, Link, Navigate } from 'react-router-dom'
import { EventsList } from './pages/EventsList'
import { EventDetail } from './pages/EventDetail'
import { CarDetail } from './pages/CarDetail'
import { Welcome } from './pages/Welcome'
import { SerialEmulator } from './pages/SerialEmulator'
import './App.scss'

// App shell + routing. Routes mirror the Angular appStates.js so URLs match the
// old app one-to-one.
export function App() {
  return (
    <BrowserRouter>
      <header className="app-header">
        <Link to="/events-list">
          <img src="/img/logo-color-flat.png" alt="Utah Valley Pinewood Derby" />
        </Link>
        <div className="subtitle">Race Manager</div>
      </header>

      <main className="app-main">
        <Routes>
          <Route path="/" element={<Navigate to="/events-list" replace />} />
          <Route path="/events-list" element={<EventsList />} />
          <Route path="/events/:eventId" element={<EventDetail />} />
          <Route path="/events/:eventId/welcome" element={<Welcome />} />
          <Route path="/car/:carId" element={<CarDetail />} />
          <Route path="/emulator" element={<SerialEmulator />} />
          <Route path="*" element={<Navigate to="/events-list" replace />} />
        </Routes>
      </main>
    </BrowserRouter>
  )
}
