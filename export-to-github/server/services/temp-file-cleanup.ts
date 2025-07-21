/**
 * Temporary File Cleanup Service
 * Handles cleanup of uploaded and generated files that haven't been saved
 */

import fs from 'fs';
import path from 'path';
import { db } from '../db';
import { avatars } from '@shared/schema';
import { eq, sql } from 'drizzle-orm';

export class TempFileCleanupService {
  private static instance: TempFileCleanupService;
  private cleanupInterval: NodeJS.Timeout | null = null;
  
  // Cleanup configuration
  private readonly config = {
    tempDir: path.join(process.cwd(), 'temp'),
    tempAvatarsDir: path.join(process.cwd(), 'temp', 'avatars'),
    meshyProcessingDir: path.join(process.cwd(), 'temp', 'meshy-processing'),
    uploadsDir: path.join(process.cwd(), 'uploads'),
    maxAge: 30 * 60 * 1000, // 30 minutes in milliseconds
    cleanupInterval: 15 * 60 * 1000, // 15 minutes in milliseconds
  };

  private constructor() {}

  static getInstance(): TempFileCleanupService {
    if (!TempFileCleanupService.instance) {
      TempFileCleanupService.instance = new TempFileCleanupService();
    }
    return TempFileCleanupService.instance;
  }

  /**
   * Initialize the cleanup service with automatic periodic cleanup
   */
  public initialize(): void {
    console.log('🧹 Initializing temporary file cleanup service...');
    
    // Run initial cleanup
    this.performCleanup();
    
    // Schedule periodic cleanup
    this.cleanupInterval = setInterval(() => {
      this.performCleanup();
    }, this.config.cleanupInterval);
    
    console.log(`✅ Temp file cleanup service initialized (runs every ${this.config.cleanupInterval / 1000 / 60} minutes)`);
  }

