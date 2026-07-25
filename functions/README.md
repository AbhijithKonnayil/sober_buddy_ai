# SoberBuddy AI Backend Architecture Rules

This document defines the backend architecture and development conventions for SoberBuddy AI. All new features and modifications must follow these guidelines.

## Local Firebase Functions setup

### Prerequisites
- Install the Firebase CLI: `npm install -g firebase-tools`
- Install Java Runtime (required by the emulator suite): https://www.java.com/
- Make sure Node.js 20 is installed

### One-time setup
1. Sign in to Firebase:
   `firebase login`
2. Select or create a Firebase project:
   `firebase use --add`
3. Install dependencies:
   `cd functions && npm install`
4. Create a Google Cloud service account and set the path in `functions/.env.local`:
   `GOOGLE_APPLICATION_CREDENTIALS=/absolute/path/to/service-account.json`

### Run the emulators
From the repo root:

```bash
firebase emulators:start --only auth,functions,firestore
```

If you want to run only functions:

```bash
firebase emulators:start --only functions
```

### Useful URLs
- Functions emulator: http://localhost:5001
- Firestore emulator: http://localhost:8080
- Auth emulator: http://localhost:9099

### Local environment variables
The file `functions/.env.local` is used for local development. You can optionally set one of these for real AI replies:
- `GEMINI_API_KEY`
- `GOOGLE_API_KEY`
- `OPENAI_API_KEY`

---

# 1. Project Structure

Separate the application into clear layers.

```
shared/
backend-core/
functions/
frontend/
```

### Responsibilities

### shared

Contains:

- Request/Response models
- Interfaces
- Enums
- Constants

Shared by both frontend and backend.

---

### backend-core

Contains all application logic.

Includes:

- AI orchestration
- Business logic
- Prompt generation
- Validation
- Services

This layer must remain cloud and framework independent.

---

### functions

Acts as the transport layer.

Responsibilities only:

- HTTP/Firebase functions
- Authentication
- Request validation
- Environment variables
- Call backend-core services
- Return responses

No business logic.

---

### frontend

Contains only UI and API integration.

---

# 2. Thin API Layer

API endpoints must remain lightweight.

Allowed:

- Read request
- Authenticate user
- Validate payload
- Read environment variables
- Instantiate services
- Return response

Not allowed:

- AI prompts
- Business logic
- Database logic
- Complex conditionals

---

# 3. Service Layer

All business logic belongs inside Services.

Services should:

- Orchestrate workflows
- Call AI providers
- Handle validation
- Coordinate repositories
- Return domain models

Services must not depend on Firebase or HTTP.

---

# 4. Provider Pattern

External AI providers must be abstracted.

Example

```
AIProvider

    ↑

GeminiProvider

OpenAIProvider

MockProvider
```

Never call an LLM directly from Services.

Services depend only on interfaces.

---

# 5. Prompt Isolation

Never write prompts inside Services.

Store prompts in

```
backend-core/

    prompt_utils/
```

Example

```
buildRecoveryPrompt()

buildEmergencyPrompt()

buildCaregiverPrompt()
```

Services only call these builders.

---

# 6. Shared Types

Any model used by both frontend and backend belongs in

```
shared/
```

Examples

- UserProfile
- RecoveryPlan
- EmergencyRequest
- CaregiverResponse
- RiskLevel

Never duplicate interfaces.

---

# 7. Secrets

Never hardcode

- API keys
- Tokens
- Credentials

Read them only inside the Functions layer using environment variables.

Pass them into Services through constructors.

---

# 8. Dependency Direction

```
functions

↓

backend-core

↓

shared
```

```
frontend

↓

shared
```

Rules

- frontend never imports backend-core
- backend-core never imports frontend
- shared imports nothing from other layers

---

# 9. Feature Structure

Each feature should follow

```
feature/

    services/
    providers/
    prompt_utils/
    repositories/
    models/
```

Examples

```
recovery/

caregiver/

risk-analysis/

education/
```

---

# 10. AI Response Rules

LLM responses must be

- Parsed
- Validated
- Converted into typed models

Never expose raw LLM output directly to the frontend.

---

# 11. Core Principles

- Keep APIs thin.
- Keep business logic inside Services.
- Isolate AI providers.
- Store prompts separately.
- Share types through the shared package.
- Never duplicate models.
- Never hardcode secrets.
- Keep backend cloud-independent whenever possible.
