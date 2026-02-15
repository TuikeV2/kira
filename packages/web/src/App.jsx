import React, { Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastProvider, useToast } from './contexts/ToastContext';
import { LanguageProvider } from './contexts/LanguageContext';
import Layout from './components/Layout';
import { AdminRoute } from './components/admin';
import { ErrorBoundary } from './components/ui';
import OfflineIndicator from './components/OfflineIndicator';

import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { versionService, authService } from './services/api.service';

const Landing = React.lazy(() => import('./pages/Landing'));
const Login = React.lazy(() => import('./pages/Login'));
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const Licenses = React.lazy(() => import('./pages/Licenses'));
const ModerationLogs = React.lazy(() => import('./pages/ModerationLogs'));
const Servers = React.lazy(() => import('./pages/Servers'));
const ServerDashboard = React.lazy(() => import('./pages/ServerDashboard'));
const ModuleConfigPage = React.lazy(() => import('./pages/ModuleConfigPage'));
const ActivateLicense = React.lazy(() => import('./pages/ActivateLicense'));
const BuyLicense = React.lazy(() => import('./pages/BuyLicense'));
const PromoCodes = React.lazy(() => import('./pages/PromoCodes'));
const MyLicenses = React.lazy(() => import('./pages/MyLicenses'));
const AuthCallback = React.lazy(() => import('./pages/AuthCallback'));
const TermsOfService = React.lazy(() => import('./pages/TermsOfService'));
const PrivacyPolicy = React.lazy(() => import('./pages/PrivacyPolicy'));
const Account = React.lazy(() => import('./pages/Account'));
const Notifications = React.lazy(() => import('./pages/Notifications'));
const HelpCenter = React.lazy(() => import('./pages/HelpCenter'));
const AdminServers = React.lazy(() => import('./pages/admin/AdminServers'));
const AdminProducts = React.lazy(() => import('./pages/admin/AdminProducts'));
const AdminDashboard = React.lazy(() => import('./pages/admin/AdminDashboard'));
const AdminUsers = React.lazy(() => import('./pages/admin/AdminUsers'));
const AdminStats = React.lazy(() => import('./pages/admin/AdminStats'));
const DownloadApp = React.lazy(() => import('./pages/DownloadApp'));
const NotFound = React.lazy(() => import('./pages/NotFound'));

function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-dark-950">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
        <div className="text-lg text-gray-600 dark:text-gray-300">Loading...</div>
      </div>
    </div>
  );
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingFallback />;
  if (!user) return <Navigate to="/login" replace />;
  return <Layout>{children}</Layout>;
}

function AppRoutes() {
  const location = useLocation();
  const navigate = useNavigate();
  const { login } = useAuth();
  const toast = useToast();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const checkVersion = async () => {
      try {
        const appInfo = await CapacitorApp.getInfo();
        const { data } = await versionService.getLatest();

        if (appInfo.version !== data.version) {
          toast.warning(
            `Dostępna nowa wersja aplikacji (${data.version}). Pobierz aktualizację w zakładce Pobierz.`
          );
        }
      } catch {}
    };

    checkVersion();
  }, []);

  // Logowanie z app: po powrocie do foreground pobierz token z API
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const tryFetchToken = async () => {
      const sessionId = localStorage.getItem('app_auth_session');
      if (!sessionId) return;

      try {
        const res = await authService.getAppToken(sessionId);
        if (res.data?.data?.token) {
          localStorage.removeItem('app_auth_session');
          try { await Browser.close(); } catch (e) {}
          await login(res.data.data.token);
          navigate('/dashboard');
        }
      } catch (e) {
        // Token jeszcze nie gotowy — spróbuj ponownie za chwilę
        setTimeout(tryFetchToken, 1500);
      }
    };

    // Przy powrocie do foreground — sprawdź token
    const stateListener = CapacitorApp.addListener('appStateChange', (state) => {
      if (state.isActive) tryFetchToken();
    });

    // Po kliknięciu "Zaloguj" w Login.jsx
    const onAuthStart = () => {
      // Daj chwilę na OAuth, potem zacznij sprawdzać
      setTimeout(tryFetchToken, 3000);
    };
    window.addEventListener('app-auth-start', onAuthStart);

    // Na starcie — jeśli sesja istnieje (np. app wrócił z tła)
    tryFetchToken();

    // Deep link fallback
    const urlListener = CapacitorApp.addListener('appUrlOpen', async (data) => {
      try { await Browser.close(); } catch (e) {}
      if (!data.url || !data.url.includes('kira://')) return;
      try {
        const afterScheme = data.url.split('kira://')[1] || '';
        const slug = afterScheme.split('?')[0];
        if (slug) navigate(`/${slug}`);
      } catch (e) {}
    });

    return () => {
      window.removeEventListener('app-auth-start', onAuthStart);
      stateListener.then(h => h.remove());
      urlListener.then(h => h.remove());
    };
  }, [navigate, login]);

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/terms" element={<TermsOfService />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/moderation" element={<ProtectedRoute><ModerationLogs /></ProtectedRoute>} />
        <Route path="/servers" element={<ProtectedRoute><Servers /></ProtectedRoute>} />
        <Route path="/servers/:guildId" element={<ProtectedRoute><ServerDashboard /></ProtectedRoute>} />
        <Route path="/servers/:guildId/:module" element={<ProtectedRoute><ModuleConfigPage /></ProtectedRoute>} />
        <Route path="/activate" element={<ProtectedRoute><ActivateLicense /></ProtectedRoute>} />
        <Route path="/buy" element={<ProtectedRoute><BuyLicense /></ProtectedRoute>} />
        <Route path="/my-licenses" element={<ProtectedRoute><MyLicenses /></ProtectedRoute>} />
        <Route path="/account" element={<ProtectedRoute><Account /></ProtectedRoute>} />
        <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
        <Route path="/help" element={<ProtectedRoute><HelpCenter /></ProtectedRoute>} />
        <Route path="/download" element={<ProtectedRoute><DownloadApp /></ProtectedRoute>} />
        <Route path="/admin/licenses" element={<AdminRoute><Licenses /></AdminRoute>} />
        <Route path="/admin/promo-codes" element={<AdminRoute><PromoCodes /></AdminRoute>} />
        <Route path="/admin/servers" element={<AdminRoute><AdminServers /></AdminRoute>} />
        <Route path="/admin/products" element={<AdminRoute><AdminProducts /></AdminRoute>} />
        <Route path="/admin/dashboard" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
        <Route path="/admin/users" element={<AdminRoute><AdminUsers /></AdminRoute>} />
        <Route path="/admin/stats" element={<AdminRoute><AdminStats /></AdminRoute>} />
        <Route path="*" element={<NotFound />} />
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
                <OfflineIndicator />
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