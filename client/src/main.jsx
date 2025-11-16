import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './index.css'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import AdminDashboard from './pages/AdminDashboard'

function App() {
  const isLogged = !!localStorage.getItem('token')
  let storedUser = null
  try { storedUser = JSON.parse(localStorage.getItem('user') || 'null') } catch (e) { storedUser = null }
  const isAdmin = storedUser && storedUser.role === 'admin'

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login/>} />
        <Route path="/dashboard" element={isLogged && !isAdmin ? <Dashboard/> : <Navigate to="/login" replace />} />
        <Route path="/admin-dashboard" element={isLogged && isAdmin ? <AdminDashboard/> : <Navigate to="/login" replace />} />
        {/* Always send root and unknown paths to the login page first */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

createRoot(document.getElementById('root')).render(<App />)
