import React, { createContext, useState } from 'react';

export const OrderRefreshContext = createContext(null);

export const OrderRefreshProvider = ({ children }) => {
  const [refreshCounter, setRefreshCounter] = useState(0);

  const triggerRefresh = () => {
    setRefreshCounter(prev => prev + 1);
  };

  return (
    <OrderRefreshContext.Provider value={{ refreshCounter, triggerRefresh }}>
      {children}
    </OrderRefreshContext.Provider>
  );
};
