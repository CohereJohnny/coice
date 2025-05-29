class ImageService {
  private cache = new Map<string, string>();
  private pendingRequests = new Map<string, Promise<string>>();
  private requestCounts = new Map<string, number>();

  async getSignedImageUrl(imageId: string): Promise<string> {
    // Increment request counter for debugging
    const currentCount = this.requestCounts.get(imageId) || 0;
    this.requestCounts.set(imageId, currentCount + 1);
    
    if (currentCount > 0) {
      console.warn(`Image ${imageId} requested ${currentCount + 1} times`);
    }

    // Check cache first
    if (this.cache.has(imageId)) {
      return this.cache.get(imageId)!;
    }

    // Check if request is already pending
    if (this.pendingRequests.has(imageId)) {
      return this.pendingRequests.get(imageId)!;
    }

    // Create new request
    const requestPromise = this.fetchSignedUrl(imageId);
    this.pendingRequests.set(imageId, requestPromise);

    try {
      const url = await requestPromise;
      // Cache the result
      this.cache.set(imageId, url);
      return url;
    } catch (error) {
      console.error(`Failed to get signed URL for image ${imageId}:`, error);
      // Return placeholder on error
      return '/api/placeholder-image';
    } finally {
      // Clean up pending request
      this.pendingRequests.delete(imageId);
    }
  }

  private async fetchSignedUrl(imageId: string): Promise<string> {
    const response = await fetch(`/api/images/${imageId}?signed=true`);
    if (!response.ok) {
      throw new Error(`Failed to get signed URL: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.signedUrl;
  }

  // Clear cache when needed
  clearCache() {
    this.cache.clear();
    this.requestCounts.clear();
  }

  // Get cache stats for debugging
  getCacheStats() {
    return {
      cacheSize: this.cache.size,
      pendingRequests: this.pendingRequests.size,
      requestCounts: Object.fromEntries(this.requestCounts),
    };
  }
}

// Export singleton instance
export const imageService = new ImageService(); 