'use client'

import { useState } from 'react'

export function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false)

  return (
    <aside className={`border-r bg-gray-50 transition-all duration-300 ${
      isCollapsed ? 'w-16' : 'w-64'
    }`}>
      <div className="p-4">
        {/* Collapse Toggle */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="mb-4 p-2 rounded hover:bg-gray-200 w-full flex justify-center"
        >
          {isCollapsed ? '→' : '←'}
        </button>

        {!isCollapsed && (
          <div className="space-y-4">
            {/* Catalogs Section */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">
                Catalogs
              </h3>
              <div className="space-y-1">
                <div className="p-2 rounded hover:bg-gray-200 cursor-pointer">
                  <div className="flex items-center space-x-2">
                    <span>📁</span>
                    <span className="text-sm">Oil & Gas</span>
                  </div>
                  <div className="ml-6 mt-1 space-y-1">
                    <div className="p-1 rounded hover:bg-gray-200 cursor-pointer">
                      <div className="flex items-center space-x-2">
                        <span>📂</span>
                        <span className="text-xs text-gray-600">Wells</span>
                      </div>
                    </div>
                    <div className="p-1 rounded hover:bg-gray-200 cursor-pointer">
                      <div className="flex items-center space-x-2">
                        <span>📂</span>
                        <span className="text-xs text-gray-600">Pipelines</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="p-2 rounded hover:bg-gray-200 cursor-pointer">
                  <div className="flex items-center space-x-2">
                    <span>📁</span>
                    <span className="text-sm">Manufacturing</span>
                  </div>
                </div>
              </div>
            </div>

            {/* GCS Buckets Section */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">
                GCS Buckets
              </h3>
              <div className="space-y-1">
                <div className="p-2 rounded hover:bg-gray-200 cursor-pointer">
                  <div className="flex items-center space-x-2">
                    <span>☁️</span>
                    <span className="text-sm">coice-main</span>
                  </div>
                </div>
                <div className="p-2 rounded hover:bg-gray-200 cursor-pointer">
                  <div className="flex items-center space-x-2">
                    <span>☁️</span>
                    <span className="text-sm">legacy-images</span>
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