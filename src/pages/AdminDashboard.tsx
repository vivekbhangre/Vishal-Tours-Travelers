import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { api, socket } from '../lib/api';
import { format } from 'date-fns';
import { Download, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function AdminDashboard() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('All');

  useEffect(() => {
    fetchBookings();
    fetchRevenue();

    socket.on('booking:updated', (updatedBooking) => {
      setBookings(prev => prev.map(b => b.id === updatedBooking.id ? updatedBooking : b));
    });

    socket.on('booking:created', (newBooking) => {
      setBookings(prev => [...prev, newBooking]);
    });

    return () => {
      socket.off('booking:updated');
      socket.off('booking:created');
    };
  }, []);

  const fetchBookings = async () => {
    try {
      const data = await api.getBookings();
      setBookings(data);
    } catch (error) {
      console.error('Failed to fetch bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRevenue = async () => {
    try {
      const data = await api.getRevenueLogs();
      // Format data for chart
      const formattedData = data.map((item: any) => ({
        name: `${item.month} ${item.year}`,
        amount: item.amount
      }));
      setRevenueData(formattedData);
    } catch (error) {
      console.error('Failed to fetch revenue:', error);
    }
  };

  const handleDownloadReport = () => {
    api.downloadMonthlyReport();
  };

  const handleUpdateStatus = async (id: string, field: 'rideStatus' | 'paymentStatus', value: string) => {
    try {
      await api.updateBooking(id, { [field]: value });
    } catch (error) {
      console.error('Failed to update booking:', error);
      alert('Failed to update booking status');
    }
  };

  // Calculate stats
  const totalRides = bookings.length;
  const completedRides = bookings.filter(b => b.rideStatus === 'Completed').length;
  const pendingRides = bookings.filter(b => b.rideStatus === 'Pending').length;
  const ongoingRides = bookings.filter(b => b.rideStatus === 'Ongoing').length;
  const cancelledRides = bookings.filter(b => b.rideStatus === 'Cancelled').length;
  const totalRevenue = bookings.filter(b => b.paymentStatus === 'Paid').reduce((sum, b) => sum + parseFloat(b.fareAmount || '0'), 0);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending': return 'bg-yellow-100 text-yellow-800';
      case 'Ongoing': return 'bg-blue-100 text-blue-800';
      case 'Completed': return 'bg-green-100 text-green-800';
      case 'Cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentColor = (status: string) => {
    return status === 'Paid' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
  };

  const filteredBookings = activeTab === 'All' 
    ? bookings 
    : bookings.filter(b => b.rideStatus === activeTab);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            <button
              onClick={handleDownloadReport}
              className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <Download className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
              Download Monthly Report
            </button>
          </div>
          
          {/* Stats Grid */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5 mb-8">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <dt className="text-sm font-medium text-gray-500 truncate">Total Rides</dt>
                <dd className="mt-1 text-3xl font-semibold text-gray-900">{totalRides}</dd>
              </div>
            </div>
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <dt className="text-sm font-medium text-gray-500 truncate">Completed Rides</dt>
                <dd className="mt-1 text-3xl font-semibold text-green-600">{completedRides}</dd>
              </div>
            </div>
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <dt className="text-sm font-medium text-gray-500 truncate">Ongoing Rides</dt>
                <dd className="mt-1 text-3xl font-semibold text-blue-600">{ongoingRides}</dd>
              </div>
            </div>
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <dt className="text-sm font-medium text-gray-500 truncate">Cancelled Rides</dt>
                <dd className="mt-1 text-3xl font-semibold text-red-600">{cancelledRides}</dd>
              </div>
            </div>
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <dt className="text-sm font-medium text-gray-500 truncate">Pending Rides</dt>
                <dd className="mt-1 text-3xl font-semibold text-yellow-600">{pendingRides}</dd>
              </div>
            </div>
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <dt className="text-sm font-medium text-gray-500 truncate">Total Revenue</dt>
                <dd className="mt-1 text-3xl font-semibold text-indigo-600">${totalRevenue.toFixed(2)}</dd>
              </div>
            </div>
          </div>

          {/* Revenue Chart */}
          <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-8">
            <div className="px-4 py-5 sm:px-6 flex items-center justify-between">
              <h3 className="text-lg leading-6 font-medium text-gray-900 flex items-center">
                <TrendingUp className="mr-2 h-5 w-5 text-indigo-500" />
                Revenue Overview
              </h3>
            </div>
            <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
              {revenueData.length > 0 ? (
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={revenueData}
                      margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} />
                      <YAxis axisLine={false} tickLine={false} tickFormatter={(value) => `₹${value}`} />
                      <Tooltip 
                        formatter={(value: number) => [`₹${value.toFixed(2)}`, 'Revenue']}
                        cursor={{ fill: '#f3f4f6' }}
                      />
                      <Bar dataKey="amount" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-72 flex items-center justify-center text-gray-500">
                  No revenue data available yet.
                </div>
              )}
            </div>
          </div>

          {/* All Bookings List */}
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">All Bookings</h3>
            </div>
            
            {/* Tabs */}
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex px-4 space-x-8 overflow-x-auto" aria-label="Tabs">
                {['All', 'Pending', 'Ongoing', 'Completed', 'Cancelled'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`
                      whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                      ${activeTab === tab 
                        ? 'border-indigo-500 text-indigo-600' 
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                    `}
                  >
                    {tab} Rides
                    <span className={`ml-2 py-0.5 px-2.5 rounded-full text-xs font-medium ${
                      activeTab === tab ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-900'
                    }`}>
                      {tab === 'All' ? bookings.length : bookings.filter(b => b.rideStatus === tab).length}
                    </span>
                  </button>
                ))}
              </nav>
            </div>

            <div className="border-t border-gray-200">
              {loading ? (
                <div className="p-4 text-center text-gray-500">Loading bookings...</div>
              ) : filteredBookings.length === 0 ? (
                <div className="p-4 text-center text-gray-500">No {activeTab !== 'All' ? activeTab.toLowerCase() : ''} bookings found.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Customer
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Route
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Payment
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Fare
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredBookings.map((booking) => (
                        <tr key={booking.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {booking.userName}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {booking.tripType === 'Tour' 
                              ? `${booking.fromLocation} \u2192 ${booking.destinations}`
                              : `${booking.fromLocation} \u2192 ${booking.toLocation}`}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {format(new Date(booking.rideDate), 'PPp')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <select
                              value={booking.rideStatus}
                              onChange={(e) => handleUpdateStatus(booking.id, 'rideStatus', e.target.value)}
                              className={`mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md ${getStatusColor(booking.rideStatus)}`}
                            >
                              <option value="Pending">Pending</option>
                              <option value="Ongoing">Ongoing</option>
                              <option value="Completed">Completed</option>
                              <option value="Cancelled">Cancelled</option>
                            </select>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <select
                              value={booking.paymentStatus}
                              onChange={(e) => handleUpdateStatus(booking.id, 'paymentStatus', e.target.value)}
                              className={`mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md ${getPaymentColor(booking.paymentStatus)}`}
                            >
                              <option value="Not Paid">Not Paid</option>
                              <option value="Paid">Paid</option>
                            </select>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            ₹{parseFloat(booking.fareAmount).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
