import React, { useEffect, useState, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../contexts/AuthContext';
import { OrderRefreshContext } from '../contexts/OrderRefreshContext';

const OrderHistory = () => {
  const { token } = useContext(AuthContext);
  const { refreshCounter, triggerRefresh } = useContext(OrderRefreshContext);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloadingOrderId, setDownloadingOrderId] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [menuItems, setMenuItems] = useState([]); // State to hold menu items for the edit modal

  // Effect to fetch orders from the backend
  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);
      setError(null);

      if (!token) {
        setError('Authentication token not found. Please log in.');
        setLoading(false);
        return;
      }

      try {
        const res = await axios.get(`${process.env.REACT_APP_API_URL}/api/orders`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setOrders(res.data);
      } catch (err) {
        console.error("❌ Failed to fetch order history:", err);
        if (axios.isAxiosError(err) && err.response) {
          setError(`Failed to fetch orders: ${err.response.data.message || 'Server error'}`);
        } else if (err.request) {
          setError('Failed to fetch orders: No response from server. Check network.');
        } else {
          setError(`Failed to fetch orders: ${err.message}`);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [token, refreshCounter]);

  // Effect to fetch menu items for the edit modal
  useEffect(() => {
    const fetchMenuItems = async () => {
      try {
        const res = await axios.get(`${process.env.REACT_APP_API_URL}/api/menu`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setMenuItems(res.data);
      } catch (err) {
        console.error("❌ Failed to fetch menu items:", err);
        // Handle error, e.g., set an error state for the menu items part of the modal
      }
    };
    if (isEditModalOpen && token) {
      fetchMenuItems();
    }
  }, [isEditModalOpen, token]);

  /**
   * Handles the click event for the "Print Bill" button.
   * Initiates the download of the invoice for the specified order ID.
   * @param {number} orderId - The ID of the order for which to download the invoice.
   */
  const handlePrintBill = async (orderId) => {
    setDownloadingOrderId(orderId);
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/orders/${orderId}/invoice/download`, {
        responseType: 'blob',
        headers: { Authorization: `Bearer ${token}` },
      });

      const contentDisposition = response.headers['content-disposition'];
      let filename = `invoice-${orderId}.pdf`;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1];
        }
      }

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);

    } catch (err) {
      console.error('❌ Error downloading invoice:', err);
      if (axios.isAxiosError(err) && err.response) {
        if (err.response.data instanceof Blob) {
          const reader = new FileReader();
          reader.onload = function() {
            try {
              const errorText = JSON.parse(reader.result);
              alert(`Failed to download invoice: ${errorText.message || errorText.error || 'Server error'}`);
            } catch (e) {
              alert(`Failed to download invoice: ${err.response.statusText || 'Unknown server error'}`);
            }
          };
          reader.readAsText(err.response.data);
        } else {
          alert(`Failed to download invoice: ${err.response.data?.message || err.response.data?.error || err.response.statusText || 'Server error'}`);
        }
      } else if (err.request) {
        alert('Failed to download invoice: No response from server. Check network connection.');
      } else {
        alert(`Failed to download invoice: ${err.message}`);
      }
    } finally {
      setDownloadingOrderId(null);
    }
  };

  /**
   * Opens the edit modal for a selected order.
   * @param {object} order - The order to be edited.
   */
  const handleEditOrder = (order) => {
    setSelectedOrder(order);
    setIsEditModalOpen(true);
  };

  /**
   * Handles saving changes from the edit modal to the backend.
   * @param {Array<object>} updatedItems - The new list of items for the order.
   */
  const handleSaveChanges = async (updatedItems) => {
    if (!selectedOrder || !token) return;

    try {
      await axios.put(`${process.env.REACT_APP_API_URL}/api/orders/${selectedOrder.id}/status`, {
        items: updatedItems,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setIsEditModalOpen(false);
      triggerRefresh();
      alert('Order updated successfully!');
    } catch (err) {
      console.error('❌ Error updating order:', err);
      if (axios.isAxiosError(err) && err.response) {
        alert(`Failed to update order: ${err.response.data?.message || 'Server error'}`);
      } else {
        alert(`Failed to update order: ${err.message}`);
      }
    }
  };

  /**
   * Edit Order Modal Component
   * This is nested for simplicity, but could be extracted to a separate file.
   */
  const EditOrderModal = ({ order, onClose, onSave, menuItems }) => {
    const [currentItems, setCurrentItems] = useState(order.items.filter(item => item.status !== 'cancelled'));
    const [selectedMenuItem, setSelectedMenuItem] = useState(null);
    const [newItemQuantity, setNewItemQuantity] = useState(1);
    const [newItemNotes, setNewItemNotes] = useState('');
    const [searchQuery, setSearchQuery] = useState(''); // New state for search input
    const [filteredMenuItems, setFilteredMenuItems] = useState([]); // New state for filtered suggestions

    const MINUTE_THRESHOLD = 5; // 5 minutes for removal grace period

    // Effect to filter menu items based on search query
    useEffect(() => {
      if (searchQuery.length > 0) {
        const lowerCaseQuery = searchQuery.toLowerCase();
        const filtered = menuItems.filter(item =>
          item.name.toLowerCase().includes(lowerCaseQuery)
        );
        setFilteredMenuItems(filtered);
      } else {
        setFilteredMenuItems([]); // Clear suggestions if search query is empty
      }
    }, [searchQuery, menuItems]);

    const handleQuantityChange = (index, delta) => {
      setCurrentItems(prevItems => {
        const newItems = [...prevItems];
        const item = newItems[index];
        const newQuantity = item.quantity + delta;

        if (newQuantity <= 0) {
          const addedAtDate = new Date(item.addedAt);
          const now = new Date();
          const minutesPassed = (now.getTime() - addedAtDate.getTime()) / (1000 * 60);

          if (minutesPassed > MINUTE_THRESHOLD) {
            alert(`Cannot fully remove "${item.name}". It was added more than ${MINUTE_THRESHOLD} minutes ago. It will be marked as cancelled on the bill.`);
            return newItems.filter((_, i) => i !== index);
          } else {
            return newItems.filter((_, i) => i !== index);
          }
        } else {
          newItems[index] = { ...item, quantity: newQuantity };
        }
        return newItems;
      });
    };

    const handleRemoveItem = (index, item) => {
        const addedAtDate = new Date(item.addedAt);
        const now = new Date();
        const minutesPassed = (now.getTime() - addedAtDate.getTime()) / (1000 * 60);

        if (minutesPassed > MINUTE_THRESHOLD) {
            alert(`Cannot fully remove "${item.name}". It was added more than ${MINUTE_THRESHOLD} minutes ago. It will be marked as cancelled on the bill if saved.`);
            setCurrentItems(prevItems => prevItems.filter((_, i) => i !== index));
        } else {
            setCurrentItems(prevItems => prevItems.filter((_, i) => i !== index));
        }
    };


    const handleAddItem = () => {
      if (selectedMenuItem && newItemQuantity > 0) {
        const newItem = {
          id: selectedMenuItem.id,
          name: selectedMenuItem.name,
          quantity: newItemQuantity,
          price: selectedMenuItem.price,
          notes: newItemNotes,
          addedAt: new Date().toISOString(),
          status: 'active',
        };
        setCurrentItems(prevItems => [...prevItems, newItem]);
        setSelectedMenuItem(null);
        setNewItemQuantity(1);
        setNewItemNotes('');
        setSearchQuery(''); // Clear search query after adding item
        setFilteredMenuItems([]); // Clear filtered suggestions
      } else {
        alert('Please select a menu item and specify a quantity greater than 0.');
      }
    };

    const isItemRemovable = (item) => {
        const addedAtDate = new Date(item.addedAt);
        const now = new Date();
        const minutesPassed = (now.getTime() - addedAtDate.getTime()) / (1000 * 60);
        return minutesPassed <= MINUTE_THRESHOLD;
    };

    const handleSave = () => {
      onSave(currentItems);
    };

    // Handler for selecting an item from the suggestions
    const handleSelectSuggestion = (item) => {
      setSelectedMenuItem(item);
      setSearchQuery(item.name); // Set input field to the selected item's name
      setFilteredMenuItems([]); // Clear suggestions
    };

    if (!order) return null;

    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <h3 className="text-2xl font-bold text-gray-800 mb-4">Edit Order #{order.id}</h3>

          {/* Current Items */}
          <div className="mb-6">
            <h4 className="font-semibold text-gray-700 mb-2">Current Items:</h4>
            {currentItems.length === 0 ? (
              <p className="text-gray-500 italic">No active items in this order.</p>
            ) : (
              <ul className="space-y-3">
                {currentItems.map((item, index) => (
                  <li key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded-md border border-gray-200">
                    <div>
                      <p className="font-medium text-gray-800">{item.name} (₹{item.price.toFixed(2)})</p>
                      <p className="text-sm text-gray-600">Quantity: {item.quantity}</p>
                      {item.notes && <p className="text-xs text-gray-500 italic">Notes: {item.notes}</p>}
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleQuantityChange(index, -1)}
                        className="p-1.5 rounded-full bg-red-100 text-red-600 hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={item.quantity === 1 && !isItemRemovable(item)}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4"></path></svg>
                      </button>
                      <span>{item.quantity}</span>
                      <button
                        onClick={() => handleQuantityChange(index, 1)}
                        className="p-1.5 rounded-full bg-green-100 text-green-600 hover:bg-green-200"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                      </button>
                      <button
                        onClick={() => handleRemoveItem(index, item)}
                        className={`p-1.5 rounded-md text-sm transition duration-150
                          ${isItemRemovable(item) ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-gray-300 text-gray-600 cursor-not-allowed'}
                        `}
                        disabled={!isItemRemovable(item)}
                        title={!isItemRemovable(item) ? `Cannot remove after ${MINUTE_THRESHOLD} minutes. It will be marked as cancelled on the bill.` : ''}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Add New Item with Search */}
          <div className="mb-6 p-4 border border-blue-200 rounded-md bg-blue-50 relative"> {/* Added relative for positioning suggestions */}
            <h4 className="font-semibold text-blue-700 mb-2">Add New Item:</h4>
            <div className="flex flex-col space-y-3">
              <input
                type="text"
                placeholder="Search menu item by name"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSelectedMenuItem(null); // Clear selected item if user types again
                }}
                className="p-2 border border-gray-300 rounded-md w-full focus:ring-blue-500 focus:border-blue-500"
              />
              {searchQuery.length > 0 && filteredMenuItems.length > 0 && (
                <ul className="absolute z-10 bg-white border border-gray-300 rounded-md w-full max-h-48 overflow-y-auto mt-1 top-full left-0 shadow-lg">
                  {filteredMenuItems.map(item => (
                    <li
                      key={item.id}
                      className="p-2 cursor-pointer hover:bg-gray-100 border-b border-gray-200 last:border-b-0"
                      onClick={() => handleSelectSuggestion(item)}
                    >
                      {item.name} (₹{item.price.toFixed(2)})
                    </li>
                  ))}
                </ul>
              )}
              {searchQuery.length > 0 && filteredMenuItems.length === 0 && (
                <p className="text-gray-500 text-sm mt-1">No matching items found.</p>
              )}

              {selectedMenuItem && (
                <p className="text-sm text-green-700 mt-2">Selected: <strong>{selectedMenuItem.name}</strong></p>
              )}

              <input
                type="number"
                placeholder="Quantity"
                value={newItemQuantity}
                onChange={(e) => setNewItemQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="p-2 border border-gray-300 rounded-md w-full focus:ring-blue-500 focus:border-blue-500"
                min="1"
              />
              <input
                type="text"
                placeholder="Notes (optional)"
                value={newItemNotes}
                onChange={(e) => setNewItemNotes(e.target.value)}
                className="p-2 border border-gray-300 rounded-md w-full focus:ring-blue-500 focus:border-blue-500"
              />
              <button
                onClick={handleAddItem}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!selectedMenuItem || newItemQuantity <= 0}
              >
                Add Item
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 mt-6">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400 transition duration-200"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition duration-200"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    );
  };


  return (
    <div className="p-6 max-w-5xl mx-auto font-sans">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">📜 Order History</h2>
      <div className="space-y-4">
        {orders.length === 0 ? (
          <div className="bg-white p-4 rounded-lg shadow-sm text-center text-gray-500 italic">No orders placed yet.</div>
        ) : (
          orders
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .map((order) => {
              const isPrintEnabled = order.status === 'served' || order.status === 'completed';
              const isEditEnabled = order.status === 'pending' || order.status === 'preparing';

              const activeItemsTotal = order.items.filter(item => item.status !== 'cancelled').reduce((sum, item) => sum + (item.price * item.quantity), 0);
              const gstAmountDisplay = (activeItemsTotal * (order.gstPercentage || 0)) / 100;
              const finalTotalDisplay = activeItemsTotal + gstAmountDisplay;


              return (
                <div key={order.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition duration-200">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-bold text-gray-900 text-lg">Order #{order.id}</span>
                    <span className="text-sm text-gray-600">{new Date(order.createdAt).toLocaleString()}</span>
                  </div>
                  <div className="text-gray-700 mb-1">Platform: <strong className="capitalize">{order.platform}</strong></div>
                  {order.tableNo && <div className="text-gray-700 mb-1">Table: <strong>{order.tableNo}</strong></div>}
                  {order.token && <div className="text-gray-700 mb-1">Token: <strong>{order.token}</strong></div>}
                  <div className="text-gray-700 mb-2">Status: <span className={`capitalize font-semibold ${order.status === 'pending' ? 'text-yellow-600' : order.status === 'preparing' ? 'text-blue-600' : order.status === 'served' || order.status === 'completed' ? 'text-green-600' : 'text-gray-600'}`}>{order.status}</span></div>

                  <div className="mt-3">
                    <h4 className="font-semibold text-gray-800 mb-1">Items:</h4>
                    <ul className="list-disc list-inside text-gray-700">
                      {order.items.map((item, index) => (
                        <li key={index} className={item.status === 'cancelled' ? 'line-through text-gray-500' : ''}>
                          {item.name} × {item.quantity} (₹{item.price.toFixed(2)} each)
                          {item.notes && <span className="text-xs italic ml-1">({item.notes})</span>}
                          {item.status === 'cancelled' && <span className="text-xs font-semibold ml-1 text-red-500">(Cancelled)</span>}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-3 pt-3 border-t border-gray-200 flex justify-between items-center">
                    <div className="font-bold text-xl text-gray-900">
                      Total: ₹{finalTotalDisplay.toFixed(2)}
                    </div>
                    <div className="flex space-x-2">
                      {/* Edit Order Button */}
                      <button
                        onClick={() => handleEditOrder(order)}
                        className={`
                          px-4 py-2 rounded-md font-medium text-white transition duration-200
                          ${isEditEnabled ? 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2' : 'bg-gray-400 cursor-not-allowed'}
                        `}
                        disabled={!isEditEnabled}
                        title={!isEditEnabled ? "Only pending or preparing orders can be edited." : "Edit this order"}
                      >
                        <svg className="w-5 h-5 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                        Edit
                      </button>

                      {/* Print Bill Button */}
                      <button
                        onClick={() => handlePrintBill(order.id)}
                        className={`
                          px-4 py-2 rounded-md font-medium text-white transition duration-200
                          ${!isPrintEnabled || downloadingOrderId === order.id ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2'}
                        `}
                        disabled={!isPrintEnabled || downloadingOrderId === order.id}
                        title={!isPrintEnabled ? "Only served or completed orders can be printed." : "Print Bill"}
                      >
                        {downloadingOrderId === order.id ? (
                          <>
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Downloading...
                          </>
                        ) : (
                          <>
                            <svg className="w-5 h-5 inline-block mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v2"></path></svg>
                            Print Bill
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
        )}
      </div>

      {/* Edit Order Modal */}
      {isEditModalOpen && selectedOrder && (
        <EditOrderModal
          order={selectedOrder}
          onClose={() => setIsEditModalOpen(false)}
          onSave={handleSaveChanges}
          menuItems={menuItems}
        />
      )}
    </div>
  );
};

export default OrderHistory;
