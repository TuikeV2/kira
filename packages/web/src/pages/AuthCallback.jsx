import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();
  const [status, setStatus] = useState('Weryfikacja...');
  const [isAppLogin, setIsAppLogin] = useState(false);

  useEffect(() => {
    const token = searchParams.get('token');
    const error = searchParams.get('error');
    const state = searchParams.get('state') || '';
    const isApp = searchParams.get('app') === '1' || state === 'app' || state.startsWith('app_');

    // Logowanie z aplikacji mobilnej — token jest w API, nie w URL
    if (isApp) {
      setIsAppLogin(true);
      setStatus('Logowanie zakończone!');

      // Próbuj deep link (może zadziała na niektórych urządzeniach)
      if (token) {
        window.location.href = `kira://auth/callback?token=${token}`;
      }
      return;
    }

    // Logowanie z przeglądarki web — standardowy flow
    if (token) {
      login(token)
        .then(() => {
          navigate('/dashboard');
        })
        .catch(() => {
          navigate('/login');
        });
    } else if (error) {
      navigate('/login?error=' + error);
    } else {
      navigate('/login');
    }
  }, [searchParams, login, navigate]);

  if (isAppLogin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white flex-col gap-6 px-6">
        <div className="text-4xl">✓</div>
        <div className="text-xl font-semibold text-center">{status}</div>
        <p className="text-gray-400 text-sm text-center">
          Zamknij tę kartę i wróć do aplikacji KiraEvo.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white flex-col gap-4">
      <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      <div className="text-xl font-semibold">{status}</div>
    </div>
  );
}
