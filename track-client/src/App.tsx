import { BrowserRouter, Routes, Route, Link, Navigate } from 'react-router-dom'
import { EventsList } from './pages/EventsList'
import { Stub } from './pages/Stub'
import './App.css'

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
          <Route path="/events/:eventId" element={<Stub name="Event / Race" />} />
          <Route path="/cars/:carId" element={<Stub name="Car Detail" />} />
          <Route path="/calibrate" element={<Stub name="Calibrate Scale" />} />
          <Route path="*" element={<Navigate to="/events-list" replace />} />
        </Routes>
      </main>
    </BrowserRouter>
  )
}
