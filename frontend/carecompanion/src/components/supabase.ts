import { createClient } from '@supabase/supabase-js';

// Add this line to see what React is actually reading!
console.log("Testing URL:", import.meta.env.VITE_SUPABASE_URL);

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);

// import { createClient } from '@supabase/supabase-js';

// // Paste the keys directly inside the quotes just for this test
// const supabaseUrl = 'https://bvujqlhwxbhafjefysfq.supabase.co';
// const supabaseKey = 'eyJhbGciOiJIUzI1NiIsIn...paste-the-rest-of-your-long-key-here';

// export const supabase = createClient(supabaseUrl, supabaseKey);