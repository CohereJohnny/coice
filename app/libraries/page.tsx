import { AuthGuard } from '../components/auth/AuthGuard'

export default function LibrariesPage() {
  return (
    <AuthGuard>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Libraries</h1>
          <p className="text-muted-foreground">
            Manage your image libraries and collections
          </p>
        </div>

        <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4">Library Management</h3>
          <p className="text-muted-foreground">
            This page will contain library creation, editing, and management features.
            Coming in Sprint 4: Catalog & Library Management Foundation.
          </p>
        </div>
      </div>
    </AuthGuard>
  )
} 