import React from 'react';
import './Button.css';

export const Button = ({ variant = 'primary', className = '', children, ...props }) => {
  return (
    <button className={`btn btn-${variant} ${className}`} {...props}>
      {children}
    </button>
  );
};
