'use client'

import Link from 'next/link'

export function Navbar() {
  return (
    <nav className="border-b bg-white px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Left: Logo and Brand */}
        <div className="flex items-center space-x-4">
          <Link href="/" className="flex items-center space-x-2">
            <div className="h-8 w-8 rounded bg-blue-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">C</span>
            </div>
            <span className="text-xl font-semibold text-gray-900">Coice</span>
          </Link>
        </div>

        {/* Center: Navigation Links */}
        <div className="flex items-center space-x-8">
          <Link 
            href="/libraries" 
            className="text-gray-600 hover:text-gray-900 font-medium"
          >
            Libraries
          </Link>
          <Link 
            href="/analysis" 
            className="text-gray-600 hover:text-gray-900 font-medium"
          >
            Analysis
          </Link>
          <Link 
            href="/search" 
            className="text-gray-600 hover:text-gray-900 font-medium"
          >
            Search
          </Link>
        </div>

        {/* Right: User Controls */}
        <div className="flex items-center space-x-4">
          <button className="text-gray-600 hover:text-gray-900">
            <span className="sr-only">Theme switcher</span>
            🌙
          </button>
          <button className="text-gray-600 hover:text-gray-900">
            <span className="sr-only">Settings</span>
            ⚙️
          </button>
          <button className="text-gray-600 hover:text-gray-900">
            <span className="sr-only">Profile</span>
            👤
          </button>
        </div>
      </div>
    </nav>
  )
} 