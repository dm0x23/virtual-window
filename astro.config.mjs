// @ts-check
import { defineConfig } from 'astro/config';
import preact from '@astrojs/preact';
import tailwindcss from '@tailwindcss/vite';
import { loadEnv } from 'vite';

const env = loadEnv(process.env.NODE_ENV || 'development', process.cwd(), '');
const supabaseUrl = env.PUBLIC_SUPABASE_URL || env.SUPABASE_URL || process.env.PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = env.PUBLIC_SUPABASE_ANON_KEY || env.SUPABASE_KEY || process.env.PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_KEY || '';

// https://astro.build/config
export default defineConfig({
  integrations: [preact()],
  vite: {
    plugins: [tailwindcss()],
    define: {
      'import.meta.env.PUBLIC_SUPABASE_URL': JSON.stringify(supabaseUrl),
      'import.meta.env.PUBLIC_SUPABASE_ANON_KEY': JSON.stringify(supabaseKey),
      'import.meta.env.SUPABASE_URL': JSON.stringify(supabaseUrl),
      'import.meta.env.SUPABASE_KEY': JSON.stringify(supabaseKey),
    },
  },
});
