const variantClasses = {
  text: 'h-4 rounded',
  circle: 'rounded-full',
  card: 'h-32 rounded-xl',
  'table-row': 'h-12 rounded-lg',
  button: 'h-10 rounded-lg',
  avatar: 'w-10 h-10 rounded-full',
};

export default function Skeleton({
  variant = 'text',
  width,
  height,
  count = 1,
  className = '',
}) {
  const baseClasses = variantClasses[variant] || variantClasses.text;

  const style = {};
  if (width) style.width = typeof width === 'number' ? `${width}px` : width;
  if (height) style.height = typeof height === 'number' ? `${height}px` : height;

  const items = Array.from({ length: count }, (_, i) => i);

  return (
    <>
      {items.map((i) => (
        <div
          key={i}
          className={`
            animate-pulse bg-gray-200 dark:bg-dark-700
            ${baseClasses}
            ${className}
          `}
          style={style}
        />
      ))}
    </>
  );
}

// Preset skeleton layouts
export function SkeletonCard() {
  return (
    <div className="card p-4 space-y-4">
      <div className="flex items-center gap-4">
        <Skeleton variant="avatar" />
        <div className="flex-1 space-y-2">
          <Skeleton width="60%" />
          <Skeleton width="40%" />
        </div>
      </div>
      <Skeleton variant="card" height={80} />
    </div>
  );
}

export function SkeletonTable({ rows = 5 }) {
  return (
    <div className="space-y-2">
      <Skeleton variant="table-row" className="opacity-70" />
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} variant="table-row" />
      ))}
    </div>
  );
}

export function SkeletonStats() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="card p-6 space-y-3">
          <Skeleton width={100} />
          <Skeleton width="60%" height={32} />
        </div>
      ))}
    </div>
  );
}
