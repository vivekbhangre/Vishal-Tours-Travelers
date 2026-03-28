import { getDoc, getCachedRows, invalidateCache } from './sheets.js';

export const setupFleetRoutes = (app: any, io: any) => {
  // Get all vehicles
  app.get('/api/vehicles', async (req: any, res: any) => {
    const doc = getDoc();
    if (!doc) return res.status(500).json({ error: 'Google Sheets not configured' });
    try {
      const sheet = doc.sheetsByTitle['vehicles'];
      if (!sheet) return res.json([]);
      const forceRefresh = req.query.forceRefresh === 'true';
      const rows = await getCachedRows('vehicles', forceRefresh);
      
      const rideRows = await getCachedRows('Bookings', forceRefresh);
      const activeRides = rideRows.filter(r => ['Assigned', 'Ongoing'].includes(r.get('rideStatus')));

      res.json(rows.map(r => {
        const vehicleId = r.get('vehicleId') || `row-${r.rowNumber}`;
        const isBusy = vehicleId && activeRides.some(ride => ride.get('assignedVehicleId') === vehicleId);
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
      }));
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch vehicles' });
    }
  });

  // Add a vehicle
  app.post('/api/vehicles', async (req: any, res: any) => {
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
  app.delete('/api/vehicles/:id', async (req: any, res: any) => {
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
  app.get('/api/drivers', async (req: any, res: any) => {
    const doc = getDoc();
    if (!doc) return res.status(500).json({ error: 'Google Sheets not configured' });
    try {
      const sheet = doc.sheetsByTitle['drivers'];
      if (!sheet) return res.json([]);
      const forceRefresh = req.query.forceRefresh === 'true';
      const rows = await getCachedRows('drivers', forceRefresh);
      
      const rideRows = await getCachedRows('Bookings', forceRefresh);
      const activeRides = rideRows.filter(r => ['Assigned', 'Ongoing'].includes(r.get('rideStatus')));

      res.json(rows.map(r => {
        const email = r.get('email');
        const isBusy = email && activeRides.some(ride => ride.get('assignedDriverEmail') === email);
        const currentStatus = r.get('status');
        
        return {
          id: r.get('id') || `row-${r.rowNumber}`,
          name: r.get('name'),
          email,
          phone: r.get('phone'),
          assignedVehicleId: r.get('assignedVehicleId'),
          status: currentStatus === 'Inactive' ? 'Inactive' : (isBusy ? 'Busy' : 'Available')
        };
      }));
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch drivers' });
    }
  });

  // Add a driver
  app.post('/api/drivers', async (req: any, res: any) => {
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
  app.delete('/api/drivers/:id', async (req: any, res: any) => {
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
    
    const { driverId, vehicleId } = req.body;
    const rideId = req.params.id;
    
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

      const driverRows = await getCachedRows('drivers');
      let driverRow = null;
      if (driverId) {
        driverRow = driverRows.find(r => r.get('id') === driverId || `row-${r.rowNumber}` === driverId);
        if (!driverRow) return res.status(404).json({ error: 'Driver not found' });
      }
      
      const vehicleRows = await getCachedRows('vehicles');
      const vehicleRow = vehicleRows.find(r => r.get('vehicleId') === vehicleId || `row-${r.rowNumber}` === vehicleId);
      if (!vehicleRow) return res.status(404).json({ error: 'Vehicle not found' });

      // Check maintenance
      if (vehicleRow.get('status') === 'Maintenance') {
        return res.status(400).json({ error: 'Vehicle is in maintenance' });
      }

      // Check overlapping rides
      const rideStart = new Date(rideRow.get('rideDate')).getTime();
      // Assuming a ride takes 4 hours for overlap check if no end time is specified
      const rideEnd = rideStart + (4 * 60 * 60 * 1000); 

      const overlappingRide = rideRows.find(r => {
        if (r.get('id') === rideId) return false;
        if (!['Assigned', 'Ongoing'].includes(r.get('rideStatus'))) return false;
        
        const isSameDriver = driverRow ? r.get('assignedDriverEmail') === driverRow.get('email') : false;
        const isSameVehicle = r.get('assignedVehicleId') === vehicleId;
        
        if (!isSameDriver && !isSameVehicle) return false;
        
        const rStart = new Date(r.get('rideDate')).getTime();
        const rEnd = rStart + (4 * 60 * 60 * 1000);
        
        return (rStart < rideEnd) && (rEnd > rideStart);
      });

      if (overlappingRide) {
        return res.status(400).json({ error: 'Driver or vehicle already assigned to overlapping ride.' });
      }

      // If reassignment, free up old driver/vehicle
      const oldDriverEmail = rideRow.get('assignedDriverEmail');
      const oldVehicleId = rideRow.get('assignedVehicleId');
      
      if (oldDriverEmail && (!driverRow || oldDriverEmail !== driverRow.get('email'))) {
        const oldDriverRow = driverRows.find(r => r.get('email') === oldDriverEmail);
        if (oldDriverRow) {
          oldDriverRow.set('status', 'Available');
          await oldDriverRow.save();
          invalidateCache('drivers');
        }
      }
      
      if (oldVehicleId && oldVehicleId !== vehicleId) {
        const oldVehicleRow = vehicleRows.find(r => r.get('vehicleId') === oldVehicleId || `row-${r.rowNumber}` === oldVehicleId);
        if (oldVehicleRow) {
          oldVehicleRow.set('status', 'Available');
          await oldVehicleRow.save();
          invalidateCache('vehicles');
        }
      }

      // Update new driver and vehicle status
      if (driverRow) {
        driverRow.set('status', 'Busy');
        await driverRow.save();
        invalidateCache('drivers');
      }
      
      vehicleRow.set('status', 'In Use');
      await vehicleRow.save();
      invalidateCache('vehicles');

      // Update ride
      rideRow.set('rideStatus', 'Assigned');
      rideRow.set('assignedDriverEmail', driverRow ? driverRow.get('email') : '');
      rideRow.set('assignedVehicleId', vehicleId);
      await rideRow.save();
      invalidateCache('Bookings');

      const updatedRide = {
        id: rideRow.get('id'),
        rideStatus: 'Assigned',
        assignedDriverEmail: driverRow.get('email'),
        assignedVehicleId: vehicleId,
        driverDetails: {
          name: driverRow.get('name'),
          phone: driverRow.get('phone')
        },
        vehicleDetails: {
          name: vehicleRow.get('vehicleName'),
          number: vehicleRow.get('vehicleNumber')
        }
      };

      io.emit('booking:updated', updatedRide);
      res.json(updatedRide);

    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to assign driver' });
    }
  });
};
