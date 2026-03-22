import React from 'react';

export function Logo({ className = "h-8" }: { className?: string }) {
  return (
    <img 
      src="/logo.png" 
      alt="LOGup Logo" 
      className={`object-contain ${className}`}
    />
  );
}
