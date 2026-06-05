import React from 'react';
import './Skeleton.css';

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  circle?: boolean;
  className?: string;
  animation?: 'pulse' | 'wave' | 'none';
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = '20px',
  circle = false,
  className = '',
  animation = 'pulse',
}) => {
  const style: React.CSSProperties = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
    borderRadius: circle ? '50%' : '4px',
  };

  return (
    <div
      className={`skeleton skeleton-${animation} ${className}`}
      style={style}
    />
  );
};

// Pre-built skeleton layouts
export const SkeletonTable: React.FC<{ rows?: number; columns?: number }> = ({
  rows = 5,
  columns = 4,
}) => {
  return (
    <div className="skeleton-table">
      <div className="skeleton-header">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} width="100%" height="40px" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="skeleton-row">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton key={colIndex} width="100%" height="60px" />
          ))}
        </div>
      ))}
    </div>
  );
};

export const SkeletonCard: React.FC = () => {
  return (
    <div className="skeleton-card">
      <Skeleton width="100%" height="200px" />
      <div className="skeleton-card-content">
        <Skeleton width="70%" height="24px" />
        <Skeleton width="100%" height="16px" />
        <Skeleton width="90%" height="16px" />
        <Skeleton width="40%" height="16px" />
      </div>
    </div>
  );
};

export const SkeletonDashboard: React.FC = () => {
  return (
    <div className="skeleton-dashboard">
      <Skeleton width="200px" height="40px" />
      <div className="skeleton-stats">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} width="100%" height="100px" />
        ))}
      </div>
      <Skeleton width="150px" height="30px" />
      <div className="skeleton-actions">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} width="100%" height="120px" />
        ))}
      </div>
    </div>
  );
};

export default Skeleton;
