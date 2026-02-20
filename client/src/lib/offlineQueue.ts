/**
 * Offline Queue System for background sync
 * Queues API requests when offline and syncs when connection is restored
 */

export interface QueuedRequest {
  id: string;
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers: Record<string, string>;
  body?: any;
  timestamp: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  retryCount: number;
  maxRetries: number;
  type: 'guest-checkin' | 'guest-checkout' | 'payment' | 'settings' | 'upload' | 'other';
}

export interface QueueManager {
  add: (request: Omit<QueuedRequest, 'id' | 'timestamp' | 'retryCount'>) => Promise<string>;
  remove: (id: string) => Promise<boolean>;
  clear: () => Promise<void>;
  getQueue: () => Promise<QueuedRequest[]>;
  sync: () => Promise<SyncResult[]>;
  getQueueSize: () => Promise<number>;
  isOnline: () => boolean;
  addListener: (callback: (queue: QueuedRequest[]) => void) => void;
  removeListener: (callback: (queue: QueuedRequest[]) => void) => void;
}

export interface SyncResult {
  requestId: string;
  success: boolean;
  error?: string;
  response?: any;
}

const STORAGE_KEY = 'pelangi-offline-queue';
const MAX_QUEUE_SIZE = 100;
const DEFAULT_MAX_RETRIES = 3;

class OfflineQueueManager implements QueueManager {
  private syncInProgress = false;
  private listeners: Set<(queue: QueuedRequest[]) => void> = new Set();

  constructor() {
    // Listen for online events to trigger sync
    window.addEventListener('online', () => {
      this.sync().catch(console.error);
    });

    // Periodic sync attempt (every 30 seconds when online)
    setInterval(() => {
      if (navigator.onLine && !this.syncInProgress) {
        this.sync().catch(console.error);
      }
    }, 30000);
  }

  async add(request: Omit<QueuedRequest, 'id' | 'timestamp' | 'retryCount'>): Promise<string> {
    const queuedRequest: QueuedRequest = {
      ...request,
      id: this.generateId(),
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries: request.maxRetries || DEFAULT_MAX_RETRIES,
    };

    const queue = await this.getQueue();
    
    // Remove oldest items if queue is full
    if (queue.length >= MAX_QUEUE_SIZE) {
      queue.sort((a, b) => a.timestamp - b.timestamp);
      queue.splice(0, queue.length - MAX_QUEUE_SIZE + 1);
    }

    queue.push(queuedRequest);
    await this.saveQueue(queue);
    
    console.log(`Added request to offline queue: ${queuedRequest.type} - ${queuedRequest.method} ${queuedRequest.url}`);
    this.notifyListeners(queue);

    // Try immediate sync if online
    if (navigator.onLine) {
      this.sync().catch(console.error);
    }

    return queuedRequest.id;
  }

  async remove(id: string): Promise<boolean> {
    const queue = await this.getQueue();
    const initialLength = queue.length;
    const filteredQueue = queue.filter(req => req.id !== id);
    
    if (filteredQueue.length !== initialLength) {
      await this.saveQueue(filteredQueue);
      this.notifyListeners(filteredQueue);
      return true;
    }
    
    return false;
  }

  async clear(): Promise<void> {
    await this.saveQueue([]);
    this.notifyListeners([]);
  }

  async getQueue(): Promise<QueuedRequest[]> {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error loading queue from storage:', error);
      return [];
    }
  }

  async getQueueSize(): Promise<number> {
    const queue = await this.getQueue();
    return queue.length;
  }

  async sync(): Promise<SyncResult[]> {
    if (this.syncInProgress || !navigator.onLine) {
      return [];
    }

    this.syncInProgress = true;
    const results: SyncResult[] = [];

    try {
      const queue = await this.getQueue();
      if (queue.length === 0) {
        return results;
      }

      console.log(`Starting sync of ${queue.length} queued requests`);

      // Sort by priority and timestamp
      const sortedQueue = queue.sort((a, b) => {
        const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
        if (priorityDiff !== 0) return priorityDiff;
        return a.timestamp - b.timestamp;
      });

      const successfulRequests: string[] = [];
      const failedRequests: QueuedRequest[] = [];

      for (const request of sortedQueue) {
        try {
          const result = await this.executeRequest(request);
          results.push({
            requestId: request.id,
            success: true,
            response: result,
          });
          successfulRequests.push(request.id);
          
          console.log(`Successfully synced: ${request.type} - ${request.method} ${request.url}`);
          
          // Small delay between requests to avoid overwhelming the server
          await new Promise(resolve => setTimeout(resolve, 100));
          
        } catch (error) {
          console.error(`Sync failed for request ${request.id}:`, error);
          
          request.retryCount++;
          
          if (request.retryCount >= request.maxRetries) {
            // Max retries reached, remove from queue
            console.warn(`Removing request ${request.id} after ${request.maxRetries} failed attempts`);
            successfulRequests.push(request.id);
          } else {
            // Keep in queue for retry
            failedRequests.push(request);
          }
          
          results.push({
            requestId: request.id,
            success: false,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      // Update queue: remove successful requests, keep failed ones for retry
      const updatedQueue = failedRequests;
      await this.saveQueue(updatedQueue);
      this.notifyListeners(updatedQueue);

      console.log(`Sync completed: ${successfulRequests.length} successful, ${failedRequests.length} remaining`);

    } catch (error) {
      console.error('Sync process failed:', error);
    } finally {
      this.syncInProgress = false;
    }

    return results;
  }

  isOnline(): boolean {
    return navigator.onLine;
  }

  /**
   * Add listener for queue changes
   */
  addListener(callback: (queue: QueuedRequest[]) => void): void {
    this.listeners.add(callback);
  }

  /**
   * Remove queue change listener
   */
  removeListener(callback: (queue: QueuedRequest[]) => void): void {
    this.listeners.delete(callback);
  }

  private async executeRequest(request: QueuedRequest): Promise<any> {
    const { method, url, headers, body } = request;

    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    // Parse response if it's JSON
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    }

    return await response.text();
  }

  private async saveQueue(queue: QueuedRequest[]): Promise<void> {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
    } catch (error) {
      console.error('Error saving queue to storage:', error);
      // If storage is full, try to clear old entries
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        await this.clearOldEntries();
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
        } catch (retryError) {
          console.error('Failed to save queue even after clearing old entries:', retryError);
        }
      }
    }
  }

  private async clearOldEntries(): Promise<void> {
    const queue = await this.getQueue();
    const now = Date.now();
    const oneDayAgo = now - (24 * 60 * 60 * 1000);
    
    // Remove entries older than 1 day
    const filteredQueue = queue.filter(req => req.timestamp > oneDayAgo);
    
    // If still too many, keep only the most recent 50
    if (filteredQueue.length > 50) {
      filteredQueue.sort((a, b) => b.timestamp - a.timestamp);
      filteredQueue.splice(50);
    }
    
    await this.saveQueue(filteredQueue);
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private notifyListeners(queue: QueuedRequest[]): void {
    this.listeners.forEach(callback => {
      try {
        callback(queue);
      } catch (error) {
        console.error('Error in queue listener:', error);
      }
    });
  }
}

