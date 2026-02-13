import { Link, useLocation } from 'react-router-dom';
import { FaHome, FaChevronRight } from 'react-icons/fa';

const routeLabels = {
  '': 'Dashboard',
  'servers': 'Serwery',
  'licenses': 'Licencje',
  'moderation': 'Logi Moderacji',
  'activate': 'Aktywuj Licencje',
  'buy': 'Kup Licencje',
};

export default function Breadcrumbs({ items, className = '' }) {
  const location = useLocation();

  // Auto-generate items from location if not provided
  const breadcrumbItems = items || generateFromPath(location.pathname);

  if (breadcrumbItems.length <= 1) return null;

  return (
    <nav className={`flex items-center gap-2 text-sm ${className}`}>
      {breadcrumbItems.map((item, index) => {
        const isLast = index === breadcrumbItems.length - 1;

        return (
          <div key={item.path || index} className="flex items-center gap-2">
            {index === 0 ? (
              <Link
                to={item.path}
                className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
              >
                <FaHome className="w-4 h-4" />
                <span className="hidden sm:inline">{item.label}</span>
              </Link>
            ) : (
              <>
                <FaChevronRight className="w-3 h-3 text-gray-300 dark:text-gray-600" />
                {isLast ? (
                  <span className="text-gray-900 dark:text-white font-medium">
                    {item.label}
                  </span>
                ) : (
                  <Link
                    to={item.path}
                    className="text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                  >
                    {item.label}
                  </Link>
                )}
              </>
            )}
          </div>
        );
      })}
    </nav>
  );
}

function generateFromPath(pathname) {
  const segments = pathname.split('/').filter(Boolean);
  const items = [{ path: '/', label: 'Dashboard' }];

  let currentPath = '';
  segments.forEach((segment) => {
    currentPath += `/${segment}`;
    const label = routeLabels[segment] || segment;
    items.push({ path: currentPath, label });
  });

  return items;
}
