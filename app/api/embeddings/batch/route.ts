import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { content_types = ['catalog', 'library', 'image', 'job_result'], batch_size = 10 } = body;

    const results: any = {
      catalogs: { processed: 0, success: 0, errors: 0 },
      libraries: { processed: 0, success: 0, errors: 0 },
      images: { processed: 0, success: 0, errors: 0 },
      job_results: { processed: 0, success: 0, errors: 0 }
    };

    const errors: string[] = [];

    // Process catalogs
    if (content_types.includes('catalog')) {
      console.log('Processing catalogs...');
      const { data: catalogs } = await supabase
        .from('catalogs')
        .select('id, name, description')
        .is('embedding', null);

      if (catalogs) {
        for (const catalog of catalogs) {
          try {
            const response = await fetch(`${request.nextUrl.origin}/api/embeddings/generate`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                content_type: 'catalog',
                content_id: catalog.id,
                force_regenerate: false
              })
            });
            
            const result = await response.json();
            results.catalogs.processed++;
            
            if (result.success) {
              results.catalogs.success++;
              console.log(`✅ Catalog ${catalog.id} (${catalog.name}): embedding generated`);
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
      const { data: libraries } = await supabase
        .from('libraries')
        .select('id, name, description')
        .is('embedding', null);

      if (libraries) {
        for (const library of libraries) {
          try {
            const response = await fetch(`${request.nextUrl.origin}/api/embeddings/generate`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                content_type: 'library',
                content_id: library.id,
                force_regenerate: false
              })
            });
            
            const result = await response.json();
            results.libraries.processed++;
            
            if (result.success) {
              results.libraries.success++;
              console.log(`✅ Library ${library.id} (${library.name}): embedding generated`);
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

    // Process images (in smaller batches due to multimodal processing)
    if (content_types.includes('image')) {
      console.log('Processing images...');
      const { data: images } = await supabase
        .from('images')
        .select('id, gcs_path')
        .is('embedding', null)
        .limit(50); // Process first 50 images to avoid timeout

      if (images) {
        for (const image of images) {
          try {
            const response = await fetch(`${request.nextUrl.origin}/api/embeddings/generate`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                content_type: 'image',
                content_id: image.id,
                force_regenerate: false
              })
            });
            
            const result = await response.json();
            results.images.processed++;
            
            if (result.success) {
              results.images.success++;
              const filename = image.gcs_path.split('/').pop();
              console.log(`✅ Image ${image.id} (${filename}): embedding generated`);
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

    // Process job results (text only, faster)
    if (content_types.includes('job_result')) {
      console.log('Processing job results...');
      const { data: jobResults } = await supabase
        .from('job_results')
        .select('id, result')
        .is('embedding', null)
        .limit(100); // Process first 100 job results

      if (jobResults) {
        for (const jobResult of jobResults) {
          try {
            const response = await fetch(`${request.nextUrl.origin}/api/embeddings/generate`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                content_type: 'job_result',
                content_id: jobResult.id,
                force_regenerate: false
              })
            });
            
            const result = await response.json();
            results.job_results.processed++;
            
            if (result.success) {
              results.job_results.success++;
              console.log(`✅ Job Result ${jobResult.id}: embedding generated`);
            } else {
              results.job_results.errors++;
              errors.push(`Job Result ${jobResult.id}: ${result.error}`);
              console.error(`❌ Job Result ${jobResult.id}: ${result.error}`);
            }
          } catch (error) {
            results.job_results.errors++;
            const errorMsg = `Job Result ${jobResult.id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
            errors.push(errorMsg);
            console.error(`❌ ${errorMsg}`);
          }
        }
      }
    }

    const totalProcessed = Object.values(results).reduce((sum, r: any) => sum + r.processed, 0);
    const totalSuccess = Object.values(results).reduce((sum, r: any) => sum + r.success, 0);
    const totalErrors = Object.values(results).reduce((sum, r: any) => sum + r.errors, 0);

    return NextResponse.json({
      success: true,
      message: `Batch embedding generation completed`,
      summary: {
        total_processed: totalProcessed,
        total_success: totalSuccess,
        total_errors: totalErrors,
        success_rate: totalProcessed > 0 ? Math.round((totalSuccess / totalProcessed) * 100) : 0
      },
      details: results,
      errors: errors.slice(0, 10) // Return first 10 errors
    });

  } catch (error) {
    console.error('Batch embedding generation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 