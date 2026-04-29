import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

let supabase = null;
if (url && serviceKey) {
  supabase = createClient(url, serviceKey);
} else {
  console.warn('Supabase not configured for backend (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing)');
}

export default supabase;
