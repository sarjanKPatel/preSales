"use client";

import React, { useState } from "react";
import Layout from "@/components/layout/Layout";
import Card from "@/components/Card";
import { Loader2, Sparkles, Search, FileText, AlertCircle } from "lucide-react";

export default function TestAIPage() {
  const [activeTest, setActiveTest] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Record<string, any> | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Test basic OpenAI connection
  const testOpenAI = async () => {
    setActiveTest("openai");
    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const response = await fetch("/api/test/openai", {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to test OpenAI");
      }

      setResults(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unknown error occurred");
    } finally {
      setLoading(false);
    }
  };

  // Test Deep Research
  const testDeepResearch = async () => {
    setActiveTest("deep-research");
    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const response = await fetch("/api/test/deep-research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company: "Stripe",
          query: "Quick research on company size and recent news",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to test Deep Research");
      }

      setResults(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unknown error occurred");
    } finally {
      setLoading(false);
    }
  };

  // Test Pre-Demo Checklist
  const testPreDemoChecklist = async () => {
    setActiveTest("pre-demo");
    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const response = await fetch("/api/test/pre-demo-checklist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company: "Microsoft",
          contact: {
            name: "John Smith",
            title: "VP of Sales",
            demoDate: "2024-02-01",
          },
        }),
      });

      // Stream the response for progress updates
      if (!response.ok) {
        throw new Error("Failed to generate checklist");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);

        // Parse streaming updates
        const lines = chunk.split("\n");
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.type === "progress") {
                setResults((prev: Record<string, any> | null) => ({
                  ...prev,
                  progress: data.message,
                }));
              } else if (data.type === "complete") {
                setResults(data.result);
              }
            } catch {
              // Ignore parsing errors
            }
          }
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unknown error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            AI Integration Testing
          </h1>
          <p className="text-gray-600">
            Test various AI features before integrating them into the main
            application
          </p>
        </div>

        {/* Test Options */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={testOpenAI}
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">
                  Test OpenAI Connection
                </h3>
                <p className="text-sm text-gray-600">
                  Verify API key and basic functionality
                </p>
              </div>
            </div>
          </Card>

          <Card
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={testDeepResearch}
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Search className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">
                  Test Deep Research
                </h3>
                <p className="text-sm text-gray-600">
                  Quick company research (2-3 min)
                </p>
              </div>
            </div>
          </Card>

          <Card
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={testPreDemoChecklist}
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">
                  Pre-Demo Checklist
                </h3>
                <p className="text-sm text-gray-600">
                  Full research report (5-10 min)
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Results Section */}
        {(loading || results || error) && (
          <Card title="Test Results" className="mt-8">
            {loading && (
              <div className="flex items-center gap-3 text-gray-600">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Running {activeTest} test...</span>
                {results?.progress && (
                  <span className="text-sm text-gray-500">
                    - {results.progress}
                  </span>
                )}
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

            {results && !loading && (
              <div className="space-y-4">
                {activeTest === "openai" && (
                  <div>
                    <p className="text-green-600 font-medium mb-2">
                      ✅ OpenAI Connection Successful!
                    </p>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-700">{results.message}</p>
                      <p className="text-xs text-gray-500 mt-2">
                        Model: {results.model}
                      </p>
                    </div>
                  </div>
                )}

                {activeTest === "deep-research" && (
                  <div>
                    <h3 className="font-semibold mb-2">Research Results</h3>
                    <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                      <div>
                        <p className="text-sm font-medium text-gray-700">
                          Summary:
                        </p>
                        <p className="text-sm text-gray-600 whitespace-pre-wrap">
                          {results.summary}
                        </p>
                      </div>
                      {results.stats && (
                        <div className="pt-3 border-t border-gray-200">
                          <p className="text-xs text-gray-500">
                            Searches: {results.stats.searches} | Pages read:{" "}
                            {results.stats.pagesRead} | Duration:{" "}
                            {results.stats.duration}s
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeTest === "pre-demo" && results.checklist && (
                  <div className="space-y-4">
                    <h3 className="font-semibold">
                      Pre-Demo Checklist Generated
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="font-medium text-sm mb-2">
                          Company Overview
                        </h4>
                        <p className="text-sm text-gray-600">
                          {results.checklist.companyOverview}
                        </p>
                      </div>

                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="font-medium text-sm mb-2">
                          Recent News
                        </h4>
                        <p className="text-sm text-gray-600">
                          {results.checklist.recentNews}
                        </p>
                      </div>

                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="font-medium text-sm mb-2">
                          Key Executives
                        </h4>
                        <ul className="text-sm text-gray-600">
                          {Object.entries(
                            results.checklist.keyExecutives || {}
                          ).map(([name, title]) => (
                            <li key={name}>
                              • {name}: {title}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="font-medium text-sm mb-2">
                          Technology Stack
                        </h4>
                        <ul className="text-sm text-gray-600">
                          {results.checklist.technologyStack?.map(
                            (tech: string) => (
                              <li key={tech}>• {tech}</li>
                            )
                          )}
                        </ul>
                      </div>
                    </div>

                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h4 className="font-medium text-sm mb-2">
                        Recommended Demo Focus
                      </h4>
                      <ol className="text-sm text-gray-700 list-decimal list-inside">
                        {results.checklist.recommendedDemoFocus?.map(
                          (focus: string, i: number) => (
                            <li key={i}>{focus}</li>
                          )
                        )}
                      </ol>
                    </div>
                  </div>
                )}
              </div>
            )}
          </Card>
        )}
      </div>
    </Layout>
  );
}
