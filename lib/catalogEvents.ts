// Simple event emitter for catalog updates
type EventCallback = () => void;

class CatalogEventEmitter {
  private listeners: EventCallback[] = [];

  on(callback: EventCallback) {
    this.listeners.push(callback);
    
    // Return cleanup function
    return () => {
      this.listeners = this.listeners.filter(listener => listener !== callback);
    };
  }

  emit() {
    this.listeners.forEach(callback => callback());
  }
}

export const catalogEvents = new CatalogEventEmitter(); 