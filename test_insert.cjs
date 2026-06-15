const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres.ogqmojvzeyasqoqhkpuz:Rebecasuji%4013@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres' });

async function main() {
  await client.connect();

  // Get the latest session
  const sessionRes = await client.query("SELECT id, employee_id FROM sessions ORDER BY created_at DESC LIMIT 1");
  if (sessionRes.rows.length === 0) {
    console.log("No sessions found.");
    await client.end();
    return;
  }
  const session = sessionRes.rows[0];
  console.log("Found session:", session);

  // Try to insert using pg directly
  try {
    const insertRes = await client.query(
      "INSERT INTO idle_alerts (employee_id, session_id, idle_since, response, reason, description) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
      [session.employee_id, session.id, new Date().toISOString(), 'Working', 'Test script reason', 'Test script description']
    );
    console.log("Inserted via pg:", insertRes.rows);
  } catch (err) {
    console.error("Error inserting via pg:", err);
  }

  await client.end();
}

main().catch(console.error);
