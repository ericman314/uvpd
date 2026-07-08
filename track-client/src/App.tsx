import { BrowserRouter, Routes, Route, Link, Navigate } from 'react-router-dom'
import { EventsList } from './pages/EventsList'
import { EventDetail } from './pages/EventDetail'
import { CarDetail } from './pages/CarDetail'
import { Stub } from './pages/Stub'
import './App.scss'

// App shell + routing. Routes mirror the Angular appStates.js so URLs match the
// old app one-to-one; pages not yet ported render a Stub placeholder.
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
          <Route path="/car/:carId" element={<CarDetail />} />
          <Route path="/calibrate" element={<Stub name="Calibrate Scale" />} />
          <Route path="*" element={<Navigate to="/events-list" replace />} />
        </Routes>
      </main>
    </BrowserRouter>
  )
}
