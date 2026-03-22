import { io } from 'socket.io-client';

const API_URL = '/api';

export const socket = io();

export const api = {
  async register(data: any) {
    const res = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async login(data: any) {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async verifyReset(data: any) {
    const res = await fetch(`${API_URL}/auth/verify-reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async resetPassword(data: any) {
    const res = await fetch(`${API_URL}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async getUser(id: string) {
    const res = await fetch(`${API_URL}/users/${id}`);
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async updateUser(id: string, data: any) {
    const res = await fetch(`${API_URL}/users/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async createBooking(data: any) {
    const res = await fetch(`${API_URL}/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async getBookings(userId?: string, isAdmin?: boolean, forceRefresh?: boolean) {
    let url = `${API_URL}/bookings`;
    const params = new URLSearchParams();
    if (userId) params.append('userId', userId);
    if (isAdmin) params.append('isAdmin', 'true');
    if (forceRefresh) params.append('forceRefresh', 'true');
    params.append('_t', Date.now().toString());
    if (params.toString()) url += `?${params.toString()}`;
    
    const res = await fetch(url);
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async updateBooking(id: string, data: any) {
    const res = await fetch(`${API_URL}/bookings/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async downloadMonthlyReport() {
    window.open(`${API_URL}/reports/monthly`, '_blank');
  },

  async getRevenueLogs(forceRefresh?: boolean) {
    const params = new URLSearchParams();
    if (forceRefresh) params.append('forceRefresh', 'true');
    params.append('_t', Date.now().toString());
    const res = await fetch(`${API_URL}/revenue?${params.toString()}`);
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async getVehicles(forceRefresh?: boolean) {
    const params = new URLSearchParams();
    if (forceRefresh) params.append('forceRefresh', 'true');
    params.append('_t', Date.now().toString());
    const res = await fetch(`${API_URL}/vehicles?${params.toString()}`);
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async getDrivers(forceRefresh?: boolean) {
    const params = new URLSearchParams();
    if (forceRefresh) params.append('forceRefresh', 'true');
    params.append('_t', Date.now().toString());
    const res = await fetch(`${API_URL}/drivers?${params.toString()}`);
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async addDriver(data: { name: string; phone: string; email: string }) {
    const res = await fetch(`${API_URL}/drivers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async deleteDriver(id: string) {
    const res = await fetch(`${API_URL}/drivers/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async addVehicle(data: { name: string; number: string }) {
    const res = await fetch(`${API_URL}/vehicles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async deleteVehicle(id: string) {
    const res = await fetch(`${API_URL}/vehicles/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async assignDriver(bookingId: string, driverId: string, vehicleId: string) {
    const res = await fetch(`${API_URL}/bookings/${bookingId}/assign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ driverId, vehicleId }),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Failed to assign driver');
    }
    return res.json();
  }
};
