import { AuthGuard } from '../../components/auth/AuthGuard';

interface CatalogDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function CatalogDetailPage({ params }: CatalogDetailPageProps) {
  const { id } = await params;
  
  return (
    <AuthGuard>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Catalog Details</h1>
          <p className="text-muted-foreground">
            Viewing catalog ID: {id}
          </p>
        </div>

        <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4">Catalog Information</h3>
          <p className="text-muted-foreground">
            This page will show detailed catalog information and its libraries.
            This is a placeholder for Sprint 5: Google Cloud Storage Integration.
          </p>
        </div>
      </div>
    </AuthGuard>
  );
} 