// Singleton instance
let queueManager: QueueManager | null = null;

/**
 * Get the singleton queue manager instance
 */
export function getOfflineQueueManager(): QueueManager {
  if (!queueManager) {
    queueManager = new OfflineQueueManager();
  }
  return queueManager;
}

/**
 * Add a request to the offline queue
 */
export async function queueRequest(
  url: string,
  method: QueuedRequest['method'],
  body?: any,
  options: {
    priority?: QueuedRequest['priority'];
    type?: QueuedRequest['type'];
    headers?: Record<string, string>;
    maxRetries?: number;
  } = {}
): Promise<string> {
  const manager = getOfflineQueueManager();
  
  return await manager.add({
    url,
    method,
    body,
    headers: options.headers || {},
    priority: options.priority || 'medium',
    type: options.type || 'other',
    maxRetries: options.maxRetries || DEFAULT_MAX_RETRIES,
  });
}

/**
 * Enhanced fetch that automatically queues requests when offline
 */
export async function fetchWithOfflineQueue(
  url: string,
  options: RequestInit & {
    priority?: QueuedRequest['priority'];
    type?: QueuedRequest['type'];
    maxRetries?: number;
  } = {}
): Promise<Response> {
  // If online, try normal fetch first
  if (navigator.onLine) {
    try {
      const response = await fetch(url, options);
      return response;
    } catch (error) {
      console.warn('Fetch failed, falling back to queue:', error);
      // Fall through to queue logic
    }
  }

  // If offline or fetch failed, queue the request
  const { priority, type, maxRetries, ...fetchOptions } = options;
  
  const requestId = await queueRequest(
    url,
    (fetchOptions.method as QueuedRequest['method']) || 'GET',
    fetchOptions.body,
    {
      priority,
      type,
      headers: fetchOptions.headers as Record<string, string>,
      maxRetries,
    }
  );

  // Return a fake response indicating the request was queued
  return new Response(
    JSON.stringify({ 
      queued: true, 
      requestId,
      message: 'Request queued for background sync'
    }),
    {
      status: 202, // Accepted
      statusText: 'Queued',
      headers: { 'Content-Type': 'application/json' }
    }
  );
}

/**
 * Offline queue utilities for debugging
 */
export const queueDebug = {
  /**
   * Get current queue contents
   */
  async getQueue(): Promise<QueuedRequest[]> {
    const manager = getOfflineQueueManager();
    return await manager.getQueue();
  },

  /**
   * Clear all queued requests
   */
  async clearQueue(): Promise<void> {
    const manager = getOfflineQueueManager();
    await manager.clear();
  },

  /**
   * Force sync all requests
   */
  async forceSync(): Promise<SyncResult[]> {
    const manager = getOfflineQueueManager();
    return await manager.sync();
  },

  /**
   * Get queue statistics
   */
  async getStats(): Promise<{
    totalRequests: number;
    byType: Record<string, number>;
    byPriority: Record<string, number>;
    oldestRequest?: Date;
    newestRequest?: Date;
  }> {
    const queue = await this.getQueue();
    
    const stats = {
      totalRequests: queue.length,
      byType: {} as Record<string, number>,
      byPriority: {} as Record<string, number>,
      oldestRequest: undefined as Date | undefined,
      newestRequest: undefined as Date | undefined,
    };

    if (queue.length > 0) {
      queue.forEach(req => {
        stats.byType[req.type] = (stats.byType[req.type] || 0) + 1;
        stats.byPriority[req.priority] = (stats.byPriority[req.priority] || 0) + 1;
      });

      const timestamps = queue.map(req => req.timestamp);
      stats.oldestRequest = new Date(Math.min(...timestamps));
      stats.newestRequest = new Date(Math.max(...timestamps));
    }

    return stats;
  }
};
