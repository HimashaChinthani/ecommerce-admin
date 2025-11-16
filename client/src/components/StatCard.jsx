import React from 'react'

export default function StatCard({ title, value, subtitle, color = 'sky' }){
  const colors = {
    sky: 'bg-sky-50 text-sky-600',
    green: 'bg-green-50 text-green-600',
    indigo: 'bg-indigo-50 text-indigo-700',
    gray: 'bg-gray-50 text-gray-800'
  }
  const cls = colors[color] || colors.sky
  return (
    <div className="p-5 bg-white rounded-lg shadow hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm text-gray-500">{title}</div>
          <div className={`mt-2 text-2xl font-extrabold ${cls.split(' ')[1]}`}>{value}</div>
          {subtitle && <div className="text-xs text-gray-400 mt-1">{subtitle}</div>}
        </div>
        <div className="w-12 h-12 rounded-md bg-gray-100 flex items-center justify-center text-xl font-bold text-gray-600">{title[0]}</div>
      </div>
    </div>
  )
}
