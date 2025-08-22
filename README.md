# PropelIQ - AI-Powered Pre-Sales Platform

A comprehensive pre-sales proposal generator built with Next.js 15.3.5, featuring secure AI agent integration, real-time chat, and dynamic proposal management.

## 🚀 Overview

PropelIQ transforms the pre-sales process through AI-driven insights and interactive chat interfaces. The platform helps sales teams create compelling proposals, manage leads, and develop strategic visions through intelligent automation.

## 📋 Tech Stack

### Core Framework
- **Next.js**: 15.3.5 with App Router
- **React**: 18.3.1 with TypeScript
- **Styling**: Tailwind CSS 4.1.0 with custom brand colors
- **Database**: Supabase (PostgreSQL + Real-time + Auth)

### AI & Backend
- **AI Integration**: OpenAI API with custom agent architecture
- **Authentication**: Supabase Auth with workspace management
- **Real-time**: Supabase subscriptions for live collaboration
- **API Routes**: Next.js server-side API endpoints

### UI Components
- Custom component library with variant system
- Lucide React icons
- Responsive mobile-first design
- Loading states and error handling

## 🏗️ Architecture

### Database Schema (Supabase)
```
├── profiles              # User profiles extending Supabase auth
├── workspaces           # Team workspace management
├── proposals            # Main proposal entities
├── proposal_sections    # Dynamic, flexible sections with JSONB content
├── chat_sessions        # AI chat sessions per proposal/vision
├── chat_messages        # Individual messages with metadata
└── visions             # Company vision documents
```

### AI Agent System
- **Server-side processing**: Secure API key handling
- **Streaming responses**: Real-time message processing
- **Context management**: Session-based conversation history
- **Tool integration**: Gap detection, question generation, vision management

### File Structure
```
src/
├── app/
│   ├── api/agent/          # AI agent API endpoint
│   ├── chat/               # Chat interface pages
│   ├── vision/             # Vision management
│   ├── proposals/          # Proposal CRUD
│   └── settings/           # User/workspace settings
├── components/
│   ├── chat/               # Chat UI components
│   │   ├── shared/         # Reusable chat components
│   │   ├── chatVision/     # Vision-specific chat
│   │   ├── chatLead/       # Lead management chat
│   │   └── chatProposal/   # Proposal chat
│   ├── layout/             # Layout components
│   ├── proposals/          # Proposal management
│   └── vision/             # Vision components
├── agent/                  # AI agent system
│   ├── llm/               # Language model providers
│   ├── memory/            # Context and session management
│   ├── tools/             # AI tools and capabilities
│   └── rag/               # Retrieval-augmented generation
├── contexts/              # React contexts
├── hooks/                 # Custom React hooks
├── lib/                   # Utilities and helpers
└── types/                 # TypeScript definitions
```

## 🔧 Major Changes & Improvements

### 🤖 AI Agent Security Overhaul

#### **Before: Client-Side Security Issues**
- AI agent running in browser with exposed API keys
- OpenAI credentials visible to client-side code
- Unnecessary Anthropic provider causing CORS errors
- Invalid UUID health checks causing database errors

#### **After: Secure Server-Side Architecture**
- ✅ **Server-only AI processing** via `/api/agent` endpoint
- ✅ **Protected API keys** in server environment only  
- ✅ **Single provider system** (OpenAI only)
- ✅ **Proper health checks** with valid database queries

**Technical Implementation:**
```typescript
// New API Route: /src/app/api/agent/route.ts
POST /api/agent  // Process AI messages securely
GET  /api/agent  // Health check endpoint

// Updated Client Hook: /src/hooks/useAgentResponse.ts
const response = await fetch('/api/agent', {
  method: 'POST',
  body: JSON.stringify({ sessionId, userMessage, userId, workspaceId, visionId })
});
```

### 🐛 Critical Bug Fixes

#### **1. Invalid UUID Database Errors**
**Problem:** `invalid input syntax for type uuid: "health_check_test"`
**Solution:** 
- Replaced hardcoded test strings with proper database connectivity tests
- Implemented read-only health checks without creating invalid records

#### **2. TypeScript Compilation Errors** 
**Problem:** Missing `parent_document_id` property in RAG Document interface
**Solution:** Extended Document interface in `/src/agent/types.ts`

#### **3. Webpack Module Resolution**
**Problem:** Missing chunks causing 500 errors and build failures
**Solution:** Cleaned build artifacts and resolved module dependencies

#### **4. Chat UI Visibility Issues**
**Problem:** White text on white background making user messages unreadable
**Solution:** Fixed text color classes in Message component
```typescript
// Before: Only assistant messages had explicit text color
role === 'assistant' && "text-gray-900"

// After: Explicit colors for both user and assistant
role === 'assistant' ? "text-gray-900" : "text-white"
```

