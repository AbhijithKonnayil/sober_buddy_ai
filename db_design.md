# Firebase Database Design
## Recovery & Prevention Platform

**Database:** Cloud Firestore (NoSQL, document-based)
**Auth:** Firebase Authentication (Email/Password)

---

## 1. Design Principles

- **Firestore, not Realtime Database** — better querying, security rules, and scaling for this data shape (nested profiles, chat history, relationships).
- **Denormalize where reads are frequent** (e.g., store `soberName` on a caregiver's linked-user reference) to avoid extra reads during voice-chat latency-sensitive calls.
- **Subcollections for unbounded, append-only data** (chat messages, alert events) — keeps parent documents small and fast to read.
- **Sensitive fields isolated** into their own documents/collections so security rules can restrict them independently (e.g., location history should never be readable by anyone except the linked caregiver with explicit consent, not by the general app).

---

## 2. Top-Level Collections

```
users/{userId}
soberProfiles/{soberId}
links/{linkId}
emergencyContacts/{contactId}
chatSessions/{sessionId}/messages/{messageId}
flaggedLocations/{locationId}
locationPings/{soberId}/pings/{pingId}
alertEvents/{alertId}
educationalContent/{contentId}
```

---

## 3. Collection Details

### 3.1 `users/{userId}`
Core identity document. `userId` = Firebase Auth UID.

```json
{
  "email": "abhi@example.com",
  "role": "sober",              // "sober" | "caregiver"
  "displayName": "Abhi",
  "createdAt": Timestamp,
  "linkedUserIds": ["userId2", "userId3"],  // denormalized for quick lookup
  "onboardingComplete": true,
  "fcmToken": "..."              // for push notifications
}
```

**Why `linkedUserIds` here too (in addition to `links` collection):** lets you read "who is this person connected to" with a single doc read on login, instead of a query — matters for a fast app-open experience.

---

### 3.2 `soberProfiles/{soberId}`
`soberId` == the Sober's `userId`. One profile per Sober (1:1), even if a caregiver filled it out initially.

```json
{
  "substance": "opioids",                     // Q1
  "triggers": ["stress", "loneliness", "poor_sleep"],   // Q2, multi-select
  "copingStrategies": ["walking", "music", "talking_to_ai"], // Q3
  "filledBy": "caregiver",                    // "self" | "caregiver"
  "confirmedBySober": false,                  // flips true once Sober logs in & reviews
  "riskTier": "high",                         // derived from substance (opioids = high)
  "updatedAt": Timestamp
}
```

**Why separate from `users`:** onboarding data is more sensitive than account data and may need different read rules (e.g., a caregiver filling it out shouldn't retroactively get broader read access than consented).

---

### 3.3 `emergencyContacts/{contactId}`
Subcollection under the Sober is also a valid option — shown here as top-level with `soberId` reference for simpler querying (`where soberId ==`).

```json
{
  "soberId": "userId1",
  "name": "Meera",
  "relationship": "Mother",
  "phone": "+91XXXXXXXXXX",   // simulate in demo — don't store real numbers in a hackathon demo DB
  "notifyConsent": true,       // explicit opt-in for auto-notification
  "isPrimary": true,
  "createdAt": Timestamp
}
```

A Sober can have multiple contacts (mother, sponsor, friend) — that's why this is its own collection rather than a single embedded field.

---

### 3.4 `links/{linkId}`
Represents the Sober↔Caregiver relationship, including consent state — this is the gate that controls whether a caregiver can see anything about a specific Sober.

```json
{
  "soberId": "userId1",
  "caregiverId": "userId2",
  "status": "accepted",        // "pending" | "accepted" | "revoked"
  "relationshipLabel": "Mother",
  "canReceiveLocationAlerts": true,
  "canReceiveRiskAlerts": true,
  "createdAt": Timestamp,
  "acceptedAt": Timestamp
}
```

`linkId` suggestion: `${soberId}_${caregiverId}` — makes existence-checks a direct doc read instead of a query.

**This is the most important document in the whole schema for privacy.** Every security rule and every alert-dispatch Cloud Function should check `links` before showing a caregiver anything about a Sober.

---

### 3.5 `chatSessions/{sessionId}`
One doc per conversation session (e.g., per app-open or per day).

```json
{
  "userId": "userId1",
  "role": "sober",             // whose chat mode this is
  "startedAt": Timestamp,
  "lastMessageAt": Timestamp,
  "highestRiskFlag": "medium"  // rolled up from messages, for quick dashboard queries
}
```

#### Subcollection: `chatSessions/{sessionId}/messages/{messageId}`
```json
{
  "sender": "user",            // "user" | "ai"
  "transcript": "I really want to drink tonight",
  "audioUrl": "gs://.../clip.wav",   // optional, Cloud Storage reference
  "riskFlag": "high",          // "none" | "low" | "medium" | "high" — set by LLM classification
  "matchedTriggers": ["relationship_conflict"],
  "timestamp": Timestamp
}
```

**Why messages are a subcollection, not an array field:** arrays in a single doc will hit the 1MB document size limit fast with voice-chat volume, and you lose the ability to paginate/query by risk flag efficiently.

---

### 3.6 `flaggedLocations/{locationId}`
```json
{
  "soberId": "userId1",
  "label": "Old hangout spot",
  "lat": 8.5241,
  "lng": 76.9366,
  "radiusMeters": 200,
  "addedBy": "caregiver",       // or "self"
  "createdAt": Timestamp
}
```

### 3.7 `locationPings/{soberId}/pings/{pingId}`
Subcollection per Sober — high write volume, so isolate it from the profile doc entirely.

```json
{
  "lat": 8.5241,
  "lng": 76.9366,
  "timestamp": Timestamp,
  "matchedFlaggedLocationId": "locationId1"   // null if no match
}
```

**Retention note:** for the real product (not the demo), auto-delete pings older than X days via a scheduled Cloud Function — indefinite location history storage is a real liability and worth mentioning in your pitch as a "we thought about this" point.

---

### 3.8 `alertEvents/{alertId}`
The audit trail of every safety event — powers the caregiver dashboard and demo storyline.

```json
{
  "soberId": "userId1",
  "caregiverIdsNotified": ["userId2"],
  "triggerType": "location",      // "location" | "chat_risk"
  "sourceId": "pingId123",        // reference to the ping or message that triggered it
  "soberRespondedFirst": true,    // did the Sober get a check-in before caregiver was notified
  "status": "resolved",           // "pending" | "escalated" | "resolved"
  "createdAt": Timestamp,
  "resolvedAt": Timestamp
}
```

### 3.9 `educationalContent/{contentId}`
Static/CMS-style content — can even be seeded once and left mostly read-only.

```json
{
  "title": "Understanding Opioid Withdrawal",
  "substance": "opioids",
  "body": "...",
  "tags": ["withdrawal", "safety"],
  "order": 1
}
```

---

## 4. Entity-Relationship Summary

```
users (1) ──── (1) soberProfiles          [only for role: sober]
users (1) ──── (*) emergencyContacts       [via soberId]
users (sober) (*) ──── (*) users (caregiver)   via links collection
chatSessions (1) ──── (*) messages
users (sober) (1) ──── (*) flaggedLocations
users (sober) (1) ──── (*) locationPings   [subcollection]
alertEvents (*) ──── references ──── flaggedLocations / messages
```

---

## 5. Suggested Security Rules (core logic, simplified)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isSignedIn() {
      return request.auth != null;
    }

    function isOwner(userId) {
      return isSignedIn() && request.auth.uid == userId;
    }

    // A caregiver can only read a Sober's sensitive data if an accepted link exists
    function isLinkedCaregiver(soberId) {
      return isSignedIn() && exists(
        /databases/$(database)/documents/links/$(soberId + '_' + request.auth.uid)
      ) && get(
        /databases/$(database)/documents/links/$(soberId + '_' + request.auth.uid)
      ).data.status == 'accepted';
    }

    match /users/{userId} {
      allow read: if isOwner(userId) || isLinkedCaregiver(userId);
      allow write: if isOwner(userId);
    }

    match /soberProfiles/{soberId} {
      allow read: if isOwner(soberId) || isLinkedCaregiver(soberId);
      allow write: if isOwner(soberId) || isLinkedCaregiver(soberId); // allow caregiver-fill on behalf of sober
    }

    match /chatSessions/{sessionId} {
      allow read, write: if isOwner(resource.data.userId);
      // caregivers do NOT get raw chat transcript access by default — dashboard should
      // only expose rolled-up risk trends via a Cloud Function, not raw messages
    }

    match /flaggedLocations/{locId} {
      allow read: if isOwner(resource.data.soberId) || isLinkedCaregiver(resource.data.soberId);
      allow write: if isOwner(resource.data.soberId) || isLinkedCaregiver(resource.data.soberId);
    }

    match /locationPings/{soberId}/pings/{pingId} {
      allow read: if isOwner(soberId) ||
        (isLinkedCaregiver(soberId) &&
         get(/databases/$(database)/documents/links/$(soberId + '_' + request.auth.uid)).data.canReceiveLocationAlerts == true);
      allow write: if isOwner(soberId); // only the Sober's device writes its own pings
    }

    match /alertEvents/{alertId} {
      allow read: if isOwner(resource.data.soberId) ||
        request.auth.uid in resource.data.caregiverIdsNotified;
      allow write: if false; // only Cloud Functions (admin SDK) create alert events
    }

    match /educationalContent/{contentId} {
      allow read: if isSignedIn();
      allow write: if false; // seeded/managed by admin only
    }
  }
}
```

**Key deliberate choice:** raw chat transcripts are never directly readable by a caregiver, even a linked/consented one — only rolled-up `riskFlag` trends via `alertEvents` and a summarized Cloud Function view. This protects the Sober's candidness in chat (they'll self-censor if they think a parent can read every message) while still giving caregivers the safety signal they need. Worth calling out explicitly in your pitch — it's a strong "we thought about the ethics" point.

---

## 6. Cloud Functions to Plan For

| Function | Trigger | Purpose |
|---|---|---|
| `onMessageCreate` | Firestore `onCreate` on `messages` | Run risk classification, update `chatSessions.highestRiskFlag`, create `alertEvents` if high risk |
| `onLocationPing` | Firestore `onCreate` on `pings` | Check against `flaggedLocations`, trigger check-in flow, create `alertEvents` if unresolved |
| `dispatchCaregiverNotification` | Firestore `onCreate` on `alertEvents` | Send FCM push to linked caregivers where consent allows |
| `cleanupOldPings` | Scheduled (daily) | Delete `locationPings` older than retention window |
| `generateEmergencyScript` | Callable (on-demand from app) | Calls LLM with Sober's profile + contact info, returns script — kept server-side so prompt/API key never touches the client |

---

## 7. Recommended Composite Indexes

- `messages`: `sessionId ASC, timestamp ASC` (chat history in order)
- `alertEvents`: `soberId ASC, createdAt DESC` (caregiver dashboard, latest first)
- `locationPings`: `timestamp DESC` per subcollection (usually fine without composite index since it's already scoped by soberId path)

---

## 8. Demo-Day Simplification Notes

If time is short, you can safely collapse:
- `soberProfiles` into a subfield of `users` (skip separate collection) — only split it out if you want cleaner security rules
- `locationPings` — replace with a single mocked "Simulate zone entry" button that directly writes one `alertEvents` doc, skipping real geolocation entirely
- `links` — hardcode one Sober↔Caregiver pair with `status: accepted` at seed time instead of building the invite/accept UI