import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient, createSupabaseServiceClient } from '@/lib/supabase';
import { generateTextEmbedding, generateImageEmbedding, imageToBase64DataUrl } from '@/lib/services/cohere-embeddings';
import { Storage } from '@google-cloud/storage';

// Import the individual generation functions from the generate route
async function generateCatalogEmbedding(supabase: any, serviceSupabase: any, catalogId: string, forceRegenerate: boolean = false) {
  // Get catalog data using regular client
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

  // Update catalog with embedding using service client to bypass RLS
  const { error: updateError } = await serviceSupabase
    .from('catalogs')
    .update({ embedding: embeddingResult.embedding })
    .eq('id', catalogId);

  if (updateError) {
    console.error('Failed to save catalog embedding:', updateError);
    return { success: false, error: 'Failed to save embedding' };
  }

  return { success: true, message: 'Catalog embedding generated successfully' };
}

async function generateLibraryEmbedding(supabase: any, serviceSupabase: any, libraryId: string, forceRegenerate: boolean = false) {
  // Get library data using regular client
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

  // Update library with embedding using service client to bypass RLS
  const { error: updateError } = await serviceSupabase
    .from('libraries')
    .update({ embedding: embeddingResult.embedding })
    .eq('id', libraryId);

  if (updateError) {
    console.error('Failed to save library embedding:', updateError);
    return { success: false, error: 'Failed to save embedding' };
  }

  return { success: true, message: 'Library embedding generated successfully' };
}

async function generateImageEmbeddingForRecord(supabase: any, serviceSupabase: any, imageId: string, forceRegenerate: boolean = false) {
  // Get image data using regular client
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
    
    // Extract relative path from full GCS URI (remove gs://bucket-name/ prefix)
    const gcsPath = image.gcs_path;
    const relativePath = gcsPath.startsWith('gs://') 
      ? gcsPath.replace(`gs://${process.env.GCS_BUCKET_NAME}/`, '')
      : gcsPath;
    
    const file = bucket.file(relativePath);

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

    console.log(`🔍 About to save embedding: length=${embeddingResult.embedding.length}, first 3=[${embeddingResult.embedding.slice(0, 3).map(v => v.toFixed(6)).join(', ')}]`);

    // Update image with embedding using service client to bypass RLS
    const { error: updateError } = await serviceSupabase
      .from('images')
      .update({ embedding: embeddingResult.embedding })
      .eq('id', imageId);

    if (updateError) {
      console.error('Failed to save image embedding:', updateError);
      return { success: false, error: 'Failed to save embedding' };
    }

    console.log(`🔍 Database update completed for image ${imageId}`);

    return { success: true, message: 'Image embedding generated successfully' };
  } catch (error) {
    console.error('Error generating image embedding:', error);
    return { success: false, error: 'Failed to process image' };
  }
}

