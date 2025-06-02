import React from 'react';
import { Metadata } from 'next';
import { SingleImageView } from '@/components/images/single-view';

interface PageProps {
  params: Promise<{
    id: string;
    imageId: string;
  }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id, imageId } = await params;
  
  return {
    title: `Image ${imageId} - Library ${id} - COICE`,
    description: `View and analyze image ${imageId} in library ${id}`,
  };
}

export default async function SingleImagePage({ params }: PageProps) {
  const { id, imageId } = await params;
  
  return (
    <div className="container mx-auto py-6">
      <SingleImageView 
        libraryId={id} 
        imageId={imageId}
        className="max-w-7xl mx-auto"
      />
    </div>
  );
} 