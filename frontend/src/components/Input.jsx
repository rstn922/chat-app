import React, { forwardRef } from 'react';
import './Input.css';

export const Input = forwardRef(({ className = '', ...props }, ref) => {
  return (
    <input className={`input ${className}`} ref={ref} {...props} />
  );
});
