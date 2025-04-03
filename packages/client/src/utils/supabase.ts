import { createClient } from "@supabase/supabase-js";

const key = import.meta.env.VITE_SUPABASE_KEY;
const url = import.meta.env.VITE_SUPABASE_URL;

if (!key || !url) {
  throw new Error("VITE_SUPABASE_KEY and VITE_SUPABASE_URL must be set");
}

export const supabase = createClient(url, key);
