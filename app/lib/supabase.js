import { createClient } from '@supabase/supabase-js'

// Create a single supabase client for interacting with your database
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Anon Key:', supabaseAnonKey);

export const supabase = createClient(supabaseUrl, supabaseAnonKey) 

// const { data, error } = await supabase.auth.signInWithPassword({ email, password });
// console.log('Login result:', data, error); 

const handleLogin = async (e) => {
  e.preventDefault();
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    console.log('Login result:', data, error);
    // ...rest of your login logic
  } catch (err) {
    // handle error
  }
}; 