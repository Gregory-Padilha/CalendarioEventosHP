import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Temporary runtime validation log for connection debugging
console.log('[Supabase Client Initialization] URL:', supabaseUrl ? `${supabaseUrl.substring(0, 15)}...` : 'undefined', 'Key Exists:', !!supabaseAnonKey);

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('CRITICAL: Missing Supabase Environment Variables! URL:', supabaseUrl, 'Key Exists:', !!supabaseAnonKey);
  throw new Error('Missing Supabase Environment Variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
