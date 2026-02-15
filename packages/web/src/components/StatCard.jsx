import { FaArrowUp, FaArrowDown } from 'react-icons/fa';
import { GlassCard } from './ui/GlassCard';
import { cn } from '../lib/utils';

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
    blue: 'bg-blue-500/15 text-blue-400 ring-1 ring-blue-500/20',
    green: 'bg-green-500/15 text-green-400 ring-1 ring-green-500/20',
    yellow: 'bg-yellow-500/15 text-yellow-400 ring-1 ring-yellow-500/20',
    purple: 'bg-purple-500/15 text-purple-400 ring-1 ring-purple-500/20',
    red: 'bg-red-500/15 text-red-400 ring-1 ring-red-500/20',
    pink: 'bg-pink-500/15 text-pink-400 ring-1 ring-pink-500/20',
  };

  const colors = colorClasses[color] || colorClasses.blue;

  return (
    <GlassCard className="p-5 group">
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
                <FaArrowUp className="w-3 h-3 text-green-400" />
              ) : (
                <FaArrowDown className="w-3 h-3 text-red-400" />
              )}
              <span className={cn(
                'text-xs font-medium',
                trend === 'up' ? 'text-green-400' : 'text-red-400'
              )}>
                {trendValue}
              </span>
              <span className="text-xs text-gray-500">vs last week</span>
            </div>
          )}
        </div>
        {Icon && (
          <div className={cn('p-3 rounded-xl group-hover:scale-110 transition-transform duration-300', colors)}>
            <Icon className="w-6 h-6" />
          </div>
        )}
      </div>
    </GlassCard>
  );
}
