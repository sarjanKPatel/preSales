# AI Integration Setup Guide

## Overview

This guide will help you set up the Deep Research capabilities in PropelIQ. The integration includes:

1. **OpenAI API Connection** - Basic functionality testing
2. **Deep Research Testing** - Company research simulation
3. **Pre-Demo Checklist Generation** - Comprehensive research reports

## Prerequisites

- OpenAI API key with access to GPT-4 models
- Supabase project configured (already set up)
- Node.js 18+ and npm

## Step 1: Install Dependencies

The required packages are already installed:

```bash
npm install openai zod dotenv
```

## Step 2: Environment Configuration

Create a `.env.local` file in your project root with the following variables:

```env
# Your existing Supabase config
NEXT_PUBLIC_SUPABASE_URL=https://vsmcdfvegjlggfbhokxm.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# Add OpenAI config
OPENAI_API_KEY=your-openai-api-key
OPENAI_ORG_ID=your-org-id # Optional

# For development
NEXT_PUBLIC_ENVIRONMENT=development
```

## Step 3: Test the Integration

1. Start the development server:

   ```bash
   npm run dev
   ```

2. Navigate to `/test-ai` in your browser

3. Test each feature:
   - **OpenAI Connection** - Verifies your API key works
   - **Deep Research** - Simulates company research (2-3 min)
   - **Pre-Demo Checklist** - Generates comprehensive reports (5-10 min)

## Current Features

### ✅ Implemented

- OpenAI client configuration
- Basic API connection testing
- Simulated Deep Research responses
- Pre-Demo Checklist generation
- Error handling and loading states
- Responsive UI for testing

### 🔄 Next Steps

- Implement real Deep Research with web search capabilities
- Add Discovery Pro agent for lead qualification
- Build Demo Architect agent for proposal generation
- Integrate with existing ChatInterface

## API Routes

The following API routes have been created:

- `/api/test/openai` - Tests basic OpenAI connection
- `/api/test/deep-research` - Simulates company research
- `/api/test/pre-demo-checklist` - Generates pre-demo reports

## Troubleshooting

### Common Issues

1. **OpenAI API Key Error**

   - Ensure your API key is valid and has sufficient credits
   - Check that the key has access to GPT-4 models

2. **Environment Variables**

   - Make sure `.env.local` is in the project root
   - Restart the development server after adding environment variables

3. **TypeScript Errors**
   - Run `npm install` to ensure all dependencies are installed
   - Check that all import paths are correct

### Getting Help

If you encounter issues:

1. Check the browser console for error messages
2. Verify your OpenAI API key in the OpenAI dashboard
3. Ensure all environment variables are set correctly

## Next Phase: Deep Research Implementation

Once the basic setup is working, we'll implement:

1. **Real Deep Research** using web search APIs
2. **Structured Output** with Zod schemas
3. **Progress Streaming** for long-running research
4. **Integration with existing ChatInterface**

## Security Notes

- Never commit your `.env.local` file to version control
- Use environment variables for all API keys
- Consider implementing rate limiting for production use
- Add proper error handling for API failures
