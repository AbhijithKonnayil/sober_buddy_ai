import React from 'react';
import { useTranslation } from '../../../shared/hooks/useTranslation';
import { useRouter } from '../../../shared/context/RouterContext';
import { Button } from '../../../shared/components/Button/Button';
import { ChatDemo } from './ChatDemo';
import { Sparkles, ChevronRight, CheckCircle2 } from 'lucide-react';

export const HeroSection: React.FC = () => {
  const { t } = useTranslation();
  const { navigate } = useRouter();

  const handleScrollToDemo = () => {
    const demoElement = document.getElementById('live-tracker');
    if (demoElement) {
      demoElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section className="landing-hero-section">
      <div className="landing-hero-glow"></div>
      
      <div className="landing-hero-container">
        {/* Left Column: Heading and Details */}
        <div className="landing-hero-content">
          <div className="landing-hero-badge glass-effect">
            <Sparkles size={14} className="icon-sparkle" />
            <span>{t('landing_hero_text_badge')}</span>
          </div>
          
          <h1 className="landing-hero-title">
            {t('landing_hero_text_title_part1')}{' '}
            <span className="gradient-text">{t('landing_hero_text_title_part2')}</span>
          </h1>
          
          <p className="landing-hero-subtitle">
            {t('landing_hero_text_subtitle')}
          </p>
          
          <div className="landing-hero-actions">
            <Button variant="primary" size="large" onClick={() => navigate('auth')}>
              {t('landing_hero_btn_start')}
              <ChevronRight size={18} />
            </Button>
            <Button variant="glass" size="large" onClick={handleScrollToDemo}>
              {t('landing_hero_btn_demo')}
            </Button>
          </div>
          
          <div className="landing-hero-proof">
            <div className="landing-hero-stars">
              <CheckCircle2 size={16} className="icon-check" />
              <span>{t('landing_hero_label_stars')}</span>
            </div>
          </div>
        </div>
        
        {/* Right Column: Chat Interface Mock */}
        <div className="landing-hero-visual" id="live-tracker">
          <div className="visual-wrapper">
            <div className="blob-glow bg-primary-glow"></div>
            <div className="blob-glow bg-secondary-glow"></div>
            <ChatDemo />
          </div>
        </div>
      </div>
    </section>
  );
};
