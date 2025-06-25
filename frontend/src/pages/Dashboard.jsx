import React from 'react';
import { Link } from 'react-router-dom';

const Dashboard = () => {
  const stats = [
    { label: 'Active Orders', value: 8, color: 'bg-yellow-500' },
    { label: 'Orders Today', value: 52, color: 'bg-green-600' },
    { label: 'Total Sales', value: '₹4,250', color: 'bg-blue-600' },
    { label: 'Tables Occupied', value: 4, color: 'bg-purple-600' },
  ];

  const quickLinks = [
    { label: '📦 Place New Order', path: '/order' },
    { label: '📋 View Order History', path: '/history' },
    { label: '🍽️ Kitchen Display', path: '/kitchen' },
  ];

  return (
    <div className="p-6 space-y-6 font-sans">
      <h2 className="text-3xl font-bold text-gray-800">📊 Admin Dashboard</h2>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <div
            key={i}
            className={`text-white p-4 rounded-lg shadow-md flex flex-col justify-between items-start ${stat.color}`}
          >
            <div className="text-sm opacity-90">{stat.label}</div>
            <div className="text-2xl font-bold mt-2">{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Quick Links */}
      <div className="mt-6">
        <h3 className="text-xl font-semibold mb-3 text-gray-800">Quick Actions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {quickLinks.map((link, idx) => (
            <Link
              key={idx}
              to={link.path}
              className="bg-white hover:bg-blue-50 p-4 rounded-lg border border-gray-200 shadow-sm flex items-center justify-between transition duration-200 ease-in-out"
            >
              <span className="text-lg font-medium text-gray-800">{link.label}</span>
              <span className="text-blue-600 font-bold text-xl">→</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;