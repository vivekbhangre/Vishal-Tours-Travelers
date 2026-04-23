import dotenv from 'dotenv';
dotenv.config();
console.log("Email:", !!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL);
console.log("Key:", !!process.env.GOOGLE_PRIVATE_KEY);
console.log("Sheet:", !!process.env.GOOGLE_SHEET_ID);
