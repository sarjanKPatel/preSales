# PropelIQ - Dependencies, Frameworks, APIs & Codebase Structure Report

## 📦 Dependencies Overview

### **Production Dependencies**

| Package               | Version  | Purpose & Usage                                                |
| --------------------- | -------- | -------------------------------------------------------------- |
| next                  | 15.3.5   | Core React framework for SSR, routing, and API routes          |
| react                 | 18.3.1   | UI library for building components                             |
| react-dom             | 18.3.1   | React DOM rendering                                            |
| @supabase/supabase-js | ^2.50.5  | Client for Supabase (PostgreSQL DB, auth, storage)             |
| openai                | ^4.68.1  | Official OpenAI API client for GPT-4, Deep Research, etc.      |
| zod                   | ^3.23.8  | TypeScript-first schema validation and parsing                 |
| @react-pdf/renderer   | ^4.3.0   | PDF generation in React                                        |
| gsap                  | ^3.13.0  | Animation library for smooth, performant UI transitions        |
| clsx                  | ^2.1.1   | Utility for conditionally joining CSS class names              |
| lucide-react          | ^0.525.0 | Icon library for React                                         |
| react-markdown        | ^10.1.0  | Render Markdown as React components                            |
| react-router-dom      | ^6.30.1  | Declarative routing for React (used for some navigation flows) |

### **Development Dependencies**

| Package              | Version | Purpose & Usage                    |
| -------------------- | ------- | ---------------------------------- |
| typescript           | ^5      | TypeScript static typing           |
| eslint               | ^9      | Linting for code quality           |
| eslint-config-next   | 15.3.5  | Next.js-specific ESLint rules      |
| @types/node          | ^20     | Node.js type definitions           |
| @types/react         | ^18     | React type definitions             |
| @types/react-dom     | ^18     | React DOM type definitions         |
| @eslint/eslintrc     | ^3      | ESLint configuration               |
| @tailwindcss/postcss | ^4      | Tailwind CSS + PostCSS integration |
| tailwindcss          | 4.1.0   | Utility-first CSS framework        |

---

## 🏗️ Frameworks & Core Technologies

- **Next.js**: Full-stack React framework for SSR, routing, and API endpoints (App Router)
- **React**: Component-based UI library
- **TypeScript**: Static typing for safety and maintainability
- **Tailwind CSS**: Utility-first CSS for rapid, consistent styling
- **Supabase**: Managed PostgreSQL database, authentication, and storage
- **OpenAI**: AI/LLM integration for chat, research, and analysis
- **GSAP**: Animation library for UI/UX polish
- **@react-pdf/renderer**: PDF generation for reports and proposals

---

## 🌐 API Endpoints

### **AI & Business APIs**

| Endpoint                | Method | Description                                                 |
| ----------------------- | ------ | ----------------------------------------------------------- |
| /api/test/openai        | POST   | Tests OpenAI API connection                                 |
| /api/deep-research      | POST   | Company research using OpenAI Deep Research (Responses API) |
| /api/pre-demo-checklist | POST   | Generates a pre-demo research checklist using GPT-4         |
| /api/chat               | POST   | AI chat assistant for proposals, with Supabase history      |

### **Testing & Utility APIs**

| Endpoint                     | Method | Description                  |
| ---------------------------- | ------ | ---------------------------- |
| /api/test/                   | -      | Namespace for test endpoints |
| /api/test/openai             | POST   | OpenAI connection test       |
| /api/test/pre-demo-checklist | POST   | Pre-demo checklist test      |

---

## 📁 Directory Structure & Purpose

