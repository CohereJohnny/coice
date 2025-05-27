import { AuthGuard } from '../components/auth/AuthGuard'

export default function AnalysisPage() {
  return (
    <AuthGuard>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analysis</h1>
          <p className="text-muted-foreground">
            AI-powered image analysis and job management
          </p>
        </div>

        <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4">Analysis Dashboard</h3>
          <p className="text-muted-foreground">
            This page will contain job management, pipeline execution, and analysis results.
            Coming in Sprint 9: Cohere AI Integration & Job Foundation.
          </p>
        </div>
      </div>
    </AuthGuard>
  )
} 