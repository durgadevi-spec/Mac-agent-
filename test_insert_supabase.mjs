import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ogqmojvzeyasqoqhkpuz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ncW1vanZ6ZXlhc3FvcWhrcHV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyNTM1NTQsImV4cCI6MjA5NjgyOTU1NH0.kWuDdRb2bb8IAOMot5BnIvQzWefOAkYfIRmJxFqT4v8';
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data: sessions } = await supabase.from('work_sessions').select('id, employee_id').limit(1);

  if (!sessions || sessions.length === 0) {
    console.log("No work_sessions found.");
    return;
  }

  const payload = {
    employee_id: sessions[0].employee_id,
    session_id: sessions[0].id,
    idle_since: new Date().toISOString(),
    response: 'Working',
    reason: 'Test via supabase client (after FK fix)',
    description: 'Testing if RLS and FK work correctly'
  };

  console.log('Inserting payload:', payload);
  const { data, error } = await supabase.from('idle_alerts').insert([payload]).select();
  
  if (error) {
    console.error('Insert error:', error);
  } else {
    console.log('Insert success:', data);
  }
}

main();
