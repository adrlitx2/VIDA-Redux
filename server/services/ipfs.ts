import { create } from 'ipfs-http-client';
import fs from 'fs';
import path from 'path';

// IPFS client configuration using Pinata as a more reliable service
const PINATA_API_KEY = process.env.PINATA_API_KEY;
const PINATA_SECRET_KEY = process.env.PINATA_SECRET_KEY;

export class IPFSService {
  /**
   * Upload an image file to IPFS
   * @param filePath - Local file path to upload
   * @returns IPFS hash and gateway URL
   */
  async uploadImage(filePath: string): Promise<{ hash: string; url: string }> {
    try {
      const fileBuffer = fs.readFileSync(filePath);
      const fileName = path.basename(filePath);
      
      const result = await ipfsClient.add({
        path: fileName,
        content: fileBuffer
      });

      const hash = result.cid.toString();
      const url = `https://ipfs.io/ipfs/${hash}`;
      
      console.log(`✅ Image uploaded to IPFS: ${fileName} -> ${hash}`);
      return { hash, url };
    } catch (error) {
      console.error('❌ IPFS upload failed:', error);
      throw new Error(`Failed to upload to IPFS: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Upload multiple images from attached_assets directory to IPFS
   * @param imageFiles - Array of image file names
   * @returns Array of upload results
   */
  async uploadMultipleImages(imageFiles: string[]): Promise<Array<{ fileName: string; hash: string; url: string }>> {
    const results = [];
    
    for (const fileName of imageFiles) {
      try {
        const filePath = path.join('attached_assets', fileName);
        if (fs.existsSync(filePath)) {
          const { hash, url } = await this.uploadImage(filePath);
          results.push({ fileName, hash, url });
        } else {
          console.warn(`⚠️ File not found: ${filePath}`);
        }
      } catch (error) {
        console.error(`❌ Failed to upload ${fileName}:`, error);
      }
    }
    
    return results;
  }

  /**
   * Get IPFS gateway URL from hash
   * @param hash - IPFS hash
   * @returns Gateway URL
   */
  getGatewayUrl(hash: string): string {
    return `https://ipfs.io/ipfs/${hash}`;
  }

  /**
   * Verify IPFS content is accessible
   * @param hash - IPFS hash to verify
   * @returns Boolean indicating accessibility
   */
  async verifyContent(hash: string): Promise<boolean> {
    try {
      const url = this.getGatewayUrl(hash);
      const response = await fetch(url, { method: 'HEAD' });
      return response.ok;
    } catch (error) {
      console.error(`❌ IPFS content verification failed for ${hash}:`, error);
      return false;
    }
  }
}

export const ipfsService = new IPFSService();