```
preSales/
├── backend/                  # (Reserved for future backend services)
├── public/                   # Static assets (SVGs, images, favicon)
├── src/
│   ├── app/
│   │   ├── api/              # Next.js API routes (AI, business logic)
│   │   │   ├── chat/         # AI chat API
│   │   │   ├── deep-research/# Deep Research API
│   │   │   ├── pre-demo-checklist/ # Pre-demo checklist API
│   │   │   ├── test/         # API test endpoints
│   │   │   └── hello/        # Example/test endpoint
│   │   ├── test-ai/          # Unified AI testing dashboard (frontend)
│   │   ├── proposals/        # Proposal pages (dynamic routing)
│   │   ├── signup/           # Signup page
│   │   ├── login/            # Login page
│   │   ├── layout.tsx        # Root layout
│   │   ├── page.tsx          # Home page
│   │   └── globals.css       # Global styles
│   ├── components/
│   │   ├── chat/             # Chat UI components
│   │   ├── proposals/        # Proposal UI components
│   │   ├── layout/           # Header, Layout wrappers
│   │   ├── sections/         # Proposal section UIs
│   │   ├── Button.tsx        # Reusable button
│   │   ├── Card.tsx          # Reusable card
│   │   └── ...             # Additional components
│   ├── contexts/             # React context providers (e.g., Auth)
│   ├── lib/                  # Core utilities
│   │   ├── openai.ts         # OpenAI client/configs
│   │   ├── supabase.ts       # Supabase client/configs
│   │   └── utils.ts          # Utility functions
│   ├── pages/                # (Legacy/compat) React pages
│   ├── types/                # TypeScript type definitions
├── .env.local                # Environment variables (not committed)
├── package.json              # Project dependencies & scripts
├── README.md                 # Project overview
├── AI_INTEGRATION_SETUP.md   # AI setup guide
├── DETAILED_AI_CODEBASE_REPORT.md # AI architecture report
└── DETAILED_DEPENDENCIES_AND_STRUCTURE_REPORT.md # (This file)
```

---

## 🧩 Integration & Purpose of Major Parts

### **1. Next.js App Router (`src/app/`)**

- Handles all routing, layouts, and API endpoints
- `api/` subfolder contains all backend logic (AI, business, test APIs)
- `test-ai/` provides a unified dashboard for testing all AI endpoints

### **2. Components (`src/components/`)**

- Modular, reusable UI components for chat, proposals, layout, and sections
- Designed for composability and rapid development

### **3. Lib (`src/lib/`)**

- Core integrations for OpenAI and Supabase
- Utility functions for formatting, validation, etc.

### **4. Contexts (`src/contexts/`)**

- React context providers (e.g., authentication)

### **5. Types (`src/types/`)**

- Centralized TypeScript type definitions for all business and AI data

### **6. Public (`public/`)**

- Static assets (SVGs, images, favicon)

### **7. Backend (`backend/`)**

- Reserved for future backend services or serverless functions

---

## 📝 Summary Table

| Area           | Purpose/Integration                               |
| -------------- | ------------------------------------------------- |
| Next.js        | Full-stack framework, routing, SSR, API endpoints |
| React          | UI components, hooks, state management            |
| TypeScript     | Type safety, maintainability                      |
| Tailwind CSS   | Utility-first styling, rapid prototyping          |
| Supabase       | Database, authentication, storage                 |
| OpenAI         | AI/LLM integration for chat, research, analysis   |
| GSAP           | UI/UX animations                                  |
| PDF Renderer   | Dynamic PDF generation for proposals/reports      |
| Zod            | Schema validation for API payloads                |
| Lucide         | Iconography                                       |
| React Markdown | Markdown rendering for AI output                  |

---

## 🔍 Additional Notes

- **Environment Variables**: All secrets (API keys, DB URLs) are managed via `.env.local` and never committed.
- **Testing**: `/test-ai` page provides a comprehensive UI for testing all AI endpoints.
- **Documentation**: `README.md`, `AI_INTEGRATION_SETUP.md`, and detailed code comments support onboarding and maintenance.
- **Scalability**: The structure supports easy addition of new APIs, components, and business logic.

---

_Report generated: December 2024_
_Codebase Version: 0.1.0_
