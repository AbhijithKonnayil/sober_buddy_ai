# Product Requirements Document
## Recovery & Prevention Platform — GenAI-Powered Support for Sobers & Caregivers

**Version:** 1.0 (Hackathon MVP)
**Status:** Draft for build

---

## 1. Problem Statement

People recovering from substance use disorder (SUD) — referred to here as **"Sobers"** — often relapse during moments of high cognitive load: cravings, stress spikes, loneliness, or conflict. In these moments, typing out a request for help is friction they can't overcome. Caregivers (family, partners, friends) around them often don't know what to say or do in real time, and generic advice doesn't reflect the Sober's actual triggers or history.

This platform closes that gap with a **voice-first, GenAI-powered companion** for both Sobers and Caregivers, personalized from day one through a short onboarding flow, and backed by contextual safety tools (crisis contacts, location-based alerts).

---

## 2. Users & Personas

### Persona 1: The Sober
Someone actively in recovery who needs low-friction, immediate, non-judgmental support in the moment a craving or trigger hits — without needing to explain their whole history every time.

### Persona 2: The Caregiver
A trusted person (parent, partner, friend) linked to a Sober, who wants to know **how to respond** in the moment — what to say, what not to say, when to worry, when to escalate — and who may receive alerts if the Sober is at risk.

**Relationship model:** A Sober can have one or more linked Caregivers. A Caregiver can be linked to one or more Sobers. Either party can initiate the link; the other must accept (consent-gated).

---

## 3. Core Design Principle

> **Zero-typing when it matters most.**

Every crisis-facing surface must be usable by voice or single tap. Typing is only acceptable in low-stakes screens (settings, onboarding, journaling — optional).

---

## 4. Onboarding Flow

Available to both Sobers and Caregivers. A Caregiver can fill it out **on behalf of** a Sober (e.g., a parent setting up the app for their child), with the Sober able to review/edit later. This dual-entry path should be flagged in the data model (`filled_by: self | caregiver`) since it affects tone of AI responses (a caregiver-filled profile is inferred, not confirmed, until the Sober logs in and confirms it).

**Sign-in:** Email-based login for both user types.

### Q1 — Substance
*"What substance are you recovering from?"*
Single-select: Alcohol / Nicotine / Cannabis / Prescription medication / Opioids / Other
→ Drives withdrawal-symptom awareness, risk tier (e.g., opioids = higher overdose risk → tighter safety net), and tone of AI language.

### Q2 — Triggers
*"What usually triggers your cravings?"*
Multi-select: Stress / Loneliness / Anxiety / Friends using substances / Parties / Relationship conflicts / Work pressure / Poor sleep / Other
→ Used for pattern-matching in conversation (semantic detection, not keyword-matching) and for proactive nudges.

### Q3 — Coping strategies
*"What helps you avoid using substances?"*
Multi-select: Calling someone / Walking / Music / Meditation / Movies / Journaling / Prayer / Talking to AI / Other
→ AI prioritizes **the user's own proven coping methods** before generic suggestions.

### Q4 — Emergency contact
*"Who should we contact if you're in crisis?"*
Collect: Name, Relationship, Phone number (simulated in demo)
→ Powers the emergency script generator and (with consent) caregiver notification.

**Note on consent:** Add a clear consent toggle here — *"Allow this contact to be notified automatically in high-risk situations"* — separate from just storing the number. This matters both ethically and for judging (shows responsible design).

---

## 5. Core Feature Set (MVP)

### 5.1 Voice-First Chat — Sober View
- Tap-and-hold or wake-word to talk; no keyboard required to start a session.
- Audio → Speech-to-Text → LLM (with onboarding profile as system context) → Text-to-Speech response, streamed back conversationally.
- The LLM prompt is **grounded in the user's Q1–Q3 answers** so responses reference their actual triggers and coping tools, not generic advice.
- Immediate response pattern for a detected craving/relapse-risk message:
  1. Brief grounding/validation (not clinical, not preachy)
  2. One concrete next action pulled from their own coping list ("You said walking helps — want a 5-minute walk prompt?")
  3. Offer to escalate (call trusted contact / view emergency script) — never forced, always offered

### 5.2 Voice-First Chat — Caregiver View
- Same voice-first mechanic, different system prompt: coaches the caregiver in real time.
- Caregiver can describe a situation ("She just told me she wants to drink tonight, what do I say?") and receive:
  - A short **do/don't script** tailored to the Sober's profile (e.g., avoid mentioning "willpower" if conflict is a listed trigger)
  - Tone guidance (calm, non-confrontational phrasing)
  - When to step back vs. when to escalate to professional/emergency help

### 5.3 Personalized Emergency Scripts
GenAI-generated, not static templates — built from the Sober's substance type, trigger context, and emergency contact info. Two variants:
- **For the Sober**: a self-talk script to read/hear during acute craving ("say this out loud to yourself")
- **For the Caregiver**: what to say when calling the trusted contact or emergency services, including relevant medical context (substance, known risk factors) — critical for opioid-risk users where every second counts

