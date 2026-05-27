const { Client } = require('pg');
const client = new Client({ 
  connectionString: 'postgresql://postgres.bmigbiajnhhknltuvrso:Durgadevi%4067@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});
async function run() {
  await client.connect();
  const emp = await client.query("SELECT id FROM employees WHERE employee_code = 'E0053'");
  const employeeId = emp.rows[0].id;
  const today = new Date().toISOString().slice(0, 10);
  console.log('Testing for date:', today);
  const plans = await client.query('SELECT * FROM daily_plans WHERE employee_id = $1 AND "date"::text = $2', [employeeId, today]);
  console.log('Plans for today:', plans.rows);
  const allPlans = await client.query('SELECT * FROM daily_plans WHERE employee_id = $1', [employeeId]);
  console.log('All plans for E0053:', allPlans.rows);
  await client.end();
}
run().catch(console.error);
