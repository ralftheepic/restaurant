import React, { useEffect, useState } from 'react';
import io from 'socket.io-client';

const socket = io('http://localhost:5000');

const KitchenDisplay = () => {
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState('pending'); // ⬅️ Filter state

  useEffect(() => {
    socket.on('new-order', (order) => {
      setOrders((prev) => [order, ...prev]);
    });

    socket.on('order-updated', (updatedOrder) => {
      setOrders((prev) =>
        prev.map((o) => (o.id === updatedOrder.id ? updatedOrder : o))
      );
    });

    return () => {
      socket.off('new-order');
      socket.off('order-updated');
    };
  }, []);

  const updateStatus = async (id, newStatus) => {
    await fetch(`/api/orders/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });

    // Optional: optimistic UI update
    setOrders((prev) =>
      prev.map((order) =>
        order.id === id ? { ...order, status: newStatus } : order
      )
    );
  };

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">🍽️ Kitchen Live Orders</h2>

      {/* 🔘 Filter Tabs */}
      <div className="mb-4">
        {['pending', 'preparing', 'served'].map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`mr-2 px-4 py-2 rounded ${
              filter === status ? 'bg-blue-600 text-white' : 'bg-gray-200'
            }`}
          >
            {status.toUpperCase()}
          </button>
        ))}
      </div>

      {/* 📋 Orders Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {orders
          .filter((order) => order.status === filter)
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .map((order) => (
            <div key={order.id} className="border p-4 shadow rounded">
              <div className="font-bold">Order #{order.id}</div>
              <div>Table: {order.tableNo || 'Online'}</div>
              <div>Status: {order.status}</div>
              <div>Total: ₹{order.total}</div>

              {order.status === 'pending' && (
                <button
                  className="mt-2 px-3 py-1 bg-green-600 text-white rounded"
                  onClick={() => updateStatus(order.id, 'preparing')}
                >
                  Mark as Preparing
                </button>
              )}

              {order.status === 'preparing' && (
                <button
                  className="mt-2 px-3 py-1 bg-blue-600 text-white rounded"
                  onClick={() => updateStatus(order.id, 'served')}
                >
                  Mark as Served
                </button>
              )}

              {order.status === 'served' && (
                <span className="mt-2 px-3 py-1 text-sm bg-gray-300 rounded inline-block">
                  ✅ Done
                </span>
              )}
            </div>
          ))}
      </div>
    </div>
  );
};

export default KitchenDisplay;
