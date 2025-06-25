import React, { useEffect, useState, useContext } from 'react';
import io from 'socket.io-client';
import { AuthContext } from '../contexts/AuthContext'; // Import AuthContext

// Ensure this matches your backend Socket.IO server URL
const socket = io(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}`);

const KitchenDisplay = () => {
  const { token } = useContext(AuthContext); // Get token from AuthContext
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState('pending');
  const [message, setMessage] = useState(''); // For Socket.IO connection status

  useEffect(() => {
    // Handle socket connection events
    socket.on('connect', () => {
      setMessage('✅ Connected to Kitchen Socket');
      console.log('Connected to Socket.IO server for kitchen display.');
      // Fetch initial orders on connect to ensure current state is loaded
      fetchInitialOrders();
    });

    socket.on('disconnect', () => {
      setMessage('❌ Disconnected from Kitchen Socket. Reconnecting...');
      console.log('Disconnected from Socket.IO server.');
    });

    socket.on('connect_error', (error) => {
      setMessage(`❌ Socket connection error: ${error.message}`);
      console.error('Socket.IO connection error:', error);
    });

    // Listen for new orders
    socket.on('new-order', (order) => {
      console.log('New order received via socket:', order);
      setOrders((prev) => {
        // Prevent duplicates if the order already exists
        if (!prev.some(o => o.id === order.id)) {
          return [order, ...prev];
        }
        return prev;
      });
    });

    // Listen for order updates (e.g., status changes)
    socket.on('order-updated', (updatedOrder) => {
      console.log('Order updated via socket:', updatedOrder);
      setOrders((prev) =>
        prev.map((o) => (o.id === updatedOrder.id ? updatedOrder : o))
      );
    });

    const fetchInitialOrders = async () => {
        if (!token) {
            setMessage('Authentication token missing for initial order fetch.');
            return;
        }
        try {
            const res = await fetch(`${process.env.REACT_APP_API_URL}/api/orders`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (res.ok) {
                setOrders(data);
            } else {
                setMessage(`Error fetching initial orders: ${data.message || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('Failed to fetch initial orders:', error);
            setMessage(`Failed to fetch initial orders: ${error.message}`);
        }
    };

    // Fetch initial orders when component mounts or token changes
    fetchInitialOrders();


    // Cleanup on unmount
    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('connect_error');
      socket.off('new-order');
      socket.off('order-updated');
    };
  }, [token]); // Re-run effect if token changes to refetch initial orders

  const updateStatus = async (id, newStatus) => {
    try {
      if (!token) {
        setMessage('Authentication token missing. Cannot update status.');
        return;
      }
      await fetch(`${process.env.REACT_APP_API_URL}/api/orders/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` // Include token
        },
        body: JSON.stringify({ status: newStatus }),
      });
      // The backend should ideally emit 'order-updated' via socket after successful PATCH,
      // so this optimistic update is often not strictly needed if sockets are reliable.
      // But keeping it for immediate UI feedback.
      setOrders((prev) =>
        prev.map((order) =>
          order.id === id ? { ...order, status: newStatus } : order
        )
      );
    } catch (error) {
      console.error(`Failed to update order ${id} status to ${newStatus}:`, error);
      setMessage(`❌ Failed to update order status for #${id}`);
    }
  };

  return (
    <div className="p-4 max-w-5xl mx-auto font-sans">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">🍽️ Kitchen Live Orders</h2>

      {/* Socket connection status message */}
      {message && (
        <div className={`p-2 mb-4 rounded ${message.includes('✅') ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}`}>
          {message}
        </div>
      )}

      {/* 🔘 Filter Tabs */}
      <div className="mb-4 flex flex-wrap gap-2">
        {['pending', 'preparing', 'served'].map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded-full font-semibold text-sm transition duration-300 ease-in-out
              ${filter === status ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}
            `}
          >
            {status.toUpperCase()}
          </button>
        ))}
      </div>

      {/* 📋 Orders Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {orders
          .filter((order) => order.status === filter)
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)) // Sort by newest first
          .map((order) => (
            <div key={order.id} className="border border-gray-200 p-4 shadow rounded-lg bg-white flex flex-col justify-between hover:shadow-md transition duration-200">
              <div className="font-bold text-lg text-gray-900">Order #{order.id}</div>
              <div className="text-gray-700">Table: {order.tableNo || order.ref || 'Online'}</div>
              <div className="text-gray-700 mb-2">Status: <span className={`capitalize font-semibold ${order.status === 'pending' ? 'text-yellow-600' : order.status === 'preparing' ? 'text-blue-600' : 'text-green-600'}`}>{order.status}</span></div>

              <div className="mt-2">
                <h4 className="font-semibold text-gray-800 mb-1">Items:</h4>
                <ul className="list-disc list-inside text-gray-700 text-sm">
                  {order.items.map((item, index) => (
                    <li key={index}>{item.name} × {item.quantity}</li>
                  ))}
                </ul>
              </div>

              <div className="mt-3 pt-3 border-t border-gray-200 text-right font-bold text-xl text-gray-900">
                Total: ₹{order.total.toFixed(2)}
              </div>

              <div className="mt-4 flex justify-end gap-2">
                {order.status === 'pending' && (
                  <button
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition duration-200 shadow-md"
                    onClick={() => updateStatus(order.id, 'preparing')}
                  >
                    Mark as Preparing
                  </button>
                )}

                {order.status === 'preparing' && (
                  <button
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition duration-200 shadow-md"
                    onClick={() => updateStatus(order.id, 'served')}
                  >
                    Mark as Served
                  </button>
                )}

                {order.status === 'served' && (
                  <span className="px-4 py-2 text-sm bg-gray-300 text-gray-800 rounded-md inline-block font-semibold">
                    ✅ Done
                  </span>
                )}
              </div>
            </div>
          ))}
          {orders.filter((order) => order.status === filter).length === 0 && (
            <div className="col-span-full text-center text-gray-500 italic p-4 bg-white rounded-lg shadow-sm">
              No {filter} orders found.
            </div>
          )}
      </div>
    </div>
  );
};

export default KitchenDisplay;