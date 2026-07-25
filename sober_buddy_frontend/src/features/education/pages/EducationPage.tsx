import React from 'react';
import { useRouter } from '../../../shared/context/RouterContext';
import { useTranslation } from '../../../shared/hooks/useTranslation';
import { Button } from '../../../shared/components/Button/Button';
import { Card } from '../../../shared/components/Card/Card';
import educationArticles from '../data/educationContent.json';
import type { EducationArticle } from '../../../shared/types/recovery.types';
import { ArrowLeft, BookOpen } from 'lucide-react';
import './EducationPage.css';

const articles = educationArticles as EducationArticle[];

export const EducationPage: React.FC = () => {
  const { navigate } = useRouter();
  const { t } = useTranslation();

  return (
    <div className="education-page">
      <header className="education-header glass-effect">
        <div className="education-nav">
          <Button variant="glass" size="small" onClick={() => navigate('dashboard')}>
            <ArrowLeft size={16} aria-hidden="true" />
            {t('education_btn_back')}
          </Button>
          <h1 className="education-title">
            <BookOpen size={22} aria-hidden="true" />
            {t('education_title')}
          </h1>
        </div>
      </header>

      <main id="main-content" className="education-main">
        <p className="education-subtitle">{t('education_subtitle')}</p>

        <div className="education-grid">
          {articles.map((article) => (
            <article key={article.id} className="education-article">
            <Card
              className="education-card"
              glass={true}
              hoverable={true}
            >
              <h2 className="education-card-title">{article.title}</h2>
              <div className="education-tags" aria-label={t('education_tags_label')}>
                {article.tags.map((tag) => (
                  <span key={tag} className="education-tag">
                    {tag}
                  </span>
                ))}
              </div>
              <p className="education-card-body">{article.body}</p>
              <p className="education-disclaimer" role="note">
                {t('education_disclaimer')}
              </p>
            </Card>
            </article>
          ))}
        </div>
      </main>
    </div>
  );
};

export default EducationPage;
