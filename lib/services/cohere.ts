import { CohereClientV2 } from 'cohere-ai';

export interface CohereImageAnalysisRequest {
  imageUrl: string;
  prompt: string;
  promptType: 'boolean' | 'descriptive' | 'keywords';
}

export interface CohereImageAnalysisResponse {
  success: boolean;
  response: string;
  confidence?: number;
  error?: string;
  metadata?: {
    model: string;
    timestamp: string;
    promptType: string;
  };
}

export interface CohereClientConfig {
  apiKey: string;
  retryAttempts?: number;
  retryDelay?: number;
  timeout?: number;
}

export class CohereService {
  private client: CohereClientV2;
  private config: CohereClientConfig;

  constructor(config: CohereClientConfig) {
    this.config = {
      retryAttempts: 3,
      retryDelay: 1000,
      timeout: 30000,
      ...config,
    };

    this.client = new CohereClientV2({
      token: this.config.apiKey,
    });
  }

  /**
   * Test the Cohere API connection
   */
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      // Make a simple test call to verify authentication
      await this.client.chat({
        model: 'command',
        messages: [
          {
            role: 'user',
            content: 'Hello, this is a connection test.',
          },
        ],
        maxTokens: 10,
      });

      return { success: true };
    } catch (error) {
      console.error('Cohere connection test failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Analyze a single image with a prompt
   * For now, this will be a placeholder that returns simulated results
   * until we can properly integrate the Aya Vision multimodal API
   */
  async analyzeImage(
    request: CohereImageAnalysisRequest
  ): Promise<CohereImageAnalysisResponse> {
    const { imageUrl, prompt, promptType } = request;

    try {
      // For now, return a simulated response since we need to research the correct
      // multimodal API format for the TypeScript client
      // TODO: Implement actual image analysis with Aya Vision
      
      console.log(`[PLACEHOLDER] Analyzing image: ${imageUrl} with prompt: ${prompt}`);
      
      const simulatedResponse = this.generateSimulatedResponse(prompt, promptType);

      return {
        success: true,
        response: simulatedResponse,
        metadata: {
          model: 'c4ai-aya-vision-8b',
          timestamp: new Date().toISOString(),
          promptType,
        },
      };
    } catch (error) {
      console.error('Image analysis failed:', error);
      return {
        success: false,
        response: '',
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          model: 'c4ai-aya-vision-8b',
          timestamp: new Date().toISOString(),
          promptType,
        },
      };
    }
  }

  /**
   * Generate a simulated response for testing purposes
   */
  private generateSimulatedResponse(prompt: string, promptType: string): string {
    switch (promptType) {
      case 'boolean':
        return 'true'; // Simulate a boolean response
      case 'keywords':
        return 'test, image, analysis, placeholder'; // Simulate keywords
      case 'descriptive':
        return `This is a simulated analysis of an image based on the prompt: "${prompt}". The actual implementation will use Cohere's Aya Vision model for real image analysis.`;
      default:
        return 'Simulated response';
    }
  }

  /**
   * Analyze multiple images in batch
   */
  async analyzeImageBatch(
    requests: CohereImageAnalysisRequest[]
  ): Promise<CohereImageAnalysisResponse[]> {
    // For now, process sequentially to avoid rate limiting
    // TODO: Implement proper batch processing with rate limiting
    const results: CohereImageAnalysisResponse[] = [];

    for (const request of requests) {
      const result = await this.analyzeImage(request);
      results.push(result);

      // Add small delay between requests to avoid rate limiting
      await this.delay(500);
    }

    return results;
  }

  /**
   * Format prompt based on expected response type
   */
  private formatPromptForType(prompt: string, type: string): string {
    switch (type) {
      case 'boolean':
        return `${prompt}\n\nPlease respond with only "true" or "false".`;
      case 'keywords':
        return `${prompt}\n\nPlease respond with a comma-separated list of relevant keywords.`;
      case 'descriptive':
        return `${prompt}\n\nPlease provide a detailed description.`;
      default:
        return prompt;
    }
  }

  /**
   * Parse and validate response based on prompt type
   */
  private parseResponseByType(response: string, type: string): string {
    const cleanResponse = response.trim().toLowerCase();

    switch (type) {
      case 'boolean':
        // Normalize boolean responses
        if (cleanResponse.includes('true') || cleanResponse.includes('yes')) {
          return 'true';
        } else if (cleanResponse.includes('false') || cleanResponse.includes('no')) {
          return 'false';
        }
        // If unclear, return the original response
        return response.trim();
      
      case 'keywords':
        // Clean up keywords list
        return response
          .trim()
          .split(',')
          .map(keyword => keyword.trim())
          .filter(keyword => keyword.length > 0)
          .join(', ');
      
      case 'descriptive':
      default:
        return response.trim();
    }
  }

  /**
   * Execute a function with retry logic
   */
  private async executeWithRetry<T>(
    operation: () => Promise<T>
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= this.config.retryAttempts!; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        // Don't retry on authentication errors
        if (this.isNonRetryableError(lastError)) {
          throw lastError;
        }

        if (attempt < this.config.retryAttempts!) {
          const delay = this.config.retryDelay! * Math.pow(2, attempt - 1); // Exponential backoff
          console.warn(`Cohere API attempt ${attempt} failed, retrying in ${delay}ms:`, lastError.message);
          await this.delay(delay);
        }
      }
    }

    throw lastError!;
  }

  /**
   * Check if an error should not be retried
   */
  private isNonRetryableError(error: Error): boolean {
    const message = error.message.toLowerCase();
    return (
      message.includes('authentication') ||
      message.includes('api key') ||
      message.includes('unauthorized') ||
      message.includes('forbidden')
    );
  }

  /**
   * Delay execution for specified milliseconds
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get service status and configuration
   */
  getStatus() {
    return {
      configured: !!this.config.apiKey,
      retryAttempts: this.config.retryAttempts,
      timeout: this.config.timeout,
    };
  }
}

// Singleton instance for the application
let cohereServiceInstance: CohereService | null = null;

export function getCohereService(): CohereService {
  if (!cohereServiceInstance) {
    const apiKey = process.env.COHERE_API_KEY;
    
    if (!apiKey) {
      throw new Error('COHERE_API_KEY environment variable is not configured');
    }

    cohereServiceInstance = new CohereService({
      apiKey,
      retryAttempts: 3,
      retryDelay: 1000,
      timeout: 30000,
    });
  }

  return cohereServiceInstance;
}

// Export singleton getter for convenience
export default getCohereService; 