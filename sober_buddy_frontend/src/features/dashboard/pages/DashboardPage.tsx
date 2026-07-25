import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../shared/context/AuthContext';
import { useRouter } from '../../../shared/context/RouterContext';
import { useTranslation } from '../../../shared/hooks/useTranslation';
import { Button } from '../../../shared/components/Button/Button';
import { Card } from '../../../shared/components/Card/Card';
import { InteractiveCounter } from '../../landing/components/InteractiveCounter';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../firebase';
import { LogOut, Heart, Phone, AlertTriangle, ShieldCheck, MapPin, Mic, PhoneCall } from 'lucide-react';
import './DashboardPage.css';

interface SoberProfileData {
  substance: string;
  triggers: string[];
  copingStrategies: string[];
  filledBy: 'self' | 'caregiver';
  confirmedBySober: boolean;
  riskTier: 'low' | 'medium' | 'high';
}

interface EmergencyContactData {
  name: string;
  relationship: string;
  phone: string;
  notifyConsent: boolean;
}

export const DashboardPage: React.FC = () => {
  const { user, userDoc, logout } = useAuth();
  const { navigate } = useRouter();
  const { t } = useTranslation();

  const isSober = userDoc?.role === 'sober';

  const [profile, setProfile] = useState<SoberProfileData | null>(null);
  const [contact, setContact] = useState<EmergencyContactData | null>(null);
  const [loading, setLoading] = useState(true);

  // Voice Chat / Coaching Demo States
  const [isChatActive, setIsChatActive] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  
  // Emergency Script Demo States
  const [isPanicActive, setIsPanicActive] = useState(false);
  
  // Caregiver links label
  const [relationshipLabel, setRelationshipLabel] = useState('');
  const [soberBuddyName, setSoberBuddyName] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      if (!user || !userDoc) return;

      try {
        let soberId = user.uid;

        if (!isSober) {
          // If caregiver, find their linked sober user
          if (userDoc.linkedUserIds && userDoc.linkedUserIds.length > 0) {
            soberId = userDoc.linkedUserIds[0];
            
            // Get Link details
            const linkSnap = await getDoc(doc(db, 'links', `${soberId}_${user.uid}`));
            if (linkSnap.exists()) {
              setRelationshipLabel(linkSnap.data().relationshipLabel);
            }

            // Get Buddy Name
            const buddyUserSnap = await getDoc(doc(db, 'users', soberId));
            if (buddyUserSnap.exists()) {
              setSoberBuddyName(buddyUserSnap.data().displayName);
            }
          } else {
            setLoading(false);
            return;
          }
        }

        // Fetch Profile
        const profileSnap = await getDoc(doc(db, 'soberProfiles', soberId));
        if (profileSnap.exists()) {
          setProfile(profileSnap.data() as SoberProfileData);
        }

        // Fetch Contact
        const contactSnap = await getDoc(doc(db, 'emergencyContacts', `${soberId}_primary`));
        if (contactSnap.exists()) {
          setContact(contactSnap.data() as EmergencyContactData);
        }

      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, userDoc, isSober]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('landing');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  const toggleVoiceChat = () => {
    setIsChatActive(!isChatActive);
    setChatMessage(isSober ? 'Daily Check-in active. Speak to SoberBuddy...' : 'Coaching assistant active. Talk to SoberBuddy Coach...');
  };

  const triggerPanicButton = () => {
    setIsPanicActive(!isPanicActive);
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner"></div>
        <p>Loading Dashboard...</p>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-glow"></div>

      {/* Dashboard Navbar */}
      <header className="dashboard-header glass-effect">
        <div className="dashboard-nav-container">
          <div className="dashboard-logo" onClick={() => navigate('landing')}>
            <Heart className="logo-icon animate-pulse" size={22} fill="var(--color-primary)" />
            <span className="logo-text">{t('landing_nav_logo_text')}</span>
          </div>

          <div className="dashboard-header-right">
            <span className="user-greeting">
              {t('dashboard_welcome')}
              <strong>{userDoc?.displayName}</strong>
            </span>
            <Button variant="glass" size="small" onClick={handleLogout}>
              <LogOut size={16} />
              {t('dashboard_btn_logout')}
            </Button>
          </div>
        </div>
      </header>

      {/* Dashboard Main Grid */}
      <main className="dashboard-main">
        
        {/* SOBER USER DASHBOARD */}
        {isSober ? (
          <div className="dashboard-grid-sober">
            
            {/* Left Column: Live Tracker Counter & Quick Actions */}
            <div className="dashboard-col-left">
              <InteractiveCounter />
              
              <Card className="actions-card" glass={true} hoverable={false}>
                <h3>Quick Support</h3>
                <div className="quick-actions-buttons">
                  <Button variant="primary" size="large" onClick={toggleVoiceChat} className="chat-action-btn">
                    <Mic size={20} />
                    {t('dashboard_sober_btn_chat')}
                  </Button>
                  <Button variant="secondary" size="large" onClick={triggerPanicButton} className="panic-action-btn">
                    <AlertTriangle size={20} />
                    {t('dashboard_sober_btn_panic')}
                  </Button>
                </div>
              </Card>
            </div>

            {/* Right Column: Settings & Details */}
            <div className="dashboard-col-right">
              <Card className="settings-card" glass={true} hoverable={false}>
                <div className="settings-card-header">
                  <h3>{t('dashboard_sober_header_profile')}</h3>
                  <span className="badge-sober-active">{t('dashboard_sober_badge')}</span>
                </div>

                <div className="settings-info-list">
                  <div className="settings-info-item">
                    <span className="settings-label">{t('dashboard_sober_label_substance')}</span>
                    <span className="settings-value capitalized">{profile?.substance || 'None'}</span>
                  </div>

                  <div className="settings-info-item">
                    <span className="settings-label">{t('dashboard_sober_label_triggers')}</span>
                    <div className="badge-grid">
                      {profile?.triggers && profile.triggers.length > 0 ? (
                        profile.triggers.map((trig) => (
                          <span key={trig} className="tag-badge badge-trigger">{t(`onboarding_trigger_${trig}`)}</span>
                        ))
                      ) : (
                        <span className="settings-value-none">None specified</span>
                      )}
                    </div>
                  </div>

                  <div className="settings-info-item">
                    <span className="settings-label">{t('dashboard_sober_label_coping')}</span>
                    <div className="badge-grid">
                      {profile?.copingStrategies && profile.copingStrategies.length > 0 ? (
                        profile.copingStrategies.map((cop) => (
                          <span key={cop} className="tag-badge badge-coping">{t(`onboarding_coping_${cop}`)}</span>
                        ))
                      ) : (
                        <span className="settings-value-none">None specified</span>
                      )}
                    </div>
                  </div>

                  <hr className="settings-divider" />

                  <div className="settings-info-item">
                    <span className="settings-label">{t('dashboard_sober_label_contact')}</span>
                    <div className="contact-details-box">
                      <div className="contact-row">
                        <span className="contact-name">{contact?.name || 'No contact added'}</span>
                        {contact?.relationship && (
                          <span className="contact-relation">({contact.relationship})</span>
                        )}
                      </div>
                      {contact?.phone && (
                        <div className="contact-phone">
                          <Phone size={14} />
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
          /* CAREGIVER USER DASHBOARD */
          <div className="dashboard-grid-caregiver">
            
            {/* Left Column: Alerts Log & Actions */}
            <div className="dashboard-col-left">
              <Card className="alerts-card" glass={true} hoverable={false}>
                <h3>{t('dashboard_caregiver_header_alerts')}</h3>
                
                <div className="alerts-list">
                  <div className="alert-item unresolved glass-effect">
                    <div className="alert-item-header">
                      <div className="alert-title-group">
                        <AlertTriangle size={18} className="icon-warning-pulse" />
                        <strong>{t('dashboard_caregiver_alert_chat_title')}</strong>
                      </div>
                      <span className="alert-status-badge pending">{t('dashboard_caregiver_alert_status_pending')}</span>
                    </div>
                    <p className="alert-desc">{t('dashboard_caregiver_alert_chat_desc')}</p>
                    <span className="alert-timestamp">Just now</span>
                  </div>

                  <div className="alert-item resolved glass-effect">
                    <div className="alert-item-header">
                      <div className="alert-title-group">
                        <MapPin size={18} />
                        <strong>{t('dashboard_caregiver_alert_loc_title')}</strong>
                      </div>
                      <span className="alert-status-badge resolved">{t('dashboard_caregiver_alert_status_resolved')}</span>
                    </div>
                    <p className="alert-desc">{t('dashboard_caregiver_alert_loc_desc')}</p>
                    <span className="alert-timestamp">1 hour ago</span>
                  </div>
                </div>
              </Card>

              <Card className="actions-card" glass={true} hoverable={false}>
                <h3>Supporter Coaching</h3>
                <div className="quick-actions-buttons">
                  <Button variant="primary" size="large" onClick={toggleVoiceChat} className="chat-action-btn">
                    <Mic size={20} />
                    {t('dashboard_caregiver_btn_coach')}
                  </Button>
                </div>
              </Card>
            </div>

            {/* Right Column: Buddy Profile & Link Status */}
            <div className="dashboard-col-right">
              <Card className="buddy-profile-card" glass={true} hoverable={false}>
                <div className="buddy-profile-header">
                  <h3>{t('dashboard_caregiver_header_profile')}</h3>
                  <span className="badge-caregiver-active">{t('dashboard_caregiver_badge')}</span>
                </div>

                <div className="buddy-meta-info">
                  <span className="buddy-meta-label">{t('dashboard_caregiver_sober_name')}</span>
                  <span className="buddy-meta-value"><strong>{soberBuddyName || 'Buddy'}</strong></span>
                </div>

                <div className="buddy-meta-info">
                  <span className="buddy-meta-label">{t('dashboard_caregiver_label_relationship')}</span>
                  <span className="buddy-meta-value capitalize">{relationshipLabel || 'Sponsor'}</span>
                </div>

                <div className="consent-verification-alert">
                  <ShieldCheck size={16} />
                  <span>
                    {profile?.confirmedBySober 
                      ? t('dashboard_caregiver_profile_confirmed') 
                      : t('dashboard_caregiver_profile_disclaimer')}
                  </span>
                </div>

                <hr className="settings-divider" />

                <div className="settings-info-list">
                  <div className="settings-info-item">
                    <span className="settings-label">Substance Recovering From</span>
                    <span className="settings-value capitalized">{profile?.substance || 'None'}</span>
                  </div>

                  <div className="settings-info-item">
                    <span className="settings-label">Known Triggers</span>
                    <div className="badge-grid">
                      {profile?.triggers && profile.triggers.length > 0 ? (
                        profile.triggers.map((trig) => (
                          <span key={trig} className="tag-badge badge-trigger">{t(`onboarding_trigger_${trig}`)}</span>
                        ))
                      ) : (
                        <span className="settings-value-none">None specified</span>
                      )}
                    </div>
                  </div>

                  <div className="settings-info-item">
                    <span className="settings-label">Coping Strategies</span>
                    <div className="badge-grid">
                      {profile?.copingStrategies && profile.copingStrategies.length > 0 ? (
                        profile.copingStrategies.map((cop) => (
                          <span key={cop} className="tag-badge badge-coping">{t(`onboarding_coping_${cop}`)}</span>
                        ))
                      ) : (
                        <span className="settings-value-none">None specified</span>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            </div>

          </div>
        )}

      </main>

      {/* MOCK VOICE INTERACTION MODAL POPUP */}
      {isChatActive && (
        <div className="modal-overlay" onClick={toggleVoiceChat}>
          <div className="modal-content glass-effect" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Voice Check-in Active</h3>
              <button className="close-modal-btn" onClick={toggleVoiceChat}>
                <X size={20} />
              </button>
            </div>
            
            <div className="voice-visualizer">
              <div className="waveform-bar bar-1"></div>
              <div className="waveform-bar bar-2"></div>
              <div className="waveform-bar bar-3"></div>
              <div className="waveform-bar bar-4"></div>
              <div className="waveform-bar bar-5"></div>
              <div className="waveform-bar bar-6"></div>
              <div className="waveform-bar bar-7"></div>
            </div>

            <p className="voice-message-text">{chatMessage}</p>
            
            <div className="modal-footer">
              <Button variant="glass" size="medium" onClick={toggleVoiceChat}>
                Disconnect Voice
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MOCK EMERGENCY SCRIPT MODAL */}
      {isPanicActive && (
        <div className="modal-overlay" onClick={triggerPanicButton}>
          <div className="modal-content glass-effect panic-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="panic-modal-title">
                <AlertTriangle size={24} className="text-warning animate-pulse" />
                <h3>Personalized Emergency Script</h3>
              </div>
              <button className="close-modal-btn" onClick={triggerPanicButton}>
                <X size={20} />
              </button>
            </div>

            <div className="script-container">
              <div className="script-box">
                <h4>For You (Self-Talk Calm Script)</h4>
                <p className="script-text blockquote">
                  "I am feeling a strong urge right now, but this is a temporary chemical spike. I am recovering from {profile?.substance || 'substances'} and my mind is reacting to a trigger. I will take deep breaths. Walking or talking to my support is what I do. I am safe in this second."
                </p>
              </div>

              <div className="script-box">
                <h4>For Your Caregiver (When calling {contact?.name || 'Emergency contact'})</h4>
                <p className="script-text blockquote">
                  "Hello, I am calling about a potential relapse risk/acute craving situation. I need support. The recovery profile lists triggers like {profile?.triggers ? profile.triggers.join(', ') : 'stress'} and our coping plan is {profile?.copingStrategies ? profile.copingStrategies.join(', ') : 'walking'}. Please help me coordinate recovery assistance."
                </p>
              </div>
            </div>

            <div className="panic-contacts-quick">
              <div className="quick-contact-row">
                <PhoneCall size={18} className="text-accent" />
                <span>Call Primary Contact: <strong>{contact?.name || 'None'}</strong> ({contact?.phone || 'No Phone'})</span>
              </div>
            </div>

            <div className="modal-footer">
              <Button variant="secondary" size="medium" onClick={triggerPanicButton}>
                Dismiss Safe Screen
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

// Lightweight local close SVG symbol replacement
const X: React.FC<{ size: number }> = ({ size }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round"
  >
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

export default DashboardPage;
