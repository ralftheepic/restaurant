import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../contexts/AuthContext'; // Import AuthContext
import { OrderRefreshContext } from '../contexts/OrderRefreshContext'; // Import OrderRefreshContext

const OrderForm = () => {
  const { token } = useContext(AuthContext); // Get token from AuthContext
  const { triggerRefresh } = useContext(OrderRefreshContext); // Get triggerRefresh from OrderRefreshContext

  const [menu, setMenu] = useState([]);
  const [selectedItems, setSelectedItems] = useState({});
  const [category, setCategory] = useState('all');
  const [orderType, setOrderType] = useState('dine-in');
  const [tableOrToken, setTableOrToken] = useState('');
  const [searchText, setSearchText] = useState('');
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState({ text: '', type: '' });

  useEffect(() => {
    if (!token) {
      setFeedbackMessage({ text: 'Authentication token not found. Please log in.', type: 'error' });
      return;
    }

    axios.get(`${process.env.REACT_APP_API_URL}/api/menu`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => setMenu(res.data))
    .catch(err => {
      console.error("❌ Failed to load menu:", err);
      setFeedbackMessage({ text: 'Failed to load menu. Please try again later.', type: 'error' });
    });
  }, [token]); // Dependency on token to refetch menu if token changes

  const handleQuantityChange = (item, qty) => {
    setSelectedItems(prev => {
      const updated = { ...prev };
      if (qty > 0) {
        updated[item.id] = { ...item, quantity: qty };
      } else {
        delete updated[item.id];
      }
      return updated;
    });
  };

  const handlePlaceOrder = async () => {
    setFeedbackMessage({ text: '', type: '' });
    setIsPlacingOrder(true);

    const items = Object.values(selectedItems);
    const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

    if (!token) {
      setFeedbackMessage({ text: 'Authentication token not found. Cannot place order.', type: 'error' });
      setIsPlacingOrder(false);
      return;
    }

    const payload = {
      items,
      total,
      platform: orderType,
      tableNo: orderType === 'dine-in' ? tableOrToken : null,
      ref: orderType !== 'dine-in' ? tableOrToken : null,
    };

    try {
      await axios.post(`${process.env.REACT_APP_API_URL}/api/orders`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setFeedbackMessage({ text: '✅ Order placed successfully!', type: 'success' });
      setSelectedItems({});
      setTableOrToken('');
      triggerRefresh(); // Call triggerRefresh from context to signal OrderHistory
    } catch (err) {
      console.error("❌ Failed to place order:", err);
      if (err.response) {
        console.error("Server response:", err.response.data);
        console.error("Status:", err.response.status);
        console.error("Headers:", err.response.headers);
        setFeedbackMessage({ text: `❌ Failed to place order: ${err.response.data.message || 'Server error'}`, type: 'error' });
      } else if (err.request) {
        console.error("No response received:", err.request);
        setFeedbackMessage({ text: '❌ Failed to place order: No response from server. Check network.', type: 'error' });
      } else {
        console.error("Request setup error:", err.message);
        setFeedbackMessage({ text: `❌ Failed to place order: ${err.message}`, type: 'error' });
      }
    } finally {
      setIsPlacingOrder(false);
    }
  };

  const categories = ['all', ...new Set(menu.map(item => item.category))];

  const isPlaceOrderDisabled = Object.values(selectedItems).length === 0 || !tableOrToken || isPlacingOrder;

  return (
    <div className="p-4 max-w-5xl mx-auto font-sans">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">🍽️ Place New Order</h2>

      {feedbackMessage.text && (
        <div
          className={`p-3 mb-4 rounded-lg text-white ${
            feedbackMessage.type === 'success' ? 'bg-green-500' : 'bg-red-500'
          }`}
        >
          {feedbackMessage.text}
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-start sm:items-center mb-4 gap-4 bg-white p-4 rounded-lg shadow-sm">
        <label className="text-gray-700 font-medium">Order Type:</label>
        {['dine-in', 'takeaway', 'online'].map(type => (
          <label key={type} className="flex items-center space-x-2 text-gray-600">
            <input
              type="radio"
              name="orderType"
              value={type}
              checked={orderType === type}
              onChange={() => setOrderType(type)}
              className="form-radio text-blue-600 rounded-full"
            />
            <span>{type.charAt(0).toUpperCase() + type.slice(1)}</span>
          </label>
        ))}
      </div>

      <div className="mb-4 bg-white p-4 rounded-lg shadow-sm">
        <input
          type="text"
          className="border border-gray-300 p-2 rounded-md w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
          placeholder={orderType === 'dine-in' ? 'Enter Table Number' : 'Enter Token / App Ref'}
          value={tableOrToken}
          onChange={(e) => setTableOrToken(e.target.value)}
        />
        {!tableOrToken && (
          <p className="text-sm text-red-500 mt-1">
            {orderType === 'dine-in' ? 'Table Number' : 'Token / App Ref'} is required.
          </p>
        )}
      </div>

      <div className="mb-4 bg-white p-4 rounded-lg shadow-sm">
        <input
          type="text"
          placeholder="Search menu item..."
          className="border border-gray-300 p-2 rounded-md w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value.toLowerCase())}
        />
      </div>

      <div className="mb-6 flex flex-wrap gap-2 bg-white p-4 rounded-lg shadow-sm">
        {categories.map(cat => (
          <button
            key={cat}
            className={`px-4 py-2 rounded-full font-semibold text-sm transition duration-300 ease-in-out
              ${category === cat ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}
            `}
            onClick={() => setCategory(cat)}
          >
            {cat.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
        {menu
          .filter(item =>
            (category === 'all' || item.category === category) &&
            item.name.toLowerCase().includes(searchText)
          )
          .map(item => (
            <div key={item.id} className="border border-gray-200 p-4 rounded-lg shadow-sm bg-white flex flex-col justify-between items-start hover:shadow-md transition duration-200">
              <div className="font-semibold text-gray-800 text-lg mb-1">{item.name}</div>
              <div className="text-md text-gray-600 mb-3">₹{item.price.toFixed(2)}</div>
              <input
                type="number"
                min="0"
                value={selectedItems[item.id]?.quantity || ''}
                placeholder="Qty"
                className="mt-2 border border-gray-300 p-2 w-24 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200 text-center"
                onChange={(e) => handleQuantityChange(item, parseInt(e.target.value) || 0)}
              />
            </div>
          ))}
          {menu.length === 0 && !feedbackMessage.text && (
            <p className="col-span-full text-center text-gray-500">Loading menu items...</p>
          )}
          {menu.length === 0 && feedbackMessage.type === 'error' && (
             <p className="col-span-full text-center text-red-600">{feedbackMessage.text}</p>
          )}
      </div>

      <div className="bg-white p-6 rounded-lg shadow-lg mb-6">
        <h3 className="text-xl font-bold mb-3 text-gray-800 flex items-center">
          🛒 Order Summary
        </h3>
        {Object.values(selectedItems).length === 0 && <div className="text-gray-500 italic">No items selected</div>}
        {Object.values(selectedItems).map((item) => (
          <div key={item.id} className="flex justify-between py-2 border-b border-gray-200 last:border-b-0">
            <div className="text-gray-700">{item.name} × {item.quantity}</div>
            <div className="font-medium text-gray-800">₹{(item.price * item.quantity).toFixed(2)}</div>
          </div>
        ))}
        <div className="mt-4 font-bold text-right text-xl text-gray-900 pt-4 border-t border-gray-300">
          Total: ₹{Object.values(selectedItems).reduce((sum, item) => sum + item.price * item.quantity, 0).toFixed(2)}
        </div>
      </div>

      <button
        className={`w-full bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-bold text-lg transition duration-300 ease-in-out shadow-lg
          ${isPlaceOrderDisabled ? 'opacity-50 cursor-not-allowed bg-gray-400 hover:bg-gray-400' : ''}
        `}
        onClick={handlePlaceOrder}
        disabled={isPlaceOrderDisabled}
      >
        {isPlacingOrder ? 'Placing Order...' : '🧾 Place Order'}
      </button>
    </div>
  );
};

export default OrderForm;