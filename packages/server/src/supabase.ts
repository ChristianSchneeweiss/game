import { createClient } from "@supabase/supabase-js";

export const createSB = (url: string, key: string) => createClient(url, key);
