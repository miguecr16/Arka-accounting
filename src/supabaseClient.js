import { createClient } from '@supabase/supabase-js';

// Initializing the Supabase client directly in the code.
// Please replace these strings locally with your actual URL and Anon Key.
const SUPABASE_URL = "https://abcdefghijklmno.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_...";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
