/**
 * Performance benchmarking utilities for Bible data processing
 */

import {
  PerformanceMonitor,
  formatDuration,
  formatMemoryUsage,
} from "./progressTracker";

export interface BenchmarkResult {
  operation: string;
  duration: number;
  memoryUsage: NodeJS.MemoryUsage;
  throughput?: number; // items per second
  metadata?: Record<string, any>;
}

export class BenchmarkSuite {
  private results: BenchmarkResult[] = [];
  private monitor: PerformanceMonitor;

  constructor() {
    this.monitor = new PerformanceMonitor();
  }

  async benchmark<T>(
    operation: string,
    fn: () => Promise<T> | T,
    options?: {
      itemCount?: number;
      metadata?: Record<string, any>;
    }
  ): Promise<T> {
    const startTime = Date.now();
    const startMemory = process.memoryUsage();

    this.monitor.checkpoint(`${operation}-start`);

    try {
      const result = await fn();
      const endTime = Date.now();
      const duration = endTime - startTime;

      this.monitor.checkpoint(`${operation}-end`);

      const memoryUsage = process.memoryUsage();
      const throughput = options?.itemCount
        ? options.itemCount / (duration / 1000)
        : undefined;

      const benchmarkResult: BenchmarkResult = {
        operation,
        duration,
        memoryUsage,
        throughput,
        metadata: options?.metadata,
      };

      this.results.push(benchmarkResult);

      return result;
    } catch (error) {
      this.monitor.checkpoint(`${operation}-error`);
      throw error;
    }
  }

  getResults(): BenchmarkResult[] {
    return [...this.results];
  }

  generateReport(): string {
    const lines: string[] = [];
    lines.push("=".repeat(60));
    lines.push("PERFORMANCE BENCHMARK REPORT");
    lines.push("=".repeat(60));

    if (this.results.length === 0) {
      lines.push("No benchmark results available.");
      return lines.join("\n");
    }

    lines.push(`\n📊 SUMMARY:`);
    lines.push(`   Total Operations: ${this.results.length}`);
    lines.push(
      `   Total Duration: ${formatDuration(
        this.monitor.getReport().totalDuration
      )}`
    );

    const totalMemory = this.results.reduce(
      (acc, result) => ({
        rss: acc.rss + result.memoryUsage.rss,
        heapTotal: acc.heapTotal + result.memoryUsage.heapTotal,
        heapUsed: acc.heapUsed + result.memoryUsage.heapUsed,
        external: acc.external + result.memoryUsage.external,
        arrayBuffers: acc.arrayBuffers + result.memoryUsage.arrayBuffers,
      }),
      { rss: 0, heapTotal: 0, heapUsed: 0, external: 0, arrayBuffers: 0 }
    );

    const avgMemory = {
      rss: Math.round(totalMemory.rss / this.results.length),
      heapTotal: Math.round(totalMemory.heapTotal / this.results.length),
      heapUsed: Math.round(totalMemory.heapUsed / this.results.length),
      external: Math.round(totalMemory.external / this.results.length),
      arrayBuffers: Math.round(totalMemory.arrayBuffers / this.results.length),
    };

    lines.push(`   Average Memory: ${formatMemoryUsage(avgMemory)}`);

    lines.push(`\n🔍 DETAILED RESULTS:`);
    this.results.forEach((result, index) => {
      lines.push(`\n${index + 1}. ${result.operation.toUpperCase()}`);
      lines.push(`   Duration: ${formatDuration(result.duration)}`);
      lines.push(`   Memory: ${formatMemoryUsage(result.memoryUsage)}`);

      if (result.throughput) {
        lines.push(`   Throughput: ${result.throughput.toFixed(2)} items/sec`);
      }

      if (result.metadata) {
        lines.push(`   Metadata: ${JSON.stringify(result.metadata, null, 2)}`);
      }
    });

    // Performance analysis
    lines.push(`\n📈 PERFORMANCE ANALYSIS:`);

    const durations = this.results.map((r) => r.duration);
    const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
    const maxDuration = Math.max(...durations);
    const minDuration = Math.min(...durations);

    lines.push(`   Average Operation Time: ${formatDuration(avgDuration)}`);
    lines.push(`   Fastest Operation: ${formatDuration(minDuration)}`);
    lines.push(`   Slowest Operation: ${formatDuration(maxDuration)}`);

    if (this.results.some((r) => r.throughput)) {
      const throughputs = this.results
        .filter((r) => r.throughput)
        .map((r) => r.throughput!);
      const avgThroughput =
        throughputs.reduce((a, b) => a + b, 0) / throughputs.length;
      lines.push(
        `   Average Throughput: ${avgThroughput.toFixed(2)} items/sec`
      );
    }

    lines.push("=".repeat(60));

    return lines.join("\n");
  }

  reset(): void {
    this.results = [];
    // Create new monitor to reset checkpoints
    this.monitor = new PerformanceMonitor();
  }
}

/**
 * Benchmark a specific function with multiple runs
 */
export async function benchmarkFunction<T>(
  name: string,
  fn: () => Promise<T> | T,
  runs: number = 5,
  options?: {
    itemCount?: number;
    metadata?: Record<string, any>;
  }
): Promise<BenchmarkResult[]> {
  const suite = new BenchmarkSuite();
  const results: BenchmarkResult[] = [];

  console.log(`Benchmarking ${name} (${runs} runs)...`);

  for (let i = 0; i < runs; i++) {
    suite.reset();
    await suite.benchmark(`${name}-run-${i + 1}`, fn, options);
    results.push(...suite.getResults());
  }

  return results;
}

/**
 * Compare performance between two functions
 */
export async function comparePerformance<T1, T2>(
  name1: string,
  fn1: () => Promise<T1> | T1,
  name2: string,
  fn2: () => Promise<T2> | T2,
  runs: number = 3
): Promise<{
  [name1]: BenchmarkResult[];
  [name2]: BenchmarkResult[];
  comparison: {
    winner: string;
    durationDiff: number;
    percentFaster: number;
  };
}> {
  console.log(`Comparing ${name1} vs ${name2} (${runs} runs each)...`);

  const suite1 = new BenchmarkSuite();
  const suite2 = new BenchmarkSuite();

  // Run benchmarks
  for (let i = 0; i < runs; i++) {
    suite1.reset();
    suite2.reset();

    await Promise.all([
      suite1.benchmark(`${name1}-run-${i + 1}`, fn1),
      suite2.benchmark(`${name2}-run-${i + 1}`, fn2),
    ]);
  }

  const results1 = suite1.getResults();
  const results2 = suite2.getResults();

  // Calculate averages
  const avgDuration1 =
    results1.reduce((sum, r) => sum + r.duration, 0) / results1.length;
  const avgDuration2 =
    results2.reduce((sum, r) => sum + r.duration, 0) / results2.length;

  const winner = avgDuration1 < avgDuration2 ? name1 : name2;
  const durationDiff = Math.abs(avgDuration1 - avgDuration2);
  const percentFaster =
    (durationDiff / Math.max(avgDuration1, avgDuration2)) * 100;

  return {
    [name1]: results1,
    [name2]: results2,
    comparison: {
      winner,
      durationDiff,
      percentFaster,
    },
  };
}
