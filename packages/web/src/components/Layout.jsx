import { useState } from 'react';
import UnifiedSidebar from './layout/UnifiedSidebar';
import Navbar from './Navbar';
import { Breadcrumbs } from './ui';
import { AnimatedPage } from './animated';

export default function Layout({ children, variant = 'user' }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-dark-900 transition-colors duration-200">
      <UnifiedSidebar
        variant={variant}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 dark:bg-black/70 z-20 md:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-20 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary-600 focus:text-white focus:rounded-lg">
          Skip to content
        </a>
        <main id="main-content" className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 dark:bg-dark-900 p-4 md:p-6 scrollbar-thin transition-colors duration-200">
          <div className="max-w-7xl mx-auto">
            <Breadcrumbs className="mb-4" />
            <AnimatedPage>
              {children}
            </AnimatedPage>
          </div>
        </main>
      </div>
    </div>
  );
}
