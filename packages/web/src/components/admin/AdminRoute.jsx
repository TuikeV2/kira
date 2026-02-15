import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Layout from '../Layout';

export default function AdminRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-dark-950">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
          <div className="text-lg text-gray-600 dark:text-gray-300">Loading...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== 'ADMIN') {
    return <Navigate to="/servers" replace />;
  }

  return <Layout variant="admin">{children}</Layout>;
}
