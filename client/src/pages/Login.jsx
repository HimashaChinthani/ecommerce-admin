import React, { useState } from 'react'
import api from '../lib/api'
import Toast from '../components/Toast'
import { useNavigate } from 'react-router-dom'

export default function Login(){
  const [email, setEmail] = useState('admin@local.test')
  const [password, setPassword] = useState('Admin123!')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState(null)
  const navigate = useNavigate()

  async function submit(e){
    e.preventDefault()
    setLoading(true)
    setError('')
    try{
      const res = await api.post('/login', { email, password })
      const { token } = res.data
      if (!token) throw new Error('No token returned')
      // persist token and set default header for immediate requests
      localStorage.setItem('token', token)
      api.defaults.headers.common.Authorization = `Bearer ${token}`
      navigate('/dashboard')
    }catch(err){
      // Surface helpful messages from backend when present
      const serverMessage = err?.response?.data?.message || err?.response?.data?.error
      const msg = serverMessage || err.message || 'Login failed'
      setError(msg)
      setToast({ message: msg, type: 'error' })
    }finally{setLoading(false)}
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-50 to-indigo-50 px-4">
      <div className="max-w-md w-full p-8 bg-white rounded-3xl shadow-2xl border border-gray-100">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-extrabold text-gray-900">Welcome back</h1>
          <p className="text-sm text-gray-500">Sign in to manage your eCommerce store</p>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600">Email</label>
            <input autoFocus name="email" type="email" required className="mt-1 block w-full rounded-lg border border-gray-200 shadow-sm p-3 focus:outline-none focus:ring-2 focus:ring-sky-300" value={email} onChange={e=>setEmail(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600">Password</label>
            <input name="password" type="password" required className="mt-1 block w-full rounded-lg border border-gray-200 shadow-sm p-3 focus:outline-none focus:ring-2 focus:ring-sky-300" value={password} onChange={e=>setPassword(e.target.value)} />
          </div>
          {error && <div className="text-sm text-red-600 bg-red-50 p-2 rounded">{error}</div>}
          <button disabled={loading} className="w-full py-3 px-4 bg-gradient-to-r from-sky-500 to-indigo-600 text-white rounded-lg font-semibold shadow hover:opacity-95 disabled:opacity-60">
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
        <div className="mt-6 text-center text-sm text-gray-500">
          Demo admin: <strong>admin@local.test</strong> / <strong>Admin123!</strong>
        </div>
      </div>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
