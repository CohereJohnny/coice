const { createClient } = require('@supabase/supabase-js');
const { generateTextEmbedding, generateImageEmbedding, imageToBase64DataUrl } = require('../lib/services/cohere-embeddings');
const { Storage } = require('@google-cloud/storage');

require('dotenv').config({ path: '.env.local' });

async function generateEmbeddingsForExistingContent() {
  console.log('🚀 Starting embedding generation for existing content...\n');

  // Initialize Supabase client
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // Initialize Google Cloud Storage
  const storage = new Storage({
    keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
  });
  const bucket = storage.bucket(process.env.GCS_BUCKET_NAME);

  const results = {
    catalogs: { processed: 0, success: 0, errors: 0 },
    libraries: { processed: 0, success: 0, errors: 0 },
    images: { processed: 0, success: 0, errors: 0 },
    job_results: { processed: 0, success: 0, errors: 0 }
  };

  // 1. Generate embeddings for catalogs
  console.log('📁 Processing catalogs...');
  try {
    const { data: catalogs, error } = await supabase
      .from('catalogs')
      .select('id, name, description')
      .is('embedding', null);

    if (error) throw error;

    for (const catalog of catalogs || []) {
      try {
        const textContent = `${catalog.name}\n${catalog.description || ''}`.trim();
        const embeddingResult = await generateTextEmbedding(textContent);
        
        if (embeddingResult.success) {
          const { error: updateError } = await supabase
            .from('catalogs')
            .update({ embedding: embeddingResult.embedding })
            .eq('id', catalog.id);

          if (updateError) throw updateError;
          
          results.catalogs.success++;
          console.log(`  ✅ Catalog: ${catalog.name}`);
        } else {
          results.catalogs.errors++;
          console.log(`  ❌ Catalog: ${catalog.name} - ${embeddingResult.error}`);
        }
        results.catalogs.processed++;
      } catch (error) {
        results.catalogs.errors++;
        console.log(`  ❌ Catalog: ${catalog.name} - ${error.message}`);
      }
    }
  } catch (error) {
    console.error('Error processing catalogs:', error.message);
  }

  // 2. Generate embeddings for libraries
  console.log('\n📚 Processing libraries...');
  try {
    const { data: libraries, error } = await supabase
      .from('libraries')
      .select('id, name, description')
      .is('embedding', null);

    if (error) throw error;

    for (const library of libraries || []) {
      try {
        const textContent = `${library.name}\n${library.description || ''}`.trim();
        const embeddingResult = await generateTextEmbedding(textContent);
        
        if (embeddingResult.success) {
          const { error: updateError } = await supabase
            .from('libraries')
            .update({ embedding: embeddingResult.embedding })
            .eq('id', library.id);

          if (updateError) throw updateError;
          
          results.libraries.success++;
          console.log(`  ✅ Library: ${library.name}`);
        } else {
          results.libraries.errors++;
          console.log(`  ❌ Library: ${library.name} - ${embeddingResult.error}`);
        }
        results.libraries.processed++;
      } catch (error) {
        results.libraries.errors++;
        console.log(`  ❌ Library: ${library.name} - ${error.message}`);
      }
    }
  } catch (error) {
    console.error('Error processing libraries:', error.message);
  }

  // 3. Generate embeddings for images (first 20 for testing)
  console.log('\n🖼️  Processing images (first 20)...');
  try {
    const { data: images, error } = await supabase
      .from('images')
      .select('id, gcs_path, metadata')
      .is('embedding', null)
      .limit(20);

    if (error) throw error;

    for (const image of images || []) {
      try {
        const file = bucket.file(image.gcs_path);
        const [imageBuffer] = await file.download();
        const mimeType = image.metadata?.mimetype || 'image/jpeg';
        const base64DataUrl = imageToBase64DataUrl(imageBuffer, mimeType);
        
        const embeddingResult = await generateImageEmbedding(base64DataUrl);
        
        if (embeddingResult.success) {
          const { error: updateError } = await supabase
            .from('images')
            .update({ embedding: embeddingResult.embedding })
            .eq('id', image.id);

          if (updateError) throw updateError;
          
          results.images.success++;
          const filename = image.gcs_path.split('/').pop();
          console.log(`  ✅ Image: ${filename}`);
        } else {
          results.images.errors++;
          const filename = image.gcs_path.split('/').pop();
          console.log(`  ❌ Image: ${filename} - ${embeddingResult.error}`);
        }
        results.images.processed++;
      } catch (error) {
        results.images.errors++;
        const filename = image.gcs_path.split('/').pop();
        console.log(`  ❌ Image: ${filename} - ${error.message}`);
      }
    }
  } catch (error) {
    console.error('Error processing images:', error.message);
  }

  // 4. Generate embeddings for job results (first 50 for testing)
  console.log('\n📊 Processing job results (first 50)...');
  try {
    const { data: jobResults, error } = await supabase
      .from('job_results')
      .select('id, result')
      .is('embedding', null)
      .limit(50);

    if (error) throw error;

    for (const jobResult of jobResults || []) {
      try {
        const textContent = typeof jobResult.result === 'string' 
          ? jobResult.result 
          : JSON.stringify(jobResult.result);
        
        const embeddingResult = await generateTextEmbedding(textContent);
        
        if (embeddingResult.success) {
          const { error: updateError } = await supabase
            .from('job_results')
            .update({ embedding: embeddingResult.embedding })
            .eq('id', jobResult.id);

          if (updateError) throw updateError;
          
          results.job_results.success++;
          console.log(`  ✅ Job Result: ${jobResult.id}`);
        } else {
          results.job_results.errors++;
          console.log(`  ❌ Job Result: ${jobResult.id} - ${embeddingResult.error}`);
        }
        results.job_results.processed++;
      } catch (error) {
        results.job_results.errors++;
        console.log(`  ❌ Job Result: ${jobResult.id} - ${error.message}`);
      }
    }
  } catch (error) {
    console.error('Error processing job results:', error.message);
  }

  // Print summary
  console.log('\n📈 SUMMARY:');
  console.log('==========================================');
  Object.entries(results).forEach(([type, stats]) => {
    const successRate = stats.processed > 0 ? Math.round((stats.success / stats.processed) * 100) : 0;
    console.log(`${type.toUpperCase()}:`);
    console.log(`  Processed: ${stats.processed}`);
    console.log(`  Success: ${stats.success}`);
    console.log(`  Errors: ${stats.errors}`);
    console.log(`  Success Rate: ${successRate}%`);
    console.log('');
  });

  const totalProcessed = Object.values(results).reduce((sum, r) => sum + r.processed, 0);
  const totalSuccess = Object.values(results).reduce((sum, r) => sum + r.success, 0);
  const totalErrors = Object.values(results).reduce((sum, r) => sum + r.errors, 0);
  const overallSuccessRate = totalProcessed > 0 ? Math.round((totalSuccess / totalProcessed) * 100) : 0;

  console.log(`OVERALL TOTALS:`);
  console.log(`  Total Processed: ${totalProcessed}`);
  console.log(`  Total Success: ${totalSuccess}`);
  console.log(`  Total Errors: ${totalErrors}`);
  console.log(`  Overall Success Rate: ${overallSuccessRate}%`);
  
  if (totalSuccess > 0) {
    console.log('\n🎉 Embeddings generated successfully! You can now search for content.');
  }
}

// Run the script
generateEmbeddingsForExistingContent()
  .then(() => {
    console.log('\n✅ Embedding generation completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Embedding generation failed:', error);
    process.exit(1);
  }); 