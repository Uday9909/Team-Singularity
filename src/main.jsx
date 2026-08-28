import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import Dashboard from './App.jsx'
import Architecture from './pages/Architecture.jsx'
import Stack from './pages/Stack.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Architecture />} />
        <Route path="/landing" element={<Dashboard />} />
        <Route path="/stack" element={<Stack />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
