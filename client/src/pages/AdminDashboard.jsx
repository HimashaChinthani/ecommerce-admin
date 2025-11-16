import React, { useEffect, useState } from 'react'
import api from '../lib/api'
import Toast from '../components/Toast'

export default function AdminDashboard(){
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(()=>{
    let mounted = true
    async function load(){
      try{
        const res = await api.get('/stats')
        if (!mounted) return
        setStats(res.data || null)
      }catch(err){
        console.error('Failed to fetch admin stats', err)
        setError(err?.response?.data?.error || err.message || 'Failed to load stats')
      }finally{ if (mounted) setLoading(false) }
    }
    load()
    return () => { mounted = false }
  },[])

  if (loading) return <div className="p-6">Loading...</div>
  if (error) return <div className="p-6 text-red-600">{error}</div>
  if (!stats) return <div className="p-6">No data</div>

  const { totalUsers, revenue, products = [], categories = [], recentOrders = [] } = stats

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white">
      <div className="max-w-6xl mx-auto p-6">
        <header className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-sm text-gray-600">Revenue, products and categories overview</p>
          </div>
          <div>
            <button
              type="button"
              onClick={() => window.open('/admin', '_blank')}
              className="text-sm text-sky-600 hover:underline"
            >Open Admin UI</button>
          </div>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="p-6 bg-white rounded-lg shadow">
            <div className="text-sm text-gray-500">Revenue</div>
            <div className="mt-2 text-3xl font-extrabold text-green-600">${Number(revenue||0).toFixed(2)}</div>
            <div className="text-xs text-gray-400 mt-1">Total revenue</div>
          </div>
          <div className="p-6 bg-white rounded-lg shadow">
            <div className="text-sm text-gray-500">Products</div>
            <div className="mt-2 text-3xl font-extrabold text-sky-600">{products.length}</div>
            <div className="text-xs text-gray-400 mt-1">Total products</div>
          </div>
          <div className="p-6 bg-white rounded-lg shadow">
            <div className="text-sm text-gray-500">Categories</div>
            <div className="mt-2 text-3xl font-extrabold text-indigo-700">{categories.length}</div>
            <div className="text-xs text-gray-400 mt-1">Total categories</div>
          </div>
          <div className="p-6 bg-white rounded-lg shadow">
            <div className="text-sm text-gray-500">Users</div>
            <div className="mt-2 text-3xl font-extrabold text-gray-800">{totalUsers}</div>
            <div className="text-xs text-gray-400 mt-1">Registered users</div>
          </div>
        </section>

        <section className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Products</h2>
            <div className="text-sm text-gray-500">All items</div>
          </div>

          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                <tr>
                  <th className="p-3">Product</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Price</th>
                  <th className="p-3">Stock</th>
                </tr>
              </thead>
              <tbody>
                {products.length === 0 && (
                  <tr><td className="p-6" colSpan={4}>No products</td></tr>
                )}
                {products.map(p => (
                  <tr key={p.id} className="border-t hover:bg-gray-50">
                    <td className="p-3 font-medium">{p.name}</td>
                    <td className="p-3 text-sm text-gray-600">{p.category ? p.category.name : '—'}</td>
                    <td className="p-3 font-semibold text-green-600">${Number(p.price||0).toFixed(2)}</td>
                    <td className="p-3">{p.stock}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Categories</h2>
            <div className="text-sm text-gray-500">All categories</div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {categories.length === 0 && <div className="text-gray-500">No categories</div>}
              {categories.map(c => (
                <div key={c.id} className="p-3 bg-gray-50 rounded border text-sm text-gray-700">{c.name}</div>
              ))}
            </div>
          </div>
        </section>

      </div>
    </div>
  )
}
