import { ipfsService } from './services/ipfs';
import { db } from './db';
import { streamBackgrounds } from '../shared/schema';
import { eq } from 'drizzle-orm';

/**
 * Migration script to upload existing images to IPFS and update database URLs
 */
async function migrateImagesToIPFS() {
  console.log('🚀 Starting IPFS migration...');
  
  try {
    // Get all backgrounds with local image URLs
    const backgrounds = await db.select().from(streamBackgrounds);
    console.log(`📊 Found ${backgrounds.length} backgrounds to migrate`);
    
    const imageFiles = [
      '3b052c71-59cf-48e3-a3ec-9e238cac1c77.png', // Pop Art Bedroom
      '873fe266-5fea-4bfc-b3b1-e10872b96c93.png', // Neon Graffiti Bedroom  
      '73091702-53fb-42a9-9bf7-569be5e06904.png'  // Warhol Modern Bedroom
    ];
    
    // Upload all images to IPFS
    console.log('📤 Uploading images to IPFS...');
    const ipfsResults = await ipfsService.uploadMultipleImages(imageFiles);
    
    // Create mapping from filename to IPFS URL
    const ipfsMapping: Record<string, string> = {};
    ipfsResults.forEach(result => {
      ipfsMapping[result.fileName] = result.url;
      console.log(`✅ ${result.fileName} -> ${result.hash}`);
    });
    
    // Update database records with IPFS URLs
    console.log('🔄 Updating database with IPFS URLs...');
    for (const background of backgrounds) {
      const currentUrl = background.imageUrl;
      if (currentUrl?.startsWith('/attached_assets/')) {
        const fileName = currentUrl.replace('/attached_assets/', '');
        const ipfsUrl = ipfsMapping[fileName];
        
        if (ipfsUrl) {
          await db
            .update(streamBackgrounds)
            .set({ 
              imageUrl: ipfsUrl,
              updatedAt: new Date()
            })
            .where(eq(streamBackgrounds.id, background.id));
          
          console.log(`✅ Updated ${background.name}: ${fileName} -> IPFS`);
        }
      }
    }
    
    console.log('🎉 IPFS migration completed successfully!');
    
    // Verify IPFS content accessibility
    console.log('🔍 Verifying IPFS content accessibility...');
    for (const result of ipfsResults) {
      const isAccessible = await ipfsService.verifyContent(result.hash);
      console.log(`${isAccessible ? '✅' : '❌'} ${result.fileName}: ${isAccessible ? 'accessible' : 'not accessible'}`);
    }
    
  } catch (error) {
    console.error('❌ IPFS migration failed:', error);
    throw error;
  }
}

// Run migration if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateImagesToIPFS()
    .then(() => {
      console.log('Migration completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

export { migrateImagesToIPFS };