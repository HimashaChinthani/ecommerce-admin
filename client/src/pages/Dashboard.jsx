import React, { useEffect, useState } from 'react'
import api from '../lib/api'
import Toast from '../components/Toast'
import StatCard from '../components/StatCard'

function Header({ onOpenProfile, isAdmin, onOpenCreate, onCreateCategory }){
  return (
    <header className="bg-white/60 backdrop-blur-sm shadow-md sticky top-0 z-20">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center text-white font-extrabold text-lg">eC</div>
          <div>
            <div className="font-semibold text-lg">eCommerce</div>
            <div className="text-xs text-gray-500">Admin dashboard</div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {isAdmin && (
            <>
              <button onClick={onOpenCreate} className="text-sm text-white bg-sky-600 px-3 py-1 rounded">New product</button>
              <button onClick={onCreateCategory} className="text-sm text-sky-600 border border-sky-600 px-3 py-1 rounded">New category</button>
            </>
          )}
          <button onClick={onOpenProfile} className="text-sm text-gray-700 hover:underline">Manage profile</button>
          <a target="_blank" rel="noreferrer" href="/admin" className="text-sm text-sky-600 hover:underline">Open Admin UI</a>
        </div>
      </div>
    </header>
  )
}

export default function Dashboard(){
  const [products, setProducts] = useState([])
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [profileOpen, setProfileOpen] = useState(false)
  const [profile, setProfile] = useState({ name: '', email: '', password: '' })
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [toast, setToast] = useState(null)
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newProduct, setNewProduct] = useState({ name: '', description: '', price: '', stock: 0, categoryId: '' })
  const [newImage, setNewImage] = useState(null)

  useEffect(()=>{
    async function load(){
      try{
  const [pRes, oRes] = await Promise.all([api.get('/products'), api.get('/orders')])
  setProducts(pRes.data || [])
  setOrders(oRes.data || [])
      }catch(err){
        console.error('Failed to load', err)
        setToast({ message: err?.response?.data?.message || err.message || 'Failed to load data', type: 'error' })
      }finally{setLoading(false)}
    }
    load()
  },[])

  const backendBase = import.meta.env.VITE_API_URL || 'http://localhost:4000'

  // create product handler (multipart upload)
  async function handleCreate(e) {
    e.preventDefault()
    setCreating(true)
    try {
      const fd = new FormData()
      fd.append('name', newProduct.name)
      fd.append('description', newProduct.description)
      fd.append('price', newProduct.price)
      fd.append('stock', String(newProduct.stock))
      if (newProduct.categoryId) fd.append('categoryId', String(newProduct.categoryId))
      if (newImage) fd.append('image', newImage)

      const res = await api.post('/products', fd)
      const created = res.data
      setProducts(prev => [created, ...prev])
      setToast({ message: 'Product created', type: 'success' })
      setShowCreate(false)
      setNewProduct({ name: '', description: '', price: '', stock: 0, categoryId: '' })
      setNewImage(null)
    } catch (err) {
      console.error('Create product failed', err)
      setToast({ message: err?.response?.data?.error || err.message || 'Create failed', type: 'error' })
    } finally {
      setCreating(false)
    }
  }

  // Compute revenue in USD and INR. Orders store totals as decimal dollars.
  const revenueUsd = orders.reduce((s, o) => s + (Number(o.total) || 0), 0)
  // Conversion: $1 = Rs 300
  const revenueRs = orders.reduce((s, o) => s + ((Number(o.total) || 0) * 300), 0)

  // determine current user role from localStorage
  let currentUser = null
  try { currentUser = JSON.parse(localStorage.getItem('user') || 'null') } catch (e) { currentUser = null }
  const isAdmin = currentUser && currentUser.role === 'admin'

  // Profile handlers
  async function openProfile(){
    setProfileOpen(true)
    try{
      const res = await api.get('/users/me')
      setProfile({ name: res.data.name || '', email: res.data.email || '', password: '' })
    }catch(err){
      setToast({ message: 'Failed to load profile', type: 'error' })
    }
  }

  async function saveProfile(e){
    e.preventDefault()
    try{
      const body = { name: profile.name, email: profile.email }
      if (profile.password) body.password = profile.password
      const res = await api.put('/users/me', body)
      setProfileOpen(false)
      localStorage.setItem('user', JSON.stringify(res.data))
      setToast({ message: 'Profile updated', type: 'success' })
    }catch(err){
      console.error('Update profile failed', err)
      setToast({ message: err?.response?.data?.error || err.message || 'Update failed', type: 'error' })
    }
  }

  async function createCategory() {
    try {
      const name = window.prompt('Category name')
      if (!name) return
      const res = await api.post('/categories', { name })
      setToast({ message: 'Category created', type: 'success' })
    } catch (err) {
      console.error('Create category failed', err)
      setToast({ message: err?.response?.data?.error || err.message || 'Create category failed', type: 'error' })
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 to-white">
      <Header onOpenProfile={openProfile} isAdmin={isAdmin} onOpenCreate={() => setShowCreate(true)} onCreateCategory={createCategory} />
      <main className="max-w-6xl mx-auto p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mb-6">
          <StatCard title="Products" value={products.length} subtitle="Total catalog items" color="sky" />
          <StatCard title="Orders" value={orders.length} subtitle="Orders placed" color="indigo" />
          {isAdmin && <StatCard title="Revenue" value={`$${revenueUsd.toFixed(2)}`} subtitle="Total revenue" color="green" />}
        </div>

        <section className="mb-6">
          <h2 className="text-xl font-semibold mb-4">Latest products</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {loading ? (
              Array.from({length:3}).map((_,i) => (
                <div key={i} className="card animate-pulse">
                  <div className="h-32 bg-gray-100 rounded mb-3" />
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                </div>
              ))
            ) : products.map(p => (
              <div key={p.id} className="card hover:shadow-lg cursor-pointer" onClick={() => setSelectedProduct(p)}>
                <div className="mb-3 rounded-md overflow-hidden relative">
                  <img
                    src={p.filename ? `${backendBase}/api/products/${p.id}/image` : '/default-product.svg'}
                    alt={p.name}
                    onError={(e) => { e.currentTarget.src = '/default-product.svg' }}
                    className="w-full h-40 object-cover"
                  />
                  <div className="absolute top-2 right-2 bg-white/80 px-3 py-1 rounded text-sm font-semibold text-sky-600 shadow">${(Number(p.price)||0).toFixed(2)}</div>
                  <div className="p-3 bg-white">
                    <div className="text-sm text-gray-500">{p.category || 'Product'}</div>
                  </div>
                </div>
                <div className="font-semibold text-lg">{p.name}</div>
                <div className="text-sm text-gray-500 truncate">{p.description}</div>
                <div className="mt-3 font-medium text-sky-600">&nbsp;</div>
              </div>
            ))}
          </div>
        </section>

          {/* Create product modal */}
          {showCreate && (
            <div className="fixed inset-0 z-50 flex items-center justify-center">
              <div className="absolute inset-0 bg-black/40" onClick={() => setShowCreate(false)} />
              <div className="relative max-w-2xl w-full mx-4">
                <form onSubmit={handleCreate} className="bg-white rounded-xl shadow-2xl p-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Create product</h3>
                    <button type="button" className="text-gray-500" onClick={() => setShowCreate(false)}>Close ✕</button>
                  </div>
                  <div className="grid grid-cols-1 gap-3 mt-4">
                    <input required placeholder="Name" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} className="p-3 border rounded" />
                    <input placeholder="Category ID" value={newProduct.categoryId} onChange={e => setNewProduct({...newProduct, categoryId: e.target.value})} className="p-3 border rounded" />
                    <textarea placeholder="Description" value={newProduct.description} onChange={e => setNewProduct({...newProduct, description: e.target.value})} className="p-3 border rounded" />
                    <div className="grid grid-cols-2 gap-3">
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                        <input required placeholder="Price (e.g. 19.99)" value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: e.target.value})} className="p-3 border rounded pl-8" />
                        <div className="text-xs text-gray-500 mt-1">Enter price in USD ($)</div>
                      </div>
                      <input placeholder="Stock" type="number" value={newProduct.stock} onChange={e => setNewProduct({...newProduct, stock: Number(e.target.value)})} className="p-3 border rounded" />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Image</label>
                      <input type="file" accept="image/*" onChange={e => setNewImage(e.target.files?.[0] || null)} />
                      {newImage && <div className="mt-2 text-sm text-gray-600">Selected: {newImage.name}</div>}
                    </div>
                    <div className="flex gap-2 mt-4">
                      <button type="submit" disabled={creating} className="px-4 py-2 bg-sky-600 text-white rounded">{creating ? 'Uploading...' : 'Create'}</button>
                      <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 border rounded">Cancel</button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          )}

        {/* Product detail modal */}
        {selectedProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50" onClick={() => setSelectedProduct(null)} />
            <div className="relative max-w-2xl w-full mx-4">
              <div className="bg-white rounded-xl shadow-2xl p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-2xl font-bold">{selectedProduct.name}</h3>
                    <div className="text-sm text-gray-500">ID: {selectedProduct.id}</div>
                  </div>
                  <button className="text-gray-500" onClick={() => setSelectedProduct(null)}>Close ✕</button>
                </div>
                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="md:col-span-1 bg-gradient-to-br from-sky-50 to-indigo-50 rounded-md h-40 flex items-center justify-center overflow-hidden">
                    <img
                      src={selectedProduct.filename ? `${backendBase}/api/products/${selectedProduct.id}/image` : '/default-product.svg'}
                      alt={selectedProduct.name}
                      onError={(e) => { e.currentTarget.src = '/default-product.svg' }}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-gray-700">{selectedProduct.description || 'No description provided.'}</p>
                    <div className="mt-4 flex items-center gap-4">
                      <div className="text-lg font-semibold">${(Number(selectedProduct.price)||0).toFixed(2)}</div>
                    </div>
                    <div className="mt-4 text-sm text-gray-500">Category: {selectedProduct.category || selectedProduct.categoryId || '—'}</div>
                    <div className="mt-4">
                      <button className="px-4 py-2 bg-sky-600 text-white rounded hover:opacity-95">Manage in Admin</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Profile modal */}
        {profileOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40" onClick={() => setProfileOpen(false)} />
            <div className="relative max-w-md w-full mx-4">
              <form onSubmit={saveProfile} className="bg-white rounded-xl shadow-2xl p-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Manage profile</h3>
                  <button type="button" className="text-gray-500" onClick={() => setProfileOpen(false)}>Close ✕</button>
                </div>
                <div className="grid grid-cols-1 gap-3 mt-4">
                  <input required placeholder="Name" value={profile.name} onChange={e => setProfile({...profile, name: e.target.value})} className="p-3 border rounded" />
                  <input required placeholder="Email" type="email" value={profile.email} onChange={e => setProfile({...profile, email: e.target.value})} className="p-3 border rounded" />
                  <input placeholder="New password (leave blank to keep)" type="password" value={profile.password} onChange={e => setProfile({...profile, password: e.target.value})} className="p-3 border rounded" />
                  <div className="flex gap-2 mt-4">
                    <button type="submit" className="px-4 py-2 bg-sky-600 text-white rounded">Save</button>
                    <button type="button" onClick={() => setProfileOpen(false)} className="px-4 py-2 border rounded">Cancel</button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}

        <section>
          <h2 className="text-xl font-semibold mb-4">Recent orders</h2>
          <div className="overflow-x-auto bg-white rounded-lg shadow-sm">
            <table className="w-full text-left">
              <thead className="text-xs text-gray-500 uppercase tracking-wider">
                <tr>
                  <th className="p-3">ID</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">Items</th>
                  <th className="p-3">Total</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(o => (
                  <tr key={o.id} className="border-t hover:bg-gray-50">
                    <td className="p-3">#{o.id}</td>
                    <td className="p-3">{o.email}</td>
                    <td className="p-3">{(o.OrderItems || o.orderItems || []).length}</td>
                    <td className="p-3 text-sky-600 font-medium">${(Number(o.total)||0).toFixed(2)}</td>
                    <td className="p-3"><span className={`px-2 py-1 rounded text-xs ${o.status==='pending' ? 'bg-yellow-50 text-yellow-700' : 'bg-green-50 text-green-700'}`}>{o.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

      </main>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
