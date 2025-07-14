"use client";

import React, { useState } from "react";
import Layout from "@/components/layout/Layout";
import Button from "@/components/Button";
import Card from "@/components/Card";
import {
  Loader2,
  Search,
  Building2,
  FileText,
  AlertCircle,
  CheckCircle,
  Globe,
  Target,
  Zap,
} from "lucide-react";

interface ResearchProgress {
  status: "idle" | "searching" | "reading" | "analyzing" | "complete" | "error";
  currentAction?: string;
  searchCount?: number;
  pagesRead?: number;
  startTime?: number;
  endTime?: number;
}

interface ResearchResults {
  companyOverview?: string;
  recentDevelopments?: string[];
  keyStakeholders?: Array<{ name: string; role: string }>;
  challenges?: string[];
  opportunities?: string[];
  recommendations?: string[];
  citations?: Array<{ title: string; url: string }>;
  raw?: string;
}

export default function TestDeepResearch() {
  // Form state
  const [companyName, setCompanyName] = useState("");
  const [requirements, setRequirements] = useState("");
  const [useCase, setUseCase] = useState<"discovery" | "demo" | "proposal">(
    "discovery"
  );

  // Research state
  const [isResearching, setIsResearching] = useState(false);
  const [progress, setProgress] = useState<ResearchProgress>({
    status: "idle",
  });
  const [results, setResults] = useState<ResearchResults | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Predefined requirement templates
  const requirementTemplates = {
    discovery: `- Identify if they are a good fit for our AI pre-sales platform
- Find their current sales process and tools
- Understand their company size and growth trajectory
- Determine budget range and decision-making process`,

    demo: `- Research their specific pain points in sales/pre-sales
- Identify key stakeholders who might attend the demo
- Find their current technology stack
- Understand their evaluation criteria
- Discover any recent initiatives or transformations`,

    proposal: `- Deep dive into their business challenges
- Analyze their competitive landscape
- Find specific use cases for our solution
- Research their procurement process
- Identify potential objections and how to address them`,
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!companyName.trim()) {
      setError("Please enter a company name");
      return;
    }

    setError(null);
    setResults(null);
    setIsResearching(true);
    setProgress({
      status: "searching",
      currentAction: "Initializing research...",
      startTime: Date.now(),
      searchCount: 0,
      pagesRead: 0,
    });

    try {
      const response = await fetch("/api/deep-research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company: companyName,
          requirements: requirements || requirementTemplates[useCase],
          useCase,
          options: {
            model: "o4-mini-deep-research-2025-06-26",
            maxSearches: 10,
          },
        }),
      });

      // Handle streaming response
      if (!response.ok) {
        throw new Error(`Research failed: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));

                // Update progress based on event type
                if (data.type === "progress") {
                  setProgress((prev) => ({
                    ...prev,
                    status: data.status,
                    currentAction: data.message,
                    searchCount: data.searchCount || prev.searchCount,
                    pagesRead: data.pagesRead || prev.pagesRead,
                  }));
                } else if (data.type === "complete") {
                  setProgress((prev) => ({
                    ...prev,
                    status: "complete",
                    endTime: Date.now(),
                  }));
                  setResults(data.results);
                } else if (data.type === "error") {
                  throw new Error(data.message);
                }
              } catch (e) {
                console.error("Failed to parse SSE data:", e);
              }
            }
          }
        }
      }
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Research failed";
      setError(errorMessage);
      setProgress((prev) => ({ ...prev, status: "error" }));
    } finally {
      setIsResearching(false);
    }
  };

  const formatDuration = (start?: number, end?: number) => {
    if (!start) return "";
    const duration = (end || Date.now()) - start;
    const seconds = Math.floor(duration / 1000);
    const minutes = Math.floor(seconds / 60);
    return minutes > 0 ? `${minutes}m ${seconds % 60}s` : `${seconds}s`;
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Deep Research Testing
          </h1>
          <p className="text-gray-600">
            Test AI-powered company research with real-time web search
            capabilities
          </p>
        </div>

        {/* Input Form */}
        <Card className="mb-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Company Name Input */}
            <div>
              <label
                htmlFor="company"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Company Name
              </label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="company"
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g., Microsoft, Stripe, Salesforce"
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  disabled={isResearching}
                />
              </div>
            </div>

            {/* Use Case Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Research Purpose
              </label>
              <div className="grid grid-cols-3 gap-3">
                {(["discovery", "demo", "proposal"] as const).map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => {
                      setUseCase(option);
                      setRequirements(""); // Clear custom requirements
                    }}
                    className={`px-4 py-2 rounded-lg border-2 transition-all ${
                      useCase === option
                        ? "border-primary bg-primary text-white"
                        : "border-gray-300 bg-white text-gray-700 hover:border-gray-400"
                    }`}
                    disabled={isResearching}
                  >
                    {option.charAt(0).toUpperCase() + option.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Requirements Textarea */}
            <div>
              <label
                htmlFor="requirements"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Research Requirements
                <span className="text-gray-500 font-normal ml-2">
                  (Leave empty to use template for {useCase})
                </span>
              </label>
              <textarea
                id="requirements"
                value={requirements}
                onChange={(e) => setRequirements(e.target.value)}
                placeholder={requirementTemplates[useCase]}
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                disabled={isResearching}
              />
            </div>

            {/* Quick Options */}
            <div className="flex flex-wrap gap-2">
              <span className="text-sm text-gray-600">Quick options:</span>
              <button
                type="button"
                onClick={() =>
                  setRequirements(
                    (prev) => prev + "\n- Include competitor analysis"
                  )
                }
                className="text-sm text-primary hover:underline"
                disabled={isResearching}
              >
                + Competitor Analysis
              </button>
              <button
                type="button"
                onClick={() =>
                  setRequirements(
                    (prev) => prev + "\n- Find recent news and announcements"
                  )
                }
                className="text-sm text-primary hover:underline"
                disabled={isResearching}
              >
                + Recent News
              </button>
              <button
                type="button"
                onClick={() =>
                  setRequirements(
                    (prev) => prev + "\n- Identify integration requirements"
                  )
                }
                className="text-sm text-primary hover:underline"
                disabled={isResearching}
              >
                + Integrations
              </button>
            </div>

            {/* Submit Button */}
            <div className="flex items-center gap-4">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                disabled={isResearching || !companyName.trim()}
                loading={isResearching}
              >
                <Search className="w-4 h-4 mr-2" />
                Start Deep Research
              </Button>

              {isResearching && (
                <span className="text-sm text-gray-600">
                  This may take 3-10 minutes...
                </span>
              )}
            </div>
          </form>
        </Card>

        {/* Progress Display */}
        {progress.status !== "idle" && (
          <Card className="mb-8">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">
                  Research Progress
                </h3>
                <span className="text-sm text-gray-500">
                  {formatDuration(progress.startTime, progress.endTime)}
                </span>
              </div>

              {/* Progress Steps */}
              <div className="space-y-3">
                {/* Searching */}
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      progress.status === "searching"
                        ? "bg-blue-100"
                        : ["reading", "analyzing", "complete"].includes(
                            progress.status
                          )
                        ? "bg-green-100"
                        : "bg-gray-100"
                    }`}
                  >
                    {progress.status === "searching" ? (
                      <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                    ) : ["reading", "analyzing", "complete"].includes(
                        progress.status
                      ) ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <Globe className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      Web Search
                      {progress.searchCount
                        ? ` (${progress.searchCount} searches)`
                        : ""}
                    </p>
                    {progress.status === "searching" &&
                      progress.currentAction && (
                        <p className="text-xs text-gray-600">
                          {progress.currentAction}
                        </p>
                      )}
                  </div>
                </div>

                {/* Reading */}
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      progress.status === "reading"
                        ? "bg-blue-100"
                        : ["analyzing", "complete"].includes(progress.status)
                        ? "bg-green-100"
                        : "bg-gray-100"
                    }`}
                  >
                    {progress.status === "reading" ? (
                      <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                    ) : ["analyzing", "complete"].includes(progress.status) ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <FileText className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      Reading Pages
                      {progress.pagesRead
                        ? ` (${progress.pagesRead} pages)`
                        : ""}
                    </p>
                    {progress.status === "reading" &&
                      progress.currentAction && (
                        <p className="text-xs text-gray-600">
                          {progress.currentAction}
                        </p>
                      )}
                  </div>
                </div>

                {/* Analyzing */}
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      progress.status === "analyzing"
                        ? "bg-blue-100"
                        : progress.status === "complete"
                        ? "bg-green-100"
                        : "bg-gray-100"
                    }`}
                  >
                    {progress.status === "analyzing" ? (
                      <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                    ) : progress.status === "complete" ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <Zap className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      Analysis & Synthesis
                    </p>
                    {progress.status === "analyzing" &&
                      progress.currentAction && (
                        <p className="text-xs text-gray-600">
                          {progress.currentAction}
                        </p>
                      )}
                  </div>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Error Display */}
        {error && (
          <Card className="mb-8 border-red-200 bg-red-50">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
              <div>
                <p className="font-medium text-red-900">Research Failed</p>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          </Card>
        )}

        {/* Results Display */}
        {results && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">
              Research Results
            </h2>

            {/* Company Overview */}
            {results.companyOverview && (
              <Card>
                <h3 className="font-semibold text-gray-900 mb-3">
                  Company Overview
                </h3>
                <p className="text-gray-700 whitespace-pre-wrap">
                  {results.companyOverview}
                </p>
              </Card>
            )}

            {/* Recent Developments */}
            {results.recentDevelopments &&
              results.recentDevelopments.length > 0 && (
                <Card>
                  <h3 className="font-semibold text-gray-900 mb-3">
                    Recent Developments
                  </h3>
                  <ul className="space-y-2">
                    {results.recentDevelopments.map((item, index) => (
                      <li key={index} className="flex items-start">
                        <span className="text-primary mr-2">•</span>
                        <span className="text-gray-700">{item}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              )}

            {/* Key Stakeholders */}
            {results.keyStakeholders && results.keyStakeholders.length > 0 && (
              <Card>
                <h3 className="font-semibold text-gray-900 mb-3">
                  Key Stakeholders
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {results.keyStakeholders.map((person, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-gray-600">
                          {person.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {person.name}
                        </p>
                        <p className="text-sm text-gray-600">{person.role}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Challenges & Opportunities */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {results.challenges && results.challenges.length > 0 && (
                <Card>
                  <h3 className="font-semibold text-gray-900 mb-3">
                    Challenges
                  </h3>
                  <ul className="space-y-2">
                    {results.challenges.map((item, index) => (
                      <li key={index} className="flex items-start">
                        <span className="text-red-500 mr-2">⚠</span>
                        <span className="text-gray-700">{item}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              )}

              {results.opportunities && results.opportunities.length > 0 && (
                <Card>
                  <h3 className="font-semibold text-gray-900 mb-3">
                    Opportunities
                  </h3>
                  <ul className="space-y-2">
                    {results.opportunities.map((item, index) => (
                      <li key={index} className="flex items-start">
                        <span className="text-green-500 mr-2">✓</span>
                        <span className="text-gray-700">{item}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              )}
            </div>

            {/* Recommendations */}
            {results.recommendations && results.recommendations.length > 0 && (
              <Card className="bg-blue-50 border-blue-200">
                <h3 className="font-semibold text-gray-900 mb-3">
                  <Target className="w-5 h-5 inline mr-2 text-blue-600" />
                  Recommendations
                </h3>
                <ol className="space-y-2 list-decimal list-inside">
                  {results.recommendations.map((item, index) => (
                    <li key={index} className="text-gray-700">
                      {item}
                    </li>
                  ))}
                </ol>
              </Card>
            )}

            {/* Sources/Citations */}
            {results.citations && results.citations.length > 0 && (
              <Card>
                <h3 className="font-semibold text-gray-900 mb-3">Sources</h3>
                <div className="space-y-2">
                  {results.citations.map((citation, index) => (
                    <a
                      key={index}
                      href={citation.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block p-2 hover:bg-gray-50 rounded transition-colors"
                    >
                      <p className="text-sm font-medium text-blue-600 hover:underline">
                        {citation.title}
                      </p>
                      <p className="text-xs text-gray-500">{citation.url}</p>
                    </a>
                  ))}
                </div>
              </Card>
            )}

            {/* Raw Output (for debugging) */}
            {process.env.NODE_ENV === "development" && results.raw && (
              <details className="mt-8">
                <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-900">
                  View Raw Output (Debug)
                </summary>
                <Card className="mt-2">
                  <pre className="text-xs text-gray-700 whitespace-pre-wrap overflow-x-auto">
                    {results.raw}
                  </pre>
                </Card>
              </details>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
