import React, { useEffect } from 'react'

export default function Toast({ message, type = 'info', onClose }){
  useEffect(()=>{
    if (!message) return
    const t = setTimeout(() => onClose && onClose(), 4000)
    return () => clearTimeout(t)
  },[message])

  if (!message) return null

  const bg = type === 'error' ? 'bg-red-50 border-red-200' : type === 'success' ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'

  return (
    <div className={`fixed right-6 bottom-6 z-50 max-w-sm w-full ${bg} border p-4 rounded-lg shadow-lg`} role="status">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          {type === 'error' ? (
            <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
          ) : type === 'success' ? (
            <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/></svg>
          ) : (
            <svg className="h-6 w-6 text-sky-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01"/></svg>
          )}
        </div>
        <div className="flex-1 text-sm text-gray-800">
          <div className="font-medium">{type === 'error' ? 'Error' : type === 'success' ? 'Success' : 'Notice'}</div>
          <div className="mt-1">{message}</div>
        </div>
        <button onClick={() => onClose && onClose()} className="text-gray-400 hover:text-gray-600 ml-2">✕</button>
      </div>
    </div>
  )
}
