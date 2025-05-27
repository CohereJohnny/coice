'use client'

import { useState } from 'react'

export function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false)

  return (
    <aside className={`border-r border-border bg-muted transition-all duration-300 ${
      isCollapsed ? 'w-16' : 'w-64'
    }`}>
      <div className="p-4">
        {/* Collapse Toggle */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="mb-4 p-2 rounded hover:bg-background w-full flex justify-center text-muted-foreground hover:text-foreground transition-colors"
        >
          {isCollapsed ? '→' : '←'}
        </button>

        {!isCollapsed && (
          <div className="space-y-4">
            {/* Catalogs Section */}
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-2">
                Catalogs
              </h3>
              <div className="space-y-1">
                <div className="p-2 rounded hover:bg-background cursor-pointer">
                  <div className="flex items-center space-x-2">
                    <span>📁</span>
                    <span className="text-sm text-foreground">Oil & Gas</span>
                  </div>
                  <div className="ml-6 mt-1 space-y-1">
                    <div className="p-1 rounded hover:bg-background cursor-pointer">
                      <div className="flex items-center space-x-2">
                        <span>📂</span>
                        <span className="text-xs text-muted-foreground">Wells</span>
                      </div>
                    </div>
                    <div className="p-1 rounded hover:bg-background cursor-pointer">
                      <div className="flex items-center space-x-2">
                        <span>📂</span>
                        <span className="text-xs text-muted-foreground">Pipelines</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="p-2 rounded hover:bg-background cursor-pointer">
                  <div className="flex items-center space-x-2">
                    <span>📁</span>
                    <span className="text-sm text-foreground">Manufacturing</span>
                  </div>
                </div>
              </div>
            </div>

            {/* GCS Buckets Section */}
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-2">
                GCS Buckets
              </h3>
              <div className="space-y-1">
                <div className="p-2 rounded hover:bg-background cursor-pointer">
                  <div className="flex items-center space-x-2">
                    <span>☁️</span>
                    <span className="text-sm text-foreground">coice-main</span>
                  </div>
                </div>
                <div className="p-2 rounded hover:bg-background cursor-pointer">
                  <div className="flex items-center space-x-2">
                    <span>☁️</span>
                    <span className="text-sm text-foreground">legacy-images</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  )
} 