import { AuthGuard } from '../../components/auth/AuthGuard';
import LibraryDetailClient from './LibraryDetailClient';

interface LibraryDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function LibraryDetailPage({ params }: LibraryDetailPageProps) {
  const { id } = await params;
  
  return (
    <AuthGuard>
      <LibraryDetailClient libraryId={id} />
    </AuthGuard>
  );
} 