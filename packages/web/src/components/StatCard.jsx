import { FaArrowUp, FaArrowDown } from 'react-icons/fa';

export default function StatCard({
  title,
  value,
  icon: Icon,
  color = 'blue',
  trend,
  trendValue,
  subtitle
}) {
  const colorClasses = {
    blue: {
      bg: 'bg-primary-500',
      bgLight: 'bg-primary-50 dark:bg-primary-900/20',
      text: 'text-primary-600 dark:text-primary-400',
      border: 'border-primary-100 dark:border-primary-800/30'
    },
    green: {
      bg: 'bg-green-500',
      bgLight: 'bg-green-50 dark:bg-green-900/20',
      text: 'text-green-600 dark:text-green-400',
      border: 'border-green-100 dark:border-green-800/30'
    },
    yellow: {
      bg: 'bg-amber-500',
      bgLight: 'bg-amber-50 dark:bg-amber-900/20',
      text: 'text-amber-600 dark:text-amber-400',
      border: 'border-amber-100 dark:border-amber-800/30'
    },
    purple: {
      bg: 'bg-purple-500',
      bgLight: 'bg-purple-50 dark:bg-purple-900/20',
      text: 'text-purple-600 dark:text-purple-400',
      border: 'border-purple-100 dark:border-purple-800/30'
    },
    red: {
      bg: 'bg-red-500',
      bgLight: 'bg-red-50 dark:bg-red-900/20',
      text: 'text-red-600 dark:text-red-400',
      border: 'border-red-100 dark:border-red-800/30'
    },
    pink: {
      bg: 'bg-pink-500',
      bgLight: 'bg-pink-50 dark:bg-pink-900/20',
      text: 'text-pink-600 dark:text-pink-400',
      border: 'border-pink-100 dark:border-pink-800/30'
    }
  };

  const colors = colorClasses[color] || colorClasses.blue;

  return (
    <div className="card p-5 hover:shadow-soft-lg dark:hover:shadow-dark-lg transition-all duration-300 group">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
            {title}
          </p>
          <p className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
          {subtitle && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              {subtitle}
            </p>
          )}
          {trend && (
            <div className="flex items-center gap-1 mt-2">
              {trend === 'up' ? (
                <FaArrowUp className="w-3 h-3 text-green-500" />
              ) : (
                <FaArrowDown className="w-3 h-3 text-red-500" />
              )}
              <span className={`text-xs font-medium ${trend === 'up' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {trendValue}
              </span>
              <span className="text-xs text-gray-400 dark:text-gray-500">vs last week</span>
            </div>
          )}
        </div>
        {Icon && (
          <div className={`${colors.bgLight} ${colors.border} border p-3 rounded-xl group-hover:scale-110 transition-transform duration-300`}>
            <Icon className={`w-6 h-6 ${colors.text}`} />
          </div>
        )}
      </div>
    </div>
  );
}
