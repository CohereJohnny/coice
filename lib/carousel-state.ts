/**
 * Carousel State Management Utilities
 * Handles URL state persistence and deep-linking for the carousel component
 */

export interface CarouselState {
  isOpen: boolean;
  imageIndex: number;
  zoomLevel?: number;
  showMetadata?: boolean;
  isPlaying?: boolean;
  view?: 'card' | 'list' | 'carousel';
}

export interface CarouselUrlParams {
  carousel?: string;
  image?: string;
  zoom?: string;
  metadata?: string;
  playing?: string;
  view?: string;
}

/**
 * Parse carousel state from URL search parameters
 */
export function parseCarouselState(searchParams: URLSearchParams): Partial<CarouselState> {
  const state: Partial<CarouselState> = {};

  // Check if carousel is open
  if (searchParams.get('carousel') === 'true') {
    state.isOpen = true;
  }

  // Parse image index
  const imageParam = searchParams.get('image');
  if (imageParam && !isNaN(parseInt(imageParam))) {
    state.imageIndex = parseInt(imageParam);
  }

  // Parse zoom level
  const zoomParam = searchParams.get('zoom');
  if (zoomParam && !isNaN(parseFloat(zoomParam))) {
    state.zoomLevel = parseFloat(zoomParam);
  }

  // Parse metadata visibility
  if (searchParams.get('metadata') === 'true') {
    state.showMetadata = true;
  }

  // Parse slideshow state
  if (searchParams.get('playing') === 'true') {
    state.isPlaying = true;
  }

  // Parse view mode
  const viewParam = searchParams.get('view');
  if (viewParam && ['card', 'list', 'carousel'].includes(viewParam)) {
    state.view = viewParam as 'card' | 'list' | 'carousel';
  }

  return state;
}

/**
 * Convert carousel state to URL search parameters
 */
export function carouselStateToParams(state: Partial<CarouselState>): CarouselUrlParams {
  const params: CarouselUrlParams = {};

  if (state.isOpen) {
    params.carousel = 'true';
  }

  if (state.imageIndex !== undefined) {
    params.image = state.imageIndex.toString();
  }

  if (state.zoomLevel && state.zoomLevel > 1) {
    params.zoom = state.zoomLevel.toFixed(2);
  }

  if (state.showMetadata) {
    params.metadata = 'true';
  }

  if (state.isPlaying) {
    params.playing = 'true';
  }

  if (state.view) {
    params.view = state.view;
  }

  return params;
}

/**
 * Update URL with carousel state (debounced to avoid excessive history entries)
 */
export function updateCarouselUrl(
  state: Partial<CarouselState>,
  pathname: string = window.location.pathname,
  debounceMs: number = 500
) {
  // Clear existing timeout
  if ((updateCarouselUrl as any).timeoutId) {
    clearTimeout((updateCarouselUrl as any).timeoutId);
  }

  // Debounced update
  (updateCarouselUrl as any).timeoutId = setTimeout(() => {
    const url = new URL(window.location.href);
    const params = carouselStateToParams(state);

    // Clear all carousel-related params first
    url.searchParams.delete('carousel');
    url.searchParams.delete('image');
    url.searchParams.delete('zoom');
    url.searchParams.delete('metadata');
    url.searchParams.delete('playing');
    url.searchParams.delete('view');

    // Set new params
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.set(key, value);
      }
    });

    // Update URL without page reload
    window.history.replaceState({}, '', url.toString());
  }, debounceMs);
}

/**
 * Generate shareable carousel URL
 */
export function generateShareableCarouselUrl(
  state: CarouselState,
  baseUrl: string = window.location.origin,
  pathname: string = window.location.pathname
): string {
  const url = new URL(pathname, baseUrl);
  const params = carouselStateToParams(state);

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      url.searchParams.set(key, value);
    }
  });

  return url.toString();
}

/**
 * Hook-style utility for managing carousel state with URL persistence
 */
export class CarouselStateManager {
  private state: Partial<CarouselState> = {};
  private listeners: Array<(state: Partial<CarouselState>) => void> = [];

  constructor(initialState?: Partial<CarouselState>) {
    // Initialize from URL if available
    if (typeof window !== 'undefined') {
      const urlState = parseCarouselState(new URLSearchParams(window.location.search));
      this.state = { ...initialState, ...urlState };
    } else {
      this.state = initialState || {};
    }
  }

