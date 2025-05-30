import { CohereClientV2 } from 'cohere-ai';

// Initialize Cohere client with proper configuration
function createCohereClient() {
  const apiKey = process.env.COHERE_API_KEY;
  const baseUrl = process.env.COHERE_BASE_URL;
  
  if (!apiKey) {
    throw new Error('COHERE_API_KEY environment variable is not configured');
  }

  return new CohereClientV2({
    token: apiKey,
    ...(baseUrl && { environment: baseUrl }),
  });
}

const cohere = createCohereClient();

export interface EmbeddingResult {
  embedding: number[];
  success: boolean;
  error?: string;
}

export interface BatchEmbeddingResult {
  embeddings: number[][];
  success: boolean;
  error?: string;
}

/**
 * Generate embeddings for text content using Cohere V4
 */
export async function generateTextEmbedding(text: string): Promise<EmbeddingResult> {
  try {
    if (!text.trim()) {
      return { embedding: [], success: false, error: 'Empty text provided' };
    }

    const response = await cohere.embed({
      model: 'embed-v4.0',
      texts: [text],
      inputType: 'search_document',
      embeddingTypes: ['float'],
    });

    const embedding = response.embeddings?.float?.[0];
    
    if (!embedding) {
      return { embedding: [], success: false, error: 'No embedding returned from Cohere' };
    }

    return { embedding, success: true };
  } catch (error) {
    console.error('Text embedding generation failed:', error);
    return { 
      embedding: [], 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Generate embeddings for image content using Cohere V4 multimodal
 */
export async function generateImageEmbedding(imageBase64: string): Promise<EmbeddingResult> {
  try {
    if (!imageBase64) {
      return { embedding: [], success: false, error: 'No image data provided' };
    }

    // Ensure the image is in the correct data URL format
    const dataUrl = imageBase64.startsWith('data:') 
      ? imageBase64 
      : `data:image/jpeg;base64,${imageBase64}`;

    const imageInput = {
      content: [
        {
          type: "image_url" as const,
          image_url: { url: dataUrl }
        }
      ]
    };

    const response = await cohere.embed({
      model: 'embed-v4.0',
      inputs: [imageInput],
      inputType: 'search_document',
      embeddingTypes: ['float'],
    });

    const embedding = response.embeddings?.float?.[0];
    
    if (!embedding) {
      return { embedding: [], success: false, error: 'No embedding returned from Cohere' };
    }

    return { embedding, success: true };
  } catch (error) {
    console.error('Image embedding generation failed:', error);
    return { 
      embedding: [], 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Generate embeddings for search queries
 */
export async function generateSearchEmbedding(query: string): Promise<EmbeddingResult> {
  try {
    if (!query.trim()) {
      return { embedding: [], success: false, error: 'Empty query provided' };
    }

    const response = await cohere.embed({
      model: 'embed-v4.0',
      texts: [query],
      inputType: 'search_query',
      embeddingTypes: ['float'],
    });

    const embedding = response.embeddings?.float?.[0];
    
    if (!embedding) {
      return { embedding: [], success: false, error: 'No embedding returned from Cohere' };
    }

    return { embedding, success: true };
  } catch (error) {
    console.error('Search embedding generation failed:', error);
    return { 
      embedding: [], 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Generate embeddings for multiple texts in batch
 */
export async function generateBatchTextEmbeddings(texts: string[]): Promise<BatchEmbeddingResult> {
  try {
    if (texts.length === 0) {
      return { embeddings: [], success: false, error: 'No texts provided' };
    }

    // Filter out empty texts
    const validTexts = texts.filter(text => text.trim());
    
    if (validTexts.length === 0) {
      return { embeddings: [], success: false, error: 'No valid texts provided' };
    }

    const response = await cohere.embed({
      model: 'embed-v4.0',
      texts: validTexts,
      inputType: 'search_document',
      embeddingTypes: ['float'],
    });

    const embeddings = response.embeddings?.float;
    
    if (!embeddings) {
      return { embeddings: [], success: false, error: 'No embeddings returned from Cohere' };
    }

    return { embeddings, success: true };
  } catch (error) {
    console.error('Batch text embedding generation failed:', error);
    return { 
      embeddings: [], 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Convert image file to base64 data URL for Cohere
 */
export function imageToBase64DataUrl(imageBuffer: Buffer, mimeType: string): string {
  const base64 = imageBuffer.toString('base64');
  const fileExtension = mimeType.split('/')[1] || 'jpeg';
  return `data:image/${fileExtension};base64,${base64}`;
}

/**
 * Calculate cosine similarity between two embedding vectors
 */
export function calculateCosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have the same dimension');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (normA * normB);
} 