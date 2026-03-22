import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';
import fs from 'fs';

async function run() {
  try {
    const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
    const auth = new JWT({
      email: config.client_email,
      key: config.private_key,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    const doc = new GoogleSpreadsheet(config.spreadsheetId, auth);
    await doc.loadInfo();
    const sheet = doc.sheetsByTitle['drivers'];
    const rows = await sheet.getRows();
    console.log('Rows before:', rows.length);
    if (rows.length > 0) {
      console.log('Deleting row:', rows[0].get('id'), rows[0].rowNumber);
      await rows[0].delete();
      console.log('Deleted.');
    }
  } catch (e) {
    console.error(e);
  }
}
run();
