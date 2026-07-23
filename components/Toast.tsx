import React from 'react';

type ToastProps = {
  message: string;
  type?: 'info' | 'success' | 'error';
};

export default function Toast({ message, type = 'info' }: ToastProps) {
  const styles = {
    info: 'bg-gray-900 text-white',
    success: 'bg-green-600 text-white',
    error: 'bg-red-600 text-white',
  };

  return <div className={`rounded-lg px-4 py-3 text-sm shadow-lg ${styles[type]}`}>{message}</div>;
}
