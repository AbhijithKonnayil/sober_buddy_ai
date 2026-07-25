import React, { useState, useEffect, useRef, useId } from 'react';
import { ShieldCheck, X, User, Phone, Activity } from 'lucide-react';
import { Button } from '../../../shared/components/Button/Button';
import { useTranslation } from '../../../shared/hooks/useTranslation';
import { doc, updateDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../firebase';
import type { SoberProfile, EmergencyContact } from '../../../shared/types/recovery.types';
import './ProfileReviewModal.css';

interface ProfileReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  soberId: string;
  initialProfile: SoberProfile | null;
  initialContact: EmergencyContact | null;
}

export const ProfileReviewModal: React.FC<ProfileReviewModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  soberId,
  initialProfile,
  initialContact,
}) => {
  const { t } = useTranslation();
  const titleId = useId();
  const descId = useId();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // States
  const [substance, setSubstance] = useState(initialProfile?.substance || 'alcohol');
  const [triggers, setTriggers] = useState<string[]>(initialProfile?.triggers || []);
  const [coping, setCoping] = useState<string[]>(initialProfile?.copingStrategies || []);
  const [contactName, setContactName] = useState(initialContact?.name || '');
  const [contactRelation, setContactRelation] = useState(initialContact?.relationship || '');
  const [contactPhone, setContactPhone] = useState(initialContact?.phone || '');
  const [notifyConsent, setNotifyConsent] = useState(initialContact?.notifyConsent || false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Keyboard navigation & Focus Trapping
  useEffect(() => {
    if (!isOpen) return;

    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }

      if (event.key === 'Tab' && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll(
          'a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [tabindex="0"]'
        );
        const firstElement = focusableElements[0] as HTMLElement;
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

        if (event.shiftKey) {
          if (document.activeElement === firstElement) {
            lastElement.focus();
            event.preventDefault();
          }
        } else {
          if (document.activeElement === lastElement) {
            firstElement.focus();
            event.preventDefault();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubstanceSelect = (val: string) => {
    setSubstance(val);
  };

  const handleTriggerToggle = (val: string) => {
    setTriggers((prev) =>
      prev.includes(val) ? prev.filter((t) => t !== val) : [...prev, val]
    );
  };

  const handleCopingToggle = (val: string) => {
    setCoping((prev) =>
      prev.includes(val) ? prev.filter((c) => c !== val) : [...prev, val]
    );
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!contactName || !contactRelation || !contactPhone) {
      setError('onboarding_error_contact');
      return;
    }

    setLoading(true);
    try {
      const riskTier = substance === 'opioids' ? 'high' : 'medium';

      // 1. Update Sober Profile
      await updateDoc(doc(db, 'soberProfiles', soberId), {
        substance,
        triggers,
        copingStrategies: coping,
        confirmedBySober: true,
        riskTier,
        updatedAt: serverTimestamp(),
      });

      // 2. Update/Create Emergency Contact
      await setDoc(doc(db, 'emergencyContacts', `${soberId}_primary`), {
        soberId,
        name: contactName,
        relationship: contactRelation,
        phone: contactPhone,
        notifyConsent,
        isPrimary: true,
        createdAt: serverTimestamp(),
      });

      onConfirm();
    } catch (err) {
      console.error(err);
      setError('dashboard_sober_verify_error');
    } finally {
      setLoading(false);
    }
  };

  const substances = [
    { value: 'alcohol', label: t('onboarding_substance_alcohol') },
    { value: 'nicotine', label: t('onboarding_substance_nicotine') },
    { value: 'cannabis', label: t('onboarding_substance_cannabis') },
    { value: 'prescription', label: t('onboarding_substance_prescription') },
    { value: 'opioids', label: t('onboarding_substance_opioids') },
    { value: 'other', label: t('onboarding_substance_other') },
  ];

  const triggerList = [
    { value: 'stress', label: t('onboarding_trigger_stress') },
    { value: 'loneliness', label: t('onboarding_trigger_loneliness') },
    { value: 'anxiety', label: t('onboarding_trigger_anxiety') },
    { value: 'friends', label: t('onboarding_trigger_friends') },
    { value: 'parties', label: t('onboarding_trigger_parties') },
    { value: 'conflict', label: t('onboarding_trigger_conflict') },
    { value: 'work', label: t('onboarding_trigger_work') },
    { value: 'sleep', label: t('onboarding_trigger_sleep') },
    { value: 'other', label: t('onboarding_trigger_other') },
  ];

  const copingList = [
    { value: 'call', label: t('onboarding_coping_call') },
    { value: 'walk', label: t('onboarding_coping_walk') },
    { value: 'music', label: t('onboarding_coping_music') },
    { value: 'meditate', label: t('onboarding_coping_meditate') },
    { value: 'journal', label: t('onboarding_coping_journal') },
    { value: 'prayer', label: t('onboarding_coping_prayer') },
    { value: 'ai', label: t('onboarding_coping_ai') },
    { value: 'other', label: t('onboarding_coping_other') },
  ];

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      role="presentation"
    >
      <div
        ref={modalRef}
        className="modal-content glass-effect profile-review-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <div className="modal-title-group">
            <ShieldCheck size={24} fill="var(--color-primary)" className="modal-header-icon animate-pulse" />
            <h3 id={titleId}>{t('dashboard_sober_modal_verify_title')}</h3>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            className="close-modal-btn"
            onClick={onClose}
            aria-label={t('dashboard_modal_close')}
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <p id={descId} className="modal-description">
          {t('dashboard_sober_modal_verify_desc')}
        </p>

        <form onSubmit={handleSubmit} className="review-form">
          {error && (
            <p className="onboarding-error" role="alert">
              {t(error)}
            </p>
          )}

          <div className="review-scroll-container">
            {/* Q1: Substance Selection */}
            <div className="review-section">
              <h4 id="substance-group-label" className="review-section-title">
                {t('onboarding_q_substance_sober')}
              </h4>
              <div
                className="selection-grid"
                role="radiogroup"
                aria-labelledby="substance-group-label"
              >
                {substances.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    className={`select-option-btn ${substance === item.value ? 'selected' : ''}`}
                    onClick={() => handleSubstanceSelect(item.value)}
                    role="radio"
                    aria-checked={substance === item.value}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Q2: Triggers Selection */}
            <div className="review-section">
              <h4 id="triggers-group-label" className="review-section-title">
                {t('onboarding_q_triggers')}
              </h4>
              <div
                className="selection-grid"
                role="group"
                aria-labelledby="triggers-group-label"
              >
                {triggerList.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    className={`select-option-btn ${triggers.includes(item.value) ? 'selected' : ''}`}
                    onClick={() => handleTriggerToggle(item.value)}
                    aria-pressed={triggers.includes(item.value)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Q3: Coping Strategies Selection */}
            <div className="review-section">
              <h4 id="coping-group-label" className="review-section-title">
                {t('onboarding_q_coping')}
              </h4>
              <div
                className="selection-grid"
                role="group"
                aria-labelledby="coping-group-label"
              >
                {copingList.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    className={`select-option-btn ${coping.includes(item.value) ? 'selected' : ''}`}
                    onClick={() => handleCopingToggle(item.value)}
                    aria-pressed={coping.includes(item.value)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Q4: Crisis Contact Info */}
            <div className="review-section">
              <h4 className="review-section-title">{t('onboarding_q_contact')}</h4>
              <div className="onboarding-form">
                <div className="form-group">
                  <label className="form-label" htmlFor="review-contactName">
                    <User size={16} aria-hidden="true" />
                    {t('onboarding_label_contact_name')}
                  </label>
                  <input
                    id="review-contactName"
                    type="text"
                    className="form-input"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder={t('onboarding_placeholder_contact_name')}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="review-contactRelation">
                    <Activity size={16} aria-hidden="true" />
                    {t('onboarding_label_contact_relationship')}
                  </label>
                  <input
                    id="review-contactRelation"
                    type="text"
                    className="form-input"
                    value={contactRelation}
                    onChange={(e) => setContactRelation(e.target.value)}
                    placeholder={t('onboarding_placeholder_contact_relation')}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="review-contactPhone">
                    <Phone size={16} aria-hidden="true" />
                    {t('onboarding_label_contact_phone')}
                  </label>
                  <input
                    id="review-contactPhone"
                    type="tel"
                    className="form-input"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder={t('onboarding_placeholder_contact_phone')}
                    required
                  />
                </div>

                <div className="consent-checkbox-container">
                  <input
                    id="review-consent-check"
                    type="checkbox"
                    className="consent-checkbox"
                    checked={notifyConsent}
                    onChange={(e) => setNotifyConsent(e.target.checked)}
                  />
                  <label htmlFor="review-consent-check" className="consent-checkbox-label">
                    {t('onboarding_label_consent')}
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div className="review-actions">
            <Button
              type="button"
              variant="glass"
              size="medium"
              onClick={onClose}
              disabled={loading}
            >
              {t('dashboard_sober_btn_cancel_verify')}
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="medium"
              disabled={loading}
              aria-busy={loading}
            >
              {t('dashboard_sober_btn_confirm_verify')}
              <ShieldCheck size={18} aria-hidden="true" />
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
