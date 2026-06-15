const { fetchIdleAlertsByDate } = require('./dist/src/lib/supabase.js');

async function main() {
  const alerts = await fetchIdleAlertsByDate('06a8cfe1-e100-4bfc-9554-4b1e4c16e034', '2026-06-15');
  console.log('Fetched alerts count:', alerts.length);
  if (alerts.length > 0) {
    console.log(alerts[0]);
  }
}
main();
