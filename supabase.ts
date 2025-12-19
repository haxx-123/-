import { createClient } from '@supabase/supabase-js';

// Configuration from user input
export const SUPABASE_URL = 'https://jlakwbxkftokfdyqdrmt.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpsYWt3YnhrZnRva2ZkeXFkcm10Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU5MDM4NDAsImV4cCI6MjA4MTQ3OTg0MH0.2Stwx6UV3Tv9ZpQdoc2_FEqyyLO8e2YDBmzIcNiIEfk';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);