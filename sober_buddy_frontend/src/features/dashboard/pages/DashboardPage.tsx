import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../../shared/context/AuthContext';
import { useRouter } from '../../../shared/context/RouterContext';
import { useTranslation } from '../../../shared/hooks/useTranslation';
import { Button } from '../../../shared/components/Button/Button';
import { Card } from '../../../shared/components/Card/Card';
import { chatService } from '../../../shared/services/chat.service';
import type { ChatMessage } from '../../../shared/services/chat.service';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../firebase';
import { LogOut, Heart, Phone, AlertTriangle, ShieldCheck, MapPin, Mic, PhoneCall, Send, Sparkles } from 'lucide-react';
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

  // Firestore Chat States
  const [sessionId, setSessionId] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isAiTyping, setIsAiTyping] = useState(false);

  // Caregiver Coaching Chat States
  const [coachingSessionId, setCoachingSessionId] = useState<string>('');
  const [coachingMessages, setCoachingMessages] = useState<ChatMessage[]>([]);
  const [coachingInput, setCoachingInput] = useState('');
  const [isCoachingAiTyping, setIsCoachingAiTyping] = useState(false);

  // UI state toggles
  const [isCoachingActive, setIsCoachingActive] = useState(false);
  const [isPanicActive, setIsPanicActive] = useState(false);
  const [isVoiceRecording, setIsVoiceRecording] = useState(false);

  // caregiver links label
  const [relationshipLabel, setRelationshipLabel] = useState('');
  const [soberBuddyName, setSoberBuddyName] = useState('');

  const chatEndRef = useRef<HTMLDivElement>(null);
  const coachingEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition; // eslint-disable-line @typescript-eslint/no-explicit-any
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = 'en-US';

      rec.onresult = (event: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
        let fullTranscript = '';
        for (let i = 0; i < event.results.length; ++i) {
          fullTranscript += event.results[i][0].transcript;
        }
        setInputMessage(fullTranscript);
      };

      rec.onerror = (event: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
        console.error('Speech recognition error:', event.error);
        setIsVoiceRecording(false);
      };

      rec.onend = () => {
        setIsVoiceRecording(false);
      };

      recognitionRef.current = rec;
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  // Auto-scroll chats
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    coachingEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [coachingMessages]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user || !userDoc) return;

      try {
        let soberId = user.uid;

        if (!isSober) {
          if (userDoc.linkedUserIds && userDoc.linkedUserIds.length > 0) {
            soberId = userDoc.linkedUserIds[0];
            
            const linkSnap = await getDoc(doc(db, 'links', `${soberId}_${user.uid}`));
            if (linkSnap.exists()) {
              setRelationshipLabel(linkSnap.data().relationshipLabel);
            }

            const buddyUserSnap = await getDoc(doc(db, 'users', soberId));
            if (buddyUserSnap.exists()) {
              setSoberBuddyName(buddyUserSnap.data().displayName);
            }
          }
        }

        // Fetch Profile & Contact
        const profileSnap = await getDoc(doc(db, 'soberProfiles', soberId));
        if (profileSnap.exists()) {
          setProfile(profileSnap.data() as SoberProfileData);
        }

        const contactSnap = await getDoc(doc(db, 'emergencyContacts', `${soberId}_primary`));
        if (contactSnap.exists()) {
          setContact(contactSnap.data() as EmergencyContactData);
        }

        // Setup Chat Sessions
        if (isSober) {
          const activeSessionId = await chatService.getOrCreateActiveSession(user.uid, 'sober');
          setSessionId(activeSessionId);
        }

      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, userDoc, isSober]);

  // Subscribe to Sober Chat Messages
  useEffect(() => {
    if (!sessionId) return;
    const unsubscribe = chatService.subscribeToMessages(sessionId, (msgs) => {
      setMessages(msgs);
      setIsAiTyping(false); // Stop typing once messages arrive
    });
    return () => unsubscribe();
  }, [sessionId]);

  // Subscribe to Caregiver Coaching Messages
  useEffect(() => {
    if (!coachingSessionId) return;
    const unsubscribe = chatService.subscribeToMessages(coachingSessionId, (msgs) => {
      setCoachingMessages(msgs);
      setIsCoachingAiTyping(false);
    });
    return () => unsubscribe();
  }, [coachingSessionId]);

  // Send message from Sober Buddy to AI
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || !sessionId || !user) return;

    const text = inputMessage;
    setInputMessage('');
    setIsAiTyping(true);

    if (isVoiceRecording && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      setIsVoiceRecording(false);
    }

    // Send user message
    await chatService.sendMessage(sessionId, 'user', text);
    
    // Trigger demo fallback reply logic
    await chatService.triggerDemoFallbackReply(sessionId, text, user.uid);
  };

  // Send message from Caregiver to AI Coach
  const handleSendCoachingMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!coachingInput.trim() || !coachingSessionId) return;

    const text = coachingInput;
    setCoachingInput('');
    setIsCoachingAiTyping(true);

    // Send caregiver message
    await chatService.sendMessage(coachingSessionId, 'user', text);

    // Trigger Coach simulated reply
    setTimeout(async () => {
      let aiText: string;
      const lower = text.toLowerCase();

      if (lower.includes('drink') || lower.includes('use') || lower.includes('craving') || lower.includes('relapse')) {
        aiText = `When supporting ${soberBuddyName || 'your buddy'}, it is critical to stay calm and non-confrontational. Refrain from using blame or shaming language. Remind them that cravings peak quickly and suggest their primary coping strategy: ${profile?.copingStrategies ? profile.copingStrategies[0] : 'going for a walk'}.`;
      } else if (lower.includes('stress') || lower.includes('conflict') || lower.includes('angry')) {
        aiText = `Conflict can be a severe trigger. DO NOT try to resolve deep arguments right now. Offer a safe space, suggest taking a break, and advise them to step away. Recommend they try ${profile?.copingStrategies ? profile.copingStrategies[0] : 'listening to music'}.`;
      } else {
        aiText = `As a caregiver, your presence is a powerful safety net. Validate their feelings without judging, and ensure their emergency contacts are up to date if they flag higher risk.`;
      }

      await chatService.sendMessage(coachingSessionId, 'ai', aiText);
    }, 1500);
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('landing');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  // Toggle Caregiver Coaching Modal
  const openCoachingModal = async () => {
    setIsCoachingActive(true);
    if (!coachingSessionId && user) {
      const activeSessionId = await chatService.getOrCreateActiveSession(user.uid, 'caregiver');
      setCoachingSessionId(activeSessionId);
    }
  };

  // Real Mic/Voice input via SpeechRecognition
  const toggleVoiceInput = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in this browser. Please try Chrome or Safari.');
      return;
    }

    if (isVoiceRecording) {
      recognitionRef.current.stop();
      setIsVoiceRecording(false);
    } else {
      setIsVoiceRecording(true);
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.error('Error starting recognition:', err);
        setIsVoiceRecording(false);
      }
    }
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
            
            {/* Left Column: Fully Functional Chat Interface */}
            <div className="dashboard-col-left">
              <Card className="chat-interface-card" glass={true} hoverable={false}>
                <div className="chat-card-header">
                  <div className="chat-header-title-group">
                    <Sparkles size={20} className="icon-sparkle-active" fill="var(--color-primary)" />
                    <div>
                      <h3>SoberBuddy Chat</h3>
                      <span className="chat-status-badge">AI Assistant Online</span>
                    </div>
                  </div>
                  <Button variant="glass" size="small" onClick={triggerPanicButton} className="panic-trigger-btn">
                    <AlertTriangle size={16} />
                    {t('dashboard_sober_btn_panic')}
                  </Button>
                </div>

                {/* Message display thread */}
                <div className="chat-messages-container">
                  {messages.length === 0 ? (
                    <div className="empty-chat-welcome">
                      <Heart size={32} className="welcome-heart" />
                      <p>Welcome! How are you feeling today? Tap the microphone or type below to start checking in.</p>
                    </div>
                  ) : (
                    messages.map((msg) => (
                      <div key={msg.id} className={`chat-bubble-row ${msg.sender === 'user' ? 'user-row' : 'ai-row'}`}>
                        <div className="avatar-wrapper">
                          {msg.sender === 'user' ? 'U' : <Sparkles size={12} fill="var(--color-primary)" />}
                        </div>
                        <div className="bubble-content">
                          <span className="bubble-sender">
                            {msg.sender === 'user' ? 'You' : 'SoberBuddy AI'}
                          </span>
                          <p className="bubble-text">{msg.transcript}</p>
                        </div>
                      </div>
                    ))
                  )}
                  {isAiTyping && (
                    <div className="chat-bubble-row ai-row">
                      <div className="avatar-wrapper">
                        <Sparkles size={12} />
                      </div>
                      <div className="bubble-content">
                        <div className="typing-dots">
                          <span></span>
                          <span></span>
                          <span></span>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Form Inputs */}
                <form onSubmit={handleSendMessage} className="chat-input-form">
                  <Button 
                    type="button" 
                    variant={isVoiceRecording ? 'primary' : 'glass'} 
                    size="medium" 
                    onClick={toggleVoiceInput}
                    className={`voice-mic-btn ${isVoiceRecording ? 'recording' : ''}`}
                    title="Simulate Speech to Text"
                  >
                    <Mic size={18} />
                  </Button>
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder={isVoiceRecording ? 'Listening... tap again to transcribe' : 'Type to check-in...'}
                    className="chat-text-input"
                    disabled={isVoiceRecording}
                  />
                  <Button variant="primary" size="medium" type="submit" disabled={!inputMessage.trim()}>
                    <Send size={16} />
                  </Button>
                </form>
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
                <h3>AI Support Guidance</h3>
                <div className="quick-actions-buttons">
                  <Button variant="primary" size="large" onClick={openCoachingModal} className="chat-action-btn">
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

      {/* CAREGIVER REAL-TIME COACHING CHAT MODAL */}
      {isCoachingActive && (
        <div className="modal-overlay" onClick={() => setIsCoachingActive(false)}>
          <div className="modal-content glass-effect coaching-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="coaching-modal-title">
                <Sparkles size={20} className="icon-sparkle-active" fill="var(--color-primary)" />
                <h3>AI Coaching Advisor</h3>
              </div>
              <button className="close-modal-btn" onClick={() => setIsCoachingActive(false)}>
                <X size={20} />
              </button>
            </div>

            {/* Message thread */}
            <div className="coaching-chat-window">
              {coachingMessages.length === 0 ? (
                <div className="coaching-chat-welcome">
                  <Sparkles size={32} className="welcome-sparkle" />
                  <p>Welcome to Caregiver Coach. Type a query below to get custom dos and don'ts scripts based on {soberBuddyName || 'your buddy'}'s triggers.</p>
                </div>
              ) : (
                coachingMessages.map((msg) => (
                  <div key={msg.id} className={`chat-bubble-row ${msg.sender === 'user' ? 'user-row' : 'ai-row'}`}>
                    <div className="avatar-wrapper">
                      {msg.sender === 'user' ? 'U' : <Sparkles size={12} fill="var(--color-primary)" />}
                    </div>
                    <div className="bubble-content">
                      <span className="bubble-sender">
                        {msg.sender === 'user' ? 'You' : 'AI Supporter Coach'}
                      </span>
                      <p className="bubble-text">{msg.transcript}</p>
                    </div>
                  </div>
                ))
              )}
              {isCoachingAiTyping && (
                <div className="chat-bubble-row ai-row">
                  <div className="avatar-wrapper">
                    <Sparkles size={12} />
                  </div>
                  <div className="bubble-content">
                    <div className="typing-dots">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={coachingEndRef} />
            </div>

            {/* Input Form */}
            <form onSubmit={handleSendCoachingMessage} className="chat-input-form">
              <input
                type="text"
                value={coachingInput}
                onChange={(e) => setCoachingInput(e.target.value)}
                placeholder={`Ask Coach how to support ${soberBuddyName || 'your buddy'}...`}
                className="chat-text-input"
              />
              <Button variant="primary" size="medium" type="submit" disabled={!coachingInput.trim()}>
                <Send size={16} />
              </Button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

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
