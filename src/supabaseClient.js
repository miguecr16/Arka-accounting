import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://ddenuevupwywvatplfnt.supabase.co";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_lXbno5-fKYLsfWn1MnRi2w_I7wo2a_1";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
