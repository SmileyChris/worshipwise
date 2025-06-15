import { flushSync } from 'svelte';
import { vi } from 'vitest';

/**
 * Test utility for component testing with Svelte 5
 * Following patterns from the testing guide
 */
export function testComponent(
  Component: any,
  testFn: (component: any) => void | Promise<void>,
  props = {}
) {
  let component: any;
  let cleanup: () => void;
  
  // Use $effect.root pattern from testing guide
  // Note: This will be updated when we implement actual component tests
  try {
    component = { ...props }; // Placeholder for actual mount
    testFn(component);
    cleanup = () => {}; // Placeholder for actual unmount
  } finally {
    cleanup?.();
  }
}

/**
 * Wait for DOM updates - useful for async operations
 */
export function waitForUpdates(): Promise<void> {
  return new Promise(resolve => requestAnimationFrame(resolve));
}

/**
 * Trigger custom events on elements
 */
export function triggerEvent(element: HTMLElement, eventName: string, detail?: any): void {
  const event = new CustomEvent(eventName, { detail, bubbles: true });
  element.dispatchEvent(event);
}

/**
 * Flush synchronous state updates
 * Recommended pattern from testing guide
 */
export function flushSyncUpdates(fn: () => void): void {
  flushSync(fn);
}

/**
 * Mock realtime client for WebSocket testing
 * As recommended in testing guide
 */
export class MockRealtimeClient {
  private listeners = new Map<string, Set<Function>>();
  
  subscribe(channel: string, callback: Function): () => void {
    if (!this.listeners.has(channel)) {
      this.listeners.set(channel, new Set());
    }
    this.listeners.get(channel)!.add(callback);
    
    return () => {
      this.listeners.get(channel)?.delete(callback);
    };
  }
  
  emit(channel: string, data: any): void {
    flushSync(() => {
      this.listeners.get(channel)?.forEach(cb => cb(data));
    });
  }
  
  clear(): void {
    this.listeners.clear();
  }
}

/**
 * Performance measurement utilities
 * As recommended in testing guide
 */
export async function measureRenderTime(
  renderFn: () => void | Promise<void>,
  iterations = 10
): Promise<{
  average: number;
  min: number;
  max: number;
  p95: number;
}> {
  const times: number[] = [];
  
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    
    await renderFn();
    await waitForUpdates();
    
    const end = performance.now();
    times.push(end - start);
  }
  
  times.sort((a, b) => a - b);
  
  return {
    average: times.reduce((a, b) => a + b) / times.length,
    min: Math.min(...times),
    max: Math.max(...times),
    p95: times[Math.floor(times.length * 0.95)]
  };
}

/**
 * Global test helpers as recommended in testing guide
 */
export const testHelpers = {
  flushSync,
  waitForUpdates,
  triggerEvent,
  MockRealtimeClient,
  measureRenderTime
};

// Make available globally for tests
if (typeof globalThis !== 'undefined') {
  (globalThis as any).testHelpers = testHelpers;
}