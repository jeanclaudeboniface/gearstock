import React, { useEffect } from 'react';

export default function Toast({ message, type = 'info', onClose }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColor = {
    info: 'bg-blue-500',
    success: 'bg-green-500',
    error: 'bg-red-500',
    warning: 'bg-yellow-500',
  }[type] || 'bg-blue-500';

  return (
    <div className={`fixed bottom-4 right-4 px-4 py-2 rounded text-white shadow-lg ${bgColor}`}>
      {message}
    </div>
  );
}
