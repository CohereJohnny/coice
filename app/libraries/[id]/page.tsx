import { AuthGuard } from '../../components/auth/AuthGuard';

interface LibraryDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function LibraryDetailPage({ params }: LibraryDetailPageProps) {
  const { id } = await params;
  
  return (
    <AuthGuard>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Library Details</h1>
          <p className="text-muted-foreground">
            Viewing library ID: {id}
          </p>
        </div>

        <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4">Library Information</h3>
          <p className="text-muted-foreground">
            This page will show detailed library information and its images.
            This is a placeholder for Sprint 5: Google Cloud Storage Integration.
          </p>
        </div>
      </div>
    </AuthGuard>
  );
} 