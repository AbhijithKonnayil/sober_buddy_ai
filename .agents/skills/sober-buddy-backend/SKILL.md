---
name: sober-buddy-backend
description: Backend architecture and development conventions for SoberBuddy AI backend-core and functions layers, including thin APIs, prompt isolation, and provider patterns.
---

# SoberBuddy AI Backend Architecture Rules

This document defines the backend architecture and development conventions for SoberBuddy AI. All new features and modifications must follow these guidelines.

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