### 🔐 Security Enhancements

#### **Environment Variable Management**
- Server-side only access to `OPENAI_API_KEY`
- Proper validation and error handling for missing credentials
- Enhanced logging without exposing sensitive data

#### **Provider System Cleanup**
- Removed unnecessary Anthropic provider and all related code
- Simplified LLM routing to single provider (OpenAI)
- Eliminated CORS errors from client-side API calls

#### **Waitlist Access Control System**
- **Admin-Controlled Access**: Users must be manually approved to access the platform
- **Waitlist Status Management**: Pending/Approved status workflow
- **Route Protection**: Multi-layer protection (Auth → Waitlist → Workspace)
- **Dedicated Waitlist Page**: Clean interface for pending users with sign-out functionality

### 🎨 User Experience Improvements

#### **Chat Interface Enhancements**
- **No Confirmation Dialogs**: Removed `confirm()` and `prompt()` interruptions
- **Direct Actions**: Delete and rename chat sessions without popups  
- **Auto-naming**: Timestamp-based session naming instead of prompts
- **Readable Messages**: Fixed text visibility issues

#### **Real-time Functionality**
- Live message streaming from AI agent
- Session management with automatic creation
- Message persistence with database storage
- Loading states and error handling

#### **Advanced Workspace Management**
- **Multi-Workspace Support**: Create and manage multiple organizational workspaces
- **Workspace Switching**: Seamless switching with state persistence
- **User-Scoped Uniqueness**: Workspace names unique per user, not globally
- **Team Collaboration**: Invite team members to workspaces
- **Workspace Gates**: Automatic workspace creation flow for new users

#### **Modern Glassmorphism UI**
- **Sophisticated Modal Design**: Glassmorphism effects with backdrop blur and semi-transparent backgrounds
- **Portal Rendering**: Modals render directly to document body for perfect centering
- **Smooth Animations**: 300ms transitions with scale effects (1.02x focus, 1.05x hover)
- **Interactive Elements**: All buttons and inputs have glassmorphism styling with hover effects
- **Responsive Design**: Mobile-first design with proper breakpoints and accessibility

#### **Enhanced Header Navigation**
- **Centered Navigation**: Perfect center alignment using CSS Grid layout
- **Mobile Responsive**: Comprehensive mobile menu with workspace switcher
- **Glassmorphism Effects**: Modern blur effects and transparent backgrounds
- **Three-Column Layout**: Logo/Workspace (left), Navigation (center), User Menu (right)

### 📊 Performance Optimizations

#### **Agent Initialization**
- **Before:** Multiple agent instances with inconsistent configuration
- **After:** Single global agent instance with proper state management

#### **Health Check System**
- **Before:** Heavy database operations with invalid test data
- **After:** Lightweight connectivity tests with graceful degradation

#### **Build Process**
- **Before:** TypeScript compilation errors blocking development
- **After:** Clean builds with all type issues resolved

## 🚀 Getting Started

### Prerequisites
- Node.js 18.17 or later
- Supabase account and project
- OpenAI API key

### Environment Setup
Create `.env.local` file:
```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# OpenAI Configuration (Server-side only)
OPENAI_API_KEY=your_openai_api_key
```

### Installation
```bash
# Clone repository
git clone <repository-url>
cd preSales

# Install dependencies  
npm install

# Start development server
npm run dev
```

### Available Scripts
```bash
npm run dev     # Start development server (localhost:3000)
npm run build   # Build for production
npm run start   # Start production server  
npm run lint    # Run ESLint with Next.js rules
```

## 🔌 API Endpoints

### AI Agent API
```bash
# Health Check
GET /api/agent
Response: { status: 'ok', agent_health: {...}, timestamp: '...' }

# Process Message
POST /api/agent
Body: { sessionId, userMessage, userId?, workspaceId?, visionId? }
Response: { response: "AI generated response..." }
```

## 🛠️ Development Guidelines

### Code Standards
- TypeScript for all components with proper interfaces
- Tailwind CSS with custom brand color system
- Functional components with React hooks
- Server-side API routes for sensitive operations

### Security Best Practices
- Never expose API keys to client-side code
- Use server-side API routes for external API calls
- Validate all inputs and handle errors gracefully
- Implement proper authentication and authorization

### Component Architecture
```typescript
// Example: Secure AI Integration
const { sendMessage, loading, error } = useAgentResponse({
  sessionId: activeSessionId,
  visionId: visionId,
  onMessage: handleNewMessage,
});

// Calls secure API route instead of direct agent
await fetch('/api/agent', { method: 'POST', body: JSON.stringify(data) });
```

