import fetch from 'node-fetch';

async function run() {
  const res = await fetch('http://localhost:3000/api/bookings');
  const bookings: any[] = await res.json() as any[];
  const cancelled = bookings.find((b: any) => b.rideStatus === 'Cancelled');
  if (cancelled) {
    console.log('Found cancelled booking:', cancelled.id);
    const updateRes1 = await fetch(`http://localhost:3000/api/bookings/${cancelled.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refundStatus: 'Processed', isAdmin: true })
    });
    console.log('Update 1 (Processed) response:', updateRes1.status);
    
    const updateRes2 = await fetch(`http://localhost:3000/api/bookings/${cancelled.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refundStatus: 'Pending', isAdmin: true })
    });
    console.log('Update 2 (Pending) response:', updateRes2.status, await updateRes2.text());
  } else {
    console.log('No cancelled bookings found');
  }
}
run();
