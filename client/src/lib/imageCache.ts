/**
 * Browser-based image caching system for IPFS background images
 * Reduces bandwidth usage and improves performance
 */

interface CachedImage {
  url: string;
  blob: Blob;
  timestamp: number;
  size: number;
  ipfsHash?: string;
  isFullResolution?: boolean;
}

class ImageCache {
  private cache: Map<string, CachedImage> = new Map();
  private maxCacheSize = 50 * 1024 * 1024; // 50MB max cache
  private maxAge = 24 * 60 * 60 * 1000; // 24 hours
  private currentCacheSize = 0;

  /**
   * Get cached image with IPFS optimization and local thumbnail fallback
   */
  async getImage(url: string, thumbnailUrl?: string, ipfsHash?: string): Promise<string> {
    const cacheKey = ipfsHash || url;
    
    // Check if image is in cache and still valid
    const cached = this.cache.get(cacheKey);
    if (cached && this.isValidCache(cached)) {
      console.log('🎯 Cache hit for:', cacheKey);
      return URL.createObjectURL(cached.blob);
    }

    // Remove from cache if expired
    if (cached) {
      this.removeFromCache(cacheKey);
    }

    // Handle temporary high-res files and local thumbnails
    if (url.startsWith('/uploads/')) {
      try {
        console.log('📥 Loading local file:', url);
        const response = await fetch(url);
        if (response.ok) {
          const blob = await response.blob();
          const isHighRes = url.includes('highres-');
          this.cacheImage(cacheKey, blob, url, isHighRes, ipfsHash);
          return URL.createObjectURL(blob);
        }
      } catch (error) {
        console.warn('Local file load failed:', error);
      }
    }

    // Try local thumbnail for IPFS content (cost optimization)
    if (thumbnailUrl && url.includes('gateway.pinata.cloud')) {
      try {
        console.log('📥 Loading local thumbnail:', thumbnailUrl);
        const thumbResponse = await fetch(thumbnailUrl);
        if (thumbResponse.ok) {
          const blob = await thumbResponse.blob();
          this.cacheImage(cacheKey, blob, thumbnailUrl, false, ipfsHash);
          return URL.createObjectURL(blob);
        }
      } catch (error) {
        console.warn('Local thumbnail failed, using IPFS:', error);
      }
    }

    // Fetch from IPFS and cache
    try {
      console.log('🌐 Fetching from IPFS:', url);
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status}`);
      }

      const blob = await response.blob();
      this.cacheImage(cacheKey, blob, url, true, ipfsHash);
      return URL.createObjectURL(blob);

    } catch (error) {
      // Fallback to thumbnail if IPFS fails
      if (thumbnailUrl && thumbnailUrl !== url) {
        console.log('⚠️ IPFS failed, using thumbnail fallback');
        const response = await fetch(thumbnailUrl);
        const blob = await response.blob();
        return URL.createObjectURL(blob);
      }
      throw error;
    }
  }

  /**
   * Cache an image with metadata
   */
  private cacheImage(key: string, blob: Blob, url: string, isFullRes: boolean, ipfsHash?: string): void {
    const size = blob.size;
    this.ensureCacheSpace(size);

    const cachedImage: CachedImage = {
      url,
      blob,
      timestamp: Date.now(),
      size,
      ipfsHash,
      isFullResolution: isFullRes
    };

    this.cache.set(key, cachedImage);
    this.currentCacheSize += size;
    console.log(`💾 Cached ${isFullRes ? 'full' : 'thumbnail'} image: ${key} (${(size / 1024).toFixed(1)}KB)`);
  }

  /**
   * Preload multiple backgrounds for optimized IPFS usage
   */
  async preloadBackgrounds(backgrounds: Array<{image_url: string, thumbnail_url?: string, name: string, category: string, ipfs_hash?: string}>): Promise<void> {
    // Sort by priority (bedroom category first)
    const sortedBackgrounds = backgrounds.sort((a, b) => {
      if (a.category === 'bedroom' && b.category !== 'bedroom') return -1;
      if (b.category === 'bedroom' && a.category !== 'bedroom') return 1;
      return 0;
    });

    const preloadPromises = sortedBackgrounds.map(async (bg) => {
      try {
        await this.getImage(bg.image_url, bg.thumbnail_url, bg.ipfs_hash);
      } catch (error) {
        console.warn(`Failed to preload ${bg.name}:`, error);
      }
    });

    await Promise.allSettled(preloadPromises);
    console.log(`🚀 Preloaded ${backgrounds.length} backgrounds`);
  }

  /**
   * Check if cached image is still valid
   */
  private isValidCache(cached: CachedImage): boolean {
    return Date.now() - cached.timestamp < this.maxAge;
  }

  /**
   * Ensure there's enough space in cache
   */
  private ensureCacheSpace(requiredSize: number): void {
    while (this.currentCacheSize + requiredSize > this.maxCacheSize && this.cache.size > 0) {
      this.removeOldestEntry();
    }
  }

  /**
   * Remove oldest cache entry
   */
  private removeOldestEntry(): void {
    let oldestKey: string | null = null;
    let oldestTimestamp = Number.MAX_SAFE_INTEGER;
    
    this.cache.forEach((cached, key) => {
      if (cached.timestamp < oldestTimestamp) {
        oldestTimestamp = cached.timestamp;
        oldestKey = key;
      }
    });
    
    if (oldestKey !== null) {
      this.removeFromCache(oldestKey);
    }
  }

  /**
   * Remove item from cache
   */
  private removeFromCache(url: string): void {
    const cached = this.cache.get(url);
    if (cached) {
      this.currentCacheSize -= cached.size;
      this.cache.delete(url);
      URL.revokeObjectURL(cached.url);
    }
  }

  /**
   * Clear all cached images
   */
  clearCache(): void {
    this.cache.clear();
    this.currentCacheSize = 0;
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      totalSize: this.currentCacheSize,
      totalSizeMB: (this.currentCacheSize / 1024 / 1024).toFixed(2)
    };
  }

  /**
   * Get service worker cache size
   */
  private async getServiceWorkerCacheSize(): Promise<number> {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      try {
        return new Promise((resolve) => {
          const channel = new MessageChannel();
          channel.port1.onmessage = (event) => {
            resolve(event.data.cacheSize || 0);
          };
          navigator.serviceWorker.controller!.postMessage({ type: 'GET_CACHE_SIZE' }, [channel.port2]);
        });
      } catch (error) {
        return 0;
      }
    }
    return 0;
  }

  /**
   * Clear service worker cache
   */
  private async clearServiceWorkerCache(): Promise<void> {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      try {
        const channel = new MessageChannel();
        navigator.serviceWorker.controller!.postMessage({ type: 'CLEAR_CACHE' }, [channel.port2]);
      } catch (error) {
        console.warn('Failed to clear service worker cache:', error);
      }
    }
  }

  /**
   * Get total cache size including service worker
   */
  async getTotalCacheSize(): Promise<{ memoryCache: number, serviceWorkerCache: number, totalMB: number }> {
    const swCacheSize = await this.getServiceWorkerCacheSize();
    const total = this.currentCacheSize + swCacheSize;
    
    return {
      memoryCache: this.currentCacheSize,
      serviceWorkerCache: swCacheSize,
      totalMB: total / 1024 / 1024
    };
  }
}

export const imageCache = new ImageCache();