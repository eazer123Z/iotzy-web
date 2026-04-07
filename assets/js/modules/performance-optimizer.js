/**
 * assets/js/modules/performance-optimizer.js
 * ─────────────────────────────────────────────────────────────────
 * Senior Performance Optimizer for IoTzy.
 * Implements: Caching, Prefetching, Stale-While-Revalidate, and Debouncing.
 */

const CACHE_CONFIG = {
  enabled: true,
  ttl: 1000 * 60 * 5, // 5 minutes default
  version: "v1.0.2",
};

const CACHE_KEYS = {
  DEVICES: "iotzy_cache_devices",
  SENSORS: "iotzy_cache_sensors",
  ANALYTICS: "iotzy_cache_analytics",
  DASHBOARD: "iotzy_cache_dashboard",
};

const PerformanceOptimizer = {
  _memoryCache: {},

  shouldDeferOptionalWork() {
    if (typeof document !== "undefined" && document.hidden) return true;
    if (typeof navigator === "undefined") return false;
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    const effectiveType = String(connection?.effectiveType || "").toLowerCase();
    return !!connection?.saveData || effectiveType === "slow-2g" || effectiveType === "2g";
  },

  /**
   * Caching Manager (Stale-While-Revalidate)
   */
  Cache: {
    get(key) {
      if (!CACHE_CONFIG.enabled) return null;
      
      // 1. Check Memory Cache
      const memoryEntry = PerformanceOptimizer._memoryCache[key];
      if (memoryEntry) {
        if ((Date.now() - memoryEntry.timestamp) <= CACHE_CONFIG.ttl) {
          return memoryEntry.data;
        }
        delete PerformanceOptimizer._memoryCache[key];
      }

      // 2. Check LocalStorage
      try {
        const stored = localStorage.getItem(key);
        if (stored) {
          const parsed = JSON.parse(stored);
          const timestamp = Number(parsed.timestamp || 0);
          const isExpired = !timestamp || (Date.now() - timestamp) > CACHE_CONFIG.ttl;
          if (parsed.version === CACHE_CONFIG.version && !isExpired) {
            PerformanceOptimizer._memoryCache[key] = {
              data: parsed.data,
              timestamp,
            };
            return parsed.data;
          }
          localStorage.removeItem(key);
        }
      } catch (e) {
        console.warn("Cache Read Error:", e);
      }
      return null;
    },

    set(key, data) {
      if (!CACHE_CONFIG.enabled) return;
      
      const entry = {
        data,
        timestamp: Date.now(),
      };
      PerformanceOptimizer._memoryCache[key] = entry;
      try {
        localStorage.setItem(key, JSON.stringify({
          data: entry.data,
          timestamp: entry.timestamp,
          version: CACHE_CONFIG.version
        }));
      } catch (e) {
        console.warn("Cache Write Error:", e);
      }
    }
  },

  /**
   * Prefetch Manager
   */
  Prefetch: {
    _prefetched: new Set(),

    async start() {
      const kickoff = () => {
        if (PerformanceOptimizer.shouldDeferOptionalWork()) return;
        this.run();
      };

      if (typeof window.requestIdleCallback === "function") {
        window.requestIdleCallback(() => kickoff(), { timeout: 4000 });
      } else {
        setTimeout(() => kickoff(), 3200);
      }
    },

    async run() {
      if (PerformanceOptimizer.shouldDeferOptionalWork()) return;
      const tasks = [
        { action: "get_schedules", data: {}, key: "iotzy_cache_schedules" }
      ];

      for (const task of tasks) {
        if (!this._prefetched.has(task.key)) {
          try {
            const res = await apiPost(task.action, task.data, { refresh: false });
            if (res) {
              PerformanceOptimizer.Cache.set(task.key, res);
              this._prefetched.add(task.key);
            }
          } catch (_) {}
          if (PerformanceOptimizer.shouldDeferOptionalWork()) break;
          await new Promise((resolve) => setTimeout(resolve, 140));
        }
      }
    }
  },

  /**
   * Instant UI Transition (Skeleton/Cache first)
   */
  async smartFetch(action, data, cacheKey, callback) {
    // 1. Return Cache immediately if exists
    const cachedData = this.Cache.get(cacheKey);
    if (cachedData && callback) {
      callback(cachedData, true); // true = from cache
    }

    // 2. Fetch fresh data in background
    try {
      const freshData = await apiPost(action, data);
      if (freshData) {
        this.Cache.set(cacheKey, freshData);
        if (callback) callback(freshData, false); // false = fresh
      }
    } catch (e) {
      console.error("SmartFetch Error:", e);
    }
  },

  /**
   * Debounce helper
   */
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
};

function initPerformanceOptimizer() {
  if (initPerformanceOptimizer._started) return;
  initPerformanceOptimizer._started = true;
  PerformanceOptimizer.Prefetch.start();
}

window.initPerformanceOptimizer = initPerformanceOptimizer;
