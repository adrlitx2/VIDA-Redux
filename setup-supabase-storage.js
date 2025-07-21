const { createClient } = require('@supabase/supabase-js');

async function setupStorage() {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    console.log('Setting up Supabase storage buckets...');

    // Create avatars bucket
    const { data: bucket, error: bucketError } = await supabase.storage.createBucket('avatars', {
      public: true,
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'model/gltf-binary', 'application/octet-stream'],
      fileSizeLimit: 52428800 // 50MB
    });

    if (bucketError && bucketError.message !== 'Bucket already exists') {
      console.error('Error creating bucket:', bucketError);
      return;
    }

    console.log('Avatars bucket created or already exists');

    // Set up bucket policies for public access
    const { error: policyError } = await supabase.rpc('create_bucket_policy', {
      bucket_name: 'avatars',
      policy_name: 'Public Access',
      policy: {
        for: 'select',
        to: ['public'],
        using: 'true'
      }
    });

    if (policyError) {
      console.log('Policy creation result (may already exist):', policyError.message);
    }

    console.log('✅ Supabase storage setup completed successfully');
    
  } catch (error) {
    console.error('Error setting up storage:', error);
  }
}

setupStorage();