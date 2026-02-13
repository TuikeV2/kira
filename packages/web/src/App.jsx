import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastProvider } from './contexts/ToastContext';
import { LanguageProvider } from './contexts/LanguageContext';
import Layout from './components/Layout';
import { AdminRoute } from './components/admin';
import { ErrorBoundary } from './components/ui';

// Lazy-loaded pages
const Login = React.lazy(() => import('./pages/Login'));
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const Licenses = React.lazy(() => import('./pages/Licenses'));
const ModerationLogs = React.lazy(() => import('./pages/ModerationLogs'));
const Servers = React.lazy(() => import('./pages/Servers'));
const ServerDashboard = React.lazy(() => import('./pages/ServerDashboard'));
const ActivateLicense = React.lazy(() => import('./pages/ActivateLicense'));
const BuyLicense = React.lazy(() => import('./pages/BuyLicense'));
const PromoCodes = React.lazy(() => import('./pages/PromoCodes'));
const MyLicenses = React.lazy(() => import('./pages/MyLicenses'));
const AuthCallback = React.lazy(() => import('./pages/AuthCallback'));
const TermsOfService = React.lazy(() => import('./pages/TermsOfService'));
const PrivacyPolicy = React.lazy(() => import('./pages/PrivacyPolicy'));
const Account = React.lazy(() => import('./pages/Account'));
const AdminServers = React.lazy(() => import('./pages/admin/AdminServers'));
const AdminProducts = React.lazy(() => import('./pages/admin/AdminProducts'));
const AdminDashboard = React.lazy(() => import('./pages/admin/AdminDashboard'));
const AdminUsers = React.lazy(() => import('./pages/admin/AdminUsers'));
const AdminStats = React.lazy(() => import('./pages/admin/AdminStats'));

function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-dark-900">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
        <div className="text-lg text-gray-600 dark:text-gray-300">Loading...</div>
      </div>
    </div>
  );
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingFallback />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Layout>{children}</Layout>;
}

function AppRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/login" element={<Login />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/terms" element={<TermsOfService />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/moderation" element={<ProtectedRoute><ModerationLogs /></ProtectedRoute>} />
        <Route path="/servers" element={<ProtectedRoute><Servers /></ProtectedRoute>} />
        <Route path="/servers/:guildId" element={<ProtectedRoute><ServerDashboard /></ProtectedRoute>} />
        <Route path="/activate" element={<ProtectedRoute><ActivateLicense /></ProtectedRoute>} />
        <Route path="/buy" element={<ProtectedRoute><BuyLicense /></ProtectedRoute>} />
        <Route path="/my-licenses" element={<ProtectedRoute><MyLicenses /></ProtectedRoute>} />
        <Route path="/account" element={<ProtectedRoute><Account /></ProtectedRoute>} />
        <Route path="/admin/licenses" element={<AdminRoute><Licenses /></AdminRoute>} />
        <Route path="/admin/promo-codes" element={<AdminRoute><PromoCodes /></AdminRoute>} />
        <Route path="/admin/servers" element={<AdminRoute><AdminServers /></AdminRoute>} />
        <Route path="/admin/products" element={<AdminRoute><AdminProducts /></AdminRoute>} />
        <Route path="/admin/dashboard" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
        <Route path="/admin/users" element={<AdminRoute><AdminUsers /></AdminRoute>} />
        <Route path="/admin/stats" element={<AdminRoute><AdminStats /></AdminRoute>} />
      </Routes>
    </AnimatePresence>
  );
}

function App() {
  return (
    <LanguageProvider>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <BrowserRouter>
              <ErrorBoundary>
                <Suspense fallback={<LoadingFallback />}>
                  <AppRoutes />
                </Suspense>
              </ErrorBoundary>
            </BrowserRouter>
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </LanguageProvider>
  );
}

export default App;
