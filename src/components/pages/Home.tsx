'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/layout/Layout';
import Button from '@/components/Button';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Brain, 
  Zap, 
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
      title: 'AI-Powered Analysis',
      description: 'Intelligent stakeholder mapping, challenge identification, and solution recommendations.',
      color: 'bg-primary-50 text-primary-600',
    },
    {
      icon: MessageSquare,
      title: 'Interactive Chat',
      description: 'Collaborate with AI to refine proposals, brainstorm solutions, and get strategic insights.',
      color: 'bg-blue-50 text-blue-600',
    },
    {
      icon: FileText,
      title: 'Dynamic Sections',
      description: 'Flexible proposal structure that adapts to your needs with AI-generated content.',
      color: 'bg-green-50 text-green-600',
    },
    {
      icon: TrendingUp,
      title: 'ROI Tracking',
      description: 'Built-in metrics and analytics to demonstrate value and track proposal success.',
      color: 'bg-purple-50 text-purple-600',
    },
  ];

  const benefits = [
    'Reduce proposal creation time by 70%',
    'Increase win rates with AI insights',
    'Standardize proposals across teams',
    'Track engagement and ROI metrics',
    'Collaborate with stakeholders in real-time',
    'Export to PDF with professional formatting',
  ];

  return (
    <Layout padding={false}>
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary-50 via-white to-blue-50 px-6 py-20 lg:py-32">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="flex items-center gap-2 mb-6">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <Brain className="w-5 h-5 text-white" />
                </div>
                <span className="text-primary-600 font-semibold">PropelIQ</span>
              </div>
              
              <h1 className="text-4xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
                AI-Powered
                <br />
                <span className="text-primary">Pre-Sales</span>
                <br />
                Proposals
              </h1>
              
              <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                Transform your sales process with intelligent proposal generation. 
                Let AI help you identify stakeholders, map challenges, and craft 
                compelling solutions that win deals.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  onClick={handleGetStarted}
                  variant="primary"
                  size="lg"
                  className="text-lg px-8 py-4"
                >
                  Get Started Free
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="text-lg px-8 py-4"
                  onClick={() => {
                    document.getElementById('features')?.scrollIntoView({ 
                      behavior: 'smooth' 
                    });
                  }}
                >
                  Learn More
                </Button>
              </div>
            </div>
            
            <div className="lg:pl-12">
              <div className="relative">
                <div className="bg-white rounded-2xl shadow-2xl p-6 border border-gray-100">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                      <MessageSquare className="w-4 h-4 text-primary-600" />
                    </div>
                    <span className="font-medium text-gray-900">AI Assistant</span>
                    <div className="ml-auto flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      Active
                    </div>
                  </div>
                  
                  <div className="space-y-3 mb-4">
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-sm text-gray-700">
                        "Help me identify key stakeholders for our enterprise software proposal."
                      </p>
                    </div>
                    <div className="bg-primary-50 rounded-lg p-3">
                      <p className="text-sm text-gray-700">
                        I've analyzed your proposal and identified 8 key stakeholders including the CTO, CFO, and IT Director. 
                        Would you like me to map their influence levels and decision-making power?
                      </p>
                      <div className="flex items-center gap-1 mt-2 text-xs text-primary-600">
                        <Sparkles className="w-3 h-3" />
                        AI Generated
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-100 rounded-lg px-3 py-2">
                      <span className="text-sm text-gray-500">Ask me anything...</span>
                    </div>
                    <Button size="sm" variant="primary">
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                
                {/* Floating elements */}
                <div className="absolute -top-4 -right-4 bg-success text-white rounded-full p-3 shadow-lg">
                  <CheckCircle className="w-6 h-6" />
                </div>
                <div className="absolute -bottom-4 -left-4 bg-warning text-white rounded-full p-3 shadow-lg">
                  <Zap className="w-6 h-6" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-6">
              Everything you need to win deals
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Powered by advanced AI, PropelIQ streamlines your entire proposal process 
              from initial discovery to final presentation.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-lg transition-shadow"
              >
                <div className={`w-12 h-12 rounded-lg ${feature.color} flex items-center justify-center mb-4`}>
                  <feature.icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 px-6 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-6">
                Transform your sales process
              </h2>
              <p className="text-lg text-gray-600 mb-8">
                Join leading sales teams who have revolutionized their proposal 
                process with AI-powered insights and automation.
              </p>
              
              <div className="space-y-4">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-success flex-shrink-0" />
                    <span className="text-gray-700">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="lg:pl-12">
              <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
                <div className="grid grid-cols-2 gap-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-primary mb-2">70%</div>
                    <div className="text-sm text-gray-600">Time Saved</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-success mb-2">45%</div>
                    <div className="text-sm text-gray-600">Higher Win Rate</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-purple-600 mb-2">3x</div>
                    <div className="text-sm text-gray-600">Faster Proposals</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-600 mb-2">98%</div>
                    <div className="text-sm text-gray-600">User Satisfaction</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 bg-gradient-to-r from-primary to-primary-600 text-white relative overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 bg-black bg-opacity-10"></div>
        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <h2 className="text-3xl lg:text-5xl font-bold mb-6 text-white">
            Ready to win more deals?
          </h2>
          <p className="text-xl lg:text-2xl text-white opacity-90 mb-10 max-w-2xl mx-auto leading-relaxed">
            Start creating intelligent proposals today. No credit card required.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button
              onClick={handleGetStarted}
              variant="secondary"
              size="lg"
              className="text-lg px-10 py-4 bg-white text-primary hover:bg-gray-100 hover:scale-105 transform transition-all duration-200 shadow-lg font-bold"
            >
              Get Started Free
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <p className="text-sm text-white opacity-75 sm:ml-4">
              Join 1000+ sales teams already using PropelIQ
            </p>
          </div>
        </div>
      </section>

    </Layout>
  );
}