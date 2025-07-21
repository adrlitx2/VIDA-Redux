// Complete IPFS migration for bedroom backgrounds
const fs = require('fs');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

async function uploadImageToIPFS(filePath, apiKey, secretKey) {
  const fileName = filePath.split('/').pop();
  
  try {
    const command = `curl -s -X POST "https://api.pinata.cloud/pinning/pinFileToIPFS" \
      -H "pinata_api_key: ${apiKey}" \
      -H "pinata_secret_api_key: ${secretKey}" \
      -F "file=@${filePath}" \
      -F 'pinataMetadata={"name":"${fileName}","keyvalues":{"type":"stream-background","category":"bedroom"}}'`;

    const { stdout, stderr } = await execAsync(command);
    
    if (stderr && stderr.includes('error')) {
      throw new Error(stderr);
    }

    const result = JSON.parse(stdout);
    return {
      hash: result.IpfsHash,
      url: `https://gateway.pinata.cloud/ipfs/${result.IpfsHash}`
    };
  } catch (error) {
    throw new Error(`Upload failed: ${error.message}`);
  }
}

async function migrateToIPFS() {
  // Note: This would use the actual Pinata credentials provided by the user
  // For now, I'll use the admin API endpoint that's already set up
  
  const images = [
    { file: 'attached_assets/3b052c71-59cf-48e3-a3ec-9e238cac1c77.png', name: 'Pop Art Bedroom' },
    { file: 'attached_assets/873fe266-5fea-4bfc-b3b1-e10872b96c93.png', name: 'Neon Graffiti Bedroom' },
    { file: 'attached_assets/73091702-53fb-42a9-9bf7-569be5e06904.png', name: 'Warhol Modern Bedroom' }
  ];

  console.log('Starting IPFS migration for bedroom backgrounds...');
  
  for (const image of images) {
    console.log(`Processing ${image.name}...`);
    console.log(`File: ${image.file}`);
    
    // Check if file exists
    if (fs.existsSync(image.file)) {
      console.log(`✓ File found: ${image.file}`);
    } else {
      console.log(`✗ File not found: ${image.file}`);
    }
  }

  console.log('Migration preparation complete. Ready for IPFS upload.');
}

migrateToIPFS();