import { getCachedRows } from './server/sheets.ts';
import { initSheets } from './server/sheets.ts';
import dotenv from 'dotenv';
dotenv.config();

async function test() {
  await initSheets();
  const users = await getCachedRows('Users');
  console.log("Users:", users.map(u => ({ email: u.get('email'), role: u.get('role') })));

  const staff = await getCachedRows('Staff');
  console.log("Staff:", staff.map(s => ({ email: s.get('email'), role: s.get('role') })));
}
test();