## 🎨 Brand Colors
```css
:root {
  --primary: #6366F1;        /* Indigo */
  --primary-dark: #4F46E5;
  --success: #10B981;
  --danger: #EF4444;
  --warning: #F59E0B;
}
```

## 🚢 Deployment

### Vercel Configuration
- Framework: Next.js (auto-detected)
- Build Command: `npm run build`
- Environment Variables: Configure in Vercel dashboard
- Serverless Functions: Automatic API route deployment

### Environment Variables for Production
```env
NEXT_PUBLIC_SUPABASE_URL=production_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=production_supabase_key
OPENAI_API_KEY=production_openai_key
```

## ✨ Key Features

### 🔐 Complete Authentication & Access Control
- **Secure User Registration**: Email-based signup with full name and profile management
- **Waitlist System**: Admin-controlled platform access with pending/approved workflow
- **Multi-Layer Protection**: Auth → Waitlist → Workspace → Feature access
- **Profile Management**: User settings, team invitations, and workspace management
- **Smart Routing**: Automatic redirection based on user status and workspace availability

### 🤖 AI-Powered Conversations
- **Context-Aware Chat**: Sessions with memory and conversation history
- **Real-Time Streaming**: Live responses with typing indicators
- **Multi-Tool Capabilities**: Gap detection, question generation, vision management
- **Secure Processing**: Server-side AI with protected API keys
- **Vision State Management**: AI-guided strategic planning and validation

### 💼 Advanced Workspace Management  
- **Multi-Workspace Support**: Create and manage multiple organizational workspaces
- **Seamless Switching**: Quick workspace changes with state persistence
- **User-Scoped Names**: Workspace names unique per user, preventing conflicts
- **Team Collaboration**: Invite system for team members
- **Automatic Onboarding**: New users guided through workspace creation
- **Workspace Gates**: Smart routing based on workspace availability

### 📄 Dynamic Proposals System
- **Flexible Architecture**: JSONB-based sections for any content type
- **AI-Assisted Generation**: Intelligent content creation based on context
- **Real-Time Collaboration**: Live updates and multi-user editing
- **Version Control**: Track changes and maintain proposal history
- **Export Capabilities**: PDF generation and sharing features

### 🎯 Company Vision Development
- **Interactive Workflows**: Step-by-step vision creation process
- **AI-Guided Planning**: Strategic recommendations and gap analysis
- **Progress Tracking**: Milestone management and validation
- **Vision Chat Interface**: Dedicated AI assistant for vision development
- **State Management**: Persistent vision data across sessions

### 🎨 Modern UI/UX Design
- **Glassmorphism Interface**: Sophisticated blur effects and semi-transparent backgrounds
- **Responsive Design**: Mobile-first approach with perfect tablet/desktop scaling
- **Smooth Animations**: 300ms transitions with scale effects and hover states
- **Centered Navigation**: Three-column header layout with perfect alignment
- **Portal Modals**: Document body rendering for guaranteed centering
- **Accessibility**: Full keyboard navigation and screen reader support

## 🔄 Recent Updates Summary

### ✅ Completed Improvements

#### **Core Infrastructure**
- [x] Secure server-side AI agent architecture
- [x] Fixed all TypeScript compilation errors  
- [x] Resolved chat UI visibility issues
- [x] Eliminated unnecessary provider dependencies
- [x] Removed intrusive confirmation dialogs
- [x] Implemented proper error handling and logging
- [x] Cleaned up development environment

#### **Workspace & Authentication System**
- [x] Complete waitlist access control system with admin approval
- [x] Multi-workspace support with user-scoped uniqueness
- [x] Advanced workspace creation and switching functionality
- [x] Workspace gate system for automatic user onboarding
- [x] Team collaboration and invitation system
- [x] Smart routing based on user status and workspace availability

#### **UI/UX Enhancements**
- [x] Glassmorphism modal design with portal rendering
- [x] Responsive header with centered navigation using CSS Grid
- [x] Mobile-first responsive design with comprehensive mobile menu
- [x] Smooth animations with scale effects and hover states
- [x] Perfect modal centering regardless of parent containers
- [x] Enhanced workspace switcher with mobile support

### 🎯 Current Status
- AI agent fully functional with OpenAI integration
- Chat interface operational with real-time messaging  
- Secure API key management implementation
- Clean codebase with resolved build issues
- Ready for production deployment

## 📝 License

This project is private and proprietary.

---

**Built with ❤️ using Next.js, React, TypeScript, and OpenAI**

*Last Updated: January 2025*  
*Major Overhaul: AI Security & Performance Enhancement*