"use client";

import React, { useState } from "react";
import Layout from "@/components/layout/Layout";
import Button from "@/components/Button";
import Card from "@/components/Card";
import {
  Loader2,
  Sparkles,
  Search,
  FileText,
  AlertCircle,
  MessageSquare,
  ChevronDown,
  Users,
  Code,
  Target,
  Link,
  Building2,
} from "lucide-react";

type ApiTestType = "openai" | "deep-research" | "pre-demo" | "chat" | null;

interface TestConfig {
  title: string;
  description: string;
  icon: React.ReactNode;
  inputs: {
    name: string;
    label: string;
    type: string;
    placeholder: string;
    required?: boolean;
  }[];
}

interface TestResults {
  success?: boolean;
  message?: string;
  model?: string;
  metadata?: {
    model?: string;
    tokens?: number;
    searchCount?: number;
    pagesRead?: number;
    company?: string;
    tokensUsed?: number;
    timestamp?: string;
    note?: string;
  };
  companyOverview?: string;
  recentDevelopments?: string[];
  keyStakeholders?: Array<{ name: string; role: string }>;
  technologyStack?: string[];
  challenges?: string[];
  opportunities?: string[];
  recommendations?: string[];
  citations?: Array<{ title: string; url: string }>;
  checklist?: {
    companyOverview?: string;
    technologyStack?: string[];
  };
  progress?: string;
  status?: string;
}

