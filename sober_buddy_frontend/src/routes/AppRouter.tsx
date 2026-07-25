import React, { useEffect } from 'react';
import { useAuth } from '../shared/context/AuthContext';
import { useRouter } from '../shared/context/RouterContext';
import { useTranslation } from '../shared/hooks/useTranslation';
import { LandingPage } from '../features/landing/pages/LandingPage';
import { AuthPage } from '../features/auth/pages/AuthPage';
import { OnboardingPage } from '../features/onboarding/pages/OnboardingPage';
import { DashboardPage } from '../features/dashboard/pages/DashboardPage';
import { EducationPage } from '../features/education/pages/EducationPage';
import './AppRouter.css';

const PROTECTED_ROUTES = ['dashboard', 'education'] as const;

export const AppRouter: React.FC = () => {
  const { user, userDoc, loading } = useAuth();
  const { currentRoute, navigate } = useRouter();
  const { t } = useTranslation();

  useEffect(() => {
    if (loading) {
      return;
    }

    if (!user) {
      if (currentRoute !== 'landing' && currentRoute !== 'auth') {
        navigate('landing');
      }
      return;
    }

    if (!userDoc) {
      return;
    }

    if (!userDoc.onboardingComplete) {
      if (currentRoute !== 'onboarding') {
        navigate('onboarding');
      }
      return;
    }

    if (currentRoute === 'landing' || currentRoute === 'auth' || currentRoute === 'onboarding') {
      navigate('dashboard');
    }
  }, [user, userDoc, loading, currentRoute, navigate]);

  if (loading) {
    return (
      <div className="loading-screen" aria-busy="true" aria-live="polite">
        <div className="spinner" aria-hidden="true"></div>
        <p className="loading-text">{t('app_loading')}</p>
      </div>
    );
  }

  if (user && userDoc?.onboardingComplete && PROTECTED_ROUTES.includes(currentRoute as typeof PROTECTED_ROUTES[number])) {
    switch (currentRoute) {
      case 'education':
        return <EducationPage />;
      case 'dashboard':
        return <DashboardPage />;
    }
  }

  switch (currentRoute) {
    case 'auth':
      return <AuthPage />;
    case 'onboarding':
      return user ? <OnboardingPage /> : <LandingPage />;
    case 'dashboard':
      return user && userDoc?.onboardingComplete ? <DashboardPage /> : <LandingPage />;
    case 'education':
      return user && userDoc?.onboardingComplete ? <EducationPage /> : <LandingPage />;
    case 'landing':
    default:
      return <LandingPage />;
  }
};
export default AppRouter;
