import React from 'react';
import './Chip.css';

export const Chip = ({ className = '', children, ...props }) => {
  return (
    <span className={`chip ${className}`} {...props}>
      {children}
    </span>
  );
};
