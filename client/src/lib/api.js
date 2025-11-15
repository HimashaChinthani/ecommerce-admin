import axios from 'axios'

const base = import.meta.env.VITE_API_URL || '/api'

const api = axios.create({
  baseURL: base,
})

// attach token if present
api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

export default api
