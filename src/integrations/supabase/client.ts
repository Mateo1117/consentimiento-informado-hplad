import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Los valores por defecto son los del proyecto de Supabase del hospital; se pueden
// sobreescribir en tiempo de build con VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY.
const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ?? "https://dbhamokkweyadibngphq.supabase.co";
const SUPABASE_PUBLISHABLE_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRiaGFtb2trd2V5YWRpYm5ncGhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQzNjI3NzEsImV4cCI6MjA2OTkzODc3MX0.nSnIvi5JE04D8Zbr5rt0FdizrM23Y7NUFr5rDoxIys0";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  }
});
