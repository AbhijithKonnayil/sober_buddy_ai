import React from 'react';
import './Card.css';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  glass?: boolean;
  hoverable?: boolean;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  glass = true,
  hoverable = true,
  onClick,
}) => {
  const cardClass = `sb-card ${glass ? 'sb-card-glass' : 'sb-card-standard'} ${
    hoverable ? 'sb-card-hoverable' : ''
  } ${className}`;

  return (
    <div className={cardClass} onClick={onClick}>
      {children}
    </div>
  );
};
