import React from 'react';
import Sidebar from './SidebarLayout';

const Layout = ({ children }) => (
  <div className="flex min-h-screen bg-gray-100 font-sans">
    <style>
      {`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        body {
          font-family: 'Inter', sans-serif;
        }
      `}
    </style>
    <Sidebar />
    <main className="flex-1 p-6">{children}</main>
  </div>
);

export default Layout;