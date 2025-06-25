import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext'; // Import AuthContext

const Sidebar = () => {
  const { setToken } = useContext(AuthContext); // Use setToken from AuthContext

  const handleLogout = () => {
    setToken(null); // Clear token in AuthContext (which also removes from localStorage)
    // No need for window.location.href, as AuthContext update will trigger route change via ProtectedRoute
  };

  return (
    <div className="w-64 min-h-screen bg-gray-800 text-white p-4 shadow-lg flex flex-col">
      <h2 className="text-3xl font-bold mb-8 text-blue-300">🍴 Admin Portal</h2>
      <nav className="flex flex-col flex-grow gap-4">
        <Link to="/dashboard" className="px-4 py-2 rounded-md transition-colors duration-200 hover:bg-gray-700 hover:text-blue-400 flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
          Dashboard
        </Link>
        <Link to="/kitchen" className="px-4 py-2 rounded-md transition-colors duration-200 hover:bg-gray-700 hover:text-blue-400 flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
          Kitchen
        </Link>
        <Link to="/order" className="px-4 py-2 rounded-md transition-colors duration-200 hover:bg-gray-700 hover:text-blue-400 flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
          New Order
        </Link>
        <Link to="/history" className="px-4 py-2 rounded-md transition-colors duration-200 hover:bg-gray-700 hover:text-blue-400 flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path></svg>
          Order History
        </Link>
      </nav>
      <button
        onClick={handleLogout}
        className="mt-auto w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-2 rounded-md shadow-md transition duration-200 flex items-center justify-center gap-2"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
        Logout
      </button>
    </div>
  );
};

export default Sidebar;