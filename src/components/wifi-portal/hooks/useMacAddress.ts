
import { useState, useEffect } from 'react';

export const useMacAddress = () => {
  const [macAddress, setMacAddress] = useState<string | null>(null);
  
  useEffect(() => {
    // Get the simulated MAC address from localStorage
    const simulatedMac = localStorage.getItem('simulated_mac_address');
    if (!simulatedMac) {
      // Generate a simulated MAC for testing
      const randomMac = Array.from({length: 6}, () => 
        Math.floor(Math.random() * 256).toString(16).padStart(2, '0')
      ).join(':');
      
      localStorage.setItem('simulated_mac_address', randomMac);
      setMacAddress(randomMac);
    } else {
      setMacAddress(simulatedMac);
    }
  }, []);

  const handleReset = () => {
    // For demo purposes - reset the MAC address to simulate a new device
    localStorage.removeItem('simulated_mac_address');
    window.location.reload();
  };

  return {
    macAddress,
    handleReset
  };
};
