/**
 * Progress tracking utilities for long-running operations
 */

export interface ProgressTracker {
  total: number;
  current: number;
  startTime: number;
  lastUpdate: number;
  updateInterval: number;
}

export class ProgressBar {
  private width: number;
  private tracker: ProgressTracker;

  constructor(total: number, width: number = 40) {
    this.width = width;
    this.tracker = {
      total,
      current: 0,
      startTime: Date.now(),
      lastUpdate: Date.now(),
      updateInterval: 100, // Update every 100ms
    };
  }

  update(current: number): void {
    this.tracker.current = current;
    const now = Date.now();

    if (now - this.tracker.lastUpdate >= this.tracker.updateInterval) {
      this.render();
      this.tracker.lastUpdate = now;
    }
  }

  complete(): void {
    this.tracker.current = this.tracker.total;
    this.render();
    console.log(); // New line after progress bar
  }

  private render(): void {
    const percentage = Math.min(
      100,
      Math.round((this.tracker.current / this.tracker.total) * 100)
    );
    const filled = Math.round(
      (this.tracker.current / this.tracker.total) * this.width
    );
    const empty = this.width - filled;

    const bar = "█".repeat(filled) + "░".repeat(empty);
    const elapsed = Date.now() - this.tracker.startTime;
    const eta = this.calculateETA(elapsed);

    // Clear current line and write progress
    process.stdout.write(
      `\r[${bar}] ${percentage}% (${this.tracker.current}/${this.tracker.total}) ETA: ${eta}`
    );
  }

  private calculateETA(elapsed: number): string {
    if (this.tracker.current === 0) return "--:--";

    const rate = this.tracker.current / elapsed;
    const remaining = this.tracker.total - this.tracker.current;
    const etaMs = remaining / rate;

    const minutes = Math.floor(etaMs / 60000);
    const seconds = Math.floor((etaMs % 60000) / 1000);

    return `${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}`;
  }
}

export class PerformanceMonitor {
  private startTime: number;
  private checkpoints: Map<string, number> = new Map();
  private memoryUsage: NodeJS.MemoryUsage[] = [];

  constructor() {
    this.startTime = Date.now();
    this.recordMemoryUsage();
  }

  checkpoint(name: string): void {
    this.checkpoints.set(name, Date.now());
    this.recordMemoryUsage();
  }

  getReport(): PerformanceReport {
    const endTime = Date.now();
    const totalDuration = endTime - this.startTime;

    const checkpointDurations: Record<string, number> = {};
    let lastTime = this.startTime;

    for (const name of Array.from(this.checkpoints.keys())) {
      const time = this.checkpoints.get(name)!;
      checkpointDurations[name] = time - lastTime;
      lastTime = time;
    }

    return {
      totalDuration,
      checkpointDurations,
      memoryUsage: this.memoryUsage,
      peakMemoryUsage: this.getPeakMemoryUsage(),
      averageMemoryUsage: this.getAverageMemoryUsage(),
    };
  }

  private recordMemoryUsage(): void {
    this.memoryUsage.push(process.memoryUsage());
  }

  private getPeakMemoryUsage(): NodeJS.MemoryUsage {
    return this.memoryUsage.reduce((peak, current) => ({
      rss: Math.max(peak.rss, current.rss),
      heapTotal: Math.max(peak.heapTotal, current.heapTotal),
      heapUsed: Math.max(peak.heapUsed, current.heapUsed),
      external: Math.max(peak.external, current.external),
      arrayBuffers: Math.max(peak.arrayBuffers, current.arrayBuffers),
    }));
  }

  private getAverageMemoryUsage(): NodeJS.MemoryUsage {
    const sum = this.memoryUsage.reduce((acc, current) => ({
      rss: acc.rss + current.rss,
      heapTotal: acc.heapTotal + current.heapTotal,
      heapUsed: acc.heapUsed + current.heapUsed,
      external: acc.external + current.external,
      arrayBuffers: acc.arrayBuffers + current.arrayBuffers,
    }));

    const count = this.memoryUsage.length;

    return {
      rss: Math.round(sum.rss / count),
      heapTotal: Math.round(sum.heapTotal / count),
      heapUsed: Math.round(sum.heapUsed / count),
      external: Math.round(sum.external / count),
      arrayBuffers: Math.round(sum.arrayBuffers / count),
    };
  }
}

export interface PerformanceReport {
  totalDuration: number;
  checkpointDurations: Record<string, number>;
  memoryUsage: NodeJS.MemoryUsage[];
  peakMemoryUsage: NodeJS.MemoryUsage;
  averageMemoryUsage: NodeJS.MemoryUsage;
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

export function formatMemoryUsage(mem: NodeJS.MemoryUsage): string {
  const formatBytes = (bytes: number): string => {
    const units = ["B", "KB", "MB", "GB"];
    let value = bytes;
    let unitIndex = 0;

    while (value >= 1024 && unitIndex < units.length - 1) {
      value /= 1024;
      unitIndex++;
    }

    return `${value.toFixed(1)}${units[unitIndex]}`;
  };

  return `RSS: ${formatBytes(mem.rss)}, Heap: ${formatBytes(
    mem.heapUsed
  )}/${formatBytes(mem.heapTotal)}`;
}
