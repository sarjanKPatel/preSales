# Pre-sales Next.js Project

A modern, full-stack React application built with Next.js 15.3.5, featuring AI agent functionality, PDF generation, and beautiful animations.

## 🚀 Tech Stack

### Core Framework
- **Next.js**: 15.3.5 (latest version)
- **Architecture**: App Router (using the appDir experimental flag)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4.1.0

### React & Dependencies
- **React**: 18.3.1 with React DOM
- **TypeScript**: Full TypeScript support with proper type definitions

### Key Libraries
- **@openai/agents**: AI agent functionality
- **@react-pdf/renderer**: PDF generation capabilities
- **gsap**: Professional animations
- **clsx**: Conditional CSS classes

## 📁 Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   ├── layout.tsx         # Root layout component
│   ├── page.tsx           # Home page
│   └── globals.css        # Global styles
├── components/            # Reusable components
├── lib/                   # Utility functions
└── types/                 # TypeScript type definitions
```

## 🛠️ Getting Started

### Prerequisites
- Node.js 18.17 or later
- npm or yarn package manager

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd "Pre sales"
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📦 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## 🎨 Styling

This project uses **Tailwind CSS 4.1.0** for styling. The configuration is set up in:
- `tailwind.config.ts` - Tailwind configuration
- `postcss.config.mjs` - PostCSS configuration
- `src/app/globals.css` - Global styles

## 🤖 AI Features

The project includes **@openai/agents** for AI agent functionality. This allows you to:
- Create intelligent agents
- Process natural language
- Integrate with OpenAI's latest models

## 📄 PDF Generation

**@react-pdf/renderer** is integrated for PDF generation capabilities:
- Create dynamic PDFs
- Export reports
- Generate documents

## ✨ Animations

**GSAP** is included for professional animations:
- Smooth transitions
- Complex animations
- Performance-optimized effects

## 🚀 Deployment

This project is configured for deployment on **Vercel**:

1. Connect your repository to Vercel
2. Vercel will automatically detect Next.js configuration
3. Deploy with zero configuration

### Vercel Configuration
- Framework Preset: Next.js
- Build Command: `npm run build`
- Output Directory: `.next`
- Install Command: `npm install`

## 🔧 Configuration Files

- `next.config.ts` - Next.js configuration
- `tsconfig.json` - TypeScript configuration
- `eslint.config.mjs` - ESLint configuration
- `tailwind.config.ts` - Tailwind CSS configuration

## 📝 Development Guidelines

### Code Style
- Use TypeScript for all components
- Follow ESLint rules
- Use Tailwind CSS for styling
- Implement proper error handling

### Component Structure
- Use functional components with hooks
- Implement proper TypeScript interfaces
- Follow Next.js App Router conventions

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## 📄 License

This project is private and proprietary.

---

Built with ❤️ using Next.js, React, and TypeScript
