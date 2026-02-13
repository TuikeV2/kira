export default function PageHeader({ title, subtitle, icon: Icon, iconColor = 'text-primary-500', actions, avatar, children }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
      <div className="flex items-center gap-4">
        {avatar && (
          <div className="relative flex-shrink-0">
            <img
              src={avatar.src}
              alt={avatar.alt || title}
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl border-4 border-white dark:border-dark-700 shadow-lg object-cover"
            />
            {avatar.badge && (
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 border-2 border-white dark:border-dark-800 rounded-full"></div>
            )}
          </div>
        )}
        {Icon && !avatar && (
          <div className={`p-3 rounded-xl ${iconColor.replace('text-', 'bg-').replace(/\d+/, '100')} dark:bg-opacity-20`}>
            <Icon className={`w-6 h-6 ${iconColor}`} />
          </div>
        )}
        <div>
          <h1 className="page-title flex items-center gap-3">
            {title}
          </h1>
          {subtitle && (
            <p className="page-subtitle">{subtitle}</p>
          )}
          {children}
        </div>
      </div>
      {actions && (
        <div className="flex items-center gap-3 flex-shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}
