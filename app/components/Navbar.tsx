'use client'

import Link from 'next/link'

export function Navbar() {
  return (
    <nav className="border-b border-border bg-card px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Left: Logo and Brand */}
        <div className="flex items-center space-x-4">
          <Link href="/" className="flex items-center space-x-2">
            <div className="h-8 w-8 rounded bg-blue-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">C</span>
            </div>
            <span className="text-xl font-semibold text-card-foreground">Coice</span>
          </Link>
        </div>

        {/* Center: Navigation Links */}
        <div className="flex items-center space-x-8">
          <Link 
            href="/libraries" 
            className="text-muted-foreground hover:text-card-foreground font-medium transition-colors"
          >
            Libraries
          </Link>
          <Link 
            href="/analysis" 
            className="text-muted-foreground hover:text-card-foreground font-medium transition-colors"
          >
            Analysis
          </Link>
          <Link 
            href="/search" 
            className="text-muted-foreground hover:text-card-foreground font-medium transition-colors"
          >
            Search
          </Link>
        </div>

        {/* Right: User Controls */}
        <div className="flex items-center space-x-4">
          <button className="text-muted-foreground hover:text-card-foreground transition-colors">
            <span className="sr-only">Theme switcher</span>
            🌙
          </button>
          <button className="text-muted-foreground hover:text-card-foreground transition-colors">
            <span className="sr-only">Settings</span>
            ⚙️
          </button>
          <button className="text-muted-foreground hover:text-card-foreground transition-colors">
            <span className="sr-only">Profile</span>
            👤
          </button>
        </div>
      </div>
    </nav>
  )
} 