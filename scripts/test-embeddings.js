const { generateTextEmbedding, generateImageEmbedding } = require('../lib/services/cohere-embeddings');

async function testEmbeddings() {
  console.log('Testing Cohere V4 embeddings with 1024 dimensions...\n');
  
  // Test text embedding
  console.log('🔤 Testing text embedding...');
  const textResult = await generateTextEmbedding('test dog photo');
  
  if (textResult.success) {
    console.log(`✅ Text embedding successful: ${textResult.embedding.length} dimensions`);
    console.log(`   First 5 values: [${textResult.embedding.slice(0, 5).map(v => v.toFixed(4)).join(', ')}]`);
  } else {
    console.log(`❌ Text embedding failed: ${textResult.error}`);
  }
  
  // Test image embedding (using a simple data URL)
  console.log('\n🖼️  Testing image embedding...');
  // Create a minimal test image data URL (1x1 pixel red image)
  const testImageDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
  
  const imageResult = await generateImageEmbedding(testImageDataUrl);
  
  if (imageResult.success) {
    console.log(`✅ Image embedding successful: ${imageResult.embedding.length} dimensions`);
    console.log(`   First 5 values: [${imageResult.embedding.slice(0, 5).map(v => v.toFixed(4)).join(', ')}]`);
  } else {
    console.log(`❌ Image embedding failed: ${imageResult.error}`);
  }
  
  console.log('\n📊 Summary:');
  console.log(`Expected dimensions: 1024`);
  console.log(`Text result: ${textResult.success ? textResult.embedding.length + ' dimensions' : 'FAILED'}`);
  console.log(`Image result: ${imageResult.success ? imageResult.embedding.length + ' dimensions' : 'FAILED'}`);
  
  if (textResult.success && textResult.embedding.length !== 1024) {
    console.log('\n🚨 ERROR: Text embedding has wrong dimensions!');
  }
  if (imageResult.success && imageResult.embedding.length !== 1024) {
    console.log('\n🚨 ERROR: Image embedding has wrong dimensions!');
  }
  
  if (textResult.success && imageResult.success && 
      textResult.embedding.length === 1024 && imageResult.embedding.length === 1024) {
    console.log('\n🎉 All embeddings are working correctly with 1024 dimensions!');
  }
}

testEmbeddings().catch(console.error); 