export default function TestAIPage() {
  const [selectedApi, setSelectedApi] = useState<ApiTestType>(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<TestResults | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});

  // API Test Configurations
  const apiConfigs: Record<NonNullable<ApiTestType>, TestConfig> = {
    openai: {
      title: "OpenAI Connection Test",
      description: "Verify API key and basic functionality",
      icon: <Sparkles className="w-5 h-5 text-green-600" />,
      inputs: [],
    },
    "deep-research": {
      title: "Deep Research API",
      description: "Test company research with AI analysis",
      icon: <Search className="w-5 h-5 text-blue-600" />,
      inputs: [
        {
          name: "company",
          label: "Company Name",
          type: "text",
          placeholder: "e.g., Microsoft, Stripe",
          required: true,
        },
        {
          name: "requirements",
          label: "Research Requirements",
          type: "textarea",
          placeholder: "What specific information do you need?",
        },
      ],
    },
    "pre-demo": {
      title: "Pre-Demo Checklist",
      description: "Generate a pre-demo research checklist",
      icon: <FileText className="w-5 h-5 text-purple-600" />,
      inputs: [
        {
          name: "company",
          label: "Company Name",
          type: "text",
          placeholder: "e.g., Salesforce",
          required: true,
        },
        {
          name: "contactName",
          label: "Contact Name",
          type: "text",
          placeholder: "John Doe",
        },
        {
          name: "contactTitle",
          label: "Contact Title",
          type: "text",
          placeholder: "VP of Sales",
        },
      ],
    },
    chat: {
      title: "Chat API",
      description: "Test AI chat responses",
      icon: <MessageSquare className="w-5 h-5 text-indigo-600" />,
      inputs: [
        {
          name: "message",
          label: "Message",
          type: "textarea",
          placeholder: "Ask a question about sales proposals...",
          required: true,
        },
      ],
    },
  };

  const handleApiTest = async () => {
    if (!selectedApi) return;

    setLoading(true);
    setError(null);
    setResults(null);

    try {
      let response;

      switch (selectedApi) {
        case "openai":
          response = await fetch("/api/test/openai", { method: "POST" });
          break;

        case "deep-research":
          response = await fetch("/api/deep-research", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              company: formData.company,
              requirements: formData.requirements || "General company research",
              useCase: "discovery",
            }),
          });
          break;

        case "pre-demo":
          response = await fetch("/api/test/pre-demo-checklist", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              company: formData.company,
              contact: {
                name: formData.contactName || "Unknown",
                title: formData.contactTitle || "Unknown",
                demoDate: new Date().toISOString(),
              },
            }),
          });
          break;

        case "chat":
          response = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              message: formData.message,
              sessionId: "test-session",
              proposalContext: { test: true },
            }),
          });
          break;
      }

      if (!response) throw new Error("No response received");

      // Handle streaming responses for deep-research
      if (
        selectedApi === "deep-research" &&
        response.headers.get("content-type")?.includes("text/event-stream")
      ) {
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        while (reader) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.type === "progress") {
                  setResults((prev: TestResults | null) => ({
                    ...prev,
                    progress: data.message,
                    status: data.status,
                  }));
                } else if (data.type === "complete") {
                  setResults(data.results);
                } else if (data.type === "error") {
                  throw new Error(data.message);
                }
              } catch (e) {
                console.error("Parse error:", e);
              }
            }
          }
        }
      } else {
        // Handle regular JSON responses
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "API request failed");
        }

        setResults(data);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unknown error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const resetTest = () => {
    setSelectedApi(null);
    setResults(null);
    setError(null);
    setFormData({});
  };

  const isFormValid = () => {
    if (!selectedApi) return false;
    if (selectedApi === "openai") return true;

    const config = apiConfigs[selectedApi];
    const requiredInputs = config.inputs.filter((input) => input.required);
    return requiredInputs.every((input) => formData[input.name]?.trim());
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            AI Integration Testing
          </h1>
          <p className="text-gray-600">
            Test various AI API endpoints from a single interface
          </p>
        </div>

        {/* API Selection Dropdown */}
        <Card className="mb-6">
          <div className="space-y-4">
            <label className="block text-sm font-medium text-gray-700">
              Select API to Test
            </label>
            <div className="relative">
              <select
                value={selectedApi || ""}
                onChange={(e) => {
                  setSelectedApi(e.target.value as ApiTestType);
                  setResults(null);
                  setError(null);
                  setFormData({});
                }}
                className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg appearance-none focus:ring-2 focus:ring-primary focus:border-transparent bg-white"
              >
                <option value="">Select an API to test...</option>
                <option value="openai">Test OpenAI Connection</option>
                <option value="deep-research">Test Deep Research API</option>
                <option value="pre-demo">Test Pre-Demo Checklist</option>
                <option value="chat">Test Chat API</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </Card>

        {/* Dynamic Input Form */}
        {selectedApi && (
          <Card className="mb-6">
            <div className="flex items-center gap-3 mb-4">
              {apiConfigs[selectedApi].icon}
              <div>
                <h3 className="font-semibold text-gray-900">
                  {apiConfigs[selectedApi].title}
                </h3>
                <p className="text-sm text-gray-600">
                  {apiConfigs[selectedApi].description}
                </p>
              </div>
            </div>

            {apiConfigs[selectedApi].inputs.length > 0 && (
              <div className="space-y-4 mb-6">
                {apiConfigs[selectedApi].inputs.map((input) => (
                  <div key={input.name}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {input.label}
                      {input.required && (
                        <span className="text-red-500 ml-1">*</span>
                      )}
                    </label>
                    {input.type === "textarea" ? (
                      <textarea
                        value={formData[input.name] || ""}
                        onChange={(e) =>
                          handleInputChange(input.name, e.target.value)
                        }
                        placeholder={input.placeholder}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                        disabled={loading}
                      />
                    ) : (
                      <input
                        type={input.type}
                        value={formData[input.name] || ""}
                        onChange={(e) =>
                          handleInputChange(input.name, e.target.value)
                        }
                        placeholder={input.placeholder}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                        disabled={loading}
                      />
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-3">
              <Button
                onClick={handleApiTest}
                variant="primary"
                disabled={loading || !isFormValid()}
                loading={loading}
              >
                Run Test
              </Button>
              <Button onClick={resetTest} variant="outline" disabled={loading}>
                Reset
              </Button>
            </div>
          </Card>
        )}

        {/* Results Section */}
        {(loading || results || error) && (
          <Card title="Test Results">
            {loading && results?.progress && (
              <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-2 text-blue-700">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">{results.progress}</span>
                </div>
              </div>
            )}

            {loading && !results?.progress && (
              <div className="flex items-center gap-3 text-gray-600">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Testing {selectedApi} API...</span>
              </div>
            )}

            {error && !loading && (
              <div className="flex items-start gap-3 text-red-600 bg-red-50 p-4 rounded-lg">
                <AlertCircle className="w-5 h-5 mt-0.5" />
                <div>
                  <p className="font-medium">Error</p>
                  <p className="text-sm">{error}</p>
                </div>
              </div>
            )}

            {results && !loading && !error && (
              <div className="space-y-4">
                {/* OpenAI Connection Test */}
                {selectedApi === "openai" && results.success && (
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-xl border border-green-200">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                        <svg
                          className="w-6 h-6 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </div>
                      <h3 className="text-lg font-semibold text-green-900">
                        Connection Successful!
                      </h3>
                    </div>
                    <div className="bg-white/70 p-4 rounded-lg">
                      <p className="text-gray-800">{results.message}</p>
                      <div className="mt-2 flex items-center gap-2 text-sm text-gray-600">
                        <span className="px-2 py-1 bg-gray-100 rounded">
                          Model: {results.model}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Chat API Results */}
                {selectedApi === "chat" && results.message && (
                  <div className="bg-gradient-to-r from-indigo-50 to-blue-50 p-6 rounded-xl border border-indigo-200">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-indigo-500 rounded-full flex items-center justify-center">
                        <MessageSquare className="w-6 h-6 text-white" />
                      </div>
                      <h3 className="text-lg font-semibold text-indigo-900">
                        Chat Response
                      </h3>
                    </div>
                    <div className="bg-white/70 p-4 rounded-lg">
                      <div className="prose prose-sm max-w-none">
                        <div className="whitespace-pre-wrap text-gray-700">
                          {results.message}
                        </div>
                      </div>
                      {results.metadata && (
                        <div className="mt-4 pt-4 border-t border-gray-200 flex items-center gap-4 text-sm text-gray-600">
                          <span className="px-2 py-1 bg-gray-100 rounded">
                            Model: {results.metadata.model}
                          </span>
                          <span className="px-2 py-1 bg-gray-100 rounded">
                            Tokens: {results.metadata.tokens}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Deep Research Results */}
                {selectedApi === "deep-research" && results.companyOverview && (
                  <div className="space-y-6">
                    {/* Success Header */}
                    <div className="bg-gradient-to-r from-blue-50 to-cyan-50 p-6 rounded-xl border border-blue-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                            <Search className="w-6 h-6 text-white" />
                          </div>
                          <h3 className="text-lg font-semibold text-blue-900">
                            Research Complete
                          </h3>
                        </div>
                        {results.metadata && (
                          <div className="flex items-center gap-2 text-sm">
                            <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full">
                              {results.metadata.searchCount || 0} searches
                            </span>
                            <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full">
                              {results.metadata.pagesRead || 0} pages read
                            </span>
                            <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full">
                              {results.metadata.model}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Model Warning if using fallback */}
                    {results.metadata?.note && (
                      <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
                        <div className="flex items-start gap-3">
                          <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
                          <div>
                            <p className="font-medium text-amber-900">Note</p>
                            <p className="text-sm text-amber-700">
                              {results.metadata.note}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Company Overview */}
                    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                      <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                        <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                          <Building2 className="w-5 h-5 text-gray-600" />
                          Company Overview
                        </h4>
                      </div>
                      <div className="p-6">
                        <div className="prose prose-sm max-w-none text-gray-700">
                          <div className="whitespace-pre-wrap">
                            {results.companyOverview}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Recent Developments */}
                    {results.recentDevelopments &&
                      results.recentDevelopments.length > 0 && (
                        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                          <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                            <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                              <Sparkles className="w-5 h-5 text-gray-600" />
                              Recent Developments
                            </h4>
                          </div>
                          <div className="p-6">
                            <ul className="space-y-3">
                              {results.recentDevelopments?.map(
                                (item: string, i: number) => (
                                  <li
                                    key={i}
                                    className="flex items-start gap-3"
                                  >
                                    <span className="text-blue-500 mt-1">
                                      •
                                    </span>
                                    <span className="text-gray-700">
                                      {item}
                                    </span>
                                  </li>
                                )
                              )}
                            </ul>
                          </div>
                        </div>
                      )}

                    {/* Key Stakeholders */}
                    {results.keyStakeholders &&
                      results.keyStakeholders.length > 0 && (
                        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                          <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                            <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                              <Users className="w-5 h-5 text-gray-600" />
                              Key Stakeholders
                            </h4>
                          </div>
                          <div className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {results.keyStakeholders
                                ?.filter(
                                  (person: { name: string; role: string }) =>
                                    person.name &&
                                    !person.name.includes("update")
                                )
                                .slice(0, 10)
                                .map(
                                  (
                                    person: { name: string; role: string },
                                    i: number
                                  ) => (
                                    <div
                                      key={i}
                                      className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                                    >
                                      <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                                        <span className="text-sm font-medium text-gray-600">
                                          {person.name
                                            .split(" ")
                                            .map((n: string) => n[0])
                                            .join("")
                                            .toUpperCase()
                                            .slice(0, 2)}
                                        </span>
                                      </div>
                                      <div className="min-w-0">
                                        <p className="font-medium text-gray-900 truncate">
                                          {person.name}
                                        </p>
                                        <p className="text-sm text-gray-600 truncate">
                                          {person.role}
                                        </p>
                                      </div>
                                    </div>
                                  )
                                )}
                            </div>
                          </div>
                        </div>
                      )}

                    {/* Technology Stack */}
                    {results.technologyStack &&
                      results.technologyStack.length > 0 && (
                        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                          <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                            <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                              <Code className="w-5 h-5 text-gray-600" />
                              Technology Stack
                            </h4>
                          </div>
                          <div className="p-6">
                            <div className="flex flex-wrap gap-2">
                              {results.technologyStack.map(
                                (tech: string, i: number) => (
                                  <span
                                    key={i}
                                    className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
                                  >
                                    {tech}
                                  </span>
                                )
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                    {/* Challenges & Opportunities Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Challenges */}
                      {results.challenges && results.challenges.length > 0 && (
                        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                          <div className="bg-red-50 px-6 py-4 border-b border-red-200">
                            <h4 className="font-semibold text-red-900 flex items-center gap-2">
                              <AlertCircle className="w-5 h-5 text-red-600" />
                              Challenges
                            </h4>
                          </div>
                          <div className="p-6">
                            <ul className="space-y-3">
                              {results.challenges
                                .slice(0, 5)
                                .map((item: string, i: number) => (
                                  <li
                                    key={i}
                                    className="flex items-start gap-3"
                                  >
                                    <span className="text-red-500 mt-1">⚠</span>
                                    <span className="text-gray-700 text-sm">
                                      {item}
                                    </span>
                                  </li>
                                ))}
                            </ul>
                          </div>
                        </div>
                      )}

                      {/* Opportunities */}
                      {results.opportunities &&
                        results.opportunities.length > 0 && (
                          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                            <div className="bg-green-50 px-6 py-4 border-b border-green-200">
                              <h4 className="font-semibold text-green-900 flex items-center gap-2">
                                <Target className="w-5 h-5 text-green-600" />
                                Opportunities
                              </h4>
                            </div>
                            <div className="p-6">
                              <ul className="space-y-3">
                                {results.opportunities
                                  .slice(0, 5)
                                  .map((item: string, i: number) => (
                                    <li
                                      key={i}
                                      className="flex items-start gap-3"
                                    >
                                      <span className="text-green-500 mt-1">
                                        ✓
                                      </span>
                                      <span className="text-gray-700 text-sm">
                                        {item}
                                      </span>
                                    </li>
                                  ))}
                              </ul>
                            </div>
                          </div>
                        )}
                    </div>

                    {/* Recommendations */}
                    {results.recommendations &&
                      results.recommendations.length > 0 && (
                        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl shadow-sm overflow-hidden">
                          <div className="bg-indigo-100 px-6 py-4 border-b border-indigo-200">
                            <h4 className="font-semibold text-indigo-900 flex items-center gap-2">
                              <Target className="w-5 h-5 text-indigo-600" />
                              Recommendations
                            </h4>
                          </div>
                          <div className="p-6">
                            <ol className="space-y-3">
                              {results.recommendations.map(
                                (item: string, i: number) => (
                                  <li
                                    key={i}
                                    className="flex items-start gap-3"
                                  >
                                    <span className="flex-shrink-0 w-7 h-7 bg-indigo-500 text-white rounded-full flex items-center justify-center text-sm font-medium">
                                      {i + 1}
                                    </span>
                                    <span className="text-gray-700">
                                      {item}
                                    </span>
                                  </li>
                                )
                              )}
                            </ol>
                          </div>
                        </div>
                      )}

                    {/* Citations */}
                    {results.citations && results.citations.length > 0 && (
                      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                          <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                            <Link className="w-5 h-5 text-gray-600" />
                            Sources
                          </h4>
                        </div>
                        <div className="p-6">
                          <div className="space-y-2">
                            {results.citations?.map(
                              (
                                citation: { title: string; url: string },
                                i: number
                              ) => (
                                <a
                                  key={i}
                                  href={citation.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="block p-3 hover:bg-gray-50 rounded-lg transition-colors group"
                                >
                                  <p className="font-medium text-blue-600 group-hover:underline">
                                    {citation.title}
                                  </p>
                                  <p className="text-xs text-gray-500 mt-1">
                                    {citation.url}
                                  </p>
                                </a>
                              )
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Metadata Footer */}
                    {results.metadata && (
                      <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-600">
                        <div className="flex flex-wrap gap-4">
                          <span>
                            Company: <strong>{results.metadata.company}</strong>
                          </span>
                          <span>
                            Model: <strong>{results.metadata.model}</strong>
                          </span>
                          <span>
                            Tokens:{" "}
                            <strong>
                              {results.metadata.tokensUsed?.toLocaleString() ||
                                "N/A"}
                            </strong>
                          </span>
                          <span>
                            Time:{" "}
                            <strong>
                              {results.metadata.timestamp
                                ? new Date(
                                    results.metadata.timestamp
                                  ).toLocaleString()
                                : "N/A"}
                            </strong>
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Pre-demo checklist results - Similar styling updates */}
                {selectedApi === "pre-demo" && results.checklist && (
                  <div className="space-y-6">
                    <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-6 rounded-xl border border-purple-200">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center">
                          <FileText className="w-6 h-6 text-white" />
                        </div>
                        <h3 className="text-lg font-semibold text-purple-900">
                          Pre-Demo Checklist Generated
                        </h3>
                      </div>
                    </div>

                    {/* Rest of the pre-demo UI with similar styling improvements */}
                  </div>
                )}

                {/* Enhanced Debug View */}
                {process.env.NODE_ENV === "development" && (
                  <details className="mt-6">
                    <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-900 font-medium">
                      🔧 Developer Debug Info
                    </summary>
                    <div className="mt-3 bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
                      <pre className="text-xs font-mono">
                        {JSON.stringify(results, null, 2)}
                      </pre>
                    </div>
                  </details>
                )}
              </div>
            )}
          </Card>
        )}
      </div>
    </Layout>
  );
}
