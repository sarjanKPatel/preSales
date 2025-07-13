# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm run dev` - Start development server (runs on http://localhost:3000)
- `npm run build` - Build production bundle
- `npm run start` - Start production server
- `npm run lint` - Run ESLint with Next.js and TypeScript rules

## Project Overview

**PropelIQ** is an AI-powered pre-sales proposal generator built with Next.js 15.3.5, React 18, TypeScript, and Supabase. The application helps sales teams create compelling proposals through AI-driven insights and interactive chat interfaces.

### Tech Stack
- **Frontend**: Next.js 15.3.5 with App Router, React 18, TypeScript
- **Backend**: Supabase (PostgreSQL, Auth, Real-time)
- **Styling**: Tailwind CSS 4.1.0 with custom brand colors
- **UI Components**: Custom component library with Lucide React icons
- **Routing**: React Router v6 for client-side navigation
- **AI Integration**: Ready for OpenAI API integration (placeholder responses currently)

### Brand Colors
```css
--primary: #6366F1 (Indigo)
--primary-dark: #4F46E5
--success: #10B981
--danger: #EF4444
--warning: #F59E0B
```

## Architecture

### Database Schema (Supabase)
- **profiles** - User profiles extending Supabase auth
- **proposals** - Main proposal entities with status tracking
- **proposal_sections** - Dynamic, flexible sections with JSONB content
- **chat_sessions** - AI chat sessions per proposal
- **chat_messages** - Individual chat messages with metadata

### Key Features
1. **Dynamic Proposal Sections** - Flexible section system supporting any content type
2. **AI Chat Interface** - Interactive chat for proposal development (OpenAI integration ready)
3. **Real-time Updates** - Supabase subscriptions for live collaboration
4. **Authentication** - Supabase Auth with React Context
5. **Responsive Design** - Mobile-first with Tailwind CSS

### File Structure
```
src/
├── app/                     # Next.js App Router (entry point only)
├── components/
│   ├── layout/             # Header, Layout components
│   ├── proposals/          # Proposal CRUD components
│   ├── sections/           # Dynamic section management
│   └── chat/               # AI chat interface
├── contexts/
│   └── AuthContext.tsx     # Supabase auth integration
├── lib/
│   ├── supabase.ts         # Supabase client & helpers
│   └── utils.ts            # Utility functions
├── pages/                  # Page components (React Router)
├── types/
│   ├── database.ts         # Supabase generated types
│   └── index.ts            # Application types
└── App.tsx                 # Main app with routing
```

## Development Patterns

### Component Architecture
- All components use TypeScript interfaces
- Functional components with hooks
- Custom Button and Card components with variant system
- Consistent use of `cn()` utility for conditional classes
- Loading states and error handling in all data components

### Data Management
- Supabase client in `src/lib/supabase.ts` with helper functions
- Real-time subscriptions for live updates
- Row Level Security (RLS) policies for data access
- Error handling with user-friendly messages

### Styling Conventions
- Tailwind CSS with custom brand color system
- Consistent spacing and typography scale
- Mobile-first responsive design
- Hover states and transitions
- Loading skeletons and empty states

### AI Integration
- Chat interface ready for OpenAI API integration
- Placeholder responses demonstrate expected behavior
- Message metadata for confidence scores and sources
- AI-generated content marked with special indicators

## Component Usage

### Core Components
```tsx
// Button with variants
<Button variant="primary" size="lg" loading={isLoading}>
  Create Proposal
</Button>

// Layout wrapper
<Layout maxWidth="7xl" padding={true}>
  <YourContent />
</Layout>

// Proposal sections with dynamic content
<SectionManager
  proposalId={proposalId}
  sections={sections}
  onSectionsChange={handleSectionsChange}
  editable={true}
/>

// AI Chat interface
<ChatInterface
  proposalId={proposalId}
  session={chatSession}
  onSessionCreated={handleSessionCreated}
/>
```

### Data Operations
```tsx
// Fetch proposals
const { data, error } = await db.getProposals();

// Create proposal with default sections
const { data: proposal } = await db.createProposal({
  title: "Q1 2024 Proposal",
  company_name: "Acme Corp"
});

// Add dynamic section
await db.addSection({
  proposal_id: proposalId,
  section_title: "Competitive Analysis",
  section_type: "analysis",
  content: { insights: [], competitors: [] },
  order_index: 6,
  is_ai_generated: true
});
```

## Important Notes

### Current State
- **Authentication**: Supabase Auth integration complete
- **Database**: Full schema with RLS policies
- **UI Components**: Complete component library
- **Routing**: React Router setup with all major pages
- **Chat**: Interface complete, OpenAI integration pending
- **Proposals**: Full CRUD operations with dynamic sections

### Next Steps for AI Integration
1. Add OpenAI API client to `src/lib/openai.ts`
2. Replace placeholder responses in `ChatInterface.tsx`
3. Implement section content generation
4. Add prompt engineering for different section types

### Deployment
- Configured for Vercel deployment
- Environment variables needed: Supabase URL and anon key
- All API routes are Next.js API routes (not used currently)

### Testing
- No test framework configured yet
- Manual testing through development server
- Database operations should be tested with actual Supabase instance