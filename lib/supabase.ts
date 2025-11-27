import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

const supabaseUrl = 'https://erwmioveetwzmtrxaowj.supabase.co';

const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVyd21pb3ZlZXR3em10cnhhb3dqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwNjE2NjgsImV4cCI6MjA3OTYzNzY2OH0.yFDTHVMjDXhtXz5LfqQO74GNDpFhpTuQnnVKWgPaAI0';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase credentials. Make sure environment variables are configured in app.json or .env file.');
}

console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Key length:', supabaseAnonKey?.length || 0);

const customFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  try {
    console.log('Fetching:', typeof input === 'string' ? input : input.toString());
    const response = await fetch(input, init);
    console.log('Fetch response status:', response.status);
    return response;
  } catch (error) {
    console.error('Fetch error details:', error);
    throw new Error(`Network request failed: ${(error as Error).message}`);
  }
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  },
  global: {
    fetch: customFetch,
  },
});