async function generateJobResultEmbedding(supabase: any, serviceSupabase: any, jobResultId: string, forceRegenerate: boolean = false) {
  // Get job result data using regular client
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

  // Update job result with embedding using service client to bypass RLS
  const { error: updateError } = await serviceSupabase
    .from('job_results')
    .update({ embedding: embeddingResult.embedding })
    .eq('id', jobResultId);

  if (updateError) {
    console.error('Failed to save job result embedding:', updateError);
    return { success: false, error: 'Failed to save embedding' };
  }

  return { success: true, message: 'Job result embedding generated successfully' };
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    
    // Check authentication using regular client
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Create service client for embedding updates (bypasses RLS)
    const serviceSupabase = createSupabaseServiceClient();

    const body = await request.json();
    const { content_types = ['catalog', 'library', 'image', 'job_result'], batch_size = 10, force_regenerate = false } = body;

    const results: {
      catalogs: { processed: number; success: number; errors: number };
      libraries: { processed: number; success: number; errors: number };
      images: { processed: number; success: number; errors: number };
      job_results: { processed: number; success: number; errors: number };
    } = {
      catalogs: { processed: 0, success: 0, errors: 0 },
      libraries: { processed: 0, success: 0, errors: 0 },
      images: { processed: 0, success: 0, errors: 0 },
      job_results: { processed: 0, success: 0, errors: 0 }
    };

    const errors: string[] = [];

    // Process catalogs
    if (content_types.includes('catalog')) {
      console.log('Processing catalogs...');
      let catalogQuery = supabase
        .from('catalogs')
        .select('id, name, description');
      
      // Only filter by null embeddings if not forcing regeneration
      if (!force_regenerate) {
        catalogQuery = catalogQuery.is('embedding', null);
      }

      const { data: catalogs } = await catalogQuery;

      if (catalogs) {
        for (const catalog of catalogs) {
          try {
            const result = await generateCatalogEmbedding(supabase, serviceSupabase, catalog.id, force_regenerate);
            results.catalogs.processed++;
            
            if (result.success && !result.skipped) {
              results.catalogs.success++;
              console.log(`✅ Catalog ${catalog.id} (${catalog.name}): embedding generated`);
            } else if (result.skipped) {
              console.log(`⏭️  Catalog ${catalog.id} (${catalog.name}): skipped (already has embedding)`);
            } else {
              results.catalogs.errors++;
              errors.push(`Catalog ${catalog.id}: ${result.error}`);
              console.error(`❌ Catalog ${catalog.id}: ${result.error}`);
            }
          } catch (error) {
            results.catalogs.errors++;
            const errorMsg = `Catalog ${catalog.id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
            errors.push(errorMsg);
            console.error(`❌ ${errorMsg}`);
          }
        }
      }
    }

    // Process libraries
    if (content_types.includes('library')) {
      console.log('Processing libraries...');
      let libraryQuery = supabase
        .from('libraries')
        .select('id, name, description');
      
      // Only filter by null embeddings if not forcing regeneration
      if (!force_regenerate) {
        libraryQuery = libraryQuery.is('embedding', null);
      }

      const { data: libraries } = await libraryQuery;

      if (libraries) {
        for (const library of libraries) {
          try {
            const result = await generateLibraryEmbedding(supabase, serviceSupabase, library.id, force_regenerate);
            results.libraries.processed++;
            
            if (result.success && !result.skipped) {
              results.libraries.success++;
              console.log(`✅ Library ${library.id} (${library.name}): embedding generated`);
            } else if (result.skipped) {
              console.log(`⏭️  Library ${library.id} (${library.name}): skipped (already has embedding)`);
            } else {
              results.libraries.errors++;
              errors.push(`Library ${library.id}: ${result.error}`);
              console.error(`❌ Library ${library.id}: ${result.error}`);
            }
          } catch (error) {
            results.libraries.errors++;
            const errorMsg = `Library ${library.id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
            errors.push(errorMsg);
            console.error(`❌ ${errorMsg}`);
          }
        }
      }
    }

    // Process images
    if (content_types.includes('image')) {
      console.log('Processing images...');
      let imageQuery = supabase
        .from('images')
        .select('id, gcs_path, metadata');
      
      // Only filter by null embeddings if not forcing regeneration
      if (!force_regenerate) {
        imageQuery = imageQuery.is('embedding', null);
      }

      // Only apply batch limit if not force regenerating (want to process ALL images when forcing)
      if (!force_regenerate) {
        imageQuery = imageQuery.limit(batch_size);
      }

      const { data: images } = await imageQuery;

      if (images) {
        console.log(`📊 Found ${images.length} images to process${force_regenerate ? ' (force regenerating ALL)' : ''}`);
        
        for (const image of images) {
          try {
            const result = await generateImageEmbeddingForRecord(supabase, serviceSupabase, image.id, force_regenerate);
            results.images.processed++;
            
            if (result.success && !result.skipped) {
              results.images.success++;
              const filename = image.gcs_path.split('/').pop() || image.id;
              console.log(`✅ Image ${image.id} (${filename}): embedding generated`);
            } else if (result.skipped) {
              const filename = image.gcs_path.split('/').pop() || image.id;
              console.log(`⏭️  Image ${image.id} (${filename}): skipped (already has embedding)`);
            } else {
              results.images.errors++;
              errors.push(`Image ${image.id}: ${result.error}`);
              console.error(`❌ Image ${image.id}: ${result.error}`);
            }
          } catch (error) {
            results.images.errors++;
            const errorMsg = `Image ${image.id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
            errors.push(errorMsg);
            console.error(`❌ ${errorMsg}`);
          }
        }
      }
    }

    // Process job results
    if (content_types.includes('job_result')) {
      console.log('Processing job results...');
      let jobResultQuery = supabase
        .from('job_results')
        .select('id, result');
      
      // Only filter by null embeddings if not forcing regeneration
      if (!force_regenerate) {
        jobResultQuery = jobResultQuery.is('embedding', null);
      }

      // Only apply batch limit if not force regenerating
      if (!force_regenerate) {
        jobResultQuery = jobResultQuery.limit(batch_size);
      }

      const { data: jobResults } = await jobResultQuery;

      if (jobResults) {
        console.log(`📊 Found ${jobResults.length} job results to process${force_regenerate ? ' (force regenerating ALL)' : ''}`);
        
        for (const jobResult of jobResults) {
          try {
            const result = await generateJobResultEmbedding(supabase, serviceSupabase, jobResult.id, force_regenerate);
            results.job_results.processed++;
            
            if (result.success && !result.skipped) {
              results.job_results.success++;
              console.log(`✅ Job result ${jobResult.id}: embedding generated`);
            } else if (result.skipped) {
              console.log(`⏭️  Job result ${jobResult.id}: skipped (already has embedding)`);
            } else {
              results.job_results.errors++;
              errors.push(`Job result ${jobResult.id}: ${result.error}`);
              console.error(`❌ Job result ${jobResult.id}: ${result.error}`);
            }
          } catch (error) {
            results.job_results.errors++;
            const errorMsg = `Job result ${jobResult.id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
            errors.push(errorMsg);
            console.error(`❌ ${errorMsg}`);
          }
        }
      }
    }

    const totalProcessed = Object.values(results).reduce((sum, r) => sum + r.processed, 0);
    const totalSuccess = Object.values(results).reduce((sum, r) => sum + r.success, 0);
    const totalErrors = Object.values(results).reduce((sum, r) => sum + r.errors, 0);

    return NextResponse.json({
      success: true,
      message: `Batch embedding generation completed. Processed: ${totalProcessed}, Success: ${totalSuccess}, Errors: ${totalErrors}`,
      results,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('Batch embedding generation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 