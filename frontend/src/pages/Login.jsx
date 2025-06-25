import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext'; // Import AuthContext

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { setToken } = useContext(AuthContext); // Use setToken from AuthContext

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    console.log('API:', process.env.REACT_APP_API_URL);
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: username, password })
      });
      const data = await res.json();
      console.log('Login response:', data);
      if (!res.ok) throw new Error(data.message || 'Login failed');

      setToken(data.token); // Update token in AuthContext (which also updates localStorage)
      navigate('/kitchen'); // Default page post login
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 font-sans"> {/* Added font-sans */}
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-lg w-96 max-w-sm">
        <h2 className="text-2xl font-bold mb-4 text-center text-gray-800">🔐 Staff Login</h2>

        {error && <div className="text-red-600 bg-red-100 p-2 rounded mb-3 text-sm">{error}</div>}

        <div className="mb-3">
          <label htmlFor="username" className="block text-gray-700 text-sm font-semibold mb-1">Username (Email)</label>
          <input
            id="username"
            type="text"
            placeholder="Enter your email"
            value={username}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>
        <div className="mb-4">
          <label htmlFor="password" className="block text-gray-700 text-sm font-semibold mb-1">Password</label>
          <input
            id="password"
            type="password"
            placeholder="Enter your password"
            value={password}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-lg shadow-md transition duration-200"
        >
          Login
        </button>
      </form>
    </div>
  );
};

export default Login;