import { createReadStream } from 'fs';
import { basename } from 'path';

async function uploadToIPFS() {
  const PINATA_API_KEY = process.env.PINATA_API_KEY;
  const PINATA_SECRET_KEY = process.env.PINATA_SECRET_KEY;

  if (!PINATA_API_KEY || !PINATA_SECRET_KEY) {
    console.error('❌ Missing Pinata credentials');
    return;
  }

  const images = [
    { file: 'attached_assets/3b052c71-59cf-48e3-a3ec-9e238cac1c77.png', name: 'Pop Art Bedroom' },
    { file: 'attached_assets/873fe266-5fea-4bfc-b3b1-e10872b96c93.png', name: 'Neon Graffiti Bedroom' },
    { file: 'attached_assets/73091702-53fb-42a9-9bf7-569be5e06904.png', name: 'Warhol Modern Bedroom' }
  ];

  for (const image of images) {
    try {
      console.log(`🔄 Uploading ${image.name}...`);
      
      // Create form data manually
      const boundary = `----formdata-pinata-${Date.now()}`;
      const fileBuffer = await import('fs').then(fs => fs.promises.readFile(image.file));
      const fileName = basename(image.file);
      
      let body = '';
      body += `--${boundary}\r\n`;
      body += `Content-Disposition: form-data; name="file"; filename="${fileName}"\r\n`;
      body += `Content-Type: image/png\r\n\r\n`;
      
      const formData = Buffer.concat([
        Buffer.from(body, 'utf8'),
        fileBuffer,
        Buffer.from(`\r\n--${boundary}\r\n`, 'utf8'),
        Buffer.from(`Content-Disposition: form-data; name="pinataMetadata"\r\n\r\n`, 'utf8'),
        Buffer.from(JSON.stringify({
          name: image.name.toLowerCase().replace(/\s+/g, '-'),
          keyvalues: { type: 'stream-background', category: 'bedroom' }
        }), 'utf8'),
        Buffer.from(`\r\n--${boundary}--\r\n`, 'utf8')
      ]);

      const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
        method: 'POST',
        headers: {
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
          'pinata_api_key': PINATA_API_KEY,
          'pinata_secret_api_key': PINATA_SECRET_KEY
        },
        body: formData
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Upload failed for ${image.name}:`, errorText);
        continue;
      }

      const result = await response.json();
      const ipfsUrl = `https://gateway.pinata.cloud/ipfs/${result.IpfsHash}`;
      
      console.log(`✅ ${image.name} uploaded: ${result.IpfsHash}`);
      console.log(`🔗 URL: ${ipfsUrl}`);

      // Update database
      const { db } = await import('./db');
      const { streamBackgrounds } = await import('../shared/schema');
      const { eq } = await import('drizzle-orm');

      await db
        .update(streamBackgrounds)
        .set({ 
          imageUrl: ipfsUrl,
          updatedAt: new Date()
        })
        .where(eq(streamBackgrounds.name, image.name));

      console.log(`📝 Database updated for ${image.name}`);

    } catch (error) {
      console.error(`❌ Error uploading ${image.name}:`, error);
    }
  }

  console.log('🎉 IPFS migration completed!');
}

uploadToIPFS().catch(console.error);