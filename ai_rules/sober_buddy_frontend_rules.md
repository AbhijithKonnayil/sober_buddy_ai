---
trigger: always_on
---

# Frontend Development Rules

These rules are mandatory for every implementation.

## Core Principles

1. Reuse before creating.
2. Create shared resources only once.
3. Match Figma exactly.
4. Keep architecture feature-based.
5. Never hardcode user-visible text.
6. Never duplicate UI or styles.

---

# 1. Figma Rules

- Use **only** the specified Figma node.
- Do not inspect, infer, or combine other frames.
- Do not redesign or improve the UI.
- Match the design pixel-perfect.

Use exact values for:

- Typography
- Colors
- Border radius
- Shadows
- Widths
- Heights
- Padding
- Margins
- Alignment
- Letter spacing
- Line height
- Text casing

If a font is missing, import it from Google Fonts.

---

# 2. Component Rules

Always search existing components before creating new ones.

## Reuse

- Reuse components from

```
shared/ui
shared/components
```

or

```
/components
```

where applicable.

Do not duplicate components.

---

## Creating Components

Only create a component if one does not already exist.

Create it exactly once.

Future pages must reuse it.

---

## Variants

Figma variants map directly to props.

Example

```tsx
<Button
    size="large"
    variant="primary"
    disabled
/>
```

Do NOT create

```
PrimaryButton
SecondaryButton
LargeButton
SmallButton
```

---

## Page Composition

Pages should only compose components.

Pages must not contain duplicated markup.

Pages must not override component styles.

---

# 3. Styling Rules

Use theme tokens only.

Never hardcode

- colors
- typography
- spacing
- radius
- shadows

Use

```
src/styles/themes.css
```

If Figma introduces a new value,

add a new theme token.

Do not inline arbitrary values.

---

## Shared Tailwind

If multiple components repeat the same Tailwind classes,

extract them into

```css
@layer components
```

inside global CSS.

Never duplicate identical Tailwind class strings.

---

# 4. Assets

Download every asset from Figma.

Store assets only here

```
assets/

    images/
    icons/
```

Rules

- Images → assets/images
- Icons → assets/icons

Do not inline SVG.

Do not inline base64 images.

---

# 5. Text & Localization

Hardcoded user-visible text is forbidden.

Every Figma TEXT node becomes one translation variable.

Store all variables in

```
shared/i18n/en.json
```

---

## Variable Naming

Pattern

```
<module>_<element>_<role>_<index?>
```

Example

```
auth_text_title
auth_btn_primary
dashboard_text_body
profile_placeholder_name
```

Use snake_case.

Reuse existing variables whenever possible.

Never rename variables arbitrarily.

---

## Text Rules

Copy text exactly from Figma.

Do not modify

- punctuation
- capitalization
- spacing
- line breaks

Use

```tsx
const { t } = useTranslation();
```

Never create

```
constants.ts
```

for text.

---

# 6. Feature Architecture

Project structure

```
features/

    auth/
    dashboard/
    profile/

shared/

    ui/
    components/
    hooks/
    utils/
    i18n/

routes/

App.tsx
main.tsx
```

---

## Feature Isolation

A feature may import only

```
shared/*
```

Never import another feature.

---

## Feature Structure

Each feature contains

```
pages/
components/
hooks/
api/
services/
stores/
types/
data/
```

---

Responsibilities

pages

- Route screens only

components

- Feature UI

api

- HTTP requests only

services

- Business logic

hooks

- React Query hooks

stores

- Zustand state

types

- Interfaces

data

- Mock JSON

---

# 7. API Rules

Components must never call APIs directly.

Flow

```
Component

↓

Hook

↓

Service

↓

API

↓

Backend
```

---

If backend is unavailable,

create

```
features/<feature>/data/mockData.json
```

Services must use mock data.

Types must still reflect the future API.

---

# 8. Import Rules

Allowed

```
shared

↑

features

↑

routes

↑

App

↑

main
```

Forbidden

```
feature

↓

another feature
```

or

```
shared

↓

feature
```

---

# 9. File Naming

Never create

```
api.ts
hook.ts
types.ts
service.ts
```

Use descriptive names.

Example

```
AuthPage.tsx

AuthButton.tsx

auth.service.ts

auth.api.ts

useAuth.ts

auth.types.ts
```

---

# 10. Validation Before Completion

Verify

✅ Existing component reused

✅ No duplicated markup

✅ No duplicated Tailwind

✅ Theme tokens only

✅ Assets downloaded

✅ No inline SVG

✅ No hardcoded text

✅ Translation added

✅ Feature architecture followed

✅ Proper imports

✅ API through hooks/services

✅ Mock JSON created if backend unavailable

✅ File names follow convention

✅ Figma matched exactly

---

# 11. Mismatch Rule

If an existing component differs from Figma,

DO NOT modify it automatically.

Instead,

report

- component name
- expected design
- differences

Wait for confirmation before changing.

---

# Final Principle

> **Reuse first → Create once → Localize everything → Use theme tokens → Compose pages → Follow feature architecture → Match Figma exactly**