const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres.ogqmojvzeyasqoqhkpuz:Rebecasuji%4013@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres' });

async function main() {
  await client.connect();

  // Drop the wrong FK constraint
  await client.query("ALTER TABLE idle_alerts DROP CONSTRAINT IF EXISTS idle_alerts_session_id_fkey;");
  console.log("Dropped old FK constraint");

  // Add the correct FK constraint
  try {
    await client.query("ALTER TABLE idle_alerts ADD CONSTRAINT idle_alerts_session_id_fkey FOREIGN KEY (session_id) REFERENCES work_sessions(id) ON DELETE CASCADE;");
    console.log("Added new FK constraint pointing to work_sessions");
  } catch (err) {
    console.error("Failed to add new FK constraint:", err.message);
  }

  await client.end();
}

main().catch(console.error);
