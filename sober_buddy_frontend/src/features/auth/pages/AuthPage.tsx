import React, { useState } from 'react';
import { useAuth } from '../../../shared/context/AuthContext';
import { useRouter } from '../../../shared/context/RouterContext';
import { useTranslation } from '../../../shared/hooks/useTranslation';
import { Card } from '../../../shared/components/Card/Card';
import { Button } from '../../../shared/components/Button/Button';
import { Heart, Mail, Lock, User, ShieldAlert, ArrowLeft } from 'lucide-react';
import './AuthPage.css';

export const AuthPage: React.FC = () => {
  const { login, register } = useAuth();
  const { navigate } = useRouter();
  const { t } = useTranslation();

  const [isLogin, setIsLogin] = useState(true);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<'sober' | 'caregiver'>('sober');
  
  const [error, setError] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Basic Validation
    if (!email || !password) {
      setError('Please fill out all required fields.');
      return;
    }

    if (!isLogin && password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (!isLogin && password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (!isLogin && !displayName) {
      setError('Please provide a display name.');
      return;
    }

    setFormLoading(true);
    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await register(email, password, displayName, role);
      }
      // On success, AppRouter automatically redirects based on user state
    } catch (err: unknown) {
      console.error(err);
      const firebaseError = err as { code?: string; message?: string };
      if (firebaseError.code === 'auth/email-already-in-use') {
        setError('This email is already registered.');
      } else if (firebaseError.code === 'auth/invalid-credential') {
        setError('Invalid email or password.');
      } else {
        setError(firebaseError.message || t('auth_error_generic'));
      }
      setFormLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-glow"></div>
      
      <div className="auth-container">
        <button className="back-to-landing-btn" onClick={() => navigate('landing')}>
          <ArrowLeft size={16} />
          <span>Back to Landing</span>
        </button>

        <Card className="auth-card" glass={true} hoverable={false}>
          <div className="auth-header">
            <Heart className="auth-logo-icon animate-pulse" size={40} fill="var(--color-primary)" />
            <h2 className="auth-title">
              {isLogin ? t('auth_title_login') : t('auth_title_register')}
            </h2>
            <p className="auth-subtitle">
              {isLogin ? t('auth_subtitle_login') : t('auth_subtitle_register')}
            </p>
          </div>

          <div className="auth-tabs">
            <button 
              type="button" 
              className={`auth-tab ${isLogin ? 'active' : ''}`}
              onClick={() => { setIsLogin(true); setError(null); }}
            >
              {t('auth_tab_login')}
            </button>
            <button 
              type="button" 
              className={`auth-tab ${!isLogin ? 'active' : ''}`}
              onClick={() => { setIsLogin(false); setError(null); }}
            >
              {t('auth_tab_register')}
            </button>
          </div>

          {error && (
            <div className="auth-error-box">
              <ShieldAlert size={16} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">
            {!isLogin && (
              <div className="form-group">
                <label className="form-label" htmlFor="name">
                  <User size={16} />
                  {t('auth_label_name')}
                </label>
                <input
                  id="name"
                  type="text"
                  className="form-input"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Abhi"
                  required
                />
              </div>
            )}

            <div className="form-group">
              <label className="form-label" htmlFor="email">
                <Mail size={16} />
                {t('auth_label_email')}
              </label>
              <input
                id="email"
                type="email"
                className="form-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. name@example.com"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="password">
                <Lock size={16} />
                {t('auth_label_password')}
              </label>
              <input
                id="password"
                type="password"
                className="form-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••"
                required
              />
            </div>

            {!isLogin && (
              <>
                <div className="form-group">
                  <label className="form-label" htmlFor="confirmPassword">
                    <Lock size={16} />
                    Confirm Password
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    className="form-input"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••"
                    required
                  />
                </div>

                <div className="form-group">
                  <span className="form-label-role">{t('auth_label_role')}</span>
                  <div className="role-selector-container">
                    <button
                      type="button"
                      className={`role-option-btn ${role === 'sober' ? 'selected' : ''}`}
                      onClick={() => setRole('sober')}
                    >
                      {t('auth_role_sober')}
                    </button>
                    <button
                      type="button"
                      className={`role-option-btn ${role === 'caregiver' ? 'selected' : ''}`}
                      onClick={() => setRole('caregiver')}
                    >
                      {t('auth_role_caregiver')}
                    </button>
                  </div>
                </div>
              </>
            )}

            <Button variant="primary" size="large" type="submit" className="auth-submit-btn" disabled={formLoading}>
              {formLoading ? 'Processing...' : (isLogin ? t('auth_btn_login') : t('auth_btn_register'))}
            </Button>
          </form>

          <button 
            type="button"
            className="auth-toggle-link"
            onClick={() => { setIsLogin(!isLogin); setError(null); }}
          >
            {isLogin ? t('auth_toggle_to_register') : t('auth_toggle_to_login')}
          </button>
        </Card>
      </div>
    </div>
  );
};
export default AuthPage;
