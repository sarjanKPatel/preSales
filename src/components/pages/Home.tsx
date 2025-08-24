'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/layout/Layout';
import Button from '@/components/Button';
import ScrollReveal from '@/components/ScrollReveal';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Brain, 
  FileText, 
  Users, 
  TrendingUp, 
  MessageSquare,
  ArrowRight,
  CheckCircle,
  Sparkles
} from 'lucide-react';

export default function HomePage() {
  const router = useRouter();
  const { user, profile, loading } = useAuth();

  const handleGetStarted = () => {
    if (user) {
      // If user is logged in but on waitlist, go to waitlist page
      if (profile?.waitlist_status === 'pending') {
        router.push('/waitlist');
      } else {
        // If approved, go to workspace dashboard
        router.push('/vision');
      }
    } else {
      // If not logged in, go to signup
      router.push('/signup');
    }
  };

  // Always show marketing page regardless of authentication status

  // Show landing page for unauthenticated users or those on waitlist

  const features = [
    {
      icon: Brain,
      title: 'Intelligent Discovery',
      description: 'Automatically analyze client needs, map stakeholder relationships, and identify key decision factors to build winning strategies.',
      color: 'from-gray-600 to-gray-700',
      bgColor: 'from-gray-50 to-gray-100',
      delay: '0.1s'
    },
    {
      icon: MessageSquare,
      title: 'Smart Collaboration',
      description: 'Work seamlessly with your team using AI-powered suggestions, real-time editing, and intelligent content recommendations.',
      color: 'from-gray-600 to-gray-700',
      bgColor: 'from-gray-50 to-gray-100',
      delay: '0.2s'
    },
    {
      icon: FileText,
      title: 'Dynamic Templates',
      description: 'Industry-specific templates that automatically adapt content, structure, and messaging based on your client and opportunity.',
      color: 'from-gray-600 to-gray-700',
      bgColor: 'from-gray-50 to-gray-100',
      delay: '0.3s'
    },
    {
      icon: TrendingUp,
      title: 'Performance Insights',
      description: 'Track proposal performance, measure engagement, and get actionable insights to improve your win rates over time.',
      color: 'from-gray-600 to-gray-700',
      bgColor: 'from-gray-50 to-gray-100',
      delay: '0.4s'
    },
  ];

  const benefits = [
    'Generate complete proposals in under 10 minutes',
    'Identify decision-makers and their priorities automatically',
    'Personalize content based on client industry and needs',
    'Track proposal engagement with detailed analytics',
    'Collaborate seamlessly with your entire sales team',
    'Integrate with your existing CRM and sales tools',
  ];

  return (
    <Layout padding={false} maxWidth="full">
      {/* Hero Section */}
      <section className="relative w-full min-h-screen px-4 sm:px-6 pt-20 pb-20 overflow-hidden flex items-center justify-center">
        {/* Full-width dot pattern background */}
        <div 
          className="absolute inset-0 w-full h-full dot-grid-bg"
          style={{
            width: '100vw',
            left: '50%',
            transform: 'translateX(-50%)'
          }}
        ></div>
        
        <div className="relative z-10 w-full max-w-7xl mx-auto">
          <div className="text-center">
            
            {/* Main Headline */}
            <ScrollReveal direction="up">
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-black text-gray-600 mb-6 sm:mb-8 leading-tight tracking-tight font-sans">
                Close deals faster with
                <br className="hidden sm:block" />
                <span className="sm:hidden"> </span>
                <span className="text-gray-700">
                  intelligent proposals
                </span>
              </h1>
            </ScrollReveal>
            
            {/* Supporting Subtext */}
            <ScrollReveal direction="up" delay={200}>
              <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-gray-500 mb-8 sm:mb-12 max-w-xs sm:max-w-lg md:max-w-2xl lg:max-w-3xl mx-auto leading-relaxed font-sans px-4 sm:px-0">
                Transform your sales process with AI-powered proposal generation. 
                <span className="hidden sm:inline"> Identify key stakeholders, map their challenges, and create compelling solutions that win.</span>
              </p>
            </ScrollReveal>
            
            {/* CTA Buttons */}
            <ScrollReveal direction="up" delay={400}>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center mb-8 sm:mb-12 px-4 sm:px-0">
                <Button
                  onClick={() => router.push('/login')}
                  variant="primary"
                  size="lg"
                  className="w-full sm:w-auto text-sm sm:text-base lg:text-lg px-4 sm:px-6 lg:px-10 py-2.5 sm:py-3 lg:py-4 font-semibold bg-gray-600 hover:bg-gray-700 text-white border-0 font-sans whitespace-nowrap"
                >
                  Get Started
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full sm:w-auto text-sm sm:text-base lg:text-lg px-4 sm:px-6 lg:px-10 py-2.5 sm:py-3 lg:py-4 font-semibold border-2 border-blue-600 text-blue-600 hover:bg-blue-50 bg-transparent font-sans whitespace-nowrap"
                  onClick={() => router.push('/signup')}
                >
                  Sign Up
                </Button>
              </div>
            </ScrollReveal>
            



          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-32 px-6 bg-gradient-to-b from-white via-blue-50/30 to-white w-full">
        <div className="w-full">
          <div className="text-center mb-20 max-w-6xl mx-auto">
            <ScrollReveal direction="up">
              <h2 className="text-4xl lg:text-6xl font-bold text-gray-600 mb-8">
                Everything you need to
                <br />
                <span className="text-gray-700">
                  accelerate your sales
                </span>
              </h2>
            </ScrollReveal>
            <ScrollReveal direction="up" delay={200}>
              <p className="text-xl text-gray-500 max-w-4xl mx-auto leading-relaxed">
                From stakeholder analysis to final presentations, our AI platform streamlines 
                every step of your proposal workflow with intelligent automation.
              </p>
            </ScrollReveal>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
            {features.map((feature, index) => (
              <ScrollReveal key={index} direction="up" delay={100 * (index + 1)}>
                <div className="group bg-white/80 backdrop-blur-sm rounded-3xl p-8 border border-white/50 hover:shadow-2xl transition-all duration-500 hover:-translate-y-2">
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${feature.bgColor} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                    <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${feature.color} flex items-center justify-center`}>
                      <feature.icon className="w-5 h-5 text-white" />
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-gray-600 mb-4 group-hover:text-gray-700 transition-colors duration-300">
                    {feature.title}
                  </h3>
                  <p className="text-gray-500 leading-relaxed group-hover:text-gray-600 transition-colors duration-300">
                    {feature.description}
                  </p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-32 px-6 bg-gradient-to-br from-blue-50 via-sky-50 to-white relative overflow-hidden w-full">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-5 w-full">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-400 rounded-full filter blur-3xl"></div>
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-sky-400 rounded-full filter blur-3xl"></div>
        </div>
        
        <div className="relative z-10 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <ScrollReveal direction="left">
                <h2 className="text-4xl lg:text-6xl font-bold text-gray-600 mb-8 leading-tight">
                  Proven results that
                  <br />
                  <span className="text-gray-700">
                    drive real growth
                  </span>
                </h2>
              </ScrollReveal>
              <ScrollReveal direction="left" delay={200}>
                <p className="text-xl text-gray-500 mb-10 leading-relaxed">
                  Join 1000+ sales professionals who have transformed their proposal success rates 
                  with intelligent automation, data-driven insights, and streamlined workflows.
                </p>
              </ScrollReveal>
              
              <div className="space-y-6">
                {benefits.map((benefit, index) => (
                  <ScrollReveal key={index} direction="left" delay={300 + (index * 100)}>
                    <div className="flex items-center gap-4 group">
                      <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-emerald-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                        <CheckCircle className="w-5 h-5 text-white" />
                      </div>
                      <span className="text-gray-600 font-medium group-hover:text-gray-700 transition-colors duration-300">{benefit}</span>
                    </div>
                  </ScrollReveal>
                ))}
              </div>
            </div>
            
            <div className="lg:pl-12">
              <ScrollReveal direction="right" delay={200}>
                <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl p-10 border border-white/50">
                  <div className="text-center mb-8">
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">Proven Results</h3>
                    <p className="text-gray-600">Real metrics from our customers</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-8">
                    <div className="text-center group">
                      <div className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-sky-500 bg-clip-text text-transparent mb-3 group-hover:scale-110 transition-transform duration-300">70%</div>
                      <div className="text-sm text-gray-600 font-medium">Time Saved</div>
                      <div className="w-full h-2 bg-blue-100 rounded-full mt-2">
                        <div className="h-full bg-gradient-to-r from-blue-500 to-sky-500 rounded-full" style={{width: '70%'}}></div>
                      </div>
                    </div>
                    <div className="text-center group">
                      <div className="text-5xl font-bold bg-gradient-to-r from-green-600 to-emerald-500 bg-clip-text text-transparent mb-3 group-hover:scale-110 transition-transform duration-300">45%</div>
                      <div className="text-sm text-gray-600 font-medium">Higher Win Rate</div>
                      <div className="w-full h-2 bg-green-100 rounded-full mt-2">
                        <div className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full" style={{width: '45%'}}></div>
                      </div>
                    </div>
                    <div className="text-center group">
                      <div className="text-5xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-3 group-hover:scale-110 transition-transform duration-300">3x</div>
                      <div className="text-sm text-gray-600 font-medium">Faster Proposals</div>
                      <div className="w-full h-2 bg-purple-100 rounded-full mt-2">
                        <div className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full" style={{width: '100%'}}></div>
                      </div>
                    </div>
                    <div className="text-center group">
                      <div className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-3 group-hover:scale-110 transition-transform duration-300">98%</div>
                      <div className="text-sm text-gray-600 font-medium">Satisfaction Rate</div>
                      <div className="w-full h-2 bg-blue-100 rounded-full mt-2">
                        <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full" style={{width: '98%'}}></div>
                      </div>
                    </div>
                  </div>
                </div>
              </ScrollReveal>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 sm:py-24 md:py-32 px-4 sm:px-6 bg-gradient-to-br from-gray-50 via-gray-100 to-white relative overflow-hidden w-full">
        {/* Full-width dot pattern background matching hero */}
        <div 
          className="absolute inset-0 w-full h-full dot-grid-bg opacity-40"
          style={{
            width: '100vw',
            left: '50%',
            transform: 'translateX(-50%)'
          }}
        ></div>
        
        {/* Floating elements for visual interest */}
        <div className="absolute inset-0 overflow-hidden w-full pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-gray-200 rounded-full opacity-30 animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-24 h-24 bg-gray-300 rounded-full opacity-20"></div>
          <div className="absolute top-3/4 left-3/4 w-20 h-20 bg-gray-400 rounded-full opacity-25"></div>
        </div>
        
        <div className="relative z-10 max-w-6xl mx-auto text-center px-4 sm:px-0">
          <ScrollReveal direction="up">
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-7xl font-bold mb-6 sm:mb-8 text-gray-700 leading-tight">
              Ready to accelerate
              <br className="hidden sm:block" />
              <span className="sm:hidden"> </span>
              <span className="text-gray-600">
                your sales success?
              </span>
            </h2>
          </ScrollReveal>
          
          <ScrollReveal direction="up" delay={200}>
            <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-gray-500 mb-10 sm:mb-16 max-w-xs sm:max-w-lg md:max-w-2xl lg:max-w-4xl mx-auto leading-relaxed">
              Transform your proposal process with AI-powered insights.
              <span className="hidden sm:inline"> Join industry leaders who've already revolutionized their sales approach with intelligent automation.</span>
            </p>
          </ScrollReveal>
          
          {/* Updated CTA Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">
            {/* Demo Card */}
            <ScrollReveal direction="up" delay={300}>
              <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-8 border border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300">
                <div className="w-16 h-16 bg-gray-600 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                  <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="none">
                    <path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-gray-700 mb-4">Watch Demo</h3>
                <p className="text-gray-500 mb-6 leading-relaxed">
                  See PropelIQ in action. 15-minute personalized demo tailored to your industry.
                </p>
                <Button
                  onClick={handleGetStarted}
                  variant="primary"
                  size="lg"
                  className="w-full text-lg py-4 font-semibold"
                >
                  Book Demo
                </Button>
              </div>
            </ScrollReveal>

            {/* Trial Card - Featured */}
            <ScrollReveal direction="up" delay={400}>
              <div className="bg-gray-600 rounded-3xl p-8 border border-gray-500 shadow-2xl hover:shadow-3xl transition-all duration-300 transform scale-105">
                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-6 mx-auto">
                  <svg className="w-8 h-8 text-gray-600" viewBox="0 0 24 24" fill="none">
                    <path d="M12 2L14 8H10L12 2Z" fill="currentColor" opacity="0.9"/>
                    <path d="M8 8L6 12L10 10L8 8Z" fill="currentColor" opacity="0.7"/>
                    <path d="M16 8L18 12L14 10L16 8Z" fill="currentColor" opacity="0.7"/>
                    <circle cx="12" cy="10" r="2" fill="currentColor"/>
                    <path d="M6 14L12 16L18 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.8"/>
                    <path d="M7 17L12 18.5L17 17" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" fill="none" opacity="0.6"/>
                    <path d="M10 16L11 20L12 18L13 20L14 16" stroke="currentColor" strokeWidth="1" strokeLinecap="round" fill="none" opacity="0.5"/>
                  </svg>
                </div>
                <div className="bg-white text-gray-600 px-3 py-1 rounded-full text-sm font-semibold mb-4 inline-block">
                  MOST POPULAR
                </div>
                <h3 className="text-2xl font-bold text-white mb-4">Start Free Trial</h3>
                <p className="text-gray-200 mb-6 leading-relaxed">
                  Full access for 14 days. No credit card required. Cancel anytime.
                </p>
                <Button
                  onClick={handleGetStarted}
                  variant="secondary"
                  size="lg"
                  className="w-full text-lg py-4 bg-white text-gray-600 hover:bg-gray-50 font-bold shadow-xl"
                >
                  Try Free Now
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </div>
            </ScrollReveal>

            {/* Contact Card */}
            <ScrollReveal direction="up" delay={500}>
              <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-8 border border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300">
                <div className="w-16 h-16 bg-gray-500 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                  <MessageSquare className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-700 mb-4">Talk to Sales</h3>
                <p className="text-gray-500 mb-6 leading-relaxed">
                  Custom enterprise solutions. Volume pricing. Dedicated support.
                </p>
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full text-lg py-4 font-semibold border-2 border-gray-300 text-gray-600 hover:border-gray-400"
                  onClick={() => {
                    document.getElementById('features')?.scrollIntoView({ 
                      behavior: 'smooth' 
                    });
                  }}
                >
                  Contact Sales
                </Button>
              </div>
            </ScrollReveal>
          </div>
          
          {/* Enhanced Trust Indicators */}
          <ScrollReveal direction="up" delay={600}>
            <p className="text-sm text-gray-400 mb-6 font-medium tracking-wide uppercase">
              Trusted by Sales Teams Worldwide
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-8 text-gray-500">
              <div className="flex items-center gap-3 bg-white/70 backdrop-blur-sm rounded-full px-6 py-3 shadow-sm">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="font-medium">SOC 2 Compliant</span>
              </div>
              <div className="flex items-center gap-3 bg-white/70 backdrop-blur-sm rounded-full px-6 py-3 shadow-sm">
                <Users className="w-5 h-5 text-gray-600" />
                <span className="font-medium">2500+ Active Users</span>
              </div>
              <div className="flex items-center gap-3 bg-white/70 backdrop-blur-sm rounded-full px-6 py-3 shadow-sm">
                <Sparkles className="w-5 h-5 text-yellow-500" />
                <span className="font-medium">4.9/5 Customer Rating</span>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

    </Layout>
  );
}