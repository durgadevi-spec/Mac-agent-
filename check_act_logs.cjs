const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres.ogqmojvzeyasqoqhkpuz:Rebecasuji%4013@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres' });

async function main() {
  await client.connect();
  const query = `
    SELECT
      tc.constraint_name, 
      kcu.column_name, 
      ccu.table_name AS foreign_table_name,
      ccu.column_name AS foreign_column_name 
    FROM 
      information_schema.table_constraints AS tc 
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name='activity_logs';
  `;
  const fk = await client.query(query);
  console.log('activity_logs FK constraints:', fk.rows);

  const act = await client.query("SELECT * FROM activity_logs ORDER BY logged_at DESC LIMIT 5");
  console.log('Recent activity_logs:', act.rows.map(r => ({ id: r.id, type: r.activity_type, title: r.window_title })));

  const alerts = await client.query("SELECT * FROM idle_alerts ORDER BY created_at DESC LIMIT 5");
  console.log('Recent idle_alerts:', alerts.rows.map(r => ({ id: r.id, reason: r.reason })));

  await client.end();
}

main().catch(console.error);
