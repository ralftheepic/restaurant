import React, { createContext, useState, useEffect } from 'react';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loadingAuth, setLoadingAuth] = useState(true);

  // Effect to handle initial token check and potential Firebase auth if you re-introduce it
  // For now, it just reads from localStorage
  useEffect(() => {
    // In a real application, you might want to verify the token with your backend here
    // or integrate Firebase authentication if needed (as per previous examples)
    setLoadingAuth(false); // Mark authentication as loaded
  }, []);

  const handleSetToken = (newToken) => {
    if (newToken) {
      localStorage.setItem('token', newToken);
    } else {
      localStorage.removeItem('token');
    }
    setToken(newToken);
  };

  if (loadingAuth) {
    // You can render a loading spinner or splash screen here
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-100">
        <div className="text-xl font-semibold text-gray-700">Loading authentication...</div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ token, setToken: handleSetToken }}>
      {children}
    </AuthContext.Provider>
  );
};