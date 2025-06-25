import React, { useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Import Contexts
import { AuthContext, AuthProvider } from './contexts/AuthContext';
import { OrderRefreshProvider } from './contexts/OrderRefreshContext';

// Import Components/Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import KitchenDisplay from './pages/KitchenDisplay';
import OrderForm from './pages/orderForm';
import OrderHistory from './pages/OrderHistory';
import Layout from './components/Layout'; // Assuming Layout is in components folder

// ProtectedRoute component to guard routes based on authentication status
const ProtectedRoute = ({ children }) => {
  const { token } = useContext(AuthContext);
  return token ? children : <Navigate to="/" replace />;
};

const AppContent = () => {
  const { token } = useContext(AuthContext);

  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Layout><Dashboard /></Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/kitchen"
        element={
          <ProtectedRoute>
            <Layout><KitchenDisplay /></Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/order"
        element={
          <ProtectedRoute>
            {/* OrderForm will use AuthContext and OrderRefreshContext internally */}
            <Layout><OrderForm /></Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/history"
        element={
          <ProtectedRoute>
            {/* OrderHistory will use AuthContext and OrderRefreshContext internally */}
            <Layout><OrderHistory /></Layout>
          </ProtectedRoute>
        }
      />
      {/* Fallback for any other path if not authenticated, or display 404 */}
      <Route path="*" element={token ? <Navigate to="/dashboard" replace /> : <Navigate to="/" replace />} />
    </Routes>
  );
};

const App = () => {
  return (
    <Router>
      <AuthProvider> {/* AuthProvider wraps the entire application */}
        <OrderRefreshProvider> {/* OrderRefreshProvider also wraps the application */}
          <AppContent />
        </OrderRefreshProvider>
      </AuthProvider>
    </Router>
  );
};

export default App;