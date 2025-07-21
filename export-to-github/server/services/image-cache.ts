/**
 * Image Caching Service for VIDA³
 * Handles thumbnail generation and high-res image caching for streaming backgrounds
 */

import fs from 'fs';
import path from 'path';
import axios from 'axios';
import sharp from 'sharp';
import crypto from 'crypto';

interface CacheConfig {
  thumbnailSize: { width: number; height: number };
  highResSize: { width: number; height: number };
  cacheDir: string;
  thumbnailDir: string;
  highResDir: string;
  maxAge: number; // in milliseconds
  maxCacheSize: number; // in bytes
  cleanupInterval: number; // in milliseconds
}

const config: CacheConfig = {
  thumbnailSize: { width: 320, height: 180 }, // 16:9 aspect ratio for thumbnails
  highResSize: { width: 1920, height: 1080 }, // Full HD for streaming
  cacheDir: path.join(process.cwd(), 'cache'),
  thumbnailDir: path.join(process.cwd(), 'cache', 'thumbnails'),
  highResDir: path.join(process.cwd(), 'cache', 'highres'),
  maxAge: 24 * 60 * 60 * 1000, // 24 hours for optimal performance
  maxCacheSize: 50 * 1024 * 1024, // 50 MB maximum cache size
  cleanupInterval: 6 * 60 * 60 * 1000, // Run cleanup every 6 hours
};

