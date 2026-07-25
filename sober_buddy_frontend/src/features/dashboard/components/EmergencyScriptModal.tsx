import React, { useEffect, useId, useRef, useState } from 'react';
import { AlertTriangle, PhoneCall, X } from 'lucide-react';
import { Button } from '../../../shared/components/Button/Button';
import { useTranslation } from '../../../shared/hooks/useTranslation';
import { fetchEmergencyScripts } from '../api/chat.api';
import type { EmergencyContact, SoberProfile } from '../../../shared/types/recovery.types';
import './EmergencyScriptModal.css';

interface EmergencyScriptModalProps {
  isOpen: boolean;
  onClose: () => void;
  soberId: string;
  profile: SoberProfile | null;
  contact: EmergencyContact | null;
}

export const EmergencyScriptModal: React.FC<EmergencyScriptModalProps> = ({
  isOpen,
  onClose,
  soberId,
  profile,
  contact,
}) => {
  const { t } = useTranslation();
  const titleId = useId();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [soberScript, setSoberScript] = useState('');
  const [caregiverScript, setCaregiverScript] = useState('');

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSoberScript('');
      setCaregiverScript('');
      setError(null);
      return;
    }

    const loadScripts = async () => {
      setLoading(true);
      setError(null);

      try {
        const scripts = await fetchEmergencyScripts(soberId);
        setSoberScript(scripts.soberScript);
        setCaregiverScript(scripts.caregiverScript);
      } catch {
        setError('dashboard_panic_error');
      } finally {
        setLoading(false);
      }
    };

    void loadScripts();
  }, [isOpen, soberId]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal-overlay" onClick={onClose} role="presentation">
      <div
        className="modal-content glass-effect panic-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-busy={loading}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <div className="panic-modal-title">
            <AlertTriangle size={24} className="text-warning animate-pulse" aria-hidden="true" />
            <h3 id={titleId}>{t('dashboard_panic_modal_title')}</h3>
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

        {loading ? (
          <p className="script-loading" aria-live="polite">{t('dashboard_panic_loading')}</p>
        ) : error ? (
          <p className="script-error" role="alert">{t(error)}</p>
        ) : (
          <div className="script-container">
            <div className="script-box">
              <h4>{t('dashboard_panic_script_sober_title')}</h4>
              <p className="script-text blockquote">{soberScript}</p>
            </div>

            <div className="script-box">
              <h4>
                {t('dashboard_panic_script_caregiver_title', {
                  name: contact?.name || t('dashboard_panic_contact_fallback'),
                })}
              </h4>
              <p className="script-text blockquote">{caregiverScript}</p>
            </div>
          </div>
        )}

        <div className="panic-contacts-quick">
          <div className="quick-contact-row">
            <PhoneCall size={18} className="text-accent" aria-hidden="true" />
            <span>
              {t('dashboard_panic_call_contact')}{' '}
              <strong>{contact?.name || t('dashboard_panic_contact_fallback')}</strong>{' '}
              ({contact?.phone || t('dashboard_panic_no_phone')})
            </span>
          </div>
          {profile?.substance === 'opioids' && (
            <p className="opioid-warning" role="note">
              {t('dashboard_panic_opioid_note')}
            </p>
          )}
        </div>

        <div className="modal-footer">
          <Button variant="secondary" size="medium" onClick={onClose}>
            {t('dashboard_panic_btn_dismiss')}
          </Button>
        </div>
      </div>
    </div>
  );
};
