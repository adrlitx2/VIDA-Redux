import fs from 'fs';
import path from 'path';

export class PinataIPFSService {
  private apiKey: string;
  private secretKey: string;
  private baseUrl = 'https://api.pinata.cloud';

  constructor(apiKey?: string, secretKey?: string) {
    this.apiKey = apiKey || process.env.PINATA_API_KEY || '';
    this.secretKey = secretKey || process.env.PINATA_SECRET_KEY || '';
  }

  /**
   * Upload an image file to IPFS via Pinata using curl (working approach)
   */
  async uploadImage(filePath: string): Promise<{ hash: string; url: string }> {
    if (!this.apiKey || !this.secretKey) {
      throw new Error('Pinata API credentials required for IPFS uploads');
    }

    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);

    try {
      const fileName = path.basename(filePath);
      
      // Use the working curl approach with silent output
      const command = `curl -s -X POST "https://api.pinata.cloud/pinning/pinFileToIPFS" \
        -H "pinata_api_key: ${this.apiKey}" \
        -H "pinata_secret_api_key: ${this.secretKey}" \
        -F "file=@${filePath}"`;

      const { stdout, stderr } = await execAsync(command);
      
      // Parse the JSON response
      let result;
      try {
        result = JSON.parse(stdout);
      } catch (parseError) {
        throw new Error(`Failed to parse IPFS response: ${stdout}`);
      }

      if (!result.IpfsHash) {
        throw new Error(`Upload failed: ${stdout}`);
      }

      const hash = result.IpfsHash;
      const url = `https://gateway.pinata.cloud/ipfs/${hash}`;
      
      console.log(`✅ Image uploaded to IPFS: ${fileName} -> ${hash}`);
      return { hash, url };

    } catch (error) {
      console.error('❌ IPFS upload failed:', error);
      throw error;
    }
  }

  /**
   * Upload multiple bedroom images to IPFS
   */
  async uploadBedroomImages(): Promise<Array<{ fileName: string; hash: string; url: string }>> {
    const imageFiles = [
      '3b052c71-59cf-48e3-a3ec-9e238cac1c77.png',
      '873fe266-5fea-4bfc-b3b1-e10872b96c93.png', 
      '73091702-53fb-42a9-9bf7-569be5e06904.png'
    ];

    const results = [];
    for (const fileName of imageFiles) {
      try {
        const filePath = path.join('attached_assets', fileName);
        if (fs.existsSync(filePath)) {
          const { hash, url } = await this.uploadImage(filePath);
          results.push({ fileName, hash, url });
        }
      } catch (error) {
        console.error(`Failed to upload ${fileName}:`, error);
      }
    }
    
    return results;
  }

  /**
   * Upload buffer to IPFS via Pinata
   */
  async uploadBuffer(buffer: Buffer, fileName: string): Promise<{ hash: string; url: string }> {
    if (!this.apiKey || !this.secretKey) {
      throw new Error('Pinata API credentials required for IPFS uploads');
    }

    // Write buffer to temporary file
    const tempPath = path.join(process.cwd(), 'temp', `upload-${Date.now()}-${fileName}`);
    const tempDir = path.dirname(tempPath);
    
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    fs.writeFileSync(tempPath, buffer);
    
    try {
      const result = await this.uploadImage(tempPath);
      // Clean up temp file
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
      }
      return result;
    } catch (error) {
      // Clean up temp file on error
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
      }
      throw error;
    }
  }

  /**
   * Test Pinata connection
   */
  async testConnection(): Promise<boolean> {
    if (!this.apiKey || !this.secretKey) {
      return false;
    }

    try {
      const response = await fetch(`${this.baseUrl}/data/testAuthentication`, {
        method: 'GET',
        headers: {
          'pinata_api_key': this.apiKey,
          'pinata_secret_api_key': this.secretKey
        }
      });

      return response.ok;
    } catch {
      return false;
    }
  }
}

export const pinataService = new PinataIPFSService();