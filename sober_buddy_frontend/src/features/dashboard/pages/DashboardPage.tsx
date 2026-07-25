import React, { useState } from 'react';
import { useAuth } from '../../../shared/context/AuthContext';
import { useRouter } from '../../../shared/context/RouterContext';
import { useTranslation } from '../../../shared/hooks/useTranslation';
import { Button } from '../../../shared/components/Button/Button';
import { Card } from '../../../shared/components/Card/Card';
import { InteractiveCounter } from '../../landing/components/InteractiveCounter';
import { VoiceChatModal } from '../components/VoiceChatModal';
import { EmergencyScriptModal } from '../components/EmergencyScriptModal';
import { ProfileReviewModal } from '../components/ProfileReviewModal';
import { useDashboardData } from '../hooks/useDashboardData';
import { simulateLocationAlert } from '../api/chat.api';
import {
  LogOut,
  Heart,
  Phone,
  AlertTriangle,
  ShieldCheck,
  MapPin,
  Mic,
  BookOpen,
  ShieldAlert,
} from 'lucide-react';
import './DashboardPage.css';

export const DashboardPage: React.FC = () => {
  const { user, userDoc, logout } = useAuth();
  const { navigate } = useRouter();
  const { t } = useTranslation();

  const isSober = userDoc?.role === 'sober';
  const { data, loading, error, refresh } = useDashboardData(
    user?.uid,
    isSober,
    userDoc?.linkedUserIds ?? [],
  );

  const [isChatActive, setIsChatActive] = useState(false);
  const [isPanicActive, setIsPanicActive] = useState(false);
  const [isReviewingProfile, setIsReviewingProfile] = useState(false);
  const [locationSimulating, setLocationSimulating] = useState(false);
  const [locationMessage, setLocationMessage] = useState<string | null>(null);

  const profile = data?.profile ?? null;
  const contact = data?.contact ?? null;
  const alerts = data?.alerts ?? [];
  const soberId = data?.soberId ?? user?.uid ?? '';

  const handleLogout = async () => {
    try {
      await logout();
      navigate('landing');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  const handleSimulateLocation = async () => {
    if (!soberId) {
      return;
    }

    setLocationSimulating(true);
    setLocationMessage(null);

    try {
      await simulateLocationAlert(soberId, t('dashboard_location_sim_label'));
      setLocationMessage('dashboard_location_sim_success');
      await refresh();
    } catch {
      setLocationMessage('dashboard_location_sim_error');
    } finally {
      setLocationSimulating(false);
    }
  };

  if (loading) {
    return (
      <div className="dashboard-loading" aria-busy="true" aria-live="polite">
        <div className="spinner" aria-hidden="true" />
        <p>{t('dashboard_loading')}</p>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-glow" aria-hidden="true" />

      <header className="dashboard-header glass-effect">
        <div className="dashboard-nav-container">
          <button
            type="button"
            className="dashboard-logo"
            onClick={() => navigate('landing')}
            aria-label={t('dashboard_nav_home')}
          >
            <Heart className="logo-icon animate-pulse" size={22} fill="var(--color-primary)" aria-hidden="true" />
            <span className="logo-text">{t('landing_nav_logo_text')}</span>
          </button>

          <div className="dashboard-header-right">
            <span className="user-greeting">
              {t('dashboard_welcome')}
              <strong>{userDoc?.displayName}</strong>
            </span>
            <Button
              variant="glass"
              size="small"
              onClick={() => navigate('education')}
              aria-label={t('dashboard_btn_education')}
            >
              <BookOpen size={16} aria-hidden="true" />
              {t('dashboard_btn_education')}
            </Button>
            <Button variant="glass" size="small" onClick={handleLogout}>
              <LogOut size={16} aria-hidden="true" />
              {t('dashboard_btn_logout')}
            </Button>
          </div>
        </div>
      </header>

      <main id="main-content" className="dashboard-main">
        {error && (
          <p className="dashboard-error" role="alert">
            {t(error)}
          </p>
        )}

        {isSober && profile && profile.filledBy === 'caregiver' && !profile.confirmedBySober && (
          <div className="profile-pending-banner glass-effect" role="status">
            <div className="banner-content">
              <ShieldAlert className="banner-icon animate-pulse" size={24} aria-hidden="true" />
              <div className="banner-text">
                <h4 className="banner-title">{t('dashboard_sober_banner_verify_title')}</h4>
                <p className="banner-desc">{t('dashboard_sober_banner_verify_desc')}</p>
              </div>
            </div>
            <Button
              variant="primary"
              size="small"
              onClick={() => setIsReviewingProfile(true)}
              className="banner-action-btn"
            >
              {t('dashboard_sober_btn_review_profile')}
            </Button>
          </div>
        )}

        {isSober ? (
          <div className="dashboard-grid-sober">
            <div className="dashboard-col-left">
              <InteractiveCounter />

              <Card className="actions-card" glass={true} hoverable={false}>
                <h3>{t('dashboard_sober_quick_support')}</h3>
                <div className="quick-actions-buttons">
                  <Button
                    variant="primary"
                    size="large"
                    onClick={() => setIsChatActive(true)}
                    className="chat-action-btn"
                    aria-label={t('dashboard_sober_btn_chat')}
                  >
                    <Mic size={20} aria-hidden="true" />
                    {t('dashboard_sober_btn_chat')}
                  </Button>
                  <Button
                    variant="secondary"
                    size="large"
                    onClick={() => setIsPanicActive(true)}
                    className="panic-action-btn"
                    aria-label={t('dashboard_sober_btn_panic')}
                  >
                    <AlertTriangle size={20} aria-hidden="true" />
                    {t('dashboard_sober_btn_panic')}
                  </Button>
                  <Button
                    variant="glass"
                    size="large"
                    onClick={handleSimulateLocation}
                    disabled={locationSimulating}
                    aria-busy={locationSimulating}
                  >
                    <MapPin size={20} aria-hidden="true" />
                    {t('dashboard_sober_btn_simulate_location')}
                  </Button>
                </div>
                {locationMessage && (
                  <p className="location-sim-message" role="status">
                    {t(locationMessage)}
                  </p>
                )}
              </Card>
            </div>

            <div className="dashboard-col-right">
              <Card className="settings-card" glass={true} hoverable={false}>
                <div className="settings-card-header">
                  <h3>{t('dashboard_sober_header_profile')}</h3>
                  <span className="badge-sober-active">{t('dashboard_sober_badge')}</span>
                </div>

                <div className="settings-info-list">
                  <div className="settings-info-item">
                    <span className="settings-label">{t('dashboard_sober_label_substance')}</span>
                    <span className="settings-value capitalized">{profile?.substance || t('dashboard_value_none')}</span>
                  </div>

                  <div className="settings-info-item">
                    <span className="settings-label">{t('dashboard_sober_label_triggers')}</span>
                    <div className="badge-grid">
                      {profile?.triggers?.length ? (
                        profile.triggers.map((trig) => (
                          <span key={trig} className="tag-badge badge-trigger">
                            {t(`onboarding_trigger_${trig}`)}
                          </span>
                        ))
                      ) : (
                        <span className="settings-value-none">{t('dashboard_value_none')}</span>
                      )}
                    </div>
                  </div>

                  <div className="settings-info-item">
                    <span className="settings-label">{t('dashboard_sober_label_coping')}</span>
                    <div className="badge-grid">
                      {profile?.copingStrategies?.length ? (
                        profile.copingStrategies.map((cop) => (
                          <span key={cop} className="tag-badge badge-coping">
                            {t(`onboarding_coping_${cop}`)}
                          </span>
                        ))
                      ) : (
                        <span className="settings-value-none">{t('dashboard_value_none')}</span>
                      )}
                    </div>
                  </div>

                  <hr className="settings-divider" />

                  <div className="settings-info-item">
                    <span className="settings-label">{t('dashboard_sober_label_contact')}</span>
                    <div className="contact-details-box">
                      <div className="contact-row">
                        <span className="contact-name">{contact?.name || t('dashboard_no_contact')}</span>
                        {contact?.relationship && (
                          <span className="contact-relation">({contact.relationship})</span>
                        )}
                      </div>
                      {contact?.phone && (
                        <div className="contact-phone">
                          <Phone size={14} aria-hidden="true" />
                          <span>{contact.phone}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="settings-info-item">
                    <span className="settings-label">{t('dashboard_sober_label_consent_status')}</span>
                    <span className={`consent-badge ${contact?.notifyConsent ? 'consent-enabled' : 'consent-disabled'}`}>
                      {contact?.notifyConsent ? t('dashboard_sober_consent_yes') : t('dashboard_sober_consent_no')}
                    </span>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        ) : (
          <div className="dashboard-grid-caregiver">
            <div className="dashboard-col-left">
              <Card className="alerts-card" glass={true} hoverable={false}>
                <h3>{t('dashboard_caregiver_header_alerts')}</h3>

                <div className="alerts-list">
                  {alerts.length === 0 ? (
                    <p className="alert-empty">{t('dashboard_caregiver_alert_empty')}</p>
                  ) : (
                    alerts.map((alert) => (
                      <div
                        key={alert.id}
                        className={`alert-item ${alert.status === 'resolved' ? 'resolved' : 'unresolved'} glass-effect`}
                      >
                        <div className="alert-item-header">
                          <div className="alert-title-group">
                            {alert.triggerType === 'location' ? (
                              <MapPin size={18} aria-hidden="true" />
                            ) : (
                              <AlertTriangle size={18} className="icon-warning-pulse" aria-hidden="true" />
                            )}
                            <strong>
                              {alert.triggerType === 'location'
                                ? t('dashboard_caregiver_alert_loc_title')
                                : t('dashboard_caregiver_alert_chat_title')}
                            </strong>
                          </div>
                          <span className={`alert-status-badge ${alert.status === 'resolved' ? 'resolved' : 'pending'}`}>
                            {alert.status === 'resolved'
                              ? t('dashboard_caregiver_alert_status_resolved')
                              : t('dashboard_caregiver_alert_status_pending')}
                          </span>
                        </div>
                        <p className="alert-desc">
                          {alert.triggerType === 'location'
                            ? t('dashboard_caregiver_alert_loc_desc_dynamic', {
                                location: alert.locationLabel || t('dashboard_location_sim_label'),
                              })
                            : t('dashboard_caregiver_alert_chat_desc')}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </Card>

              <Card className="actions-card" glass={true} hoverable={false}>
                <h3>{t('dashboard_caregiver_coaching_title')}</h3>
                <div className="quick-actions-buttons">
                  <Button
                    variant="primary"
                    size="large"
                    onClick={() => setIsChatActive(true)}
                    className="chat-action-btn"
                    aria-label={t('dashboard_caregiver_btn_coach')}
                  >
                    <Mic size={20} aria-hidden="true" />
                    {t('dashboard_caregiver_btn_coach')}
                  </Button>
                </div>
              </Card>
            </div>

            <div className="dashboard-col-right">
              <Card className="buddy-profile-card" glass={true} hoverable={false}>
                <div className="buddy-profile-header">
                  <h3>{t('dashboard_caregiver_header_profile')}</h3>
                  <span className="badge-caregiver-active">{t('dashboard_caregiver_badge')}</span>
                </div>

                <div className="buddy-meta-info">
                  <span className="buddy-meta-label">{t('dashboard_caregiver_sober_name')}</span>
                  <span className="buddy-meta-value">
                    <strong>{data?.soberBuddyName || t('dashboard_buddy_fallback')}</strong>
                  </span>
                </div>

                <div className="buddy-meta-info">
                  <span className="buddy-meta-label">{t('dashboard_caregiver_label_relationship')}</span>
                  <span className="buddy-meta-value capitalize">
                    {data?.relationshipLabel || t('dashboard_relationship_fallback')}
                  </span>
                </div>

                <div className="consent-verification-alert">
                  <ShieldCheck size={16} aria-hidden="true" />
                  <span>
                    {profile?.confirmedBySober
                      ? t('dashboard_caregiver_profile_confirmed')
                      : t('dashboard_caregiver_profile_disclaimer')}
                  </span>
                </div>

                <hr className="settings-divider" />

                <div className="settings-info-list">
                  <div className="settings-info-item">
                    <span className="settings-label">{t('dashboard_caregiver_label_substance')}</span>
                    <span className="settings-value capitalized">{profile?.substance || t('dashboard_value_none')}</span>
                  </div>

                  <div className="settings-info-item">
                    <span className="settings-label">{t('dashboard_caregiver_label_triggers')}</span>
                    <div className="badge-grid">
                      {profile?.triggers?.length ? (
                        profile.triggers.map((trig) => (
                          <span key={trig} className="tag-badge badge-trigger">
                            {t(`onboarding_trigger_${trig}`)}
                          </span>
                        ))
                      ) : (
                        <span className="settings-value-none">{t('dashboard_value_none')}</span>
                      )}
                    </div>
                  </div>

                  <div className="settings-info-item">
                    <span className="settings-label">{t('dashboard_caregiver_label_coping')}</span>
                    <div className="badge-grid">
                      {profile?.copingStrategies?.length ? (
                        profile.copingStrategies.map((cop) => (
                          <span key={cop} className="tag-badge badge-coping">
                            {t(`onboarding_coping_${cop}`)}
                          </span>
                        ))
                      ) : (
                        <span className="settings-value-none">{t('dashboard_value_none')}</span>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        )}
      </main>

      {user && (
        <VoiceChatModal
          isOpen={isChatActive}
          onClose={() => setIsChatActive(false)}
          userId={user.uid}
          role={isSober ? 'sober' : 'caregiver'}
        />
      )}

      <EmergencyScriptModal
        isOpen={isPanicActive}
        onClose={() => setIsPanicActive(false)}
        soberId={soberId}
        profile={profile}
        contact={contact}
      />

      {isSober && (
        <ProfileReviewModal
          isOpen={isReviewingProfile}
          onClose={() => setIsReviewingProfile(false)}
          onConfirm={async () => {
            setIsReviewingProfile(false);
            await refresh();
          }}
          soberId={soberId}
          initialProfile={profile}
          initialContact={contact}
        />
      )}
    </div>
  );
};

export default DashboardPage;
