import React from 'react';
import { useTranslation } from '../../../shared/hooks/useTranslation';
import { Card } from '../../../shared/components/Card/Card';
import { MessageSquareText, Trophy, ShieldAlert, Users } from 'lucide-react';

export const FeaturesSection: React.FC = () => {
  const { t } = useTranslation();

  const features = [
    {
      icon: <MessageSquareText size={24} className="feature-icon" />,
      title: t('landing_features_card_title_1'),
      desc: t('landing_features_card_desc_1'),
      color: 'var(--color-primary)'
    },
    {
      icon: <Trophy size={24} className="feature-icon" />,
      title: t('landing_features_card_title_2'),
      desc: t('landing_features_card_desc_2'),
      color: 'var(--color-secondary)'
    },
    {
      icon: <ShieldAlert size={24} className="feature-icon" />,
      title: t('landing_features_card_title_3'),
      desc: t('landing_features_card_desc_3'),
      color: 'var(--color-warning)'
    },
    {
      icon: <Users size={24} className="feature-icon" />,
      title: t('landing_features_card_title_4'),
      desc: t('landing_features_card_desc_4'),
      color: 'var(--color-accent)'
    }
  ];

  return (
    <section className="landing-features-section" id="features">
      <div className="landing-features-header">
        <div className="landing-section-badge glass-effect">
          {t('landing_features_badge')}
        </div>
        <h2 className="landing-features-title">
          {t('landing_features_title')}
        </h2>
        <p className="landing-features-subtitle">
          {t('landing_features_subtitle')}
        </p>
      </div>

      <div className="landing-features-grid">
        {features.map((feature, idx) => (
          <Card key={idx} className="feature-card" glass={true} hoverable={true}>
            <div 
              className="feature-icon-wrapper"
              style={{ 
                color: feature.color,
                background: `rgba(${
                  feature.color === 'var(--color-primary)' ? '124, 58, 237' : 
                  feature.color === 'var(--color-accent)' ? '29, 191, 115' : '168, 85, 247'
                }, 0.1)` 
              }}
            >
              {feature.icon}
            </div>
            <h3 className="feature-card-title">{feature.title}</h3>
            <p className="feature-card-desc">{feature.desc}</p>
          </Card>
        ))}
      </div>
    </section>
  );
};
