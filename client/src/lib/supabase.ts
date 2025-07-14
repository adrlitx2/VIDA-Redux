import { createClient } from '@supabase/supabase-js';

// Use environment variables for Supabase configuration  
// Extract actual URL from JWT if needed
function extractSupabaseUrl(urlOrToken: string): string {
  // If it looks like a JWT token, extract the URL from it
  if (urlOrToken.startsWith('eyJ')) {
    try {
      const payload = JSON.parse(atob(urlOrToken.split('.')[1]));
      if (payload.iss === 'supabase' && payload.ref) {
        return `https://${payload.ref}.supabase.co`;
      }
    } catch (e) {
      console.warn('Failed to parse token for URL');
    }
  }
  return urlOrToken;
}

const rawUrl = import.meta.env.VITE_SUPABASE_URL || "https://ewvbjadosmwgtntdmpog.supabase.co";
const supabaseUrl = extractSupabaseUrl(rawUrl);
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

console.log("Initializing Supabase with:", { 
  url: supabaseUrl,
  keyAvailable: !!supabaseAnonKey 
});

// Initialize Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storageKey: 'vida3-auth',
    detectSessionInUrl: true,
    flowType: 'pkce',
    debug: true
  }
});

// Custom function to sign in with email link (OTP)
export async function signInWithEmailLink(email: string) {
  const { data, error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${window.location.origin}/auth/callback`,
    }
  });
  
  return { data, error };
}

// For debugging purposes
if (import.meta.env.DEV) {
  (window as any).supabase = supabase;
}