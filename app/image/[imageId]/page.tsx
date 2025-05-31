import React from 'react';
import { Metadata } from 'next';
import { SingleImageView } from '@/components/images/single-view';

interface PageProps {
  params: Promise<{
    imageId: string;
  }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { imageId } = await params;
  
  return {
    title: `Image ${imageId} - COICE`,
    description: `View and analyze image ${imageId}`,
  };
}

export default async function ImagePage({ params }: PageProps) {
  const { imageId } = await params;
  
  return (
    <div className="container mx-auto py-6">
      <SingleImageView 
        imageId={imageId}
        className="max-w-7xl mx-auto"
      />
    </div>
  );
} 