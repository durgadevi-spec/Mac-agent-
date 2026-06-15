const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres.ogqmojvzeyasqoqhkpuz:Rebecasuji%4013@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres' });

async function main() {
  await client.connect();

  const act = await client.query("SELECT * FROM activity_logs WHERE activity_type = 'idle_reason' ORDER BY logged_at DESC LIMIT 5");
  console.log('Recent idle_reason activity_logs:', act.rows);

  const alerts = await client.query("SELECT * FROM idle_alerts ORDER BY created_at DESC LIMIT 5");
  console.log('Recent idle_alerts:', alerts.rows);

  await client.end();
}

main().catch(console.error);
