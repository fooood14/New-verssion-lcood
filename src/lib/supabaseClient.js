import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://myywxfguwjacuwwzrqcg.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15eXd4Zmd1d2phY3V3d3pycWNnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAyNDM2NjYsImV4cCI6MjA2NTgxOTY2Nn0.cuJjPV7h5AA1D4kj_rD0pmgEfeogv-p6Gtd8E-FN1Tw';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});