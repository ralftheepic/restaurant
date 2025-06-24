import React, { useEffect, useState } from 'react';
import axios from 'axios';

const OrderHistory = ({ token }) => {
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    axios.get('/api/orders', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => setOrders(res.data))
      .catch((err) => console.error(err));
  }, [token]);

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <h2 className="text-xl font-bold mb-4">Order History</h2>
      <ul>
        {orders.map((order) => (
          <li key={order.id} className="border p-2 mb-2">
            <div><strong>Table:</strong> {order.tableNo || 'N/A'} | <strong>Status:</strong> {order.status}</div>
            <div><strong>Total:</strong> ₹{order.total}</div>
            <div><strong>Time:</strong> {new Date(order.createdAt).toLocaleString()}</div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default OrderHistory;