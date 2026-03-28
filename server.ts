import express from 'express';
import axios from 'axios';
import { createServer as createViteServer } from 'vite';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { initSheets, getDoc, getCachedRows, invalidateCache } from './server/sheets.js';
import { setupFleetRoutes } from './server/fleet.js';
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

  // Initialize Google Sheets in the background to prevent blocking server startup
  initSheets().catch(console.error);

  // Socket.io for real-time updates
  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);
    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
    });
  });

  // API Routes
  setupFleetRoutes(app, io);

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
      const targetSheetName = userRole === 'staff' ? 'Staff' : 'Users';
      const sheet = doc.sheetsByTitle[targetSheetName];
      const rows = await getCachedRows(targetSheetName);
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
      invalidateCache(targetSheetName);

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
      const userRows = await getCachedRows('Users');
      let user = userRows.find(r => 
        r.get('email') === email && 
        r.get('name') === name && 
        r.get('phone') === phone
      );
      
      if (!user) {
        const staffRows = await getCachedRows('Staff');
        user = staffRows.find(r => 
          r.get('email') === email && 
          r.get('name') === name && 
          r.get('phone') === phone
        );
      }
      
      if (!user) {
        return res.status(404).json({ error: 'No matching account found with these details.' });
      }

      res.json({ success: true, userId: user.get('id'), isStaff: user.get('role') === 'staff' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to verify details' });
    }
  });

  app.post('/api/auth/reset-password', async (req, res) => {
    const doc = getDoc();
    if (!doc) return res.status(500).json({ error: 'Google Sheets not configured' });

    const { userId, newPassword, isStaff } = req.body;
    
    try {
      const rows = await getCachedRows(isStaff ? 'Staff' : 'Users');
      
      const user = rows.find(r => r.get('id') === userId);
      
      if (!user) {
        return res.status(404).json({ error: 'User not found.' });
      }

      user.set('password', newPassword);
      await user.save();
      invalidateCache(isStaff ? 'Staff' : 'Users');

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
      const userRows = await getCachedRows('Users');
      let user = userRows.find(r => r.get('email') === email && r.get('password') === password);
      
      if (!user) {
        const staffRows = await getCachedRows('Staff');
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
      const userRows = await getCachedRows('Users');
      let user = userRows.find(r => r.get('id') === req.params.id);
      
      if (!user) {
        const staffRows = await getCachedRows('Staff');
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
      
      const userRows = await getCachedRows('Users');
      let user = userRows.find(r => r.get('id') === req.params.id);
      let isStaff = false;
      
      if (!user) {
        const staffRows = await getCachedRows('Staff');
        user = staffRows.find(r => r.get('id') === req.params.id);
        isStaff = true;
      }
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const oldEmail = user.get('email');
      user.set('name', name);
      user.set('email', email);
      user.set('phone', phone || '');
      await user.save();
      invalidateCache(isStaff ? 'Staff' : 'Users');

      // If it's a staff member, also try to update their corresponding driver record
      if (isStaff) {
        try {
          const driversSheet = doc.sheetsByTitle['drivers'];
          if (driversSheet) {
            const driverRows = await getCachedRows('drivers');
            // Try to find by old email
            const driverRow = driverRows.find(r => r.get('email') === oldEmail);
            if (driverRow) {
              driverRow.set('name', name);
              driverRow.set('email', email);
              driverRow.set('phone', phone || '');
              await driverRow.save();
              invalidateCache('drivers');
            }
          }
          
          // Update assignedDriverEmail in Bookings if email changed
          if (oldEmail !== email) {
            const bookingsSheet = doc.sheetsByTitle['Bookings'];
            if (bookingsSheet) {
              const bookingRows = await getCachedRows('Bookings');
              let updatedBookings = false;
              for (const row of bookingRows) {
                if (row.get('assignedDriverEmail') === oldEmail) {
                  row.set('assignedDriverEmail', email);
                  await row.save();
                  updatedBookings = true;
                }
              }
              if (updatedBookings) {
                invalidateCache('Bookings');
              }
            }
          }
        } catch (err) {
          console.error('Failed to update corresponding driver record:', err);
        }
      }

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
      destinations, numberOfDays, numberOfCars, estimatedKM, suggestedVehicle, isAC
    } = req.body;
    
    try {
      const sheet = doc.sheetsByTitle['Bookings'];
      const id = Date.now().toString() + '-' + Math.random().toString(36).substr(2, 9);
      
      // Format the date to ISO format with IST offset
      let formattedDate = rideDate;
      if (rideDate) {
        try {
          // Expected format: "YYYY-MM-DD HH:MM AM/PM"
          const match = rideDate.match(/^(\d{4}-\d{2}-\d{2})\s+(\d{1,2}):(\d{2})\s+(AM|PM)$/i);
          if (match) {
            const [_, datePart, hourStr, minStr, ampm] = match;
            let hour = parseInt(hourStr, 10);
            if (ampm.toUpperCase() === 'PM' && hour < 12) hour += 12;
            if (ampm.toUpperCase() === 'AM' && hour === 12) hour = 0;
            formattedDate = `${datePart}T${String(hour).padStart(2, '0')}:${minStr}:00+05:30`;
          } else {
            // Fallback for other formats
            const dateObj = new Date(rideDate);
            if (!isNaN(dateObj.getTime())) {
              const year = dateObj.getFullYear();
              const month = String(dateObj.getMonth() + 1).padStart(2, '0');
              const day = String(dateObj.getDate()).padStart(2, '0');
              const hours = String(dateObj.getHours()).padStart(2, '0');
              const minutes = String(dateObj.getMinutes()).padStart(2, '0');
              const seconds = String(dateObj.getSeconds()).padStart(2, '0');
              formattedDate = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}+05:30`;
            }
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
        isAC: isAC ? 'Yes' : 'No',
        weddingDetails: weddingDetails ? JSON.stringify(weddingDetails) : 'N/A',
        intercityDetails: intercityDetails ? JSON.stringify(intercityDetails) : 'N/A',
        airportDetails: airportDetails ? JSON.stringify(airportDetails) : 'N/A',
        customRequirements: customRequirements || 'N/A',
        assignedDriverEmail: '',
        assignedVehicleId: ''
      };

      // Ensure headers include new fields
      if (sheet.columnCount < 30) {
        await sheet.resize({ rowCount: sheet.rowCount, columnCount: 30 });
      }
      await sheet.setHeaderRow([
        'id', 'userId', 'userName', 'userEmail', 'fromLocation', 'toLocation', 'rideDate', 
        'rideType', 'numberOfPeople', 'rideStatus', 'paymentStatus', 'fareAmount', 'timestamp',
        'tripType', 'returnDate', 'destinations', 'numberOfDays', 'numberOfCars', 'estimatedKM', 'suggestedVehicle',
        'isAC', 'weddingDetails', 'intercityDetails', 'airportDetails', 'customRequirements', 'assignedDriverEmail', 'assignedVehicleId'
      ]);

      await sheet.addRow(newBooking);
      invalidateCache('Bookings');
      
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

    const { userId, isAdmin, forceRefresh } = req.query;
    const isUserAdmin = isAdmin === 'true';
    const isForceRefresh = forceRefresh === 'true';
    
    try {
      const sheet = doc.sheetsByTitle['Bookings'];
      const usersSheet = doc.sheetsByTitle['Users'];
      
      const vehiclesSheet = doc.sheetsByTitle['vehicles'];
      const driversSheet = doc.sheetsByTitle['drivers'];
      
      const rows = await getCachedRows('Bookings', isForceRefresh);
      const userRows = await getCachedRows('Users', isForceRefresh);
      
      const userPhones: Record<string, string> = {};
      userRows.forEach(r => {
        userPhones[r.get('id')] = r.get('phone') || '';
      });

      let vehicleRows: any[] = [];
      let driverRows: any[] = [];
      if (vehiclesSheet) vehicleRows = await getCachedRows('vehicles', isForceRefresh);
      if (driversSheet) driverRows = await getCachedRows('drivers', isForceRefresh);
      
      const nowIST = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));

      let bookings = rows
        .filter(r => r.get('id'))
        .map(r => {
          const rideDateStr = r.get('rideDate');
          const rideStatus = r.get('rideStatus');
          const assignedDriverEmail = r.get('assignedDriverEmail');
          const assignedVehicleId = r.get('assignedVehicleId');
          
          let driverDetails = null;
          let vehicleDetails = null;
          let visibilityMessage = null;
          let showDetails = isUserAdmin;

          if (assignedDriverEmail || assignedVehicleId) {
            if (rideDateStr && (rideStatus === 'Assigned' || rideStatus === 'Ongoing' || rideStatus === 'Completed')) {
              showDetails = true;
            }
            
            if (showDetails) {
              if (assignedDriverEmail) {
                const driver = driverRows.find(d => d.get('email') === assignedDriverEmail);
                if (driver) {
                  driverDetails = {
                    name: driver.get('name'),
                    phone: driver.get('phone')
                  };
                }
              }
              if (assignedVehicleId) {
                const vehicle = vehicleRows.find(v => v.get('vehicleId') === assignedVehicleId);
                if (vehicle) {
                  vehicleDetails = {
                    name: vehicle.get('vehicleName'),
                    number: vehicle.get('vehicleNumber')
                  };
                }
              }
            }
          }

          if (!isUserAdmin && rideStatus === 'Confirmed') {
            if (r.get('tripType') === 'Car Renting') {
              if (!vehicleDetails) {
                visibilityMessage = "Vehicle information will be given to you before 1 hour of the start time.";
              }
            } else if (!driverDetails) {
              visibilityMessage = "Driver information will be given to you before 1 hour of the departure time.";
            }
          }

          return {
            id: r.get('id'),
            userId: r.get('userId'),
            userName: r.get('userName'),
            userPhone: userPhones[r.get('userId')] || '',
            userEmail: r.get('userEmail'),
            fromLocation: r.get('fromLocation'),
            toLocation: r.get('toLocation'),
            destinations: r.get('destinations'),
            rideDate: rideDateStr,
            returnDate: r.get('returnDate'),
            tripType: r.get('tripType'),
            rideType: r.get('rideType'),
            numberOfPeople: r.get('numberOfPeople'),
            numberOfDays: r.get('numberOfDays'),
            numberOfCars: r.get('numberOfCars'),
            estimatedKM: r.get('estimatedKM'),
            suggestedVehicle: r.get('suggestedVehicle'),
            isAC: r.get('isAC'),
            rideStatus,
            paymentStatus: r.get('paymentStatus'),
            fareAmount: r.get('fareAmount'),
            timestamp: r.get('timestamp'),
            driverDetails,
            vehicleDetails,
            visibilityMessage,
            assignedDriverEmail: showDetails ? assignedDriverEmail : undefined,
            assignedVehicleId: showDetails ? assignedVehicleId : undefined
          };
        });

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
      const rows = await getCachedRows('Bookings');
      const row = rows.find(r => r.get('id') === id);
      
      if (!row) {
        return res.status(404).json({ error: 'Booking not found' });
      }

      if (rideStatus === 'Cancelled') {
        const rideDateStr = row.get('rideDate');
        if (rideDateStr) {
          const rideTime = new Date(rideDateStr);
          const nowIST = new Date(
            new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
          );

          const diffInHours = (rideTime.getTime() - nowIST.getTime()) / (1000 * 60 * 60);

          if (diffInHours < 2) {
            return res.status(400).json({
              error: "Cancellation not allowed",
              message: "You can cancel the ride only up to 2 hours before departure."
            });
          }
        }
      }

      const oldPaymentStatus = row.get('paymentStatus');
      const oldRideStatus = row.get('rideStatus');

      if (oldRideStatus === 'Completed' && oldPaymentStatus === 'Paid') {
        return res.status(400).json({ error: 'Cannot modify a completed and paid ride.' });
      }

      if (rideStatus) row.set('rideStatus', rideStatus);
      if (paymentStatus) row.set('paymentStatus', paymentStatus);
      
      await row.save();
      invalidateCache('Bookings');

      // Automatic Status Reset for Driver and Vehicle
      if (rideStatus && (rideStatus === 'Completed' || rideStatus === 'Cancelled') && oldRideStatus !== rideStatus) {
        try {
          const assignedDriverEmail = row.get('assignedDriverEmail');
          const assignedVehicleId = row.get('assignedVehicleId');

          if (assignedDriverEmail || assignedVehicleId) {
            const driversSheet = doc.sheetsByTitle['drivers'];
            const vehiclesSheet = doc.sheetsByTitle['vehicles'];

            if (assignedDriverEmail && driversSheet) {
              const driverRows = await getCachedRows('drivers');
              const driverRow = driverRows.find(r => r.get('email') === assignedDriverEmail);
              if (driverRow) {
                driverRow.set('status', 'Available');
                await driverRow.save();
                invalidateCache('drivers');
              }
            }

            if (assignedVehicleId && vehiclesSheet) {
              const vehicleRows = await getCachedRows('vehicles');
              const vehicleRow = vehicleRows.find(r => r.get('vehicleId') === assignedVehicleId);
              if (vehicleRow) {
                vehicleRow.set('status', 'Available');
                await vehicleRow.save();
                invalidateCache('vehicles');
              }
            }
          }
        } catch (resetError) {
          console.error('Failed to reset driver/vehicle status:', resetError);
        }
      }

      // Log revenue if payment status changed to Paid
      if (paymentStatus === 'Paid' && oldPaymentStatus !== 'Paid') {
        try {
          const fareAmount = parseFloat(row.get('fareAmount') || '0');
          const date = new Date();
          const month = date.toLocaleString('default', { month: 'short' });
          const year = date.getFullYear().toString();
          
          const revenueSheet = doc.sheetsByTitle['Revenue Logs'];
          const revRows = await getCachedRows('Revenue Logs');
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
          invalidateCache('Revenue Logs');
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

  // Drivers and Vehicles Routes
  // Revenue Logs Route
  app.get('/api/revenue', async (req, res) => {
    const doc = getDoc();
    if (!doc) return res.status(500).json({ error: 'Google Sheets not configured' });

    const isForceRefresh = req.query.forceRefresh === 'true';

    try {
      const sheet = doc.sheetsByTitle['Revenue Logs'];
      const rows = await getCachedRows('Revenue Logs', isForceRefresh);
      
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
      const rows = await getCachedRows('Bookings');
      
      const bookings = rows.map(r => ({
        rideStatus: r.get('rideStatus'),
        paymentStatus: r.get('paymentStatus'),
        fareAmount: parseFloat(r.get('fareAmount') || '0')
      }));

      const totalRides = bookings.length;
      const completedRides = bookings.filter(b => b.rideStatus === 'Completed').length;
      const pendingRides = bookings.filter(b => b.rideStatus === 'Pending').length;
      const confirmedRides = bookings.filter(b => b.rideStatus === 'Confirmed').length;
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
      pdfDoc.text(`Confirmed Rides: ${confirmedRides}`);
      pdfDoc.moveDown();
      
      pdfDoc.fontSize(16).text(`Total Revenue: $${totalRevenue.toFixed(2)}`, { underline: true });
      
      pdfDoc.end();
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to generate report' });
    }
  });

  app.get('/calculate-distance', async (req, res) => {
    const { from, to, destinations, isAC } = req.query;
    
    if (!from) {
      return res.status(400).json({ error: 'from is required' });
    }
    
    if (!to && !destinations) {
      return res.status(400).json({ error: 'Either to or destinations is required' });
    }

    try {
      // Helper function to get coordinates
      const getCoordinates = async (city: string) => {
        // Clean up city name for better geocoding results
        let searchCity = city.replace(/ Railway Station/i, '').replace(/ Airport/i, '').replace(/ Bus Station/i, '').replace(/ Bus Stand/i, '').trim();
        
        const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(searchCity)}&count=1&language=en&format=json`;
        const res = await axios.get(url, { timeout: 10000 });
        if (!res.data || !res.data.results || res.data.results.length === 0) {
          throw new Error(`City not found: ${city}`);
        }
        return {
          lat: res.data.results[0].latitude,
          lon: res.data.results[0].longitude
        };
      };

      // Helper function to calculate distance between two coordinates
      const calculateLegDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const R = 6371; // Radius of the earth in km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = 
          Math.sin(dLat/2) * Math.sin(dLat/2) +
          Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
          Math.sin(dLon/2) * Math.sin(dLon/2); 
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
        const straightLineDistance = R * c;
        return straightLineDistance * 1.3; // Add 30% for road curves
      };

      const fromCoords = await getCoordinates(from as string);
      const seoniCoords = await getCoordinates('Seoni');
      
      let totalDistance = 0;
      const fromCity = (from as string).trim().toLowerCase();
      
      let waypoints: { lat: number, lon: number }[] = [];
      
      if (destinations) {
        const destArray = JSON.parse(destinations as string);
        for (const dest of destArray) {
          waypoints.push(await getCoordinates(dest));
        }
      } else if (to) {
        waypoints.push(await getCoordinates(to as string));
      }
      
      if (waypoints.length === 0) {
        return res.status(400).json({ error: 'No valid destinations provided' });
      }

      // Calculate total distance
      let currentCoords = fromCoords;
      
      if (fromCity !== 'seoni') {
        // Seoni -> pickup
        totalDistance += calculateLegDistance(seoniCoords.lat, seoniCoords.lon, fromCoords.lat, fromCoords.lon);
      }
      
      // pickup -> dest1 -> dest2 -> ... -> destN
      for (const wp of waypoints) {
        totalDistance += calculateLegDistance(currentCoords.lat, currentCoords.lon, wp.lat, wp.lon);
        currentCoords = wp;
      }
      
      // destN -> Seoni
      totalDistance += calculateLegDistance(currentCoords.lat, currentCoords.lon, seoniCoords.lat, seoniCoords.lon);

      const distanceRounded = totalDistance.toFixed(2);
      const perKmRate = isAC === 'true' ? 14 : 13;
      const basePrice = totalDistance * perKmRate;
      const finalPrice = Math.ceil(basePrice / 500) * 500;

      return res.json({
        distance: distanceRounded,
        price: finalPrice.toFixed(2)
      });
    } catch (error: any) {
      if (error.message && error.message.startsWith('City not found:')) {
        return res.status(400).json({ error: error.message });
      }
      console.error('Distance calculation error:', error);
      return res.status(500).json({ error: error.message || 'Failed to calculate distance' });
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
    app.get('*', (req, res) => {
      res.sendFile(path.join(process.cwd(), 'dist', 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
