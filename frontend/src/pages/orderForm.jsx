// frontend/src/pages/OrderForm.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const OrderForm = ({ token }) => {
  const [menu, setMenu] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);

  useEffect(() => {
    axios.get('/api/menu', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => setMenu(res.data))
      .catch(err => console.error(err));
  }, [token]);

  const handleOrder = async () => {
    const total = selectedItems.reduce((sum, item) => sum + item.price, 0);
    const orderPayload = {
      items: selectedItems,
      total,
      tableNo: 'T1',
      platform: 'offline',
    };
    await axios.post('/api/orders', orderPayload, { headers: { Authorization: `Bearer ${token}` } });
    alert('Order placed!');
  };

  const toggleItem = (item) => {
    setSelectedItems((prev) => {
      const exists = prev.find((i) => i.id === item.id);
      return exists ? prev.filter((i) => i.id !== item.id) : [...prev, item];
    });
  };

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <h2 className="text-xl font-bold mb-4">Place Order</h2>
      <div className="grid grid-cols-2 gap-4">
        {menu.map(item => (
          <div
            key={item.id}
            className={`border p-2 cursor-pointer ${selectedItems.find(i => i.id === item.id) ? 'bg-green-200' : ''}`}
            onClick={() => toggleItem(item)}
          >
            {item.name} - ₹{item.price}
          </div>
        ))}
      </div>
      <button onClick={handleOrder} className="mt-4 bg-blue-600 text-white px-4 py-2 rounded">
        Confirm Order
      </button>
    </div>
  );
};

export default OrderForm;