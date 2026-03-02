import express from 'express';
import axios from 'axios';
import { createServer as createViteServer } from 'vite';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { initSheets, getDoc, autoResizeSheet } from './server/sheets.js';
import cityAutocompleteRouter from './server/cityAutocomplete.js';
import PDFDocument from 'pdfkit';
import { GoogleGenAI } from "@google/genai";
import fs from "fs";
import path from "path";

async function startServer() {
  const app = express();
  const PORT = 3000;
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  app.use(cors());
  app.use(express.json());

  app.use('/api', cityAutocompleteRouter);

  app.get("/api/generate-hero", async (req, res) => {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            {
              text: 'Ultra-wide cinematic hero background for a travel booking website, highly detailed luxury road trip theme with scenic mountain highway sunset, panoramic view, soft atmospheric lighting, premium modern aesthetic, subtle motion blur on road, ultra high resolution, vibrant colors that blend well with deep purple gradients, spacious negative space on left side for text overlay, crisp and professional UI hero image.',
            },
          ],
        },
        config: {
          imageConfig: {
            aspectRatio: "16:9"
          }
        }
      });

      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          const base64EncodeString = part.inlineData.data;
          const publicDir = path.join(process.cwd(), 'public');
          if (!fs.existsSync(publicDir)) {
            fs.mkdirSync(publicDir);
          }
          fs.writeFileSync(path.join(publicDir, 'hero-bg.png'), Buffer.from(base64EncodeString, 'base64'));
          return res.json({ status: "success", message: "Image saved to public/hero-bg.png" });
        }
      }
      res.status(500).json({ status: "error", message: "No image generated" });
    } catch (error: any) {
      console.error("Error generating image:", error);
      res.status(500).json({ status: "error", message: error.message });
    }
  });

  // Initialize Google Sheets
  await initSheets();

  // Socket.io for real-time updates
  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);
    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
    });
  });

  // API Routes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', sheetsReady: !!getDoc() });
  });

  app.get('/api/test-resize', async (req, res) => {
    const doc = getDoc();
    if (!doc) return res.status(500).json({ error: 'Google Sheets not configured' });
    try {
      const sheet = doc.sheetsByTitle['Users'];
      await sheet.autoResizeDimensions('COLUMNS', { startIndex: 0, endIndex: sheet.columnCount });
      res.json({ status: 'ok' });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Auth Routes
  app.post('/api/auth/register', async (req, res) => {
    const doc = getDoc();
    if (!doc) return res.status(500).json({ error: 'Google Sheets not configured' });

    const { name, email, phone, password, role } = req.body;
    const userRole = role || 'customer';

    try {
      const sheet = doc.sheetsByTitle['Users'];
      const rows = await sheet.getRows();
      const existingUser = rows.find(r => r.get('email') === email);

      if (existingUser) {
        return res.status(400).json({ error: 'Email already exists' });
      }

      const id = Date.now().toString();
      await sheet.addRow({
        id,
        name,
        email,
        phone: phone || '',
        password, // Storing plain text as requested
        role: userRole,
        createdAt: new Date().toISOString()
      });
      await autoResizeSheet(sheet);

      res.json({ id, name, email, phone: phone || '', role: userRole });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to register' });
    }
  });

  app.post('/api/auth/verify-reset', async (req, res) => {
    const doc = getDoc();
    if (!doc) return res.status(500).json({ error: 'Google Sheets not configured' });

    const { name, email, phone } = req.body;

    try {
      const usersSheet = doc.sheetsByTitle['Users'];
      const userRows = await usersSheet.getRows();

      const user = userRows.find(r =>
        r.get('email') === email &&
        r.get('name') === name &&
        r.get('phone') === phone
      );

      if (!user) {
        return res.status(404).json({ error: 'No matching account found with these details.' });
      }

      res.json({ success: true, userId: user.get('id') });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to verify details' });
    }
  });

  app.post('/api/auth/reset-password', async (req, res) => {
    const doc = getDoc();
    if (!doc) return res.status(500).json({ error: 'Google Sheets not configured' });

    const { userId, newPassword } = req.body;

    try {
      const usersSheet = doc.sheetsByTitle['Users'];
      const userRows = await usersSheet.getRows();

      const user = userRows.find(r => r.get('id') === userId);

      if (!user) {
        return res.status(404).json({ error: 'User not found.' });
      }

      user.set('password', newPassword);
      await user.save();

      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to reset password' });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    const doc = getDoc();
    if (!doc) return res.status(500).json({ error: 'Google Sheets not configured' });

    const { email, password } = req.body;

    try {
      const usersSheet = doc.sheetsByTitle['Users'];
      const staffSheet = doc.sheetsByTitle['Staff'];

      const userRows = await usersSheet.getRows();
      let user = userRows.find(r => r.get('email') === email && r.get('password') === password);

      if (!user) {
        const staffRows = await staffSheet.getRows();
        user = staffRows.find(r => r.get('email') === email && r.get('password') === password);
      }

      if (!user) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      res.json({
        id: user.get('id'),
        name: user.get('name'),
        email: user.get('email'),
        phone: user.get('phone') || '',
        role: user.get('role')
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to login' });
    }
  });

  // User Profile Routes
  app.get('/api/users/:id', async (req, res) => {
    const doc = getDoc();
    if (!doc) return res.status(500).json({ error: 'Google Sheets not configured' });

    try {
      const usersSheet = doc.sheetsByTitle['Users'];
      const staffSheet = doc.sheetsByTitle['Staff'];

      const userRows = await usersSheet.getRows();
      let user = userRows.find(r => r.get('id') === req.params.id);

      if (!user) {
        const staffRows = await staffSheet.getRows();
        user = staffRows.find(r => r.get('id') === req.params.id);
      }

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({
        id: user.get('id'),
        name: user.get('name'),
        email: user.get('email'),
        phone: user.get('phone') || '',
        role: user.get('role')
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch user' });
    }
  });

  app.put('/api/users/:id', async (req, res) => {
    const doc = getDoc();
    if (!doc) return res.status(500).json({ error: 'Google Sheets not configured' });

    const { name, email, phone } = req.body;

    try {
      const usersSheet = doc.sheetsByTitle['Users'];
      const staffSheet = doc.sheetsByTitle['Staff'];

      // Ensure headers include phone
      await usersSheet.setHeaderRow(['id', 'name', 'email', 'phone', 'password', 'role', 'createdAt']);
      await staffSheet.setHeaderRow(['id', 'name', 'email', 'phone', 'password', 'role', 'createdAt']);

      const userRows = await usersSheet.getRows();
      let user = userRows.find(r => r.get('id') === req.params.id);
      let isStaff = false;

      if (!user) {
        const staffRows = await staffSheet.getRows();
        user = staffRows.find(r => r.get('id') === req.params.id);
        isStaff = true;
      }

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      user.set('name', name);
      user.set('email', email);
      user.set('phone', phone || '');
      await user.save();
      await autoResizeSheet(isStaff ? staffSheet : usersSheet);

      res.json({
        id: user.get('id'),
        name: user.get('name'),
        email: user.get('email'),
        phone: user.get('phone'),
        role: user.get('role')
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to update user' });
    }
  });

  // Bookings Routes
  app.post('/api/bookings', async (req, res) => {
    const doc = getDoc();
    if (!doc) return res.status(500).json({ error: 'Google Sheets not configured' });

    const {
      userId, userName, userEmail, fromLocation, toLocation, rideDate, rideType, numberOfPeople, fareAmount,
      tripType, returnDate, weddingDetails, intercityDetails, airportDetails, customRequirements,
      destinations, numberOfDays, numberOfCars, estimatedKM, suggestedVehicle
    } = req.body;

    try {
      const sheet = doc.sheetsByTitle['Bookings'];
      const id = Date.now().toString() + '-' + Math.random().toString(36).substr(2, 9);

      // Format the date to 12-hour format
      let formattedDate = rideDate;
      if (rideDate) {
        try {
          const dateObj = new Date(rideDate);
          if (!isNaN(dateObj.getTime())) {
            // Format: MM/DD/YYYY, hh:mm A
            formattedDate = dateObj.toLocaleString('en-US', {
              month: '2-digit',
              day: '2-digit',
              year: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
              hour12: true
            });
          }
        } catch (e) {
          console.error('Error formatting date:', e);
        }
      }

      const newBooking = {
        id,
        userId,
        userName,
        userEmail: userEmail || '',
        fromLocation,
        toLocation,
        rideDate: formattedDate,
        rideType: rideType || 'Other',
        numberOfPeople: numberOfPeople || 1,
        rideStatus: 'Pending',
        paymentStatus: 'Not Paid',
        fareAmount,
        timestamp: new Date().toISOString(),
        tripType: tripType || 'One-way',
        returnDate: returnDate || 'N/A',
        destinations: destinations || 'N/A',
        numberOfDays: numberOfDays || 'N/A',
        numberOfCars: numberOfCars || 'N/A',
        estimatedKM: estimatedKM || 'N/A',
        suggestedVehicle: suggestedVehicle || 'N/A',
        weddingDetails: weddingDetails ? JSON.stringify(weddingDetails) : 'N/A',
        intercityDetails: intercityDetails ? JSON.stringify(intercityDetails) : 'N/A',
        airportDetails: airportDetails ? JSON.stringify(airportDetails) : 'N/A',
        customRequirements: customRequirements || 'N/A'
      };

      // Ensure headers include new fields
      await sheet.setHeaderRow([
        'id', 'userId', 'userName', 'userEmail', 'fromLocation', 'toLocation', 'rideDate',
        'rideType', 'numberOfPeople', 'rideStatus', 'paymentStatus', 'fareAmount', 'timestamp',
        'tripType', 'returnDate', 'destinations', 'numberOfDays', 'numberOfCars', 'estimatedKM', 'suggestedVehicle',
        'weddingDetails', 'intercityDetails', 'airportDetails', 'customRequirements'
      ]);

      await sheet.addRow(newBooking);
      await autoResizeSheet(sheet);

      // Notify all clients about the new booking
      io.emit('booking:created', newBooking);

      res.json(newBooking);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to create booking' });
    }
  });

  app.get('/api/bookings', async (req, res) => {
    const doc = getDoc();
    if (!doc) return res.status(500).json({ error: 'Google Sheets not configured' });

    const { userId } = req.query;

    try {
      const sheet = doc.sheetsByTitle['Bookings'];
      const usersSheet = doc.sheetsByTitle['Users'];

      const rows = await sheet.getRows();
      const userRows = await usersSheet.getRows();

      const userPhones: Record<string, string> = {};
      userRows.forEach(r => {
        userPhones[r.get('id')] = r.get('phone') || '';
      });

      let bookings = rows
        .filter(r => r.get('id'))
        .map(r => ({
          id: r.get('id'),
          userId: r.get('userId'),
          userName: r.get('userName'),
          userPhone: userPhones[r.get('userId')] || '',
          userEmail: r.get('userEmail'),
          fromLocation: r.get('fromLocation'),
          toLocation: r.get('toLocation'),
          destinations: r.get('destinations'),
          rideDate: r.get('rideDate'),
          returnDate: r.get('returnDate'),
          tripType: r.get('tripType'),
          rideType: r.get('rideType'),
          numberOfPeople: r.get('numberOfPeople'),
          numberOfDays: r.get('numberOfDays'),
          numberOfCars: r.get('numberOfCars'),
          estimatedKM: r.get('estimatedKM'),
          suggestedVehicle: r.get('suggestedVehicle'),
          rideStatus: r.get('rideStatus'),
          paymentStatus: r.get('paymentStatus'),
          fareAmount: r.get('fareAmount'),
          timestamp: r.get('timestamp')
        }));

      if (userId) {
        bookings = bookings.filter(b => b.userId === userId);
      }

      res.json(bookings);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch bookings' });
    }
  });

  app.put('/api/bookings/:id', async (req, res) => {
    const doc = getDoc();
    if (!doc) return res.status(500).json({ error: 'Google Sheets not configured' });

    const { id } = req.params;
    const { rideStatus, paymentStatus } = req.body;

    try {
      const sheet = doc.sheetsByTitle['Bookings'];
      const rows = await sheet.getRows();
      const row = rows.find(r => r.get('id') === id);

      if (!row) {
        return res.status(404).json({ error: 'Booking not found' });
      }

      // 2-Hour Cancellation Rule
      if (rideStatus === 'Cancelled') {
        const rideDateStr = row.get('rideDate');
        if (rideDateStr) {
          let rideTime = new Date(rideDateStr);
          // Parse the date as local time for accurate offset checking against the system
          if (isNaN(rideTime.getTime())) {
            // If the date string was stored oddly, fallback parsing might be needed, but 
            // the frontend enforces valid strings. PST addition was arbitrary.
            rideTime = new Date(rideDateStr);
          }

          const currentTime = new Date();
          const diffInMs = rideTime.getTime() - currentTime.getTime();
          const diffInHours = diffInMs / (1000 * 60 * 60);

          if (diffInHours < 2) {
            const message = diffInHours < 0
              ? "You cannot cancel a ride that has already started or is in the past."
              : "You can cancel the ride only up to 2 hours before departure.";

            return res.status(400).json({
              error: "Cancellation not allowed",
              message: message
            });
          }
        }
      }

      const oldPaymentStatus = row.get('paymentStatus');

      if (rideStatus) row.set('rideStatus', rideStatus);
      if (paymentStatus) row.set('paymentStatus', paymentStatus);

      await row.save();
      await autoResizeSheet(sheet);

      // Log revenue if payment status changed to Paid
      if (paymentStatus === 'Paid' && oldPaymentStatus !== 'Paid') {
        try {
          const fareAmount = parseFloat(row.get('fareAmount') || '0');
          const date = new Date();
          const month = date.toLocaleString('default', { month: 'short' });
          const year = date.getFullYear().toString();

          const revenueSheet = doc.sheetsByTitle['Revenue Logs'];
          const revRows = await revenueSheet.getRows();
          const revRow = revRows.find(r => r.get('month') === month && r.get('year') === year);

          if (revRow) {
            const currentAmount = parseFloat(revRow.get('amount') || '0');
            revRow.set('amount', currentAmount + fareAmount);
            await revRow.save();
          } else {
            await revenueSheet.addRow({
              id: Date.now().toString(),
              month,
              year,
              amount: fareAmount,
              timestamp: new Date().toISOString()
            });
          }
          await autoResizeSheet(revenueSheet);
        } catch (revError) {
          console.error('Failed to log revenue:', revError);
        }
      }

      const updatedBooking = {
        id: row.get('id'),
        userId: row.get('userId'),
        userName: row.get('userName'),
        fromLocation: row.get('fromLocation'),
        toLocation: row.get('toLocation'),
        rideDate: row.get('rideDate'),
        rideStatus: row.get('rideStatus'),
        paymentStatus: row.get('paymentStatus'),
        fareAmount: row.get('fareAmount'),
        timestamp: row.get('timestamp')
      };

      // Notify all clients about the updated booking
      io.emit('booking:updated', updatedBooking);

      res.json(updatedBooking);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to update booking' });
    }
  });

  // Revenue Logs Route
  app.get('/api/revenue', async (req, res) => {
    const doc = getDoc();
    if (!doc) return res.status(500).json({ error: 'Google Sheets not configured' });

    try {
      const sheet = doc.sheetsByTitle['Revenue Logs'];
      const rows = await sheet.getRows();

      const data = rows.map(r => ({
        month: r.get('month'),
        year: r.get('year'),
        amount: parseFloat(r.get('amount') || '0')
      }));

      res.json(data);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch revenue logs' });
    }
  });

  // Report Generation
  app.get('/api/reports/monthly', async (req, res) => {
    const doc = getDoc();
    if (!doc) return res.status(500).json({ error: 'Google Sheets not configured' });

    try {
      const sheet = doc.sheetsByTitle['Bookings'];
      const rows = await sheet.getRows();

      const bookings = rows.map(r => ({
        rideStatus: r.get('rideStatus'),
        paymentStatus: r.get('paymentStatus'),
        fareAmount: parseFloat(r.get('fareAmount') || '0')
      }));

      const totalRides = bookings.length;
      const completedRides = bookings.filter(b => b.rideStatus === 'Completed').length;
      const pendingRides = bookings.filter(b => b.rideStatus === 'Pending').length;
      const totalRevenue = bookings.filter(b => b.paymentStatus === 'Paid').reduce((sum, b) => sum + b.fareAmount, 0);

      const pdfDoc = new PDFDocument();
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename=monthly_report.pdf');

      pdfDoc.pipe(res);

      pdfDoc.fontSize(25).text('Vishal Tour & Travelers', { align: 'center' });
      pdfDoc.moveDown();
      pdfDoc.fontSize(18).text('Monthly Revenue Report', { align: 'center' });
      pdfDoc.moveDown();

      pdfDoc.fontSize(14).text(`Date Generated: ${new Date().toLocaleDateString()}`);
      pdfDoc.moveDown();

      pdfDoc.text(`Total Rides: ${totalRides}`);
      pdfDoc.text(`Completed Rides: ${completedRides}`);
      pdfDoc.text(`Pending Rides: ${pendingRides}`);
      pdfDoc.moveDown();

      pdfDoc.fontSize(16).text(`Total Revenue: $${totalRevenue.toFixed(2)}`, { underline: true });

      pdfDoc.end();
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to generate report' });
    }
  });

  app.get('/calculate-distance', async (req, res) => {
    const { from, to, tripType, departureDate, returnDate, vehicle } = req.query;

    if (!from || !to) {
      return res.status(400).json({ error: 'Both from and to are required' });
    }

    try {
      // Use Open-Meteo for geocoding as it's more reliable from cloud environments
      const fromUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(from as string)}&count=1&language=en&format=json`;
      const fromRes = await axios.get(fromUrl, { timeout: 10000 });

      if (!fromRes.data || !fromRes.data.results || fromRes.data.results.length === 0) {
        return res.status(400).json({ error: 'Origin city not found' });
      }
      const fromLat = fromRes.data.results[0].latitude;
      const fromLon = fromRes.data.results[0].longitude;

      const toUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(to as string)}&count=1&language=en&format=json`;
      const toRes = await axios.get(toUrl, { timeout: 10000 });

      if (!toRes.data || !toRes.data.results || toRes.data.results.length === 0) {
        return res.status(400).json({ error: 'Destination city not found' });
      }
      const toLat = toRes.data.results[0].latitude;
      const toLon = toRes.data.results[0].longitude;

      let distanceKm = 0;

      // Calculate Haversine distance * 1.3 (approximate road detour factor)
      const R = 6371; // Radius of the earth in km
      const dLat = (toLat - fromLat) * Math.PI / 180;
      const dLon = (toLon - fromLon) * Math.PI / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(fromLat * Math.PI / 180) * Math.cos(toLat * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const straightLineDistance = R * c;
      const oneWayDistance = straightLineDistance * 1.3; // Add 30% for road curves
      distanceKm = oneWayDistance * 2; // Double the distance to account for vehicle returning to hometown

      const distanceRounded = distanceKm.toFixed(2);

      // Base Fare Formula
      const baseFare = distanceKm * 13;
      const roundedFare = Math.ceil(baseFare / 500) * 500;

      // Halt Logic (Only For Round Trip)
      let haltDays = 0;
      let haltCharges = 0;

      if (tripType === 'Round-trip' && departureDate && returnDate) {
        const depDate = new Date(departureDate as string);
        const retDate = new Date(returnDate as string);

        // Check if both dates are the same calendar day
        if (depDate.toDateString() !== retDate.toDateString()) {
          const timeDiff = retDate.getTime() - depDate.getTime();
          haltDays = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

          // Vehicle Halt Rates
          let vehicleHaltRate = 1000; // default for dzire/sedan
          const vehicleStr = (vehicle as string || '').toLowerCase();
          if (vehicleStr.includes('ertiga')) {
            vehicleHaltRate = 1500;
          } else if (vehicleStr.includes('van') || vehicleStr.includes('traveller')) {
            vehicleHaltRate = 3000;
          }

          haltCharges = haltDays * vehicleHaltRate;
        }
      }

      const finalPrice = roundedFare + haltCharges;

      return res.json({
        distance: distanceRounded,
        baseFare: roundedFare,
        haltDays,
        haltCharges,
        finalPrice,
        price: finalPrice // keep price for backwards compatibility
      });
    } catch (error) {
      console.error('Distance calculation error:', error);
      return res.status(500).json({ error: 'Failed to calculate distance' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
