import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://brzuahqgpyyvfrrfnddt.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJyenVhaHFncHl5dmZycmZuZGR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIzNjY3OTEsImV4cCI6MjA3Nzk0Mjc5MX0.5GiUYwbW9-0KTl-eCd9nE-inLm8ArCRfVc9IQy9nTy8';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
