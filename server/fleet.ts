import { getDoc, getCachedRows, invalidateCache } from './sheets.ts';
import { authenticateToken } from './auth.ts';

export const setupFleetRoutes = (app: any, io: any) => {
  // Get all vehicles
  app.get('/api/vehicles', authenticateToken, async (req: any, res: any) => {
    const doc = getDoc();
    if (!doc) return res.status(500).json({ error: 'Google Sheets not configured' });
    try {
      const sheet = doc.sheetsByTitle['vehicles'];
      if (!sheet) return res.json([]);
      const forceRefresh = req.query.forceRefresh === 'true';
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;

      const [rows, rideRows] = await Promise.all([
        getCachedRows('vehicles', forceRefresh),
        getCachedRows('Bookings', forceRefresh)
      ]);
      
      const activeRides = rideRows.filter(r => ['Assigned', 'Ongoing'].includes(r.get('rideStatus')));

      const data = rows.map(r => {
        const vehicleId = r.get('vehicleId') || `row-${r.rowNumber}`;
        const isBusy = vehicleId && activeRides.some(ride => {
          const assignmentsStr = ride.get('assignments');
          if (assignmentsStr) {
            try {
              const assignments = JSON.parse(assignmentsStr);
              if (assignments.some((a: any) => a.vehicleId === vehicleId)) return true;
            } catch(e) {}
          }
          return ride.get('assignedVehicleId') === vehicleId;
        });
        const currentStatus = r.get('status');
        
        return {
          id: r.get('id'),
          vehicleId,
          name: r.get('vehicleName') || r.get('name'),
          number: r.get('vehicleNumber') || r.get('number'),
          vehicleType: r.get('vehicleType'),
          seatingCapacity: parseInt(r.get('seatingCapacity') || '0', 10),
          status: currentStatus === 'Maintenance' ? 'Maintenance' : (isBusy ? 'In Use' : 'Available'),
          nextServiceDate: r.get('nextServiceDate')
        };
      });

      const startIndex = (page - 1) * limit;
      const paginatedData = data.slice(startIndex, startIndex + limit);

      res.json(paginatedData);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch vehicles' });
    }
  });

  // Add a vehicle
  app.post('/api/vehicles', authenticateToken, async (req: any, res: any) => {
    const doc = getDoc();
    if (!doc) return res.status(500).json({ error: 'Google Sheets not configured' });
    try {
      const sheet = doc.sheetsByTitle['vehicles'];
      const newVehicle = {
        vehicleId: 'V' + Date.now().toString().slice(-6),
        vehicleName: req.body.name,
        vehicleNumber: req.body.number,
        status: req.body.status || 'Available'
      };
      await sheet.addRow(newVehicle);
      invalidateCache('vehicles');
      res.json(newVehicle);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to add vehicle', details: error instanceof Error ? error.message : String(error) });
    }
  });

  // Delete a vehicle
  app.delete('/api/vehicles/:id', authenticateToken, async (req: any, res: any) => {
    const doc = getDoc();
    if (!doc) return res.status(500).json({ error: 'Google Sheets not configured' });
    try {
      const sheet = doc.sheetsByTitle['vehicles'];
      if (!sheet) return res.status(404).json({ error: 'Vehicles sheet not found' });
      
      const rows = await getCachedRows('vehicles');
      const vehicleRow = rows.find(r => r.get('vehicleId') === req.params.id || `row-${r.rowNumber}` === req.params.id);
      
      if (!vehicleRow) return res.status(404).json({ error: 'Vehicle not found' });
      
      await vehicleRow.delete();
      invalidateCache('vehicles');
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to delete vehicle', details: error instanceof Error ? error.message : String(error) });
    }
  });

  // Get all drivers
  app.get('/api/drivers', authenticateToken, async (req: any, res: any) => {
    const doc = getDoc();
    if (!doc) return res.status(500).json({ error: 'Google Sheets not configured' });
    try {
      const sheet = doc.sheetsByTitle['drivers'];
      if (!sheet) return res.json([]);
      const forceRefresh = req.query.forceRefresh === 'true';
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;

      const [rows, rideRows] = await Promise.all([
        getCachedRows('drivers', forceRefresh),
        getCachedRows('Bookings', forceRefresh)
      ]);
      
      const activeRides = rideRows.filter(r => ['Assigned', 'Ongoing'].includes(r.get('rideStatus')));

      const data = rows.map(r => {
        const email = r.get('email');
        const isBusy = email && activeRides.some(ride => {
          const assignmentsStr = ride.get('assignments');
          if (assignmentsStr) {
            try {
              const assignments = JSON.parse(assignmentsStr);
              if (assignments.some((a: any) => a.driverEmail === email)) return true;
            } catch(e) {}
          }
          return ride.get('assignedDriverEmail') === email;
        });
        const currentStatus = r.get('status');
        
        return {
          id: r.get('id') || `row-${r.rowNumber}`,
          name: r.get('name'),
          email,
          phone: r.get('phone'),
          assignedVehicleId: r.get('assignedVehicleId'),
          status: currentStatus === 'Inactive' ? 'Inactive' : (isBusy ? 'Busy' : 'Available')
        };
      });

      const startIndex = (page - 1) * limit;
      const paginatedData = data.slice(startIndex, startIndex + limit);

      res.json(paginatedData);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch drivers' });
    }
  });

  // Add a driver
  app.post('/api/drivers', authenticateToken, async (req: any, res: any) => {
    const doc = getDoc();
    if (!doc) return res.status(500).json({ error: 'Google Sheets not configured' });
    try {
      const sheet = doc.sheetsByTitle['drivers'];
      const newDriver = {
        id: 'D' + Date.now().toString().slice(-6),
        name: req.body.name,
        phone: req.body.phone,
        email: req.body.email || `${req.body.name.toLowerCase().replace(/\s+/g, '')}@example.com`,
        status: req.body.status || 'Available'
      };
      await sheet.addRow(newDriver);
      invalidateCache('drivers');
      res.json(newDriver);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to add driver', details: error instanceof Error ? error.message : String(error) });
    }
  });

  // Delete a driver
  app.delete('/api/drivers/:id', authenticateToken, async (req: any, res: any) => {
    const doc = getDoc();
    if (!doc) return res.status(500).json({ error: 'Google Sheets not configured' });
    try {
      const sheet = doc.sheetsByTitle['drivers'];
      if (!sheet) return res.status(404).json({ error: 'Drivers sheet not found' });
      
      const rows = await getCachedRows('drivers');
      const driverRow = rows.find(r => r.get('id') === req.params.id || `row-${r.rowNumber}` === req.params.id);
      
      if (!driverRow) return res.status(404).json({ error: 'Driver not found' });
      
      await driverRow.delete();
      invalidateCache('drivers');
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to delete driver', details: error instanceof Error ? error.message : String(error) });
    }
  });

  // Assign driver to ride
  app.post('/api/bookings/:id/assign', async (req: any, res: any) => {
    const doc = getDoc();
    if (!doc) return res.status(500).json({ error: 'Google Sheets not configured' });
    
    const { assignments } = req.body; // Array of { driverId, vehicleId }
    const rideId = req.params.id;
    
    // Legacy support
    let finalAssignments = assignments || [];
    if (!assignments && req.body.driverId && req.body.vehicleId) {
      finalAssignments = [{ driverId: req.body.driverId, vehicleId: req.body.vehicleId }];
    }

    if (finalAssignments.length === 0) {
      return res.status(400).json({ error: 'No assignments provided' });
    }
    
    try {
      const ridesSheet = doc.sheetsByTitle['Bookings'];
      const driversSheet = doc.sheetsByTitle['drivers'];
      const vehiclesSheet = doc.sheetsByTitle['vehicles'];
      
      const rideRows = await getCachedRows('Bookings');
      const rideRow = rideRows.find(r => r.get('id') === rideId);
      if (!rideRow) return res.status(404).json({ error: 'Ride not found' });
      
      if (['Completed', 'Cancelled'].includes(rideRow.get('rideStatus'))) {
        return res.status(400).json({ error: 'Cannot assign driver to completed or cancelled ride' });
      }

      const [driverRows, vehicleRows] = await Promise.all([
        getCachedRows('drivers'),
        getCachedRows('vehicles')
      ]);

      const oldAssignmentsStr = rideRow.get('assignments');
      let oldAssignments = [];
      if (oldAssignmentsStr) {
        try { oldAssignments = JSON.parse(oldAssignmentsStr); } catch(e) {}
      } else if (rideRow.get('assignedDriverEmail') || rideRow.get('assignedVehicleId')) {
        oldAssignments = [{ driverEmail: rideRow.get('assignedDriverEmail'), vehicleId: rideRow.get('assignedVehicleId') }];
      }

      // Validate all assignments
      const processedAssignments = [];
      for (const a of finalAssignments) {
        let driverRow = null;
        if (a.driverId) {
          driverRow = driverRows.find(r => r.get('id') === a.driverId || `row-${r.rowNumber}` === a.driverId);
          if (!driverRow) return res.status(404).json({ error: `Driver ${a.driverId} not found` });
          
          if (driverRow.get('status') === 'Inactive') {
             return res.status(400).json({ error: `Driver ${driverRow.get('name')} is inactive` });
          }
        }
        
        let vehicleRow = null;
        if (a.vehicleId) {
          vehicleRow = vehicleRows.find(r => r.get('vehicleId') === a.vehicleId || `row-${r.rowNumber}` === a.vehicleId);
          if (!vehicleRow) return res.status(404).json({ error: `Vehicle ${a.vehicleId} not found` });
          
          if (vehicleRow.get('status') === 'Maintenance') {
            return res.status(400).json({ error: `Vehicle ${vehicleRow.get('vehicleName')} is in maintenance` });
          }
        }

        processedAssignments.push({
          driverId: a.driverId,
          vehicleId: a.vehicleId,
          driverEmail: driverRow ? driverRow.get('email') : '',
          driverRow,
          vehicleRow
        });
      }

      // Check overlapping rides
      const getRideEnd = (row: any) => {
        const start = new Date(row.get('rideDate')).getTime();
        const tripType = row.get('tripType');
        
        if (tripType === 'Car Renting') {
          const days = parseInt(row.get('numberOfDays') || '1', 10);
          return start + (days * 24 * 60 * 60 * 1000);
        } else if (tripType === 'Round-trip') {
          const returnDate = row.get('returnDate');
          if (returnDate && returnDate !== 'N/A') {
            const retTime = new Date(returnDate).getTime();
            if (!isNaN(retTime)) return retTime;
          }
        }
        
        return start + (4 * 60 * 60 * 1000); // Default 4 hours
      };

      const rideStart = new Date(rideRow.get('rideDate')).getTime();
      const rideEnd = getRideEnd(rideRow); 

      const overlappingRide = rideRows.find(r => {
        if (r.get('id') === rideId) return false;
        if (!['Assigned', 'Ongoing'].includes(r.get('rideStatus'))) return false;
        
        const rAssignmentsStr = r.get('assignments');
        let rAssignments = [];
        if (rAssignmentsStr) {
          try { rAssignments = JSON.parse(rAssignmentsStr); } catch(e) {}
        } else if (r.get('assignedDriverEmail') || r.get('assignedVehicleId')) {
          rAssignments = [{ driverEmail: r.get('assignedDriverEmail'), vehicleId: r.get('assignedVehicleId') }];
        }

        let hasOverlap = false;
        for (const pa of processedAssignments) {
          for (const ra of rAssignments) {
            const isSameDriver = pa.driverEmail && pa.driverEmail === ra.driverEmail;
            const isSameVehicle = pa.vehicleId && pa.vehicleId === ra.vehicleId;
            if (isSameDriver || isSameVehicle) {
              hasOverlap = true;
              break;
            }
          }
          if (hasOverlap) break;
        }
        
        if (!hasOverlap) return false;
        
        const rStart = new Date(r.get('rideDate')).getTime();
        const rEnd = getRideEnd(r);
        
        return (rStart < rideEnd) && (rEnd > rideStart);
      });

      if (overlappingRide) {
        return res.status(400).json({ error: 'One or more drivers/vehicles already assigned to overlapping ride.' });
      }

      // Update ride
      const savedAssignments = processedAssignments.map(pa => ({
        driverEmail: pa.driverEmail,
        vehicleId: pa.vehicleId
      }));

      rideRow.set('rideStatus', 'Assigned');
      rideRow.set('assignments', JSON.stringify(savedAssignments));
      
      if (savedAssignments.length > 0) {
        rideRow.set('assignedDriverEmail', savedAssignments[0].driverEmail || '');
        rideRow.set('assignedVehicleId', savedAssignments[0].vehicleId || '');
      } else {
        rideRow.set('assignedDriverEmail', '');
        rideRow.set('assignedVehicleId', '');
      }
      
      await rideRow.save();
      invalidateCache('Bookings');

      const updatedRide = {
        id: rideRow.get('id'),
        userId: rideRow.get('userId'),
        rideStatus: 'Assigned',
        assignments: savedAssignments.map((fa, idx) => ({
          driverEmail: fa.driverEmail,
          vehicleId: fa.vehicleId,
          driverDetails: processedAssignments[idx].driverRow ? {
            name: processedAssignments[idx].driverRow.get('name'),
            phone: processedAssignments[idx].driverRow.get('phone')
          } : null,
          vehicleDetails: processedAssignments[idx].vehicleRow ? {
            name: processedAssignments[idx].vehicleRow.get('vehicleName'),
            number: processedAssignments[idx].vehicleRow.get('vehicleNumber')
          } : null
        })),
        // legacy fields
        assignedDriverEmail: savedAssignments[0]?.driverEmail || '',
        assignedVehicleId: savedAssignments[0]?.vehicleId || '',
        driverDetails: processedAssignments[0]?.driverRow ? {
          name: processedAssignments[0].driverRow.get('name'),
          phone: processedAssignments[0].driverRow.get('phone')
        } : null,
        vehicleDetails: processedAssignments[0]?.vehicleRow ? {
          name: processedAssignments[0].vehicleRow.get('vehicleName'),
          number: processedAssignments[0].vehicleRow.get('vehicleNumber')
        } : null
      };

      io.emit('booking:updated', updatedRide);
      res.json(updatedRide);

    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to assign driver' });
    }
  });
};
