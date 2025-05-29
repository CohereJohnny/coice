import { NextRequest, NextResponse } from 'next/server';
import { getCohereService } from '@/lib/services/cohere';
import { createSupabaseServiceClient } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    let { imageUrl, prompt, promptType } = body;

    if (!imageUrl || !prompt || !promptType) {
      return NextResponse.json(
        { error: 'Missing required fields: imageUrl, prompt, promptType' },
        { status: 400 }
      );
    }

    // If the imageUrl is from our GCS bucket, we need to get a signed URL first
    if (imageUrl.includes('storage.googleapis.com/coice-bucket/')) {
      console.log('Detected GCS URL, getting signed URL...');
      
      // Extract the image ID from the URL
      const urlParts = imageUrl.split('/');
      const filename = urlParts[urlParts.length - 1];
      const imageId = filename.split('.')[0]; // Remove extension
      
      console.log('Extracted image ID:', imageId);
      
      try {
        // Try to get signed URL via our existing API
        const signedUrlResponse = await fetch(`http://localhost:3000/api/images/${imageId}?signed=true`);
        if (signedUrlResponse.ok) {
          const signedUrlData = await signedUrlResponse.json();
          imageUrl = signedUrlData.signedUrl;
          console.log('Got signed URL successfully');
        } else {
          console.log('Failed to get signed URL, proceeding with original URL');
        }
      } catch (signedUrlError) {
        console.log('Error getting signed URL:', signedUrlError);
        console.log('Proceeding with original URL');
      }
    }

    const cohereService = getCohereService();
    
    console.log('Testing Cohere API with:', {
      imageUrl: imageUrl.substring(0, 100) + '...', // Truncate for logging
      prompt,
      promptType,
    });

    const result = await cohereService.analyzeImage({
      imageUrl,
      prompt,
      promptType,
    });

    return NextResponse.json({
      success: true,
      result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Cohere test error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const cohereService = getCohereService();
    const connectionTest = await cohereService.testConnection();
    
    return NextResponse.json({
      connectionTest,
      serviceStatus: cohereService.getStatus(),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 