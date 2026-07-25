import React, { useState } from 'react';
import { useAuth } from '../../../shared/context/AuthContext';
import { useTranslation } from '../../../shared/hooks/useTranslation';
import { Card } from '../../../shared/components/Card/Card';
import { Button } from '../../../shared/components/Button/Button';
import { doc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../firebase';
import { Activity, ShieldCheck, Heart, ArrowLeft, ArrowRight, User } from 'lucide-react';
import './OnboardingPage.css';

export const OnboardingPage: React.FC = () => {
  const { user, userDoc, refreshUserDoc } = useAuth();
  const { t } = useTranslation();

  const isSoberRole = userDoc?.role === 'sober';
  
  // States for SoberBuddy questions
  const [step, setStep] = useState(1);
  const [substance, setSubstance] = useState('');
  const [triggers, setTriggers] = useState<string[]>([]);
  const [coping, setCoping] = useState<string[]>([]);
  const [contactName, setContactName] = useState('');
  const [contactRelation, setContactRelation] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [notifyConsent, setNotifyConsent] = useState(false);

  // States specific for Caregiver track
  const [soberName, setSoberName] = useState('');
  const [caregiverRelation, setCaregiverRelation] = useState('');

  const [loading, setLoading] = useState(false);

  // Total steps computation
  const totalSteps = isSoberRole ? 4 : 5;

  const handleSubstanceToggle = (val: string) => {
    setSubstance(val);
  };

  const handleTriggerToggle = (val: string) => {
    setTriggers(prev => 
      prev.includes(val) ? prev.filter(t => t !== val) : [...prev, val]
    );
  };

  const handleCopingToggle = (val: string) => {
    setCoping(prev => 
      prev.includes(val) ? prev.filter(t => t !== val) : [...prev, val]
    );
  };

  const handleNext = () => {
    // Form validations per step
    if (!isSoberRole && step === 1 && (!soberName || !caregiverRelation)) {
      alert('Please fill out all buddy details before continuing.');
      return;
    }
    
    const substanceStep = isSoberRole ? 1 : 2;
    if (step === substanceStep && !substance) {
      alert('Please select a substance to continue.');
      return;
    }

    setStep(prev => Math.min(prev + 1, totalSteps));
  };

  const handleBack = () => {
    setStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    if (!contactName || !contactRelation || !contactPhone) {
      alert('Please fill out all emergency contact details.');
      return;
    }

    if (!user) return;

    setLoading(true);
    try {
      const riskTier = substance === 'opioids' ? 'high' : 'medium';

      if (isSoberRole) {
        // 1. Create Sober Profile
        await setDoc(doc(db, 'soberProfiles', user.uid), {
          substance,
          triggers,
          copingStrategies: coping,
          filledBy: 'self',
          confirmedBySober: true,
          riskTier,
          updatedAt: serverTimestamp()
        });

        // 2. Create Emergency Contact
        await setDoc(doc(db, 'emergencyContacts', `${user.uid}_primary`), {
          soberId: user.uid,
          name: contactName,
          relationship: contactRelation,
          phone: contactPhone,
          notifyConsent,
          isPrimary: true,
          createdAt: serverTimestamp()
        });

        // 3. Update User profile to complete onboarding
        await updateDoc(doc(db, 'users', user.uid), {
          onboardingComplete: true
        });

      } else {
        // Caregiver track setup
        // Generate a mock unique Sober UID linked to this caregiver onboarding
        const mockSoberId = 'sober_' + Math.random().toString(36).substring(2, 9);

        // 1. Create Sober Profile doc on behalf of sober buddy
        await setDoc(doc(db, 'soberProfiles', mockSoberId), {
          substance,
          triggers,
          copingStrategies: coping,
          filledBy: 'caregiver',
          confirmedBySober: false, // flips true once the sober buddy logs in
          riskTier,
          updatedAt: serverTimestamp()
        });

        // 2. Create Emergency Contact doc
        await setDoc(doc(db, 'emergencyContacts', `${mockSoberId}_primary`), {
          soberId: mockSoberId,
          name: contactName,
          relationship: contactRelation,
          phone: contactPhone,
          notifyConsent,
          isPrimary: true,
          createdAt: serverTimestamp()
        });

        // 3. Create Sober <-> Caregiver link document
        await setDoc(doc(db, 'links', `${mockSoberId}_${user.uid}`), {
          soberId: mockSoberId,
          caregiverId: user.uid,
          status: 'accepted',
          relationshipLabel: caregiverRelation,
          canReceiveLocationAlerts: true,
          canReceiveRiskAlerts: true,
          createdAt: serverTimestamp(),
          acceptedAt: serverTimestamp()
        });

        // 4. Update Caregiver user doc
        await updateDoc(doc(db, 'users', user.uid), {
          onboardingComplete: true,
          linkedUserIds: [mockSoberId]
        });

        // 5. Optionally create a placeholder Sober user doc in Firestore to allow future login
        await setDoc(doc(db, 'users', mockSoberId), {
          displayName: soberName,
          role: 'sober',
          onboardingComplete: false,
          linkedUserIds: [user.uid],
          createdAt: serverTimestamp()
        });
      }

      await refreshUserDoc();
    } catch (error) {
      console.error('Onboarding failed:', error);
      alert('Failed to complete onboarding. Please try again.');
      setLoading(false);
    }
  };

  // Substance list
  const substances = [
    { value: 'alcohol', label: t('onboarding_substance_alcohol') },
    { value: 'nicotine', label: t('onboarding_substance_nicotine') },
    { value: 'cannabis', label: t('onboarding_substance_cannabis') },
    { value: 'prescription', label: t('onboarding_substance_prescription') },
    { value: 'opioids', label: t('onboarding_substance_opioids') },
    { value: 'other', label: t('onboarding_substance_other') },
  ];

  // Triggers list
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

  // Coping strategies list
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
    <div className="onboarding-page">
      <div className="onboarding-glow"></div>

      <div className="onboarding-container">
        <Card className="onboarding-card" glass={true} hoverable={false}>
          
          {/* Header */}
          <div className="onboarding-header">
            <Heart className="onboarding-logo-icon animate-pulse" size={32} fill="var(--color-primary)" />
            <h2 className="onboarding-title">
              {isSoberRole ? t('onboarding_title_sober') : t('onboarding_title_caregiver')}
            </h2>
            <p className="onboarding-subtitle">
              {isSoberRole ? t('onboarding_subtitle_sober') : t('onboarding_subtitle_caregiver')}
            </p>
          </div>

          {/* Stepper Progress Bar */}
          <div className="stepper-progress-container">
            <div className="stepper-steps">
              {Array.from({ length: totalSteps }, (_, i) => i + 1).map((s) => (
                <div 
                  key={s} 
                  className={`step-circle ${s === step ? 'active' : ''} ${s < step ? 'completed' : ''}`}
                >
                  {s < step ? <ShieldCheck size={16} /> : s}
                </div>
              ))}
            </div>
            <div className="stepper-bar-track">
              <div 
                className="stepper-bar-fill" 
                style={{ width: `${((step - 1) / (totalSteps - 1)) * 100}%` }}
              ></div>
            </div>
          </div>

          {/* Step Contents */}
          <div className="step-content-area">
            
            {/* CAREGIVER PATH STEP 1: SOBER BUDDY DETAILS */}
            {!isSoberRole && step === 1 && (
              <div className="step-fade-in">
                <h3 className="step-title">Buddy Profile Info</h3>
                <div className="onboarding-form">
                  <div className="form-group">
                    <label className="form-label" htmlFor="soberName">
                      <User size={16} />
                      {t('onboarding_label_sober_name')}
                    </label>
                    <input
                      id="soberName"
                      type="text"
                      className="form-input"
                      value={soberName}
                      onChange={(e) => setSoberName(e.target.value)}
                      placeholder="Enter their display name"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="caregiverRelation">
                      <Activity size={16} />
                      {t('onboarding_label_relationship')}
                    </label>
                    <input
                      id="caregiverRelation"
                      type="text"
                      className="form-input"
                      value={caregiverRelation}
                      onChange={(e) => setCaregiverRelation(e.target.value)}
                      placeholder="e.g. Mother, Sponsor, Partner"
                      required
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Q1: SUBSTANCE SELECTION */}
            {step === (isSoberRole ? 1 : 2) && (
              <div className="step-fade-in">
                <h3 className="step-title">
                  {isSoberRole ? 'What substance are you recovering from?' : `What substance is ${soberName || 'your buddy'} recovering from?`}
                </h3>
                <div className="selection-grid">
                  {substances.map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      className={`select-option-btn ${substance === item.value ? 'selected' : ''}`}
                      onClick={() => handleSubstanceToggle(item.value)}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Q2: TRIGGERS MULTI-SELECT */}
            {step === (isSoberRole ? 2 : 3) && (
              <div className="step-fade-in">
                <h3 className="step-title">{t('onboarding_q_triggers')}</h3>
                <div className="selection-grid">
                  {triggerList.map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      className={`select-option-btn ${triggers.includes(item.value) ? 'selected' : ''}`}
                      onClick={() => handleTriggerToggle(item.value)}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Q3: COPING STRATEGIES MULTI-SELECT */}
            {step === (isSoberRole ? 3 : 4) && (
              <div className="step-fade-in">
                <h3 className="step-title">{t('onboarding_q_coping')}</h3>
                <div className="selection-grid">
                  {copingList.map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      className={`select-option-btn ${coping.includes(item.value) ? 'selected' : ''}`}
                      onClick={() => handleCopingToggle(item.value)}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Q4: EMERGENCY CONTACT & CONSENT */}
            {step === (isSoberRole ? 4 : 5) && (
              <div className="step-fade-in">
                <h3 className="step-title">{t('onboarding_q_contact')}</h3>
                <div className="onboarding-form">
                  <div className="form-group">
                    <label className="form-label" htmlFor="contactName">
                      {t('onboarding_label_contact_name')}
                    </label>
                    <input
                      id="contactName"
                      type="text"
                      className="form-input"
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      placeholder="e.g. Meera"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="contactRelation">
                      Relationship
                    </label>
                    <input
                      id="contactRelation"
                      type="text"
                      className="form-input"
                      value={contactRelation}
                      onChange={(e) => setContactRelation(e.target.value)}
                      placeholder="e.g. Mother, Sponsor, Friend"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="contactPhone">
                      {t('onboarding_label_contact_phone')}
                    </label>
                    <input
                      id="contactPhone"
                      type="tel"
                      className="form-input"
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      placeholder="e.g. +91XXXXXXXXXX"
                      required
                    />
                  </div>
                  
                  <div className="consent-checkbox-container">
                    <input
                      id="consent-check"
                      type="checkbox"
                      className="consent-checkbox"
                      checked={notifyConsent}
                      onChange={(e) => setNotifyConsent(e.target.checked)}
                    />
                    <label htmlFor="consent-check" className="consent-checkbox-label">
                      {t('onboarding_label_consent')}
                    </label>
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* Stepper Navigation Buttons */}
          <div className="onboarding-actions">
            {step > 1 ? (
              <Button variant="glass" size="medium" onClick={handleBack} disabled={loading}>
                <ArrowLeft size={16} />
                {t('onboarding_btn_back')}
              </Button>
            ) : (
              <div /> // Spacer
            )}

            {step < totalSteps ? (
              <Button variant="primary" size="medium" onClick={handleNext}>
                {t('onboarding_btn_next')}
                <ArrowRight size={16} />
              </Button>
            ) : (
              <Button variant="primary" size="large" onClick={handleSubmit} disabled={loading}>
                {loading ? 'Submitting...' : t('onboarding_btn_submit')}
                <ShieldCheck size={18} />
              </Button>
            )}
          </div>

        </Card>
      </div>
    </div>
  );
};
export default OnboardingPage;
