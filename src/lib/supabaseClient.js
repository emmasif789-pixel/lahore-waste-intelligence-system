import { createClient } from '@supabase/supabase-js'

// The anon key is Supabase's public client key — safe to ship in the
// browser bundle, access is controlled by Row Level Security policies on
// the database side, not by keeping this key secret.
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://bxevxortdzduoanvetls.supabase.co'
const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ4ZXZ4b3J0ZHpkdW9hbnZldGxzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc2NjYxMDksImV4cCI6MjEwMzI0MjEwOX0.gz4zPU926XGt5-vyMyiERD5TG1Hpt3J5m95Seu2T6SE'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
