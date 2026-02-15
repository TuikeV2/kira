import { useState, useEffect } from 'react';
import Sidebar from './layout/Sidebar';
import Navbar from './layout/Navbar';
import { AnimatedPage } from './animated';
import OnboardingTour from './OnboardingTour';

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(() => {
    const saved = localStorage.getItem('sidebar_expanded');
    return saved !== null ? JSON.parse(saved) : true;
  });

  useEffect(() => {
    localStorage.setItem('sidebar_expanded', JSON.stringify(sidebarExpanded));
  }, [sidebarExpanded]);

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-dark-950 transition-colors duration-200">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        expanded={sidebarExpanded}
        onToggleExpand={() => setSidebarExpanded(!sidebarExpanded)}
      />

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Navbar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-20 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary-600 focus:text-white focus:rounded-lg">
          Skip to content
        </a>
        <main id="main-content" className="flex-1 overflow-x-hidden overflow-y-auto p-4 md:p-6 scrollbar-thin">
          <div className="max-w-7xl mx-auto">
            <AnimatedPage>
              {children}
            </AnimatedPage>
          </div>
        </main>
      </div>
      <OnboardingTour />
    </div>
  );
}