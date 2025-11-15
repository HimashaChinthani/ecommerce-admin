import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './index.css'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'

function App() {
  const isLogged = !!localStorage.getItem('token')
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login/>} />
        <Route path="/dashboard" element={isLogged ? <Dashboard/> : <Navigate to="/login" replace />} />
        <Route path="/" element={<Navigate to={isLogged ? '/dashboard' : '/login'} replace />} />
      </Routes>
    </BrowserRouter>
  )
}

createRoot(document.getElementById('root')).render(<App />)
