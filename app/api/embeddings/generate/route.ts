import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase';
import { generateTextEmbedding, generateImageEmbedding, imageToBase64DataUrl } from '@/lib/services/cohere-embeddings';
import { Storage } from '@google-cloud/storage';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { content_type, content_id, force_regenerate = false } = body;

    if (!content_type || !content_id) {
      return NextResponse.json(
        { error: 'content_type and content_id are required' },
        { status: 400 }
      );
    }

    let result;

    switch (content_type) {
      case 'catalog':
        result = await generateCatalogEmbedding(supabase, content_id, force_regenerate);
        break;
      case 'library':
        result = await generateLibraryEmbedding(supabase, content_id, force_regenerate);
        break;
      case 'image':
        result = await generateImageEmbeddingForRecord(supabase, content_id, force_regenerate);
        break;
      case 'job_result':
        result = await generateJobResultEmbedding(supabase, content_id, force_regenerate);
        break;
      default:
        return NextResponse.json(
          { error: `Unsupported content_type: ${content_type}` },
          { status: 400 }
        );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Embedding generation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function generateCatalogEmbedding(supabase: any, catalogId: string, forceRegenerate: boolean) {
  // Get catalog data
  const { data: catalog, error: fetchError } = await supabase
    .from('catalogs')
    .select('id, name, description, embedding')
    .eq('id', catalogId)
    .single();

  if (fetchError || !catalog) {
    return { success: false, error: 'Catalog not found' };
  }

  // Skip if embedding already exists and not forcing regeneration
  if (catalog.embedding && !forceRegenerate) {
    return { success: true, message: 'Embedding already exists', skipped: true };
  }

  // Generate text content for embedding
  const textContent = `${catalog.name}\n${catalog.description || ''}`.trim();
  
  const embeddingResult = await generateTextEmbedding(textContent);
  
  if (!embeddingResult.success) {
    return { success: false, error: embeddingResult.error };
  }

  // Update catalog with embedding
  const { error: updateError } = await supabase
    .from('catalogs')
    .update({ embedding: embeddingResult.embedding })
    .eq('id', catalogId);

  if (updateError) {
    return { success: false, error: 'Failed to save embedding' };
  }

  return { success: true, message: 'Catalog embedding generated successfully' };
}

async function generateLibraryEmbedding(supabase: any, libraryId: string, forceRegenerate: boolean) {
  // Get library data
  const { data: library, error: fetchError } = await supabase
    .from('libraries')
    .select('id, name, description, embedding')
    .eq('id', libraryId)
    .single();

  if (fetchError || !library) {
    return { success: false, error: 'Library not found' };
  }

  // Skip if embedding already exists and not forcing regeneration
  if (library.embedding && !forceRegenerate) {
    return { success: true, message: 'Embedding already exists', skipped: true };
  }

  // Generate text content for embedding
  const textContent = `${library.name}\n${library.description || ''}`.trim();
  
  const embeddingResult = await generateTextEmbedding(textContent);
  
  if (!embeddingResult.success) {
    return { success: false, error: embeddingResult.error };
  }

  // Update library with embedding
  const { error: updateError } = await supabase
    .from('libraries')
    .update({ embedding: embeddingResult.embedding })
    .eq('id', libraryId);

  if (updateError) {
    return { success: false, error: 'Failed to save embedding' };
  }

  return { success: true, message: 'Library embedding generated successfully' };
}

async function generateImageEmbeddingForRecord(supabase: any, imageId: string, forceRegenerate: boolean) {
  // Get image data
  const { data: image, error: fetchError } = await supabase
    .from('images')
    .select('id, gcs_path, metadata, embedding')
    .eq('id', imageId)
    .single();

  if (fetchError || !image) {
    return { success: false, error: 'Image not found' };
  }

  // Skip if embedding already exists and not forcing regeneration
  if (image.embedding && !forceRegenerate) {
    return { success: true, message: 'Embedding already exists', skipped: true };
  }

  try {
    // Initialize Google Cloud Storage client
    const storage = new Storage({
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
      projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
    });

    const bucket = storage.bucket(process.env.GCS_BUCKET_NAME!);
    const file = bucket.file(image.gcs_path);

    // Download image
    const [imageBuffer] = await file.download();
    
    // Get MIME type from metadata or default to jpeg
    const mimeType = image.metadata?.mimetype || 'image/jpeg';
    
    // Convert to base64 data URL
    const base64DataUrl = imageToBase64DataUrl(imageBuffer, mimeType);
    
    // Generate embedding
    const embeddingResult = await generateImageEmbedding(base64DataUrl);
    
    if (!embeddingResult.success) {
      return { success: false, error: embeddingResult.error };
    }

    // Update image with embedding
    const { error: updateError } = await supabase
      .from('images')
      .update({ embedding: embeddingResult.embedding })
      .eq('id', imageId);

    if (updateError) {
      return { success: false, error: 'Failed to save embedding' };
    }

    return { success: true, message: 'Image embedding generated successfully' };
  } catch (error) {
    console.error('Error generating image embedding:', error);
    return { success: false, error: 'Failed to process image' };
  }
}

async function generateJobResultEmbedding(supabase: any, jobResultId: string, forceRegenerate: boolean) {
  // Get job result data
  const { data: jobResult, error: fetchError } = await supabase
    .from('job_results')
    .select('id, result, embedding')
    .eq('id', jobResultId)
    .single();

  if (fetchError || !jobResult) {
    return { success: false, error: 'Job result not found' };
  }

  // Skip if embedding already exists and not forcing regeneration
  if (jobResult.embedding && !forceRegenerate) {
    return { success: true, message: 'Embedding already exists', skipped: true };
  }

  // Generate text content for embedding
  const textContent = typeof jobResult.result === 'string' 
    ? jobResult.result 
    : JSON.stringify(jobResult.result);
  
  const embeddingResult = await generateTextEmbedding(textContent);
  
  if (!embeddingResult.success) {
    return { success: false, error: embeddingResult.error };
  }

  // Update job result with embedding
  const { error: updateError } = await supabase
    .from('job_results')
    .update({ embedding: embeddingResult.embedding })
    .eq('id', jobResultId);

  if (updateError) {
    return { success: false, error: 'Failed to save embedding' };
  }

  return { success: true, message: 'Job result embedding generated successfully' };
} 