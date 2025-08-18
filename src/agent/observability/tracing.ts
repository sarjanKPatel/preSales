export interface Span {
  id: string;
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  status: 'running' | 'completed' | 'error';
  metadata: Record<string, any>;
  error?: Error;
}

export interface Metrics {
  counters: Map<string, number>;
  gauges: Map<string, number>;
  histograms: Map<string, number[]>;
  latencies: Map<string, number[]>;
}

export interface Timer {
  start(): void;
  end(): number;
}

class SimpleTimer implements Timer {
  private startTime: number = 0;

  start(): void {
    this.startTime = Date.now();
  }

  end(): number {
    return Date.now() - this.startTime;
  }
}

class TracingSystem {
  private spans = new Map<string, Span>();
  private activeSpans: string[] = [];
  private metrics: Metrics = {
    counters: new Map(),
    gauges: new Map(),
    histograms: new Map(),
    latencies: new Map(),
  };

  // Span management
  startSpan(name: string, metadata: Record<string, any> = {}): string {
    const id = `span_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const span: Span = {
      id,
      name,
      startTime: Date.now(),
      status: 'running',
      metadata,
    };

    this.spans.set(id, span);
    this.activeSpans.push(id);
    
    console.log(`[Tracing] Started span: ${name} (${id})`);
    return id;
  }

  endSpan(id: string, error?: Error): void {
    const span = this.spans.get(id);
    if (!span) {
      console.warn(`[Tracing] Span not found: ${id}`);
      return;
    }

    const endTime = Date.now();
    span.endTime = endTime;
    span.duration = endTime - span.startTime;
    span.status = error ? 'error' : 'completed';
    
    if (error) {
      span.error = error;
    }

    // Remove from active spans
    const index = this.activeSpans.indexOf(id);
    if (index >= 0) {
      this.activeSpans.splice(index, 1);
    }

    // Record latency metric
    this.recordLatency(`span.${span.name}`, span.duration);
    
    console.log(`[Tracing] Ended span: ${span.name} (${span.duration}ms)`);
  }

  getSpan(id: string): Span | undefined {
    return this.spans.get(id);
  }

  getCurrentSpan(): Span | undefined {
    const activeId = this.activeSpans[this.activeSpans.length - 1];
    return activeId ? this.spans.get(activeId) : undefined;
  }

  // Metrics recording
  recordCount(name: string, value = 1): void {
    const current = this.metrics.counters.get(name) || 0;
    this.metrics.counters.set(name, current + value);
  }

  recordGauge(name: string, value: number): void {
    this.metrics.gauges.set(name, value);
  }

  recordLatency(name: string, duration: number): void {
    const latencies = this.metrics.latencies.get(name) || [];
    latencies.push(duration);
    
    // Keep only last 100 measurements
    if (latencies.length > 100) {
      latencies.shift();
    }
    
    this.metrics.latencies.set(name, latencies);
  }

  recordHistogram(name: string, value: number): void {
    const values = this.metrics.histograms.get(name) || [];
    values.push(value);
    
    // Keep only last 1000 values
    if (values.length > 1000) {
      values.shift();
    }
    
    this.metrics.histograms.set(name, values);
  }

  // Metrics retrieval
  getMetrics(): Metrics {
    return {
      counters: new Map(this.metrics.counters),
      gauges: new Map(this.metrics.gauges),
      histograms: new Map(this.metrics.histograms),
      latencies: new Map(this.metrics.latencies),
    };
  }

  getMetricsSummary(): Record<string, any> {
    const summary: Record<string, any> = {};

    // Counters
    summary.counters = Object.fromEntries(this.metrics.counters);
    
    // Gauges
    summary.gauges = Object.fromEntries(this.metrics.gauges);
    
    // Latency statistics
    summary.latencies = {};
    for (const [name, values] of this.metrics.latencies) {
      if (values.length > 0) {
        summary.latencies[name] = {
          count: values.length,
          avg: values.reduce((a, b) => a + b, 0) / values.length,
          min: Math.min(...values),
          max: Math.max(...values),
          p50: this.percentile(values, 0.5),
          p95: this.percentile(values, 0.95),
          p99: this.percentile(values, 0.99),
        };
      }
    }

    return summary;
  }

  private percentile(values: number[], p: number): number {
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * p) - 1;
    return sorted[Math.max(0, index)];
  }

  // Span queries
  getSpansByName(name: string): Span[] {
    return Array.from(this.spans.values()).filter(span => span.name === name);
  }

  getRecentSpans(limit = 10): Span[] {
    return Array.from(this.spans.values())
      .sort((a, b) => b.startTime - a.startTime)
      .slice(0, limit);
  }

  getErrorSpans(): Span[] {
    return Array.from(this.spans.values()).filter(span => span.status === 'error');
  }

  // Cleanup
  cleanup(olderThanMs = 3600000): void { // Default: 1 hour
    const cutoff = Date.now() - olderThanMs;
    const toDelete: string[] = [];

    for (const [id, span] of this.spans) {
      if (span.startTime < cutoff && span.status !== 'running') {
        toDelete.push(id);
      }
    }

    toDelete.forEach(id => this.spans.delete(id));
    
    if (toDelete.length > 0) {
      console.log(`[Tracing] Cleaned up ${toDelete.length} old spans`);
    }
  }

  // Export for analysis
  exportSpans(): Span[] {
    return Array.from(this.spans.values());
  }

  reset(): void {
    this.spans.clear();
    this.activeSpans.length = 0;
    this.metrics = {
      counters: new Map(),
      gauges: new Map(),
      histograms: new Map(),
      latencies: new Map(),
    };
  }

  // Public getters for health status
  getActiveSpansCount(): number {
    return this.activeSpans.length;
  }

  getTotalSpansCount(): number {
    return this.spans.size;
  }

  getTotalMetricsCount(): number {
    return this.metrics.counters.size + this.metrics.gauges.size + this.metrics.latencies.size;
  }
}

// Global tracing instance
const tracing = new TracingSystem();

// Convenience functions
export function withRootSpan<T>(name: string, fn: () => Promise<T>, metadata?: Record<string, any>): Promise<T> {
  const spanId = tracing.startSpan(name, metadata);
  
  return fn()
    .then(result => {
      tracing.endSpan(spanId);
      return result;
    })
    .catch(error => {
      tracing.endSpan(spanId, error);
      throw error;
    });
}

export function createTimer(): Timer {
  return new SimpleTimer();
}

export function trackError(error: Error, metadata?: Record<string, any>): void {
  tracing.recordCount('errors.total');
  tracing.recordCount(`errors.${error.name || 'unknown'}`);
  
  const currentSpan = tracing.getCurrentSpan();
  if (currentSpan) {
    currentSpan.metadata.error = {
      name: error.name,
      message: error.message,
      stack: error.stack,
      ...metadata,
    };
  }
  
  console.error('[Tracing] Error tracked:', error.message, metadata);
}

// Metrics shortcuts
export const metrics = {
  recordCount: (name: string, value?: number) => tracing.recordCount(name, value),
  recordGauge: (name: string, value: number) => tracing.recordGauge(name, value),
  recordLatency: (name: string, duration: number) => tracing.recordLatency(name, duration),
  recordHistogram: (name: string, value: number) => tracing.recordHistogram(name, value),
  getMetrics: () => tracing.getMetrics(),
  getSummary: () => tracing.getMetricsSummary(),
};

// Span management
export const spans = {
  start: (name: string, metadata?: Record<string, any>) => tracing.startSpan(name, metadata),
  end: (id: string, error?: Error) => tracing.endSpan(id, error),
  get: (id: string) => tracing.getSpan(id),
  getCurrent: () => tracing.getCurrentSpan(),
  getByName: (name: string) => tracing.getSpansByName(name),
  getRecent: (limit?: number) => tracing.getRecentSpans(limit),
  getErrors: () => tracing.getErrorSpans(),
  export: () => tracing.exportSpans(),
};

// Health and maintenance
export const health = {
  cleanup: (olderThanMs?: number) => tracing.cleanup(olderThanMs),
  reset: () => tracing.reset(),
  getStatus: () => ({
    activeSpans: tracing.getActiveSpansCount(),
    totalSpans: tracing.getTotalSpansCount(),
    totalMetrics: tracing.getTotalMetricsCount(),
  }),
};

// Performance monitoring decorators
export function traced(spanName?: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const name = spanName || `${target.constructor.name}.${propertyKey}`;

    descriptor.value = async function (...args: any[]) {
      const spanId = tracing.startSpan(name, { 
        class: target.constructor.name,
        method: propertyKey,
        args: args.length,
      });

      try {
        const result = await originalMethod.apply(this, args);
        tracing.endSpan(spanId);
        return result;
      } catch (error) {
        tracing.endSpan(spanId, error as Error);
        throw error;
      }
    };

    return descriptor;
  };
}

// Export the tracing system for advanced usage
export { tracing };

// Auto-cleanup every 30 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    tracing.cleanup();
  }, 30 * 60 * 1000);
}