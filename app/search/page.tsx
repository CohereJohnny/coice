import { AuthGuard } from '../components/auth/AuthGuard'

export default function SearchPage() {
  return (
    <AuthGuard>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Search</h1>
          <p className="text-muted-foreground">
            Search and discover images across your catalogs
          </p>
        </div>

        <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4">Search & Discovery</h3>
          <p className="text-muted-foreground">
            This page will contain advanced search functionality, filters, and discovery tools.
            Coming in Sprint 12: Search & Discovery.
          </p>
        </div>
      </div>
    </AuthGuard>
  )
} 