export class ImageCacheService {
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.ensureCacheDirectories();
    this.startAutomaticCleanup();
  }

  private ensureCacheDirectories(): void {
    [config.cacheDir, config.thumbnailDir, config.highResDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`Created cache directory: ${dir}`);
      }
    });
  }

  private generateCacheKey(url: string): string {
    return crypto.createHash('md5').update(url).digest('hex');
  }

  private async downloadImage(url: string): Promise<Buffer> {
    try {
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 30000,
        headers: {
          'User-Agent': 'VIDA3-ImageCache/1.0',
        },
      });
      return Buffer.from(response.data);
    } catch (error) {
      console.error(`Failed to download image from ${url}:`, error.message);
      throw new Error(`Failed to download image: ${error.message}`);
    }
  }

  private async generateThumbnail(imageBuffer: Buffer): Promise<Buffer> {
    try {
      return await sharp(imageBuffer)
        .resize(config.thumbnailSize.width, config.thumbnailSize.height, {
          fit: 'cover',
          position: 'center',
        })
        .jpeg({ quality: 85, progressive: true })
        .toBuffer();
    } catch (error) {
      console.error('Failed to generate thumbnail:', error);
      throw new Error(`Thumbnail generation failed: ${error.message}`);
    }
  }

  private async generateHighRes(imageBuffer: Buffer): Promise<Buffer> {
    try {
      const metadata = await sharp(imageBuffer).metadata();
      
      // If image is already smaller than target, don't upscale
      const targetWidth = Math.min(config.highResSize.width, metadata.width || config.highResSize.width);
      const targetHeight = Math.min(config.highResSize.height, metadata.height || config.highResSize.height);
      
      return await sharp(imageBuffer)
        .resize(targetWidth, targetHeight, {
          fit: 'cover',
          position: 'center',
          withoutEnlargement: true,
        })
        .jpeg({ quality: 95, progressive: true })
        .toBuffer();
    } catch (error) {
      console.error('Failed to generate high-res version:', error);
      throw new Error(`High-res generation failed: ${error.message}`);
    }
  }

  private getCacheFilePath(cacheKey: string, type: 'thumbnail' | 'highres'): string {
    const dir = type === 'thumbnail' ? config.thumbnailDir : config.highResDir;
    return path.join(dir, `${cacheKey}.jpg`);
  }

  private isCacheValid(filePath: string): boolean {
    try {
      const stats = fs.statSync(filePath);
      const age = Date.now() - stats.mtime.getTime();
      return age < config.maxAge;
    } catch {
      return false;
    }
  }

  async getThumbnail(imageUrl: string): Promise<{ path: string; url: string }> {
    const cacheKey = this.generateCacheKey(imageUrl);
    const thumbnailPath = this.getCacheFilePath(cacheKey, 'thumbnail');
    const thumbnailUrl = `/cache/thumbnails/${cacheKey}.jpg`;

    // Check if cached thumbnail exists and is valid
    if (fs.existsSync(thumbnailPath) && this.isCacheValid(thumbnailPath)) {
      return { path: thumbnailPath, url: thumbnailUrl };
    }

    // If cache doesn't exist or is invalid, return what we have or throw error
    if (fs.existsSync(thumbnailPath)) {
      // File exists but may be expired - use it anyway to avoid re-downloading
      return { path: thumbnailPath, url: thumbnailUrl };
    }

    // Only attempt download for new images that haven't been cached yet
    console.log(`Generating thumbnail for new image: ${imageUrl}`);

    try {
      // Download original image
      const imageBuffer = await this.downloadImage(imageUrl);
      
      // Generate thumbnail
      const thumbnailBuffer = await this.generateThumbnail(imageBuffer);
      
      // Save to cache
      fs.writeFileSync(thumbnailPath, thumbnailBuffer);
      
      console.log(`Thumbnail cached: ${thumbnailPath}`);
      return { path: thumbnailPath, url: thumbnailUrl };
      
    } catch (error) {
      console.error(`Failed to cache thumbnail for ${imageUrl}:`, error);
      throw error;
    }
  }

  async getHighRes(imageUrl: string): Promise<{ path: string; url: string }> {
    const cacheKey = this.generateCacheKey(imageUrl);
    const highResPath = this.getCacheFilePath(cacheKey, 'highres');
    const highResUrl = `/cache/highres/${cacheKey}.jpg`;

    // Check if cached high-res exists and is valid
    if (fs.existsSync(highResPath) && this.isCacheValid(highResPath)) {
      return { path: highResPath, url: highResUrl };
    }

    // If cache doesn't exist or is invalid, return what we have or throw error
    if (fs.existsSync(highResPath)) {
      // File exists but may be expired - use it anyway to avoid re-downloading
      return { path: highResPath, url: highResUrl };
    }

    // Only attempt download for new images that haven't been cached yet
    console.log(`Generating high-res cache for new image: ${imageUrl}`);

    try {
      // Download original image
      const imageBuffer = await this.downloadImage(imageUrl);
      
      // Generate high-res version
      const highResBuffer = await this.generateHighRes(imageBuffer);
      
      // Save to cache
      fs.writeFileSync(highResPath, highResBuffer);
      
      console.log(`High-res cached: ${highResPath}`);
      return { path: highResPath, url: highResUrl };
      
    } catch (error) {
      console.error(`Failed to cache high-res for ${imageUrl}:`, error);
      throw error;
    }
  }

  async cacheBackground(imageUrl: string): Promise<{
    thumbnail: { path: string; url: string };
    highRes: { path: string; url: string };
  }> {
    // Only log if we're actually downloading new content
    const cacheKey = this.generateCacheKey(imageUrl);
    const highResPath = this.getCacheFilePath(cacheKey, 'highres');
    const thumbnailPath = this.getCacheFilePath(cacheKey, 'thumbnail');
    
    const highResExists = fs.existsSync(highResPath);
    const thumbnailExists = fs.existsSync(thumbnailPath);
    
    if (!highResExists || !thumbnailExists) {
      console.log(`Caching background: ${imageUrl}`);
    }
    
    try {
      const [thumbnail, highRes] = await Promise.all([
        this.getThumbnail(imageUrl),
        this.getHighRes(imageUrl),
      ]);

      return { thumbnail, highRes };
    } catch (error) {
      console.error(`Failed to cache background ${imageUrl}:`, error);
      throw error;
    }
  }

  async clearExpiredCache(): Promise<void> {
    const dirs = [config.thumbnailDir, config.highResDir];
    
    for (const dir of dirs) {
      try {
        const files = fs.readdirSync(dir);
        let removedCount = 0;
        
        for (const file of files) {
          const filePath = path.join(dir, file);
          if (!this.isCacheValid(filePath)) {
            fs.unlinkSync(filePath);
            removedCount++;
          }
        }
        
        if (removedCount > 0) {
          console.log(`Cleared ${removedCount} expired cache files from ${dir}`);
        }
      } catch (error) {
        console.error(`Failed to clear cache in ${dir}:`, error);
      }
    }
  }

  getCacheStats(): {
    thumbnailCount: number;
    highResCount: number;
    totalSize: string;
  } {
    let thumbnailCount = 0;
    let highResCount = 0;
    let totalSize = 0;

    try {
      // Count thumbnails
      const thumbnailFiles = fs.readdirSync(config.thumbnailDir);
      thumbnailCount = thumbnailFiles.length;
      
      // Count high-res files
      const highResFiles = fs.readdirSync(config.highResDir);
      highResCount = highResFiles.length;
      
      // Calculate total size
      for (const file of thumbnailFiles) {
        const stats = fs.statSync(path.join(config.thumbnailDir, file));
        totalSize += stats.size;
      }
      
      for (const file of highResFiles) {
        const stats = fs.statSync(path.join(config.highResDir, file));
        totalSize += stats.size;
      }
    } catch (error) {
      console.error('Failed to get cache stats:', error);
    }

    return {
      thumbnailCount,
      highResCount,
      totalSize: (totalSize / (1024 * 1024)).toFixed(2) + ' MB',
    };
  }

  private startAutomaticCleanup(): void {
    // Run initial cleanup after 30 seconds
    setTimeout(() => {
      this.performCleanup();
    }, 30000);

    // Set up recurring cleanup every 6 hours
    this.cleanupInterval = setInterval(() => {
      this.performCleanup();
    }, config.cleanupInterval);

    console.log('🔄 Automatic cache cleanup scheduled every 6 hours');
  }

  private async performCleanup(): Promise<void> {
    try {
      console.log('🧹 Starting automatic cache cleanup...');
      
      const beforeStats = this.getCacheStats();
      let deletedFiles = 0;

      // Clean up by age
      deletedFiles += await this.cleanupByAge();
      
      // Clean up by size if still over limit
      deletedFiles += await this.cleanupBySize();

      const afterStats = this.getCacheStats();
      
      if (deletedFiles > 0) {
        console.log(`✅ Cache cleanup completed: ${deletedFiles} files removed`);
        console.log(`   Before: ${beforeStats.totalSize} | After: ${afterStats.totalSize}`);
      } else {
        console.log('✅ Cache cleanup completed: No files needed removal');
      }
    } catch (error) {
      console.error('❌ Cache cleanup failed:', error);
    }
  }

  private async cleanupByAge(): Promise<number> {
    let deletedCount = 0;
    const now = Date.now();
    
    const cleanDirectory = (dir: string): number => {
      let deleted = 0;
      if (!fs.existsSync(dir)) return 0;
      
      const files = fs.readdirSync(dir);
      files.forEach(file => {
        const filePath = path.join(dir, file);
        try {
          const stats = fs.statSync(filePath);
          const age = now - stats.mtime.getTime();
          
          if (age > config.maxAge) {
            fs.unlinkSync(filePath);
            deleted++;
          }
        } catch (error) {
          // File might already be deleted, continue
        }
      });
      return deleted;
    };

    deletedCount += cleanDirectory(config.thumbnailDir);
    deletedCount += cleanDirectory(config.highResDir);
    
    return deletedCount;
  }

  private async cleanupBySize(): Promise<number> {
    let deletedCount = 0;
    
    // Get current cache size
    const stats = this.getCacheStats();
    const currentSize = parseFloat(stats.totalSize) * 1024 * 1024; // Convert MB to bytes
    
    if (currentSize <= config.maxCacheSize) {
      return 0; // No cleanup needed
    }
    
    console.log(`Cache size (${stats.totalSize}) exceeds limit, cleaning up...`);
    
    // Get all files with their access times
    const allFiles: Array<{ path: string; atime: number; size: number }> = [];
    
    [config.thumbnailDir, config.highResDir].forEach(dir => {
      if (!fs.existsSync(dir)) return;
      
      const files = fs.readdirSync(dir);
      files.forEach(file => {
        const filePath = path.join(dir, file);
        try {
          const fileStats = fs.statSync(filePath);
          allFiles.push({
            path: filePath,
            atime: fileStats.atime.getTime(),
            size: fileStats.size
          });
        } catch (error) {
          // File might be deleted, skip
        }
      });
    });
    
    // Sort by access time (oldest first)
    allFiles.sort((a, b) => a.atime - b.atime);
    
    // Delete oldest files until under limit
    let freedBytes = 0;
    for (const file of allFiles) {
      if (currentSize - freedBytes <= config.maxCacheSize) {
        break;
      }
      
      try {
        fs.unlinkSync(file.path);
        freedBytes += file.size;
        deletedCount++;
      } catch (error) {
        // File might already be deleted, continue
      }
    }
    
    return deletedCount;
  }

  async clearCache(): Promise<{ deleted: number; freed: string }> {
    let deletedCount = 0;
    let freedBytes = 0;
    
    const clearDirectory = (dir: string): void => {
      if (!fs.existsSync(dir)) return;
      
      const files = fs.readdirSync(dir);
      files.forEach(file => {
        const filePath = path.join(dir, file);
        try {
          const stats = fs.statSync(filePath);
          freedBytes += stats.size;
          fs.unlinkSync(filePath);
          deletedCount++;
        } catch (error) {
          // File might already be deleted
        }
      });
    };
    
    clearDirectory(config.thumbnailDir);
    clearDirectory(config.highResDir);
    
    return {
      deleted: deletedCount,
      freed: (freedBytes / (1024 * 1024)).toFixed(2) + ' MB'
    };
  }

  stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      console.log('🛑 Automatic cache cleanup stopped');
    }
  }
}

export const imageCacheService = new ImageCacheService();