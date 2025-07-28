import React from 'react';

export const TestComponent = () => {
  return (
    <div 
      style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        backgroundColor: '#ff0000',
        color: 'white',
        padding: '20px',
        borderRadius: '10px',
        border: '3px solid yellow',
        fontSize: '18px',
        fontWeight: 'bold',
        zIndex: 9999,
        boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
        animation: 'pulse 2s infinite'
      }}
    >
      🚨 TEST COMPONENT 🚨
      <br />
      If you can see this, your changes are working!
      <br />
      <small>Easy to remove later</small>
    </div>
  );
}; 