import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../../shared/hooks/useTranslation';
import { useRouter } from '../../../shared/context/RouterContext';
import { Button } from '../../../shared/components/Button/Button';
import { Card } from '../../../shared/components/Card/Card';
import { HeroSection } from '../components/HeroSection';
import { FeaturesSection } from '../components/FeaturesSection';
import { Heart, Activity, Menu, X, ArrowRight, ShieldCheck } from 'lucide-react';
import './LandingPage.css';

export const LandingPage: React.FC = () => {
  const { t } = useTranslation();
  const { navigate } = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const stats = [
    {
      value: t('landing_stats_num_days'),
      label: t('landing_stats_label_days'),
      icon: <Activity size={24} className="stat-icon text-primary" />
    },
    {
      value: t('landing_stats_num_messages'),
      label: t('landing_stats_label_messages'),
      icon: <Heart size={24} className="stat-icon text-secondary" />
    },
    {
      value: t('landing_stats_num_success'),
      label: t('landing_stats_label_success'),
      icon: <ShieldCheck size={24} className="stat-icon text-accent" />
    }
  ];

  return (
    <div className="landing-page">
      {/* Header / Navbar */}
      <header className={`landing-header ${isScrolled ? 'scrolled glass-effect' : ''}`}>
        <div className="landing-header-container">
          <div className="landing-logo">
            <Heart className="logo-icon animate-pulse" size={24} fill="var(--color-primary)" />
            <span className="logo-text">{t('landing_nav_logo_text')}</span>
          </div>

          {/* Desktop Navigation */}
          <nav className="landing-nav-desktop">
            <a href="#features" className="nav-link">{t('landing_nav_link_features')}</a>
            <a href="#live-tracker" className="nav-link">{t('landing_nav_link_counter')}</a>
            <a href="https://docs.vite.dev" target="_blank" rel="noopener noreferrer" className="nav-link">
              {t('landing_nav_link_docs')}
            </a>
          </nav>

          <div className="landing-auth-desktop">
            <Button variant="glass" size="small" onClick={() => navigate('auth')}>
              {t('landing_nav_btn_signin')}
            </Button>
          </div>

          {/* Mobile Menu Toggle */}
          <button 
            className="mobile-menu-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="mobile-nav-drawer glass-effect">
            <nav className="mobile-nav-links">
              <a 
                href="#features" 
                className="mobile-nav-link"
                onClick={() => setMobileMenuOpen(false)}
              >
                {t('landing_nav_link_features')}
              </a>
              <a 
                href="#live-tracker" 
                className="mobile-nav-link"
                onClick={() => setMobileMenuOpen(false)}
              >
                {t('landing_nav_link_counter')}
              </a>
              <a 
                href="https://docs.vite.dev" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="mobile-nav-link"
                onClick={() => setMobileMenuOpen(false)}
              >
                {t('landing_nav_link_docs')}
              </a>
              <hr className="mobile-divider" />
              <Button variant="glass" size="medium" onClick={() => navigate('auth')}>
                {t('landing_nav_btn_signin')}
              </Button>
            </nav>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="landing-main">
        {/* Hero Section */}
        <HeroSection />

        {/* Stats Section */}
        <section className="landing-stats-section">
          <div className="landing-stats-container">
            <div className="stats-grid">
              {stats.map((stat, idx) => (
                <Card key={idx} className="stat-card" glass={true} hoverable={true}>
                  <div className="stat-icon-wrapper">
                    {stat.icon}
                  </div>
                  <div className="stat-info">
                    <span className="stat-value gradient-text">{stat.value}</span>
                    <span className="stat-label">{stat.label}</span>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <FeaturesSection />

        {/* CTA Banner Section */}
        <section className="landing-cta-section">
          <div className="landing-cta-glow"></div>
          <div className="landing-cta-container">
            <Card className="cta-card glass-effect" glass={false} hoverable={false}>
              <h2 className="cta-title">{t('landing_cta_title')}</h2>
              <p className="cta-subtitle">{t('landing_cta_subtitle')}</p>
              <div className="cta-actions">
                <Button variant="primary" size="large" onClick={() => navigate('auth')}>
                  {t('landing_cta_btn_primary')}
                  <ArrowRight size={18} />
                </Button>
                <Button variant="glass" size="large">
                  {t('landing_cta_btn_secondary')}
                </Button>
              </div>
            </Card>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="landing-footer-container">
          <div className="footer-left">
            <div className="landing-logo">
              <Heart className="logo-icon" size={20} fill="var(--color-primary)" />
              <span className="logo-text">{t('landing_nav_logo_text')}</span>
            </div>
            <p className="footer-tagline">{t('landing_footer_text_tagline')}</p>
          </div>
          <div className="footer-right">
            <div className="footer-links">
              <a href="#" className="footer-link">{t('landing_footer_link_privacy')}</a>
              <a href="#" className="footer-link">{t('landing_footer_link_terms')}</a>
            </div>
            <p className="footer-copy">{t('landing_footer_text_copyright')}</p>
          </div>
        </div>
      </footer>
    </div>
  );
};