  /**
   * Get current state
   */
  getState(): Partial<CarouselState> {
    return { ...this.state };
  }

  /**
   * Update state and persist to URL
   */
  setState(newState: Partial<CarouselState>, updateUrl: boolean = true): void {
    this.state = { ...this.state, ...newState };
    
    if (updateUrl && typeof window !== 'undefined') {
      updateCarouselUrl(this.state);
    }

    // Notify listeners
    this.listeners.forEach(listener => listener(this.getState()));
  }

  /**
   * Subscribe to state changes
   */
  subscribe(listener: (state: Partial<CarouselState>) => void): () => void {
    this.listeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Open carousel at specific image
   */
  openCarousel(imageIndex: number, options?: Partial<CarouselState>): void {
    this.setState({
      isOpen: true,
      imageIndex,
      view: 'carousel',
      ...options
    });
  }

  /**
   * Close carousel and return to previous view
   */
  closeCarousel(returnView: 'card' | 'list' = 'card'): void {
    this.setState({
      isOpen: false,
      imageIndex: 0,
      zoomLevel: 1,
      showMetadata: false,
      isPlaying: false,
      view: returnView
    });
  }

  /**
   * Navigate to specific image
   */
  navigateToImage(imageIndex: number): void {
    this.setState({
      imageIndex,
      zoomLevel: 1 // Reset zoom when navigating
    });
  }

  /**
   * Toggle metadata overlay
   */
  toggleMetadata(): void {
    this.setState({
      showMetadata: !this.state.showMetadata
    });
  }

  /**
   * Update zoom level
   */
  setZoom(zoomLevel: number): void {
    this.setState({
      zoomLevel: zoomLevel > 1 ? zoomLevel : undefined
    });
  }

  /**
   * Toggle slideshow
   */
  toggleSlideshow(): void {
    this.setState({
      isPlaying: !this.state.isPlaying
    });
  }

  /**
   * Generate shareable link for current state
   */
  getShareableUrl(): string {
    return generateShareableCarouselUrl(this.state as CarouselState);
  }

  /**
   * Copy shareable link to clipboard
   */
  async copyShareableUrl(): Promise<boolean> {
    try {
      const url = this.getShareableUrl();
      await navigator.clipboard.writeText(url);
      return true;
    } catch (error) {
      console.error('Failed to copy URL to clipboard:', error);
      return false;
    }
  }
}

/**
 * Browser history integration
 */
export function setupCarouselHistoryIntegration(stateManager: CarouselStateManager): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const handlePopState = (event: PopStateEvent) => {
    const urlState = parseCarouselState(new URLSearchParams(window.location.search));
    stateManager.setState(urlState, false); // Don't update URL to avoid infinite loop
  };

  window.addEventListener('popstate', handlePopState);

  return () => {
    window.removeEventListener('popstate', handlePopState);
  };
}

/**
 * React hook for carousel state management (placeholder for future React integration)
 */
export function useCarouselState(initialState?: Partial<CarouselState>) {
  if (typeof window === 'undefined') {
    return {
      state: initialState || {},
      setState: () => {},
      openCarousel: () => {},
      closeCarousel: () => {},
      navigateToImage: () => {},
      toggleMetadata: () => {},
      setZoom: () => {},
      toggleSlideshow: () => {},
      getShareableUrl: () => '',
      copyShareableUrl: () => Promise.resolve(false)
    };
  }

  // This would be implemented as a proper React hook when integrated
  const stateManager = new CarouselStateManager(initialState);
  
  return {
    state: stateManager.getState(),
    setState: stateManager.setState.bind(stateManager),
    openCarousel: stateManager.openCarousel.bind(stateManager),
    closeCarousel: stateManager.closeCarousel.bind(stateManager),
    navigateToImage: stateManager.navigateToImage.bind(stateManager),
    toggleMetadata: stateManager.toggleMetadata.bind(stateManager),
    setZoom: stateManager.setZoom.bind(stateManager),
    toggleSlideshow: stateManager.toggleSlideshow.bind(stateManager),
    getShareableUrl: stateManager.getShareableUrl.bind(stateManager),
    copyShareableUrl: stateManager.copyShareableUrl.bind(stateManager)
  };
}

export default CarouselStateManager; 