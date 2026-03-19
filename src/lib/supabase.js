import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// This single line connects your app to your Supabase database
export const supabase = createClient(supabaseUrl, supabaseAnonKey);