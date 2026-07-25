import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../../shared/hooks/useTranslation';
import { Card } from '../../../shared/components/Card/Card';
import { Button } from '../../../shared/components/Button/Button';
import { Calendar, Award } from 'lucide-react';
import './InteractiveCounter.css';

export const InteractiveCounter: React.FC = () => {
  const { t } = useTranslation();
  
  // Set default start date to exactly 1 day and 4 hours ago so the user sees a running timer
  const getDefaultDateString = () => {
    const d = new Date();
    d.setHours(d.getHours() - 28); // 1 day and 4 hours ago
    return d.toISOString().slice(0, 16);
  };

  const [startDateStr, setStartDateStr] = useState<string>(getDefaultDateString());
  const [time, setTime] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const calculateTime = () => {
      const start = new Date(startDateStr).getTime();
      const now = new Date().getTime();
      const diff = now - start;

      if (isNaN(diff) || diff <= 0) {
        setTime({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTime({ days, hours, minutes, seconds });
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [startDateStr]);

  const handleReset = () => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');

    let timePart = '04:25'; // Fallback / Default time
    if (startDateStr && startDateStr.includes('T')) {
      const parts = startDateStr.split('T');
      if (parts[1]) {
        timePart = parts[1].slice(0, 5); // get HH:MM
      }
    }

    setStartDateStr(`${yyyy}-${mm}-${dd}T${timePart}`);
  };

  // Determine current milestone translation key based on days elapsed
  const getMilestoneInfo = () => {
    if (time.days < 1) {
      return {
        title: t('landing_counter_milestone_title_1'),
        desc: t('landing_counter_milestone_desc_1'),
        progress: (time.hours / 24) * 100,
        label: `${time.hours} / 24 hrs`
      };
    } else if (time.days < 7) {
      return {
        title: t('landing_counter_milestone_title_2'),
        desc: t('landing_counter_milestone_desc_2'),
        progress: (time.days / 7) * 100,
        label: `${time.days} / 7 days`
      };
    } else {
      return {
        title: t('landing_counter_milestone_title_3'),
        desc: t('landing_counter_milestone_desc_3'),
        progress: Math.min((time.days / 30) * 100, 100),
        label: `${time.days} / 30 days`
      };
    }
  };

  const milestone = getMilestoneInfo();

  return (
    <Card className="counter-card" glass={true} hoverable={false}>
      <h3 className="counter-title">{t('landing_counter_title')}</h3>
      <p className="counter-subtitle">{t('landing_counter_subtitle')}</p>

      <div className="input-group">
        <label className="input-label" htmlFor="date-input">
          <Calendar className="icon-calendar" size={18} />
          {t('landing_counter_label_input')}
        </label>
        <div className="input-row">
          <input
            id="date-input"
            type="datetime-local"
            className="date-picker-input"
            value={startDateStr}
            onChange={(e) => setStartDateStr(e.target.value)}
          />
          <Button variant="glass" size="small" onClick={handleReset} className="reset-btn">
            {t('landing_counter_btn_reset')}
          </Button>
        </div>
      </div>

      <div className="timer-grid">
        <div className="timer-box">
          <span className="timer-number">{String(time.days).padStart(2, '0')}</span>
          <span className="timer-label">{t('landing_counter_unit_days')}</span>
        </div>
        <div className="timer-box">
          <span className="timer-number">{String(time.hours).padStart(2, '0')}</span>
          <span className="timer-label">{t('landing_counter_unit_hours')}</span>
        </div>
        <div className="timer-box">
          <span className="timer-number">{String(time.minutes).padStart(2, '0')}</span>
          <span className="timer-label">{t('landing_counter_unit_mins')}</span>
        </div>
        <div className="timer-box">
          <span className="timer-number">{String(time.seconds).padStart(2, '0')}</span>
          <span className="timer-label">{t('landing_counter_unit_secs')}</span>
        </div>
      </div>

      <div className="milestone-box glass-effect">
        <div className="milestone-header">
          <div className="milestone-badge">
            <Award className="icon-award" size={20} />
            <span>{milestone.title}</span>
          </div>
          <span className="milestone-progress-text">{milestone.label}</span>
        </div>
        <p className="milestone-desc">{milestone.desc}</p>
        <div className="progress-bar-track">
          <div 
            className="progress-bar-fill" 
            style={{ width: `${milestone.progress}%` }}
          ></div>
        </div>
      </div>
    </Card>
  );
};
