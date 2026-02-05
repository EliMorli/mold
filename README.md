# JohnMold Web App

A Vite + React operations app for mold inspection workflows.

## Prerequisites

- Node.js 20+
- npm 10+
- Base44 app configured
- Google OAuth URL (for direct Google sign-in)

## Environment

Copy `.env.example` to `.env` and set:

```bash
VITE_BASE44_APP_ID=your_base44_app_id
VITE_GOOGLE_AUTH_URL=https://your-auth-provider-url
```

## Running the app

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
```

## Quality checks

```bash
npm run lint
npm test
```
