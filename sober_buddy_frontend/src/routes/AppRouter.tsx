import React, { useEffect } from 'react';
import { useAuth } from '../shared/context/AuthContext';
import { useRouter } from '../shared/context/RouterContext';
import { LandingPage } from '../features/landing/pages/LandingPage';
import { AuthPage } from '../features/auth/pages/AuthPage';
import { OnboardingPage } from '../features/onboarding/pages/OnboardingPage';
import { DashboardPage } from '../features/dashboard/pages/DashboardPage';
import './AppRouter.css';

export const AppRouter: React.FC = () => {
  const { user, userDoc, loading } = useAuth();
  const { currentRoute, navigate } = useRouter();

  useEffect(() => {
    if (!loading) {
      if (user) {
        if (userDoc) {
          if (!userDoc.onboardingComplete) {
            navigate('onboarding');
          } else {
            navigate('dashboard');
          }
        }
      } else {
        if (currentRoute !== 'landing' && currentRoute !== 'auth') {
          navigate('landing');
        }
      }
    }
  }, [user, userDoc, loading, currentRoute, navigate]);

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p className="loading-text">Loading SoberBuddy...</p>
      </div>
    );
  }

  switch (currentRoute) {
    case 'auth':
      return <AuthPage />;
    case 'onboarding':
      return <OnboardingPage />;
    case 'dashboard':
      return <DashboardPage />;
    case 'landing':
    default:
      return <LandingPage />;
  }
};
export default AppRouter;
