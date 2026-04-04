import fetch from 'node-fetch';

async function run() {
  const res = await fetch('http://localhost:3000/api/revenue');
  const revenue = await res.json();
  console.log('Revenue Logs:', revenue);
}
run();
