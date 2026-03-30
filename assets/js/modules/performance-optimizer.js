/**
 * assets/js/modules/performance-optimizer.js
 * ─────────────────────────────────────────────────────────────────
 * Senior Performance Optimizer for IoTzy.
 * Implements: Caching, Prefetching, Stale-While-Revalidate, and Debouncing.
 */

const CACHE_CONFIG = {
  enabled: true,
  ttl: 1000 * 60 * 5, // 5 minutes default
  version: "v1.0.1",
};

const CACHE_KEYS = {
  DEVICES: "iotzy_cache_devices",
  SENSORS: "iotzy_cache_sensors",
  AUTOMATION: "iotzy_cache_automation",
  ANALYTICS: "iotzy_cache_analytics",
  DASHBOARD: "iotzy_cache_dashboard",
};

const PerformanceOptimizer = {
  _memoryCache: {},

  /**
   * Caching Manager (Stale-While-Revalidate)
   */
  Cache: {
    get(key) {
      if (!CACHE_CONFIG.enabled) return null;
      
      // 1. Check Memory Cache
      if (PerformanceOptimizer._memoryCache[key]) {
        return PerformanceOptimizer._memoryCache[key];
      }

      // 2. Check LocalStorage
      try {
        const stored = localStorage.getItem(key);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed.version === CACHE_CONFIG.version) {
            PerformanceOptimizer._memoryCache[key] = parsed.data;
            return parsed.data;
          }
        }
      } catch (e) {
        console.warn("Cache Read Error:", e);
      }
      return null;
    },

    set(key, data) {
      if (!CACHE_CONFIG.enabled) return;
      
      PerformanceOptimizer._memoryCache[key] = data;
      try {
        localStorage.setItem(key, JSON.stringify({
          data: data,
          timestamp: Date.now(),
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
      // Tunggu sebentar setelah bootstrap selesai
      setTimeout(() => {
        this.run();
      }, 2000);
    },

    async run() {
      console.log("🚀 Starting Prefetching...");
      
      const today = new Date().toISOString().slice(0, 10);
      const tasks = [
        { action: "get_logs", data: { date: today, limit: 100 }, key: `iotzy_cache_logs_${today}` },
        { action: "get_logs_daily_summary", data: { date: today }, key: `iotzy_cache_summary_${today}` },
        { action: "get_automation_rules", data: {}, key: CACHE_KEYS.AUTOMATION },
        { action: "get_schedules", data: {}, key: "iotzy_cache_schedules" }
      ];

      for (const task of tasks) {
        if (!this._prefetched.has(task.key)) {
          apiPost(task.action, task.data).then(res => {
            if (res) {
              PerformanceOptimizer.Cache.set(task.key, res);
              this._prefetched.add(task.key);
            }
          }).catch(() => {});
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

// Auto-start Prefetching
document.addEventListener("DOMContentLoaded", () => {
  PerformanceOptimizer.Prefetch.start();
});
