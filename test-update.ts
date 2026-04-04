import { initSheets, getDoc, getCachedRows } from './server/sheets.js';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  await initSheets();
  const doc = getDoc();
  const sheet = doc.sheetsByTitle['Bookings'];
  const rows = await getCachedRows('Bookings');
  if (rows.length > 0) {
    const row = rows[0];
    console.log('Before:', row.get('refundStatus'), row.get('refundAmount'));
    row.set('refundStatus', 'Pending');
    row.set('refundAmount', '100');
    try {
      await row.save();
      console.log('Saved successfully');
    } catch (e) {
      console.error('Error saving:', e);
    }
  } else {
    console.log('No bookings found');
  }
}
run();
