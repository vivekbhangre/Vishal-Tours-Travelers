import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';

let doc: GoogleSpreadsheet | null = null;

export async function initSheets() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_PRIVATE_KEY;
  const sheetId = process.env.GOOGLE_SHEET_ID;

  if (!email || !key || !sheetId) {
    console.warn('Google Sheets credentials missing. Please configure them in the environment.');
    return null;
  }

  try {
    const serviceAccountAuth = new JWT({
      email: email,
      key: key.replace(/\\n/g, '\n'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    doc = new GoogleSpreadsheet(sheetId, serviceAccountAuth);
    await doc.loadInfo();
    console.log(`Loaded Google Sheet: ${doc.title}`);

    // Set default format to prevent text wrapping
    await doc.updateProperties({ defaultFormat: { wrapStrategy: 'CLIP' } });

    // Ensure sheets exist
    const requiredSheets = ['Users', 'Bookings', 'Staff', 'Revenue Logs'];
    for (const title of requiredSheets) {
      let sheet = doc.sheetsByTitle[title];
      if (!sheet) {
        sheet = await doc.addSheet({ title });
        if (title === 'Users' || title === 'Staff') {
          await sheet.setHeaderRow(['id', 'name', 'email', 'phone', 'password', 'role', 'createdAt']);
        } else if (title === 'Bookings') {
          await sheet.setHeaderRow(['id', 'userId', 'userName', 'fromLocation', 'toLocation', 'rideDate', 'rideType', 'numberOfPeople', 'rideStatus', 'paymentStatus', 'fareAmount', 'timestamp']);
        } else if (title === 'Revenue Logs') {
          await sheet.setHeaderRow(['id', 'month', 'year', 'amount', 'timestamp']);
        }
      }
    }
      
    // Create default admin and staff accounts if they don't exist
    const usersSheet = doc.sheetsByTitle['Users'];
    const rows = await usersSheet.getRows();
    
    const hasAdmin = rows.some(r => r.get('role') === 'admin');
    if (!hasAdmin) {
      await usersSheet.addRow({
        id: Date.now().toString() + '-admin',
        name: 'System Admin',
        email: 'admin@vishaltravels.com',
        password: 'adminpassword123',
        role: 'admin',
        createdAt: new Date().toISOString()
      });
      console.log('Created default admin account');
    }

    const staffSheet = doc.sheetsByTitle['Staff'];
    const staffRows = await staffSheet.getRows();
    const hasStaff = staffRows.some(r => r.get('role') === 'staff');
    if (!hasStaff) {
      await staffSheet.addRow({
        id: Date.now().toString() + '-staff',
        name: 'Default Driver',
        email: 'driver@vishaltravels.com',
        password: 'driverpassword123',
        role: 'staff',
        createdAt: new Date().toISOString()
      });
      console.log('Created default staff account');
    }

    // Format all sheets
    for (const title of requiredSheets) {
      const sheet = doc.sheetsByTitle[title];
      if (sheet) {
        try {
          await sheet.loadHeaderRow();
          await sheet.loadCells('A1:Z1');
          for (let i = 0; i < sheet.headerValues.length; i++) {
            const cell = sheet.getCell(0, i);
            cell.textFormat = { bold: true };
            cell.wrapStrategy = 'CLIP';
          }
          await sheet.saveUpdatedCells();
          
          await sheet.updateProperties({ gridProperties: { frozenRowCount: 1, rowCount: sheet.rowCount, columnCount: sheet.columnCount } });
          await sheet.autoResizeDimensions('COLUMNS', { startIndex: 0, endIndex: sheet.columnCount });
        } catch (err) {
          console.error(`Error formatting sheet ${title}:`, err);
        }
      }
    }

    return doc;
  } catch (error) {
    console.error('Error initializing Google Sheets:', error);
    return null;
  }
}

export async function autoResizeSheet(sheet: any) {
  try {
    await sheet.autoResizeDimensions('COLUMNS', { startIndex: 0, endIndex: sheet.columnCount });
  } catch (err) {
    console.error(`Error resizing sheet ${sheet.title}:`, err);
  }
}

export function getDoc() {
  return doc;
}