  /**
   * Stop the cleanup service
   */
  public stop(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      console.log('🛑 Temp file cleanup service stopped');
    }
  }

  /**
   * Perform comprehensive cleanup of temporary files
   */
  public async performCleanup(): Promise<void> {
    console.log('🧹 Starting temporary file cleanup...');
    
    try {
      const startTime = Date.now();
      let totalFilesDeleted = 0;
      let totalSizeCleaned = 0;

      // 1. Clean up orphaned temp files
      const tempCleanup = await this.cleanupTempDirectory();
      totalFilesDeleted += tempCleanup.filesDeleted;
      
      // 2. Clean up old original images from meshy processing
      const meshyCleanup = await this.cleanupMeshyProcessingDirectory();
      totalFilesDeleted += meshyCleanup.filesDeleted;
      totalSizeCleaned += tempCleanup.sizeFreed + meshyCleanup.sizeFreed;

      // 1b. Clean up temp avatars directory specifically
      const tempAvatarsCleanup = await this.cleanupTempAvatarsDirectory();
      totalFilesDeleted += tempAvatarsCleanup.filesDeleted;
      totalSizeCleaned += tempAvatarsCleanup.sizeFreed;

      // 2. Clean up old upload files that weren't saved
      const uploadCleanup = await this.cleanupOrphanedUploads();
      totalFilesDeleted += uploadCleanup.filesDeleted;
      totalSizeCleaned += uploadCleanup.sizeFreed;

      // 3. Clean up generated thumbnails for unsaved avatars
      const thumbnailCleanup = await this.cleanupOrphanedThumbnails();
      totalFilesDeleted += thumbnailCleanup.filesDeleted;
      totalSizeCleaned += thumbnailCleanup.sizeFreed;

      const duration = Date.now() - startTime;
      
      if (totalFilesDeleted > 0) {
        console.log(`✅ Cleanup completed: ${totalFilesDeleted} files removed, ${this.formatBytes(totalSizeCleaned)} freed (${duration}ms)`);
      } else {
        console.log(`✅ Cleanup completed: No files needed removal (${duration}ms)`);
      }
      
    } catch (error) {
      console.error('❌ Temporary file cleanup failed:', error);
    }
  }

  /**
   * Clean up files in the temp directory
   */
  private async cleanupTempDirectory(): Promise<{filesDeleted: number, sizeFreed: number}> {
    let filesDeleted = 0;
    let sizeFreed = 0;
    
    if (!fs.existsSync(this.config.tempDir)) {
      return { filesDeleted, sizeFreed };
    }

    const files = fs.readdirSync(this.config.tempDir);
    const now = Date.now();
    
    for (const file of files) {
      const filePath = path.join(this.config.tempDir, file);
      
      try {
        const stats = fs.statSync(filePath);
        const age = now - stats.mtime.getTime();
        
        if (age > this.config.maxAge) {
          const fileSize = stats.size;
          fs.unlinkSync(filePath);
          filesDeleted++;
          sizeFreed += fileSize;
          console.log(`🗑️  Deleted temp file: ${file} (${this.formatBytes(fileSize)}, ${Math.round(age / 1000 / 60)} minutes old)`);
        }
      } catch (error) {
        // File might already be deleted, continue
        console.log(`⚠️  Could not process temp file ${file}:`, error.message);
      }
    }
    
    return { filesDeleted, sizeFreed };
  }

  /**
   * Clean up temp avatars directory specifically
   */
  private async cleanupTempAvatarsDirectory(): Promise<{filesDeleted: number, sizeFreed: number}> {
    let filesDeleted = 0;
    let sizeFreed = 0;
    
    if (!fs.existsSync(this.config.tempAvatarsDir)) {
      return { filesDeleted, sizeFreed };
    }

    const files = fs.readdirSync(this.config.tempAvatarsDir);
    const now = Date.now();
    
    for (const file of files) {
      const filePath = path.join(this.config.tempAvatarsDir, file);
      
      try {
        const stats = fs.statSync(filePath);
        const age = now - stats.mtime.getTime();
        
        // Delete temp avatar files older than max age
        if (age > this.config.maxAge && file.startsWith('temp_')) {
          const fileSize = stats.size;
          fs.unlinkSync(filePath);
          filesDeleted++;
          sizeFreed += fileSize;
          console.log(`🗑️  Deleted temp avatar: ${file} (${this.formatBytes(fileSize)}, ${Math.round(age / 1000 / 60)} minutes old)`);
        }
      } catch (error) {
        console.log(`⚠️  Could not process temp avatar ${file}:`, error.message);
      }
    }
    
    return { filesDeleted, sizeFreed };
  }

  /**
   * Clean up uploaded files that don't have corresponding database entries
   */
  private async cleanupOrphanedUploads(): Promise<{filesDeleted: number, sizeFreed: number}> {
    let filesDeleted = 0;
    let sizeFreed = 0;
    
    if (!fs.existsSync(this.config.uploadsDir)) {
      return { filesDeleted, sizeFreed };
    }

    try {
      // Get all saved avatars from database
      const savedAvatars = await db.select().from(avatars);

      // Create set of all paths that should be preserved
      const preservedPaths = new Set<string>();
      savedAvatars.forEach(avatar => {
        if (avatar.originalPath) preservedPaths.add(path.basename(avatar.originalPath));
        if (avatar.riggedPath) preservedPaths.add(path.basename(avatar.riggedPath));
        if (avatar.thumbnailPath) preservedPaths.add(path.basename(avatar.thumbnailPath));
      });

      // Check all files in uploads directory
      const files = fs.readdirSync(this.config.uploadsDir);
      const now = Date.now();
      
      for (const file of files) {
        const filePath = path.join(this.config.uploadsDir, file);
        
        try {
          const stats = fs.statSync(filePath);
          const age = now - stats.mtime.getTime();
          
          // Delete if file is not in database and older than max age
          if (!preservedPaths.has(file) && age > this.config.maxAge) {
            const fileSize = stats.size;
            fs.unlinkSync(filePath);
            filesDeleted++;
            sizeFreed += fileSize;
            console.log(`🗑️  Deleted orphaned upload: ${file} (${this.formatBytes(fileSize)}, ${Math.round(age / 1000 / 60)} minutes old)`);
          }
        } catch (error) {
          console.log(`⚠️  Could not process upload file ${file}:`, error.message);
        }
      }
      
    } catch (error) {
      console.error('❌ Failed to cleanup orphaned uploads:', error);
    }
    
    return { filesDeleted, sizeFreed };
  }

  /**
   * Clean up thumbnails for avatars that don't exist in database
   */
  private async cleanupOrphanedThumbnails(): Promise<{filesDeleted: number, sizeFreed: number}> {
    let filesDeleted = 0;
    let sizeFreed = 0;
    
    const thumbnailDirs = [
      path.join(process.cwd(), 'uploads', 'thumbnails'),
      path.join(process.cwd(), 'temp', 'thumbnails')
    ];
    
    try {
      // Get all avatar IDs from database
      const savedAvatars = await db.select({ id: avatars.id }).from(avatars);
      const savedAvatarIds = new Set(savedAvatars.map(a => a.id));
      
      for (const thumbnailDir of thumbnailDirs) {
        if (!fs.existsSync(thumbnailDir)) continue;
        
        const files = fs.readdirSync(thumbnailDir);
        const now = Date.now();
        
        for (const file of files) {
          const filePath = path.join(thumbnailDir, file);
          
          try {
            const stats = fs.statSync(filePath);
            const age = now - stats.mtime.getTime();
            
            // Extract avatar ID from filename (assuming format: avatarId_thumbnail.png)
            const avatarId = file.split('_')[0];
            
            // Delete if avatar doesn't exist in database and file is old
            if (!savedAvatarIds.has(avatarId) && age > this.config.maxAge) {
              const fileSize = stats.size;
              fs.unlinkSync(filePath);
              filesDeleted++;
              sizeFreed += fileSize;
              console.log(`🗑️  Deleted orphaned thumbnail: ${file} (${this.formatBytes(fileSize)})`);
            }
          } catch (error) {
            console.log(`⚠️  Could not process thumbnail ${file}:`, error.message);
          }
        }
      }
      
    } catch (error) {
      console.error('❌ Failed to cleanup orphaned thumbnails:', error);
    }
    
    return { filesDeleted, sizeFreed };
  }

  /**
   * Manual cleanup trigger (for testing or immediate cleanup)
   */
  public async triggerCleanup(): Promise<void> {
    console.log('🧹 Manual cleanup triggered...');
    await this.performCleanup();
  }

  /**
   * Get cleanup statistics
   */
  public getCleanupStats(): {
    tempDirSize: number;
    uploadsDirSize: number;
    tempFileCount: number;
    uploadFileCount: number;
  } {
    const stats = {
      tempDirSize: 0,
      uploadsDirSize: 0,
      tempFileCount: 0,
      uploadFileCount: 0
    };
    
    // Calculate temp directory stats
    if (fs.existsSync(this.config.tempDir)) {
      const tempFiles = fs.readdirSync(this.config.tempDir);
      stats.tempFileCount = tempFiles.length;
      
      tempFiles.forEach(file => {
        try {
          const filePath = path.join(this.config.tempDir, file);
          const fileStats = fs.statSync(filePath);
          stats.tempDirSize += fileStats.size;
        } catch (error) {
          // File might be deleted, continue
        }
      });
    }
    
    // Calculate uploads directory stats
    if (fs.existsSync(this.config.uploadsDir)) {
      const uploadFiles = fs.readdirSync(this.config.uploadsDir);
      stats.uploadFileCount = uploadFiles.length;
      
      uploadFiles.forEach(file => {
        try {
          const filePath = path.join(this.config.uploadsDir, file);
          const fileStats = fs.statSync(filePath);
          stats.uploadsDirSize += fileStats.size;
        } catch (error) {
          // File might be deleted, continue
        }
      });
    }
    
    return stats;
  }

  /**
   * Clean up old original images from meshy processing directory
   */
  private async cleanupMeshyProcessingDirectory(): Promise<{ filesDeleted: number; sizeFreed: number }> {
    let filesDeleted = 0;
    let sizeFreed = 0;

    try {
      if (!fs.existsSync(this.config.meshyProcessingDir)) {
        return { filesDeleted, sizeFreed };
      }

      const files = await fs.promises.readdir(this.config.meshyProcessingDir);
      const now = Date.now();

      for (const file of files) {
        const filePath = path.join(this.config.meshyProcessingDir, file);
        
        try {
          const stats = await fs.promises.stat(filePath);
          
          // Skip directories
          if (stats.isDirectory()) continue;
          
          // Check if file is older than maxAge
          const fileAge = now - stats.mtime.getTime();
          
          if (fileAge > this.config.maxAge) {
            const fileSize = stats.size;
            await fs.promises.unlink(filePath);
            filesDeleted++;
            sizeFreed += fileSize;
            console.log(`🗑️ Cleaned up old original image: ${file} (${this.formatBytes(fileSize)})`);
          }
        } catch (fileError) {
          console.warn(`⚠️ Could not process meshy processing file ${file}:`, fileError);
        }
      }

      if (filesDeleted > 0) {
        console.log(`✅ Cleaned up ${filesDeleted} old original images (${this.formatBytes(sizeFreed)})`);
      }

    } catch (error) {
      console.error('❌ Error cleaning up meshy processing directory:', error);
    }

    return { filesDeleted, sizeFreed };
  }

  /**
   * Format bytes to human readable string
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

export const tempFileCleanup = TempFileCleanupService.getInstance();