### 5.4 Location-Based Safety Alerts
- Sober can (opt-in, consent-based) share location with the app.
- User or caregiver can flag known high-risk locations (e.g., a specific bar, a dealer's neighborhood) during onboarding or later in settings.
- If the Sober's location matches a flagged zone, the app can:
  - Gently check in with the Sober first ("Notice you're near [flagged area] — want to talk?")
  - Only notify the caregiver if the Sober doesn't respond within a set window, or if they explicitly ask for help
- **Design principle: this is a safety net, not surveillance.** Silent, un-consented caregiver notification erodes trust and autonomy — the Sober should always know this feature is active and be able to disable it. This nuance is worth stating explicitly in your pitch; judges evaluating a health-tech product will look for exactly this kind of care.

### 5.5 Educational Resource Layer
- A lightweight, always-accessible library of vetted content (withdrawal symptoms by substance, stages of recovery, harm-reduction basics, how to talk to someone in relapse).
- AI chat can cite/link into this content rather than freely generating medical claims — reduces hallucination risk on clinical topics.

---

## 6. Suggested Data Model (simplified)

| Entity | Key fields |
|---|---|
| User | id, email, role (sober/caregiver), linked_users[] |
| SoberProfile | substance, triggers[], coping_strategies[], filled_by |
| EmergencyContact | name, relationship, phone, notify_consent (bool) |
| FlaggedLocation | label, lat/lng, radius, added_by |
| ChatSession | user_id, transcript, risk_flags[], timestamp |
| AlertEvent | trigger_type (location/chat), status, caregiver_notified (bool) |

---

## 7. Suggested Architecture (hackathon-feasible)

- **Frontend:** Flutter (cross-platform, good for voice UI + push notifications + background location) or React web if time-constrained
- **Speech:** Whisper (STT) + a TTS API (ElevenLabs / platform-native) for low-latency voice loop
- **LLM layer:** Claude/GPT via API, with a **system prompt template engine** that injects the Sober's profile fields per request — this is the crux of "personalization" for judges
- **Risk detection:** a lightweight classifier prompt or few-shot pattern in the LLM call itself (flag: low/medium/high risk) rather than a separate ML model — faster to build, easier to demo
- **Backend:** Firebase (Auth, Firestore, Cloud Functions) — fast to stand up, matches your stated experience, good for real-time location + notification triggers
- **Location:** device geolocation + geofencing (simulate with mock coordinates for demo reliability)

---

## 8. Safety & Ethical Guardrails (important for judging)

1. **AI never diagnoses or replaces clinical care** — every high-risk flag should include a clear path to a human (trusted contact, helpline, or emergency services), not just AI reassurance.
2. **Consent is explicit and revocable** at every layer — location sharing, caregiver auto-notify, emergency contact use.
3. **Crisis detection should fail safe** — if uncertain whether a message indicates real danger, the app should offer help rather than assume and act unilaterally.
4. **No shaming language, ever** — a single AI response using guilt/blame framing can undo trust in the whole product; system prompts should explicitly encode this.
5. **Data sensitivity** — SUD status, location history, and family contact info are highly sensitive; even for a demo, mention encryption-at-rest and access scoping in your pitch.

---

## 9. MVP Scope for the Hackathon (what to actually build in the time you have)

**Must-have (demoable):**
- Email login, two roles
- 4-question onboarding (self-fill only if time-constrained; caregiver-fill as stretch)
- Voice chat for Sober (STT → LLM with profile context → TTS)
- Voice chat for Caregiver (same pipe, different prompt)
- One emergency script generation demo (button-triggered, not fully automatic detection if time is short)
- Static educational content page

**Cut if short on time:**
- Real location tracking → simulate with a "Simulate entering flagged zone" demo button
- Actual SMS/call to emergency contact → mock the notification UI instead
- Multi-caregiver linking → hardcode one Sober-Caregiver pair for demo

---

## 10. Feature Extensions (Post-Hackathon Roadmap)

### Near-term
- **Mood/craving check-in streaks** — daily 10-second voice check-in, builds a longitudinal risk signal over time instead of only reacting to acute events
- **Caregiver dashboard** — trend view (not raw transcripts, for privacy) showing risk-level over time, so caregivers aren't blindsided
- **Multi-caregiver support & role-based alerts** — e.g., partner gets first alert, parent gets escalation alert
- **Sponsor/peer-support integration** — connect to AA/NA-style peer networks, not just family
- **Relapse-safe mode** — if a relapse does happen, shift tone from prevention to non-judgmental harm-reduction and re-engagement, rather than the app going silent or punitive

### Mid-term
- **Wearable integration** — heart rate/sleep signals (e.g., poor sleep is already a listed trigger) as a secondary risk signal alongside self-report
- **Localized emergency resources** — auto-surface nearest naloxone access point, detox center, or crisis line based on GPS, especially for opioid-risk users
- **Multilingual & regional adaptation** — language, cultural framing of family involvement, and local emergency numbers
- **Clinician/therapist view** — opt-in summary export a Sober can share with their actual treatment provider

### Long-term
- **Predictive risk modeling** — using anonymized, consented longitudinal data across users to improve early-warning accuracy (would need serious privacy/ethics review, not just an engineering task)
- **Insurance/healthcare system integration** — for structured aftercare programs
- **Community support circles** — small, moderated group chat spaces for Sobers with similar triggers

---

## 11. Success Metrics (for pitching / demo narrative)

- Time-to-help: seconds from "craving starts" to "user has a concrete next step" (should be near-zero given zero-typing design)
- % of chat sessions where AI references the user's *own* coping strategies (proof of personalization, not generic chatbot)
- Caregiver-reported confidence in knowing "what to say" during a crisis (even a simple pre/post survey in your pitch deck helps here)

---

## 12. One-Line Pitch

*"A voice-first AI companion that turns a 4-question onboarding into personalized, judgment-free support — for both the person in recovery and the people who love them — right at the moment willpower is hardest to find."*