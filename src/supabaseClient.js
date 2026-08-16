import { createClient } from '@supabase/supabase-js';

// The API URL uses your project reference ID (ddenuevupwywvatplfnt)
const SUPABASE_URL = "https://ddenuevupwywvatplfnt.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_lXbno5-fKYLsfWn1MnRi2w_I7wo2a_1";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
