export default function Home() {
  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="border-b pb-6">
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome to Coice
        </h1>
        <p className="text-gray-600 mt-2">
          Cohere Image Catalog Explorer - AI-powered image catalog management and analysis platform
        </p>
      </div>

      {/* Dashboard Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Libraries Card */}
        <div className="bg-white border rounded-lg p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center space-x-3 mb-4">
            <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <span className="text-blue-600 text-lg">📚</span>
            </div>
            <h3 className="text-lg font-semibold">Libraries</h3>
          </div>
          <p className="text-gray-600 text-sm mb-4">
            Browse and manage your image catalogs and libraries
          </p>
          <div className="text-2xl font-bold text-gray-900">0</div>
          <div className="text-xs text-gray-500">Total libraries</div>
        </div>

        {/* Analysis Card */}
        <div className="bg-white border rounded-lg p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center space-x-3 mb-4">
            <div className="h-10 w-10 bg-green-100 rounded-lg flex items-center justify-center">
              <span className="text-green-600 text-lg">🔍</span>
            </div>
            <h3 className="text-lg font-semibold">Analysis Jobs</h3>
          </div>
          <p className="text-gray-600 text-sm mb-4">
            AI-powered image analysis and pipeline management
          </p>
          <div className="text-2xl font-bold text-gray-900">0</div>
          <div className="text-xs text-gray-500">Jobs completed</div>
        </div>

        {/* Images Card */}
        <div className="bg-white border rounded-lg p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center space-x-3 mb-4">
            <div className="h-10 w-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <span className="text-purple-600 text-lg">🖼️</span>
            </div>
            <h3 className="text-lg font-semibold">Images</h3>
          </div>
          <p className="text-gray-600 text-sm mb-4">
            Total images stored across all catalogs
          </p>
          <div className="text-2xl font-bold text-gray-900">0</div>
          <div className="text-xs text-gray-500">Images uploaded</div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button className="bg-white border rounded-lg p-4 text-left hover:shadow-md transition-shadow">
            <div className="font-medium text-gray-900">Create New Catalog</div>
            <div className="text-sm text-gray-600 mt-1">
              Organize images by industry or domain
            </div>
          </button>
          <button className="bg-white border rounded-lg p-4 text-left hover:shadow-md transition-shadow">
            <div className="font-medium text-gray-900">Upload Images</div>
            <div className="text-sm text-gray-600 mt-1">
              Add new images to your libraries
            </div>
          </button>
          <button className="bg-white border rounded-lg p-4 text-left hover:shadow-md transition-shadow">
            <div className="font-medium text-gray-900">Create Pipeline</div>
            <div className="text-sm text-gray-600 mt-1">
              Set up AI analysis workflows
            </div>
          </button>
          <button className="bg-white border rounded-lg p-4 text-left hover:shadow-md transition-shadow">
            <div className="font-medium text-gray-900">Browse GCS Buckets</div>
            <div className="text-sm text-gray-600 mt-1">
              Access legacy image storage
            </div>
          </button>
        </div>
      </div>

      {/* Status Message */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center space-x-2">
          <span className="text-blue-600">ℹ️</span>
          <div>
            <div className="font-medium text-blue-900">Sprint 1: Foundation Complete</div>
            <div className="text-sm text-blue-700">
              Basic project structure and navigation are now in place. 
              Authentication and database integration coming in Sprint 2.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
