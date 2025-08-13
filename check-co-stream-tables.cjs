require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
);

async function printTable(table) {
  const { data, error } = await supabase.from(table).select('*');
  if (error) {
    console.error(`Error fetching ${table}:`, error);
  } else {
    console.log(`\n--- ${table} ---`);
    console.dir(data, { depth: null, colors: true });
  }
}

(async () => {
  await printTable('co_stream_sessions');
  await printTable('co_stream_participants');
})(); 