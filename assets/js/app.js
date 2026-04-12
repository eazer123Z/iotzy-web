/**
 * assets/js/app.js
 * ─────────────────────────────────────────────────────────────────
 * ORCHESTRATOR UTAMA IoTzy Frontend.
 * Berisi HANYA: Global State, Config, Utility functions, API wrapper,
 * data bootstrap, dan real-time sync. Semua logika UI spesifik
 * ada di masing-masing file dalam /modules/.
 *
 * Urutan load (footer.php):
 *   1. app.js          ← ini (pondasi, harus pertama)
 *   2. navigation.js
 *   3. overview-manager.js
 *   4. mqtt-manager, device-manager, sensor-manager
 *   5. log-manager, schedule-manager
 *   6. automation-engine, automation-ui
 *   7. camera-manager, cv-config, cv-detector, light-analyzer, cv-manager, cv-ui
 *   8. settings-manager, ai-chat
 */

/* ============================================================
   KONFIGURASI GLOBAL
   ============================================================ */
const CONFIG = {
  mqtt: {
    broker:         "broker.hivemq.com",
    port:           8884,
    path:           "/mqtt",
    maxReconnect:   5,
    reconnectDelay: 3000,
  },
  app: {
    maxLogs: 500,
    maxRenderedLogs: 180,
    liveSyncInterval: 3000,
    fullSyncInterval: 6000,
    mqttLiveSyncInterval: 4500,
    analyticsSyncInterval: 15000,
    cameraSettingsSyncInterval: 30000,
    syncBackoffMax: 12000,
  },
};

const LAZY_ASSET_MANIFEST = typeof window !== "undefined"
  ? (window.IOTZY_LAZY_ASSETS || { libs: {}, scripts: {} })
  : { libs: {}, scripts: {} };

const LAZY_ASSET_PROMISES = {};
const LAZY_GROUP_PROMISES = {};

const LAZY_FEATURE_GROUPS = {
  realtimeCore: [
    { bucket: "scripts", keys: ["performanceOptimizer", "logManager", "deviceManager", "sensorManager", "overviewManager", "mqttLib", "mqttManager"] },
  ],
  analytics: [
    { bucket: "libs", keys: ["chart"] },
    { bucket: "scripts", keys: ["performanceOptimizer", "logManager"] },
  ],
  automation: [
    { bucket: "scripts", keys: ["scheduleManager", "automationEngine", "automationUI"] },
  ],
  camera: [
    { bucket: "scripts", keys: ["cameraManager", "cameraLive", "cvConfig", "cvDetector", "lightAnalyzer", "cvManager", "cvUI"] },
  ],
  settings: [
    { bucket: "scripts", keys: ["settingsManager"] },
  ],
  aiChat: [
    { bucket: "libs", keys: ["dompurify"] },
    { bucket: "scripts", keys: ["aiChat"] },
  ],
};

function getLazyAssetUrl(bucket, key) {
  return String(LAZY_ASSET_MANIFEST?.[bucket]?.[key] || "");
}

function loadLazyAsset(bucket, key) {
  const cacheKey = `${bucket}:${key}`;
  if (LAZY_ASSET_PROMISES[cacheKey]) {
    return LAZY_ASSET_PROMISES[cacheKey];
  }

  const url = getLazyAssetUrl(bucket, key);
  if (!url || typeof document === "undefined") {
    return Promise.resolve();
  }

  const existing = Array.from(document.scripts || []).find((script) => script.src === url);
  if (existing) {
    LAZY_ASSET_PROMISES[cacheKey] = Promise.resolve();
    return LAZY_ASSET_PROMISES[cacheKey];
  }

  LAZY_ASSET_PROMISES[cacheKey] = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = url;
    script.async = false;
    script.defer = true;
    script.dataset.iotzyLazy = cacheKey;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load lazy asset: ${cacheKey}`));
    document.head.appendChild(script);
  });

  return LAZY_ASSET_PROMISES[cacheKey];
}

function syncLightAnalyzerBridge() {
  if (typeof lightAnalyzer !== "undefined") {
    lightAnalyzer.setCallbacks({
      _tag: "app",
      onLightChange: (condition, brightness) => {
        if (typeof automationEngine !== "undefined") automationEngine.notifyLight(condition, brightness);
      },
    });
  }
}

async function ensureFeatureGroup(groupName) {
  if (!groupName || LAZY_GROUP_PROMISES[groupName]) {
    return LAZY_GROUP_PROMISES[groupName] || Promise.resolve();
  }

  const group = LAZY_FEATURE_GROUPS[groupName];
  if (!Array.isArray(group) || !group.length) {
    return Promise.resolve();
  }

  LAZY_GROUP_PROMISES[groupName] = (async () => {
    for (const entry of group) {
      for (const key of entry.keys) {
        await loadLazyAsset(entry.bucket, key);
      }
    }

    if (groupName === "realtimeCore") {
      if (typeof window.initPerformanceOptimizer === "function") window.initPerformanceOptimizer();
      if (typeof window.initLogManager === "function") window.initLogManager();
      if (typeof Overview !== "undefined" && typeof Overview.init === "function") {
        Overview.init();
      }
      renderAll();
      if (typeof updateDashboardActivityFeed === "function") updateDashboardActivityFeed();
      if (typeof updateLogStats === "function") updateLogStats();
    }

    if (groupName === "camera") {
      if (typeof window.initCameraManager === "function") window.initCameraManager();
      if (typeof window.initCameraLive === "function") window.initCameraLive();
      syncLightAnalyzerBridge();
    }

    if (groupName === "settings" && typeof window.initSettingsManager === "function") {
      window.initSettingsManager();
    }

    if (groupName === "aiChat" && typeof window.initAiChatModule === "function") {
      window.initAiChatModule();
    }
  })().catch((error) => {
    delete LAZY_GROUP_PROMISES[groupName];
    throw error;
  });

  return LAZY_GROUP_PROMISES[groupName];
}

function bootstrapAIChatTrigger() {
  const chatBtn = document.getElementById("aiChatBtn");
  if (!chatBtn || chatBtn.dataset.aiLazyBound === "1") return;

  chatBtn.dataset.aiLazyBound = "1";
  chatBtn.addEventListener("click", async (event) => {
    if (window.__IOTZY_AI_CHAT_READY) return;

    event.preventDefault();
    event.stopPropagation();
    if (typeof event.stopImmediatePropagation === "function") {
      event.stopImmediatePropagation();
    }

    chatBtn.classList.add("is-loading");
    chatBtn.setAttribute("aria-busy", "true");

    try {
      await ensureFeatureGroup("aiChat");
      setTimeout(() => {
        chatBtn.click();
      }, 0);
    } catch (error) {
      console.warn("AI chat assets failed to load:", error);
      if (typeof showToast === "function") {
        showToast("Asisten AI gagal dimuat. Coba lagi sebentar.", "error");
      }
    } finally {
      chatBtn.classList.remove("is-loading");
      chatBtn.removeAttribute("aria-busy");
    }
  }, true);
}

if (typeof window !== "undefined") {
  window.ensureFeatureGroup = ensureFeatureGroup;
}

/* ============================================================
   STATE APLIKASI (Reactive-like store)
   ============================================================ */
const STATE = {
  devices:             {},
  deviceStates:        {},
  deviceTopics:        {},
  deviceOnAt:          {},
  deviceExtras:        {},
  deviceTemplates:     [],
  deviceTemplatesPromise: null,
  sensors:             {},
  sensorData:          {},
  sensorHistory:       {},
  sensorTemplates:     [],
  sensorTemplatesPromise: null,
  automationRules:     {},
  schedules:           [],
  schedulesLoaded:     false,
  scheduleLoadPromise: null,
  logs:                [],
  logFilter:           "",
  logSearchFilter:     "",
  analyticsDate:       new Date().toISOString().slice(0, 10),
  analytics:           null,
  quickControlDevices: [],
  mqtt: { client: null, connected: false, reconnectAttempts: 0, templates: [] },
  camera: {
    stream:           null,
    remoteStream:     null,
    remoteSnapshot:   null,
    active:           false,
    selectedDeviceId: null,
    selectedDeviceLabel: "",
    selectedSourceValue: "",
    selectedRemoteStreamKey: "",
    selectedRemoteLabel: "",
    mode:             "local",
    availableDevices: [],
    defaultMeta:      null,
    settings:         {},
    sessionKey:       "",
    sessionLabel:     "",
    displayName:      "",
    listError:        "",
    restoreAttempted: false,
    live: {
      featureReady:   true,
      sessions:       [],
      publishedStreamKey: "",
      watchedStreamKey: "",
    },
  },
  cvAutoStartRequested: false,
  sessionStart: Date.now(),
  cv: {
    personCount:    0,
    personPresent:  false,
    lightCondition: "unknown",
    brightness:     0,
  },
  sync: {
    timer:                 null,
    failureCount:          0,
    lastFullSyncAt:        0,
    lastAnalyticsSyncAt:   0,
    lastCameraSettingsAt:  0,
  },
};

const CAMERA_SESSION_STORAGE_KEY = `iotzy_cv_camera_profile_u${String(PHP_USER?.id || 0)}`;
const CAMERA_SESSION_TAB_KEY_STORAGE_KEY = `iotzy_cv_camera_tab_key_u${String(PHP_USER?.id || 0)}`;

function sanitizeCameraNameValue(value, fallback = "") {
  const normalized = String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
  if (!normalized) return fallback;
  return normalized.slice(0, 100);
}

function sanitizeCameraKeyValue(value, options = {}) {
  const allowEmpty = !!options.allowEmpty;
  const raw = String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9:_-]+/g, "-")
    .replace(/^[-_:]+|[-_:]+$/g, "");
  const prefix = `u${String(PHP_USER?.id || 0)}-`;
  if (!raw) return allowEmpty ? "" : `${prefix}default-browser`;
  const normalized = raw.startsWith(prefix) ? raw : `${prefix}${raw.replace(/^[-]+/, "")}`;
  return normalized.slice(0, 100);
}

function detectCameraSessionLabel() {
  if (typeof navigator === "undefined") return "Browser Ini";
  const ua = String(navigator.userAgent || "").toLowerCase();
  const platformSource = String(navigator.userAgentData?.platform || navigator.platform || "");
  let platform = platformSource;
  if (/android/.test(ua)) platform = "Android";
  else if (/iphone|ipad|ipod/.test(ua)) platform = "iPhone";
  else if (/win/.test(platformSource.toLowerCase())) platform = "Windows";
  else if (/mac/.test(platformSource.toLowerCase())) platform = "Mac";
  else if (/linux/.test(platformSource.toLowerCase())) platform = "Linux";

  let browser = "Browser";
  if (/edg\//.test(ua)) browser = "Edge";
  else if (/chrome\//.test(ua) && !/edg\//.test(ua)) browser = "Chrome";
  else if (/firefox\//.test(ua)) browser = "Firefox";
  else if (/safari\//.test(ua) && !/chrome\//.test(ua)) browser = "Safari";

  return sanitizeCameraNameValue([platform, browser].filter(Boolean).join(" "), "Browser Ini");
}

function generateCameraSessionKey() {
  const randomPart = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID().replace(/-/g, "").slice(0, 12)
    : Math.random().toString(36).slice(2, 14);
  return sanitizeCameraKeyValue(`browser-${randomPart}`);
}

function getSelectedCameraDeviceLabel() {
  const selectedId = STATE.camera.selectedDeviceId;
  const match = Array.isArray(STATE.camera.availableDevices)
    ? STATE.camera.availableDevices.find((device) => device?.deviceId === selectedId)
    : null;
  return sanitizeCameraNameValue(match?.label || STATE.camera.selectedDeviceLabel || "", "");
}

function buildCameraDisplayName(sessionLabel = STATE.camera.sessionLabel, deviceLabel = getSelectedCameraDeviceLabel()) {
  const parts = [sanitizeCameraNameValue(sessionLabel, ""), sanitizeCameraNameValue(deviceLabel, "")]
    .filter(Boolean)
    .slice(0, 2);
  return sanitizeCameraNameValue(parts.join(" • "), "Browser Camera");
}

function writeCameraSessionState() {
  const payload = {
    key: sanitizeCameraKeyValue(STATE.camera.sessionKey),
    sessionLabel: sanitizeCameraNameValue(STATE.camera.sessionLabel, detectCameraSessionLabel()),
    selectedDeviceId: STATE.camera.selectedDeviceId || "",
    selectedDeviceLabel: sanitizeCameraNameValue(STATE.camera.selectedDeviceLabel, ""),
  };

  STATE.camera.sessionKey = payload.key;
  STATE.camera.sessionLabel = payload.sessionLabel;

  try {
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.setItem(CAMERA_SESSION_TAB_KEY_STORAGE_KEY, payload.key);
    }
  } catch (_) {}

  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(CAMERA_SESSION_STORAGE_KEY, JSON.stringify({
        sessionLabel: payload.sessionLabel,
        selectedDeviceId: payload.selectedDeviceId,
        selectedDeviceLabel: payload.selectedDeviceLabel,
      }));
    }
  } catch (_) {}

  if (typeof document !== "undefined") {
    const secure = typeof window !== "undefined" && window.location?.protocol === "https:" ? "; Secure" : "";
    const maxAge = 60 * 60 * 24 * 365;
    document.cookie = `iotzy_camera_key=${encodeURIComponent(payload.key)}; Max-Age=${maxAge}; Path=/; SameSite=Lax${secure}`;
    document.cookie = `iotzy_camera_name=${encodeURIComponent(STATE.camera.displayName || buildCameraDisplayName(payload.sessionLabel, payload.selectedDeviceLabel))}; Max-Age=${maxAge}; Path=/; SameSite=Lax${secure}`;
  }

  return payload;
}

function updateCVSessionMetaUI() {
  const el = document.getElementById("cvSessionMeta");
  if (!el) return;
  const sessionLabel = sanitizeCameraNameValue(STATE.camera.sessionLabel, "Browser Ini");
  const deviceLabel = sanitizeCameraNameValue(getSelectedCameraDeviceLabel(), "kamera browser");
  el.textContent = `Sesi aktif: ${sessionLabel} • Sumber: ${deviceLabel}`;
}

function refreshCameraSessionContext(options = {}) {
  if (!STATE.camera.sessionKey) {
    STATE.camera.sessionKey = generateCameraSessionKey();
  }
  STATE.camera.sessionLabel = sanitizeCameraNameValue(
    options.sessionLabel ?? STATE.camera.sessionLabel,
    detectCameraSessionLabel()
  );
  STATE.camera.selectedDeviceLabel = sanitizeCameraNameValue(
    options.selectedDeviceLabel ?? getSelectedCameraDeviceLabel() ?? STATE.camera.selectedDeviceLabel,
    ""
  );
  STATE.camera.displayName = buildCameraDisplayName(STATE.camera.sessionLabel, STATE.camera.selectedDeviceLabel);

  if (!STATE.camera.defaultMeta || typeof STATE.camera.defaultMeta !== "object") {
    STATE.camera.defaultMeta = {};
  }
  STATE.camera.defaultMeta = {
    ...STATE.camera.defaultMeta,
    camera_key: STATE.camera.sessionKey,
    name: STATE.camera.displayName,
  };

  if (options.persist !== false) {
    writeCameraSessionState();
  }
  updateCVSessionMetaUI();

  return {
    camera_key: STATE.camera.sessionKey,
    camera_name: STATE.camera.displayName,
    camera_session_label: STATE.camera.sessionLabel,
    camera_device_label: STATE.camera.selectedDeviceLabel || "",
  };
}

function initializeCameraSessionState() {
  let storedProfile = null;
  let storedTabKey = "";
  try {
    if (typeof localStorage !== "undefined") {
      storedProfile = JSON.parse(localStorage.getItem(CAMERA_SESSION_STORAGE_KEY) || "null");
    }
  } catch (_) {
    storedProfile = null;
  }

  try {
    if (typeof sessionStorage !== "undefined") {
      storedTabKey = String(sessionStorage.getItem(CAMERA_SESSION_TAB_KEY_STORAGE_KEY) || "");
    }
  } catch (_) {
    storedTabKey = "";
  }

  const legacyStoredKey = sanitizeCameraKeyValue(storedProfile?.key || storedProfile?.cameraKey || "", { allowEmpty: true });
  STATE.camera.sessionKey = sanitizeCameraKeyValue(storedTabKey || legacyStoredKey || "", { allowEmpty: true }) || generateCameraSessionKey();
  STATE.camera.sessionLabel = sanitizeCameraNameValue(storedProfile?.sessionLabel || storedProfile?.label || "", detectCameraSessionLabel());
  STATE.camera.selectedDeviceId = storedProfile?.selectedDeviceId || STATE.camera.selectedDeviceId || null;
  STATE.camera.selectedDeviceLabel = sanitizeCameraNameValue(storedProfile?.selectedDeviceLabel || "", "");

  refreshCameraSessionContext({ persist: true });
}

function getCameraRequestContext(extra = {}) {
  const context = refreshCameraSessionContext({ persist: false });
  return {
    ...extra,
    camera_key: context.camera_key,
    camera_name: context.camera_name,
    camera_session_label: context.camera_session_label,
    camera_device_label: context.camera_device_label,
    camera_active: !!STATE.camera.active,
  };
}

function isPHPCameraSnapshotActiveSession() {
  const phpKey = sanitizeCameraKeyValue(typeof PHP_CAMERA !== "undefined" ? PHP_CAMERA?.camera_key : "", { allowEmpty: true });
  const activeKey = sanitizeCameraKeyValue(STATE.camera.sessionKey, { allowEmpty: true });
  return !!phpKey && !!activeKey && phpKey === activeKey;
}

/* ============================================================
   KONFIGURASI COMPUTER VISION (state runtime)
   ============================================================ */
const CV = {
  modelLoaded:   false,
  modelLoading:  false,
  detecting:     false,
  model:         null,
  fpsTimer:      null,
  fps:           0,
  frameCount:    0,
  overlayCanvas: null,
  overlayCtx:    null,
  showBoxes:     true,
  showDebug:     true,
  confidence:    0.5,
  humanPresent:  false,
  humanTimer:    null,
  lightCondition:"unknown",
  lightTimer:    null,
  cvRules: {
    human: { enabled: true, rules: [], delay: 5000 },
    light: { enabled: true, onDark:   [], onBright: [], delay: 2000 },
  },
};

function normalizeCVConfigInput(config = {}, base = {}) {
  const currentBase = {
    showBoundingBox: base.showBoundingBox ?? CV.showBoxes ?? true,
    showDebugInfo: base.showDebugInfo ?? CV.showDebug ?? true,
    minConfidence: base.minConfidence ?? CV.confidence ?? 0.5,
    darkThreshold: base.darkThreshold ?? (typeof CV_CONFIG !== "undefined" ? CV_CONFIG?.light?.darkThreshold : undefined) ?? 0.3,
    brightThreshold: base.brightThreshold ?? (typeof CV_CONFIG !== "undefined" ? CV_CONFIG?.light?.brightThreshold : undefined) ?? 0.7,
    humanEnabled: base.humanEnabled ?? CV.cvRules?.human?.enabled ?? true,
    lightEnabled: base.lightEnabled ?? CV.cvRules?.light?.enabled ?? true,
  };
  const source = (config && typeof config === "object") ? config : {};
  const boolValue = (value, fallback) => {
    if (value === undefined || value === null || value === "") return fallback;
    if (typeof value === "string") {
      const normalized = value.trim().toLowerCase();
      if (["0", "false", "off", "no"].includes(normalized)) return false;
      if (["1", "true", "on", "yes"].includes(normalized)) return true;
    }
    return Boolean(value);
  };
  const numValue = (value, fallback) => {
    const num = Number(value);
    return Number.isFinite(num) ? num : fallback;
  };

  return {
    showBoundingBox: boolValue(
      source.showBoundingBox ?? source.showBoundingBoxes ?? source.show_bounding_box ?? source.ui?.showBoundingBoxes,
      currentBase.showBoundingBox
    ),
    showDebugInfo: boolValue(
      source.showDebugInfo ?? source.show_debug_info ?? source.ui?.showDebugInfo,
      currentBase.showDebugInfo
    ),
    minConfidence: Math.min(0.99, Math.max(
      0.1,
      numValue(
        source.minConfidence ?? source.min_confidence ?? source.cv_min_confidence ?? source.detection?.minConfidence,
        currentBase.minConfidence
      )
    )),
    darkThreshold: Math.min(0.99, Math.max(
      0.01,
      numValue(
        source.darkThreshold ?? source.dark_threshold ?? source.cv_dark_threshold ?? source.light?.darkThreshold,
        currentBase.darkThreshold
      )
    )),
    brightThreshold: Math.min(0.99, Math.max(
      0.01,
      numValue(
        source.brightThreshold ?? source.bright_threshold ?? source.cv_bright_threshold ?? source.light?.brightThreshold,
        currentBase.brightThreshold
      )
    )),
    humanEnabled: boolValue(
      source.humanEnabled ?? source.human_rules_enabled ?? source.cv_human_rules_enabled ?? source.automation?.humanEnabled ?? source.cv_rules?.human?.enabled,
      currentBase.humanEnabled
    ),
    lightEnabled: boolValue(
      source.lightEnabled ?? source.light_rules_enabled ?? source.cv_light_rules_enabled ?? source.automation?.lightEnabled ?? source.cv_rules?.light?.enabled,
      currentBase.lightEnabled
    ),
  };
}

function buildCurrentCVConfigPayload(overrides = {}) {
  return normalizeCVConfigInput(overrides, {
    showBoundingBox: CV.showBoxes,
    showDebugInfo: CV.showDebug,
    minConfidence: CV.confidence,
    darkThreshold: typeof CV_CONFIG !== "undefined" ? CV_CONFIG?.light?.darkThreshold : undefined,
    brightThreshold: typeof CV_CONFIG !== "undefined" ? CV_CONFIG?.light?.brightThreshold : undefined,
    humanEnabled: CV.cvRules?.human?.enabled,
    lightEnabled: CV.cvRules?.light?.enabled,
  });
}

function normalizeHumanRuleConditionInput(condition, count) {
  const numericCount = Number.isFinite(Number(count))
    ? Math.max(0, Math.min(20, Math.trunc(Number(count))))
    : 0;
  const normalizedCondition = String(condition || "").trim().toLowerCase();

  switch (normalizedCondition) {
    case "gte":
      return { condition: "gt", count: Math.max(0, numericCount - 1) };
    case "lte":
      return { condition: "lt", count: Math.min(20, numericCount + 1) };
    case "any":
      return { condition: "gt", count: 0 };
    case "none":
      return { condition: "eq", count: 0 };
    case "eq":
    case "neq":
    case "gt":
    case "lt":
      return { condition: normalizedCondition, count: numericCount };
    default:
      return { condition: "eq", count: numericCount };
  }
}

function normalizeCVRulesInput(rules = {}, config = null) {
  const source = rules && typeof rules === "object" ? rules : {};
  const humanSource = source.human && typeof source.human === "object" ? source.human : {};
  const lightSource = source.light && typeof source.light === "object" ? source.light : {};
  const baseConfig = config ? normalizeCVConfigInput(config, buildCurrentCVConfigPayload()) : buildCurrentCVConfigPayload();
  const boolValue = (value, fallback) => {
    if (value === undefined || value === null || value === "") return fallback;
    if (typeof value === "string") {
      const normalized = value.trim().toLowerCase();
      if (["0", "false", "off", "no"].includes(normalized)) return false;
      if (["1", "true", "on", "yes"].includes(normalized)) return true;
    }
    return Boolean(value);
  };
  const normalizeDelay = (value, fallback) => {
    const parsed = Math.trunc(Number(value));
    const safe = Number.isFinite(parsed) ? parsed : fallback;
    return Math.max(0, Math.min(600000, safe));
  };
  const normalizeAction = (action) => {
    const normalized = String(action || "").trim().toLowerCase();
    return ["", "on", "off", "speed_low", "speed_mid", "speed_high"].includes(normalized) ? normalized : "";
  };
  const normalizeDeviceIds = (list) => {
    const rawList = Array.isArray(list) ? list : (list === undefined || list === null || list === "" ? [] : [list]);
    return Array.from(new Set(rawList.map((item) => String(item).trim()).filter(Boolean)));
  };

  const humanDelay = normalizeDelay(humanSource.delay, CV.cvRules?.human?.delay ?? 5000);
  const lightDelay = normalizeDelay(lightSource.delay, CV.cvRules?.light?.delay ?? 2000);
  const normalizedHumanRules = (Array.isArray(humanSource.rules) ? humanSource.rules : [])
    .map((rule, index) => {
      if (!rule || typeof rule !== "object") return null;
      const normalizedCondition = normalizeHumanRuleConditionInput(rule.condition, rule.count);
      return {
        id: String(rule.id || `hr_${index}_${normalizedCondition.condition}_${normalizedCondition.count}`),
        condition: normalizedCondition.condition,
        count: normalizedCondition.count,
        devices: normalizeDeviceIds(rule.devices),
        onTrue: normalizeAction(rule.onTrue),
        onFalse: normalizeAction(rule.onFalse),
        delay: normalizeDelay(rule.delay, humanDelay),
      };
    })
    .filter(Boolean);

  return {
    human: {
      enabled: config ? baseConfig.humanEnabled : boolValue(humanSource.enabled, CV.cvRules?.human?.enabled ?? true),
      rules: normalizedHumanRules,
      delay: humanDelay,
    },
    light: {
      enabled: config ? baseConfig.lightEnabled : boolValue(lightSource.enabled, CV.cvRules?.light?.enabled ?? true),
      onDark: normalizeDeviceIds(lightSource.onDark),
      onBright: normalizeDeviceIds(lightSource.onBright),
      delay: lightDelay,
    },
  };
}

function applyCVRulesState(rules = {}, config = null) {
  const normalized = normalizeCVRulesInput(rules, config);
  CV.cvRules = normalized;

  if (typeof PHP_SETTINGS !== "undefined" && PHP_SETTINGS && typeof PHP_SETTINGS === "object") {
    PHP_SETTINGS.cv_rules = JSON.parse(JSON.stringify(normalized));
  }
  if (typeof STATE !== "undefined" && STATE?.camera?.settings && typeof STATE.camera.settings === "object") {
    STATE.camera.settings.cv_rules = JSON.parse(JSON.stringify(normalized));
  }
  if (typeof automationEngine !== "undefined" && typeof automationEngine.hydrateCVRules === "function") {
    automationEngine.hydrateCVRules(normalized);
  }

  return normalized;
}

function syncCVSettingControl(id, value, formatter = null) {
  const input = document.getElementById(id);
  if (!input) return;
  input.value = value;
  const display = input.nextElementSibling;
  if (display && display.tagName === "SPAN") {
    display.textContent = formatter ? formatter(value) : String(value);
  }
}

function applyCVConfigState(config = {}) {
  const resolved = buildCurrentCVConfigPayload(config);

  CV.showBoxes = resolved.showBoundingBox;
  CV.showDebug = resolved.showDebugInfo;
  CV.confidence = resolved.minConfidence;

  CV.cvRules = {
    ...CV.cvRules,
    human: { ...(CV.cvRules?.human || {}), enabled: resolved.humanEnabled },
    light: { ...(CV.cvRules?.light || {}), enabled: resolved.lightEnabled },
  };

  if (typeof CV_CONFIG !== "undefined") {
    CV_CONFIG.detection = {
      ...(CV_CONFIG.detection || {}),
      minConfidence: resolved.minConfidence,
    };
    CV_CONFIG.light = {
      ...(CV_CONFIG.light || {}),
      darkThreshold: resolved.darkThreshold,
      brightThreshold: resolved.brightThreshold,
    };
    CV_CONFIG.ui = {
      ...(CV_CONFIG.ui || {}),
      showBoundingBoxes: resolved.showBoundingBox,
      showDebugInfo: resolved.showDebugInfo,
    };
    CV_CONFIG.automation = {
      ...(CV_CONFIG.automation || {}),
      humanEnabled: resolved.humanEnabled,
      lightEnabled: resolved.lightEnabled,
    };
  }

  if (typeof PHP_SETTINGS !== "undefined") {
    PHP_SETTINGS.cv_min_confidence = resolved.minConfidence;
    PHP_SETTINGS.cv_dark_threshold = resolved.darkThreshold;
    PHP_SETTINGS.cv_bright_threshold = resolved.brightThreshold;
    PHP_SETTINGS.cv_human_rules_enabled = resolved.humanEnabled ? 1 : 0;
    PHP_SETTINGS.cv_light_rules_enabled = resolved.lightEnabled ? 1 : 0;
    PHP_SETTINGS.cv_config = {
      ...(PHP_SETTINGS.cv_config && typeof PHP_SETTINGS.cv_config === "object" ? PHP_SETTINGS.cv_config : {}),
      detection: {
        ...(PHP_SETTINGS.cv_config?.detection || {}),
        minConfidence: resolved.minConfidence,
      },
      light: {
        ...(PHP_SETTINGS.cv_config?.light || {}),
        darkThreshold: resolved.darkThreshold,
        brightThreshold: resolved.brightThreshold,
      },
      ui: {
        ...(PHP_SETTINGS.cv_config?.ui || {}),
        showBoundingBoxes: resolved.showBoundingBox,
        showDebugInfo: resolved.showDebugInfo,
      },
      automation: {
        ...(PHP_SETTINGS.cv_config?.automation || {}),
        humanEnabled: resolved.humanEnabled,
        lightEnabled: resolved.lightEnabled,
      },
    };
    if (PHP_SETTINGS.cv_rules && typeof PHP_SETTINGS.cv_rules === "object") {
      PHP_SETTINGS.cv_rules = normalizeCVRulesInput(PHP_SETTINGS.cv_rules, resolved);
    }
  }

  if (typeof STATE !== "undefined" && STATE?.camera?.settings && typeof STATE.camera.settings === "object") {
    STATE.camera.settings.human_rules_enabled = resolved.humanEnabled ? 1 : 0;
    STATE.camera.settings.light_rules_enabled = resolved.lightEnabled ? 1 : 0;
    if (STATE.camera.settings.cv_rules) {
      STATE.camera.settings.cv_rules = normalizeCVRulesInput(STATE.camera.settings.cv_rules, resolved);
    }
  }

  ["cvShowBoundingBoxCamera", "cvShowBoundingBoxSettings"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.checked = resolved.showBoundingBox;
  });
  ["cvShowDebugInfoCamera", "cvShowDebugInfoSettings"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.checked = resolved.showDebugInfo;
  });

  const confidenceSlider = document.getElementById("cvConfidenceThreshold");
  if (confidenceSlider) confidenceSlider.value = Math.round(resolved.minConfidence * 100);
  syncCVSettingControl("settCvConfidence", resolved.minConfidence, (value) => `${Math.round(Number(value) * 100)}%`);
  syncCVSettingControl("settCvDark", resolved.darkThreshold, (value) => `${Math.round(Number(value) * 100)}%`);
  syncCVSettingControl("settCvBright", resolved.brightThreshold, (value) => `${Math.round(Number(value) * 100)}%`);

  const hud = document.getElementById("cvDetectionInfo");
  if (hud) hud.style.display = resolved.showDebugInfo && CV.detecting ? "flex" : "none";
  if (!resolved.showBoundingBox && CV.overlayCtx && CV.overlayCanvas) {
    CV.overlayCtx.clearRect(0, 0, CV.overlayCanvas.width, CV.overlayCanvas.height);
  }

  return resolved;
}

async function persistCVConfig(config = {}, opts = {}) {
  const payload = buildCurrentCVConfigPayload(config);
  const result = await apiPost("save_cv_config", { config: payload }, { key: opts.key || "save_cv_config" });
  if (result?.success !== false) {
    applyCVConfigState(result?.config || payload);
  }
  return result;
}

function getVisibleViewIds() {
  if (typeof document === "undefined") return [];
  return Array.from(document.querySelectorAll(".view"))
    .filter((view) => !view.classList.contains("hidden"))
    .map((view) => view.id)
    .filter(Boolean);
}

function getSyncContext() {
  const visibleViews = getVisibleViewIds();
  const isDashboardView = visibleViews.includes("dashboard");
  const isCameraView = visibleViews.includes("camera");
  const isAnalyticsView = visibleViews.includes("analytics");
  const isSettingsView = visibleViews.includes("settings");

  return {
    visibleViews,
    isDashboardView,
    isCameraView,
    isAnalyticsView,
    isSettingsView,
    needsCameraState: isDashboardView || isCameraView || CV.detecting || STATE.camera.active || STATE.cvAutoStartRequested,
    needsCameraSettings: isCameraView || isSettingsView,
    needsAnalytics: isAnalyticsView,
  };
}

function getAdaptiveSyncDelay() {
  const syncContext = getSyncContext();
  if (syncContext.isCameraView || CV.detecting || STATE.camera.active) {
    return CONFIG.app.liveSyncInterval;
  }
  if (syncContext.isDashboardView && !STATE.mqtt.connected) {
    return CONFIG.app.liveSyncInterval;
  }
  if (STATE.mqtt.connected) {
    return CONFIG.app.mqttLiveSyncInterval;
  }
  return CONFIG.app.fullSyncInterval;
}

function isConnectionConstrained() {
  if (typeof navigator === "undefined") return false;
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  const effectiveType = String(connection?.effectiveType || "").toLowerCase();
  return !!connection?.saveData || effectiveType === "slow-2g" || effectiveType === "2g";
}

function scheduleOptionalWarmups() {
  if (scheduleOptionalWarmups._scheduled || scheduleOptionalWarmups._done) return;
  scheduleOptionalWarmups._scheduled = true;

  const run = () => {
    if (typeof document !== "undefined" && document.hidden) {
      scheduleOptionalWarmups._scheduled = false;
      return;
    }
    if (isConnectionConstrained()) {
      scheduleOptionalWarmups._scheduled = false;
      return;
    }
    scheduleOptionalWarmups._done = true;

    const warmups = [];
    if (typeof ensureDeviceTemplatesLoaded === "function") warmups.push(ensureDeviceTemplatesLoaded().catch(() => {}));
    if (typeof ensureSensorTemplatesLoaded === "function") warmups.push(ensureSensorTemplatesLoaded().catch(() => {}));
    if (typeof ensureSchedulesLoaded === "function") warmups.push(ensureSchedulesLoaded().catch(() => {}));
    if (typeof loadMQTTTemplates === "function") warmups.push(Promise.resolve(loadMQTTTemplates()).catch(() => {}));
    if (warmups.length) Promise.allSettled(warmups).catch(() => {});
  };

  if (typeof window !== "undefined" && typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(run, { timeout: 3500 });
  } else {
    setTimeout(run, 2400);
  }
}


/* ============================================================
   UTILITY FUNCTIONS
   ============================================================ */

function escHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function showToast(message, type = "info") {
  const container = document.getElementById("toastContainer");
  if (!container) return;

  // Limit to max 5 visible toasts, remove oldest
  const existing = container.querySelectorAll('.toast');
  if (existing.length >= 5) {
    existing[0].remove();
  }

  const icons = {
    success: "fa-check-circle", error: "fa-times-circle",
    warning: "fa-exclamation-triangle", info: "fa-circle-info",
  };
  const toast   = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <i class="fas ${icons[type] || icons.info} toast-icon"></i>
    <span class="toast-msg">${escHtml(message)}</span>
    <button class="toast-close" onclick="this.parentElement.remove()"><i class="fas fa-times"></i></button>`;
  container.appendChild(toast);
  const duration = type === 'error' ? 5000 : 3500;
  setTimeout(() => {
    toast.style.opacity    = "0";
    toast.style.transform  = "translateX(12px)";
    toast.style.transition = "all .3s";
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) { modal.classList.add("active"); document.body.style.overflow = "hidden"; }
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) { modal.classList.remove("active"); document.body.style.overflow = ""; }
}

/* ============================================================
   THEME
   ============================================================ */
const THEME_META_COLORS = {
  light: "#edf8ff",
  dark: "#06111f",
};

function initTheme() {
  const t = (typeof PHP_SETTINGS !== 'undefined' ? (PHP_SETTINGS.theme || 'light') : 'light');
  document.documentElement.setAttribute('data-theme', t);
  updateThemeChrome(t);
  updateThemeIcon(t);
}

function toggleTheme() {
  const cur = document.documentElement.getAttribute('data-theme');
  const next = cur === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  updateThemeChrome(next);
  updateThemeIcon(next);
  
  // Sync settings dropdown jika ada
  const sel = document.getElementById('settTheme');
  if (sel) sel.value = next;
  
  // Update theme on backend automatically
  apiPost("save_settings", { theme: next }).catch(e => console.warn("Gagal sinkron tema:", e));
}

function updateThemeIcon(theme) {
  const btn = document.getElementById('themeToggleBtn');
  if (!btn) return;
  const icon = btn.querySelector('i');
  if (icon) icon.className = theme === 'dark' ? 'fas fa-moon' : 'fas fa-sun';
}

function updateThemeChrome(theme) {
  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme) {
    metaTheme.setAttribute("content", THEME_META_COLORS[theme] || THEME_META_COLORS.light);
  }
}

/* ============================================================
   API WRAPPER
   ============================================================ */
const ACTIVE_REQ = {};
async function apiPost(action, data = {}, opts = {}) {
  const defaultDedupeActions = new Set([
    "save_cv_config",
    "save_cv_rules",
    "update_cv_state",
    "update_device_state",
    "update_sensor_value",
    "ai_chat_fast_track",
  ]);
  const key = Object.prototype.hasOwnProperty.call(opts, "key")
    ? opts.key
    : (/^(get_|db_status$)/.test(action) || defaultDedupeActions.has(action) ? action : null);
  const noAutoRefreshActions = new Set([
    "add_log",
    "update_sensor_value",
    "update_device_state",
    "update_cv_state",
    "ai_chat_fast_track",
    "push_camera_stream_snapshot",
  ]);
  const cameraScopedActions = new Set([
    "get_dashboard_data",
    "get_cv_config",
    "save_cv_config",
    "get_cv_rules",
    "save_cv_rules",
    "update_cv_state",
    "get_camera_stream_sessions",
    "start_camera_stream",
    "join_camera_stream",
    "submit_camera_stream_answer",
    "push_camera_stream_candidate",
    "push_camera_stream_snapshot",
    "poll_camera_stream_updates",
    "get_camera_stream_snapshot",
    "stop_camera_stream",
  ]);
  let controller = null;
  try {
    if (key && ACTIVE_REQ[key]) {
      try { ACTIVE_REQ[key].abort(); } catch (_) {}
    }
    controller = new AbortController();
    if (key) ACTIVE_REQ[key] = controller;
    const base = typeof API_BASE !== "undefined"
      ? API_BASE
      : ((typeof APP_BASE !== "undefined" ? APP_BASE.replace(/\/$/, "") : "") + "/api/router.php");
    const hdrs = { "Content-Type": "application/json" };
    if (typeof CSRF_TOKEN !== "undefined") hdrs["X-CSRF-TOKEN"] = CSRF_TOKEN;
    const actionTimeouts = { get_dashboard_data: 15000, update_device_state: 4000, update_sensor_value: 4000, ai_chat_fast_track: 30000 };
    const timeoutMs = opts.timeout || actionTimeouts[action] || 8000;
    const requestData = cameraScopedActions.has(action)
      ? getCameraRequestContext(data && typeof data === "object" ? { ...data } : {})
      : data;
    const t = setTimeout(() => { try { controller.abort(); } catch(_) {} }, timeoutMs);
    const res = await fetch(`${base}?action=${action}`, {
      method: "POST",
      headers: hdrs,
      credentials: "include",
      body: JSON.stringify(requestData),
      signal: controller.signal
    });
    clearTimeout(t);
    if (key && ACTIVE_REQ[key] === controller) delete ACTIVE_REQ[key];
    if (res.status === 401) {
      window.location.href = (typeof APP_BASE !== "undefined" ? APP_BASE : "") + "/?route=login&expired=true";
      return null;
    }
    if (res.status === 403) {
      showToast("Access Denied (403)", "error");
      return null;
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const contentType = res.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      const text = await res.text();
      return { success: false, error: "Server tidak mengirimkan JSON yang valid.", raw: text };
    }
    const json = await res.json();
    const hasRefreshOverride = Object.prototype.hasOwnProperty.call(opts, "refresh");
    const isMut = hasRefreshOverride
      ? opts.refresh === true
      : (/^(add_|update_|delete_|toggle_|save_|clear_)/.test(action) && !noAutoRefreshActions.has(action));
    if (json && json.success !== false && typeof syncAllFromServer === "function" && isMut) {
      setTimeout(() => { try { syncAllFromServer(true); } catch(_) {} }, 0);
    }
    return json;
  } catch (e) {
    if (e.name !== "AbortError" && opts.silentError !== true) showToast(`API error: ${action}`, "error");
    return { success: false, error: e.message };
  } finally {
    if (key && controller && ACTIVE_REQ[key] === controller) delete ACTIVE_REQ[key];
  }
}

function normalizeCVBrightnessValue(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  if (numeric <= 0) return 0;
  if (numeric >= 100) return 1;
  return numeric > 1 ? numeric / 100 : numeric;
}

function syncCVPersonCountUI(count = STATE.cv.personCount) {
  const normalizedCount = Math.max(0, Number(count) || 0);
  const g = (id) => document.getElementById(id);
  if (g("cvPersonCount")) g("cvPersonCount").textContent = String(normalizedCount);
  if (g("cvPersonCountBig")) g("cvPersonCountBig").textContent = String(normalizedCount);
  if (g("cvHumanCount")) g("cvHumanCount").textContent = String(normalizedCount);
}

function syncCVLightUI(condition = STATE.cv.lightCondition, brightness = STATE.cv.brightness) {
  const normalizedBrightness = normalizeCVBrightnessValue(brightness);
  const pct = Math.round(normalizedBrightness * 100);
  const g = (id) => document.getElementById(id);
  const condMap = { dark: "Gelap", normal: "Normal", bright: "Terang" };

  STATE.cv.brightness = normalizedBrightness;
  STATE.cv.lightCondition = condition || "unknown";

  if (g("cvBrightness")) g("cvBrightness").textContent = `${pct}%`;
  if (g("cvBrightnessLabel")) g("cvBrightnessLabel").textContent = `${pct}%`;
  if (g("cvBrightnessBar")) g("cvBrightnessBar").style.width = pct + "%";
  if (g("cvLightCondition")) g("cvLightCondition").textContent = condMap[STATE.cv.lightCondition] || STATE.cv.lightCondition;
}

function syncCVInferenceRateUI(rate = CV.fps) {
  const numericRate = Number(rate);
  const safeRate = Number.isFinite(numericRate) ? Math.max(0, numericRate) : 0;
  const display = safeRate >= 10 ? String(Math.round(safeRate)) : safeRate.toFixed(1).replace(/\.0$/, "");
  const fpsEl = document.getElementById("cvFPS");
  if (fpsEl) fpsEl.textContent = display;
}

/* ============================================================
   CV PERSON COUNT CALLBACK (dipanggil oleh cv-detector.js)
   ============================================================ */
function onCVPersonCountUpdate(count) {
  STATE.cv.personCount   = count;
  STATE.cv.personPresent = count > 0;
  syncCVPersonCountUI(count);
  if (typeof automationEngine !== "undefined") automationEngine.notifyPersonCount(count);
  if (typeof Overview !== "undefined" && typeof Overview.updateDashboardRoomSummary === "function") {
    Overview.updateDashboardRoomSummary();
  }
  updateDashboardStats();
}

/* ============================================================
   LIGHT ANALYZER CALLBACK
   ============================================================ */
function onLightAnalysisUpdate(condition, brightness) {
  syncCVLightUI(condition, brightness);
  if (typeof Overview !== "undefined" && typeof Overview.updateDashboardRoomSummary === "function") {
    Overview.updateDashboardRoomSummary();
  }
}

async function syncAutomationFromServer() {
  if (typeof initAutomationRules === 'function') await initAutomationRules();
  const automationView = document.getElementById("automation");
  if (typeof renderAutomationView === 'function' && automationView && !automationView.classList.contains("hidden")) {
    renderAutomationView();
  }
}

function replaceDevicesFromSnapshot(data) {
  if (!Array.isArray(data)) return;
  const nextIds = new Set(data.map((device) => String(device.id)));

  Object.keys(STATE.devices).forEach((id) => {
    if (!nextIds.has(String(id))) {
      delete STATE.devices[id];
      delete STATE.deviceStates[id];
      delete STATE.deviceTopics[id];
      delete STATE.deviceOnAt[id];
      delete STATE.deviceExtras[id];
    }
  });

  data.forEach((device) => {
    const id = String(device.id);
    const isNew = !STATE.devices[id];
    STATE.devices[id] = { ...(STATE.devices[id] || {}), ...device, id };
    STATE.deviceStates[id] = Boolean(Number(device.last_state ?? device.latest_state ?? 0));
    STATE.deviceTopics[id] = { sub: device.topic_sub || "", pub: device.topic_pub || "" };

    if (STATE.deviceStates[id] && !STATE.deviceOnAt[id]) {
      STATE.deviceOnAt[id] = Date.now();
    } else if (!STATE.deviceStates[id]) {
      delete STATE.deviceOnAt[id];
    }

    if (!STATE.deviceExtras[id]) {
      STATE.deviceExtras[id] = { fanSpeed: 50, acMode: "cool", acTemp: 24, brightness: 100, volume: 60 };
    }

    if (isNew && STATE.mqtt.connected && device.topic_sub) {
      try { STATE.mqtt.client.subscribe(device.topic_sub); } catch (_) {}
    }
  });

  if (typeof renderDevices === "function") renderDevices();
  if (typeof renderQuickControls === "function") renderQuickControls();
  if (typeof renderScheduleDeviceOptions === "function") renderScheduleDeviceOptions();
}

function replaceSensorsFromSnapshot(data) {
  if (!Array.isArray(data)) return;
  const nextIds = new Set(data.map((sensor) => String(sensor.id)));

  Object.keys(STATE.sensors).forEach((id) => {
    if (!nextIds.has(String(id))) {
      delete STATE.sensors[id];
      delete STATE.sensorData[id];
      delete STATE.sensorHistory[id];
    }
  });

  data.forEach((sensor) => {
    const id = String(sensor.id);
    const isNew = !STATE.sensors[id];
    STATE.sensors[id] = { ...(STATE.sensors[id] || {}), ...sensor, id };
    STATE.sensorData[id] = sensor.latest_value ?? STATE.sensorData[id] ?? null;
    if (!STATE.sensorHistory[id]) STATE.sensorHistory[id] = [];

    if (isNew && STATE.mqtt.connected && sensor.topic) {
      try { STATE.mqtt.client.subscribe(sensor.topic); } catch (_) {}
    }
  });

  if (typeof renderSensors === "function") renderSensors();
  const dashboardView = document.getElementById("dashboard");
  if (dashboardView
      && !dashboardView.classList.contains("hidden")
      && typeof Overview !== "undefined"
      && typeof Overview.initChartSelect === "function") {
    Overview.initChartSelect();
  }
}

function scheduleNextSync(delayMs = null) {
  if (STATE.sync.timer) {
    clearTimeout(STATE.sync.timer);
  }

  const baseDelay = delayMs ?? getAdaptiveSyncDelay();
  const nextDelay = STATE.sync.failureCount > 0
    ? Math.min(
        baseDelay * Math.pow(2, STATE.sync.failureCount),
        CONFIG.app.syncBackoffMax
      )
    : baseDelay;
  STATE.sync.timer = setTimeout(() => {
    syncAllFromServer().catch(() => {});
  }, nextDelay);
}

function mergeSyncRequestOptions(base = {}, extra = {}) {
  return {
    includeAnalytics: !!(base.includeAnalytics || extra.includeAnalytics),
    includeCamera: !!(base.includeCamera || extra.includeCamera),
    includeCameraSettings: !!(base.includeCameraSettings || extra.includeCameraSettings),
  };
}

/**
 * Sinkronisasi data utama dari server (Stale-While-Revalidate)
 */
async function syncAllFromServer(forceSync = false, options = {}) {
  const cacheKey = `iotzy_cache_main_sync:${sanitizeCameraKeyValue(STATE.camera.sessionKey, { allowEmpty: true }) || "default"}`;
  const requestedOptions = mergeSyncRequestOptions({}, options);
  
  // 1. Ambil dari cache dulu untuk responsivitas instan
  if (typeof PerformanceOptimizer !== "undefined" && PerformanceOptimizer.Cache) {
    const cached = PerformanceOptimizer.Cache.get(cacheKey);
    if (cached) {
      applySyncData(cached);
    }
  }

  if (typeof document !== "undefined" && document.hidden && !forceSync) return;
  if (syncAllFromServer._inFlight) {
    syncAllFromServer._queuedForce = !!(syncAllFromServer._queuedForce || forceSync);
    syncAllFromServer._queuedOptions = mergeSyncRequestOptions(syncAllFromServer._queuedOptions || {}, requestedOptions);
    return syncAllFromServer._currentPromise || null;
  }
  syncAllFromServer._inFlight = true;
  syncAllFromServer._currentPromise = (async () => {
    try {
      const now = Date.now();
      const syncContext = getSyncContext();
      const includeAnalytics = !!requestedOptions.includeAnalytics
        || (syncContext.needsAnalytics
          && (forceSync || (now - (STATE.sync.lastAnalyticsSyncAt || 0)) >= CONFIG.app.analyticsSyncInterval));
      const includeCameraSettings = !!requestedOptions.includeCameraSettings
        || (syncContext.needsCameraSettings
          && (forceSync || (now - (STATE.sync.lastCameraSettingsAt || 0)) >= CONFIG.app.cameraSettingsSyncInterval));
      const includeCamera = !!requestedOptions.includeCamera || syncContext.needsCameraState;

      const requestBody = getCameraRequestContext({
        include_analytics: includeAnalytics ? 1 : 0,
        include_camera: includeCamera ? 1 : 0,
        include_camera_settings: includeCameraSettings ? 1 : 0,
      });

      const res = await apiPost("get_dashboard_data", requestBody);
      if (res && res.success) {
        if (typeof PerformanceOptimizer !== "undefined" && PerformanceOptimizer.Cache) {
          PerformanceOptimizer.Cache.set(cacheKey, res);
        }
        applySyncData(res, now);
      }
    } catch (e) {
      STATE.sync.failureCount += 1;
      console.warn("syncAllFromServer Error:", e);
    } finally {
      syncAllFromServer._inFlight = false;
      syncAllFromServer._currentPromise = null;

      const rerunForce = !!syncAllFromServer._queuedForce;
      const rerunOptions = syncAllFromServer._queuedOptions || null;
      syncAllFromServer._queuedForce = false;
      syncAllFromServer._queuedOptions = null;

      const shouldRerun = !!(rerunForce || (rerunOptions && (rerunOptions.includeAnalytics || rerunOptions.includeCamera || rerunOptions.includeCameraSettings)));
      if (shouldRerun) {
        setTimeout(() => {
          syncAllFromServer(rerunForce, rerunOptions || {}).catch(() => {});
        }, 0);
        return;
      }

      if (typeof document === "undefined" || !document.hidden) {
        scheduleNextSync();
      }
    }
  })();

  return syncAllFromServer._currentPromise;
}

/**
 * Menerapkan data hasil sinkronisasi ke UI dan STATE
 */
async function applySyncData(res, timestamp = Date.now()) {
  STATE.sync.failureCount = 0;

  const currentDeviceIds = Object.keys(STATE.devices);
  const serverDeviceIds  = (res.devices || []).map(d => String(d.id));
  const currentSensorIds = Object.keys(STATE.sensors);
  const serverSensorIds  = (res.sensors || []).map(s => String(s.id));
  const serverDeviceIdSet = new Set(serverDeviceIds);
  const serverSensorIdSet = new Set(serverSensorIds);

  const hasStructureChanged =
    currentDeviceIds.length !== serverDeviceIds.length ||
    currentSensorIds.length !== serverSensorIds.length ||
    !currentDeviceIds.every(id => serverDeviceIdSet.has(id)) ||
    !currentSensorIds.every(id => serverSensorIdSet.has(id));

  if (hasStructureChanged) {
    requestAnimationFrame(() => {
      replaceDevicesFromSnapshot(res.devices || []);
      replaceSensorsFromSnapshot(res.sensors || []);
    });
    await syncAutomationFromServer();
  } else if (res.devices) {
    let shouldRenderDevices = false;
    res.devices.forEach(d => {
      const id = String(d.id);
      if (!STATE.devices[id]) return;
      const before = STATE.devices[id];
      STATE.devices[id] = { ...before, ...d, id };
      if (
        before.name !== STATE.devices[id].name ||
        before.icon !== STATE.devices[id].icon ||
        before.type !== STATE.devices[id].type ||
        before.template_name !== STATE.devices[id].template_name ||
        before.topic_sub !== STATE.devices[id].topic_sub ||
        before.topic_pub !== STATE.devices[id].topic_pub
      ) {
        shouldRenderDevices = true;
      }
      const oldState = STATE.deviceStates[id];
      const newState = Boolean(Number(d.last_state ?? d.latest_state ?? 0));
      if (oldState !== newState) {
        if (STATE.deviceUpdating && STATE.deviceUpdating[id]) return;
        STATE.deviceStates[id] = newState;
        if (newState && !STATE.deviceOnAt[id]) {
          STATE.deviceOnAt[id] = Date.now();
        }
        if (!newState) {
          delete STATE.deviceOnAt[id];
        }
        if (typeof updateDeviceUI === 'function') updateDeviceUI(id);
      }
    });
    if (shouldRenderDevices) {
      if (typeof renderDevices === 'function') renderDevices();
      if (typeof renderQuickControls === 'function') renderQuickControls();
      if (typeof renderScheduleDeviceOptions === 'function') renderScheduleDeviceOptions();
    }
  }

  if (res.sensors) {
    let shouldRenderSensors = false;
    res.sensors.forEach(s => {
      const id = String(s.id);
      if (STATE.sensors[id]) {
        const before = STATE.sensors[id];
        const prevValue = STATE.sensorData[id];
        STATE.sensors[id] = { ...before, ...s, id };
        const nextValue = s.latest_value ?? prevValue ?? null;
        STATE.sensorData[id] = nextValue;

        if (
          before.name !== STATE.sensors[id].name ||
          before.icon !== STATE.sensors[id].icon ||
          before.type !== STATE.sensors[id].type ||
          before.unit !== STATE.sensors[id].unit ||
          before.device_name !== STATE.sensors[id].device_name ||
          before.template_name !== STATE.sensors[id].template_name
        ) {
          shouldRenderSensors = true;
          return;
        }

        if ((prevValue ?? null) !== nextValue || before.last_seen !== STATE.sensors[id].last_seen) {
          if (typeof updateSensorValueUI === 'function') updateSensorValueUI(id);
        }
      }
    });
    if (shouldRenderSensors && typeof renderSensors === 'function') renderSensors();
    const dashboardView = document.getElementById("dashboard");
    if (shouldRenderSensors
        && dashboardView
        && !dashboardView.classList.contains("hidden")
        && typeof Overview !== "undefined"
        && typeof Overview.initChartSelect === "function") {
      Overview.initChartSelect();
    }
  }

  if (res.cv_state && !CV.detecting) {
    STATE.cvAutoStartRequested = Number(res.cv_state.is_active) === 1;
    STATE.cv.personCount = Math.max(0, Number(res.cv_state.person_count) || 0);
    STATE.cv.personPresent = STATE.cv.personCount > 0;
    syncCVPersonCountUI(STATE.cv.personCount);
    syncCVLightUI(res.cv_state.light_condition || 'unknown', res.cv_state.brightness || 0);
    if (typeof Overview !== "undefined" && typeof Overview.updateDashboardRoomSummary === "function") {
      Overview.updateDashboardRoomSummary();
    }
  }
  if (res.cv_state && !Number(res.cv_state.is_active)) {
    STATE.cvAutoStartRequested = false;
    if (!CV.detecting) {
      STATE.camera.restoreAttempted = false;
    }
  }

  if (res.camera) {
    STATE.camera.defaultMeta = res.camera;
    refreshCameraSessionContext({ persist: false });
  }
  if (res.camera_settings) {
    STATE.camera.settings = res.camera_settings;
    if (typeof applyCVConfigState === "function") {
      applyCVConfigState(res.camera_settings);
    }
    if (res.camera_settings.cv_rules) {
      applyCVRulesState(res.camera_settings.cv_rules, res.camera_settings);
    }
    STATE.sync.lastCameraSettingsAt = timestamp;
  }
  if (res.analytics_summary) {
    STATE.analytics = { ...(STATE.analytics || {}), summary: res.analytics_summary };
    STATE.sync.lastAnalyticsSyncAt = timestamp;
    if (typeof updateLogStats === 'function') updateLogStats();
  }

  STATE.sync.lastFullSyncAt = timestamp;
  updateDashboardStats();

}

/* ============================================================
   RENDER ALL & DASHBOARD STATS
   ============================================================ */
function renderAll() {
  const dashboardView = document.getElementById("dashboard");
  const isDashboardVisible = !!dashboardView && !dashboardView.classList.contains("hidden");

  if (typeof renderDevices === 'function') renderDevices();
  if (typeof renderSensors === 'function') renderSensors();
  if (isDashboardVisible && typeof renderQuickControls === 'function') renderQuickControls();
  const automationView = document.getElementById("automation");
  if (typeof renderAutomationView === 'function' && automationView && !automationView.classList.contains("hidden")) {
    renderAutomationView();
  }
  updateDashboardStats();
}

// Cached DOM element references for updateDashboardStats
const _STAT_ELS = {};
function _getStatEl(id) { return _STAT_ELS[id] || (_STAT_ELS[id] = document.getElementById(id)); }

function updateDashboardStats() {
  const totalDev  = Object.keys(STATE.devices).length;
  const activeDev = Object.values(STATE.deviceStates).filter(Boolean).length;
  const totalSen  = Object.keys(STATE.sensors).length;
  const activeSen = Object.values(STATE.sensorData).filter(v => v !== null && v !== undefined).length;
  const g = _getStatEl;
  if (g("statActiveDevicesVal")) g("statActiveDevicesVal").textContent = activeDev;
  if (g("statActiveDevicesSub")) g("statActiveDevicesSub").textContent = `dari ${totalDev}`;
  if (g("statSensorsOnlineVal")) g("statSensorsOnlineVal").textContent = activeSen;
  if (g("statSensorsOnlineSub")) g("statSensorsOnlineSub").textContent = `dari ${totalSen}`;
  if (g("navDeviceCount"))       g("navDeviceCount").textContent       = totalDev;
  if (g("navSensorCount"))       g("navSensorCount").textContent       = totalSen;
  if (g("totalDevices"))         g("totalDevices").textContent         = totalDev;
  if (g("totalSensors"))         g("totalSensors").textContent         = totalSen;
  if (g("statMqttVal"))          g("statMqttVal").textContent          = STATE.mqtt.connected ? "Online" : "Offline";
  if (g("statMqttSub"))          g("statMqttSub").textContent          = (typeof PHP_SETTINGS !== 'undefined' && PHP_SETTINGS.mqtt_broker) || "—";
  syncCVPersonCountUI(STATE.cv.personCount);
}

/* ============================================================
   LOAD DATA AWAL DARI PHP (diinjeksi oleh footer.php)
   ============================================================ */
function loadFromPHP() {
  try {
    // Quick Control Devices
    if (typeof PHP_SETTINGS !== 'undefined') {
      const qc = PHP_SETTINGS.quick_control_devices;
      STATE.quickControlDevices = Array.isArray(qc)
        ? qc.map(String)
        : typeof qc === "string" ? JSON.parse(qc || "[]").map(String) : [];

      // CV Config dari DB
      if (PHP_SETTINGS.cv_config && typeof PHP_SETTINGS.cv_config === 'object') {
        if (typeof CV_CONFIG !== 'undefined') Object.assign(CV_CONFIG, PHP_SETTINGS.cv_config);
      }
      applyCVConfigState({
        ...(PHP_SETTINGS.cv_config && typeof PHP_SETTINGS.cv_config === "object" ? PHP_SETTINGS.cv_config : {}),
        minConfidence: PHP_SETTINGS.cv_min_confidence,
        darkThreshold: PHP_SETTINGS.cv_dark_threshold,
        brightThreshold: PHP_SETTINGS.cv_bright_threshold,
        humanEnabled: PHP_SETTINGS.cv_human_rules_enabled,
        lightEnabled: PHP_SETTINGS.cv_light_rules_enabled,
      });
      if (PHP_SETTINGS.cv_rules && typeof PHP_SETTINGS.cv_rules === 'object') {
        applyCVRulesState(PHP_SETTINGS.cv_rules, {
          ...(PHP_SETTINGS.cv_config && typeof PHP_SETTINGS.cv_config === "object" ? PHP_SETTINGS.cv_config : {}),
          humanEnabled: PHP_SETTINGS.cv_human_rules_enabled,
          lightEnabled: PHP_SETTINGS.cv_light_rules_enabled,
        });
      }
    }

    // Perangkat
    if (typeof PHP_DEVICES !== "undefined") {
      PHP_DEVICES.forEach((d) => {
        const id = String(d.id);
        STATE.devices[id]      = { ...d, id };
        STATE.deviceStates[id] = Boolean(Number(d.last_state ?? d.latest_state ?? 0));
        STATE.deviceTopics[id] = { sub: d.topic_sub || "", pub: d.topic_pub || "" };
        STATE.deviceExtras[id] = { fanSpeed: 50, acMode: "cool", acTemp: 24, brightness: 100, volume: 60 };
      });
    }

    // Sensor
    if (typeof PHP_SENSORS !== "undefined") {
      PHP_SENSORS.forEach((s) => {
        const id = String(s.id);
        STATE.sensors[id]       = { ...s, id };
        STATE.sensorData[id]    = s.latest_value ?? null;
        STATE.sensorHistory[id] = [];
      });
    }

    const phpCameraMatchesSession = isPHPCameraSnapshotActiveSession();
    if (typeof PHP_CAMERA !== 'undefined' && PHP_CAMERA && phpCameraMatchesSession) {
      STATE.camera.defaultMeta = { ...PHP_CAMERA };
    } else {
      STATE.camera.defaultMeta = {
        ...(STATE.camera.defaultMeta || {}),
        camera_key: STATE.camera.sessionKey,
        name: STATE.camera.displayName || "Browser Camera",
      };
    }
    if (typeof PHP_CAMERA_SETTINGS !== 'undefined' && phpCameraMatchesSession) {
      STATE.camera.settings = PHP_CAMERA_SETTINGS || {};
    }

    if (phpCameraMatchesSession && typeof PHP_CV_STATE !== "undefined" && PHP_CV_STATE && typeof PHP_CV_STATE === "object") {
      STATE.cv.personCount = Math.max(0, Number(PHP_CV_STATE.person_count) || 0);
      STATE.cv.personPresent = STATE.cv.personCount > 0;
      syncCVPersonCountUI(STATE.cv.personCount);
      syncCVLightUI(PHP_CV_STATE.light_condition || "unknown", PHP_CV_STATE.brightness || 0);
      STATE.cvAutoStartRequested = Number(PHP_CV_STATE.is_active) === 1;
    } else {
      STATE.cvAutoStartRequested = false;
    }

    if (typeof PHP_CAMERA_STREAM_SESSIONS !== "undefined" && Array.isArray(PHP_CAMERA_STREAM_SESSIONS)) {
      STATE.camera.live.sessions = PHP_CAMERA_STREAM_SESSIONS;
      STATE.camera.live.featureReady = true;
    }

    refreshCameraSessionContext({ persist: false });
  } catch (e) {
    console.warn("loadFromPHP error:", e);
    STATE.quickControlDevices = [];
  }
}

function revealMainApp() {
  const ls  = document.getElementById("appLoadingScreen");
  const app = document.getElementById("mainApp");
  if (app) app.classList.remove("opacity-0");
  if (ls) {
    ls.classList.add("done");
    setTimeout(() => { ls.style.display = "none"; }, 140);
  }
  const aiBtn = document.getElementById("aiChatBtn");
  if (aiBtn) aiBtn.classList.add("show");
}

function scheduleAfterFirstPaint(task, delay = 0) {
  const run = () => setTimeout(task, Math.max(0, delay));
  if (typeof window !== "undefined" && typeof window.requestAnimationFrame === "function") {
    window.requestAnimationFrame(() => run());
    return;
  }
  run();
}

function scheduleIdleTask(task, timeout = 2500) {
  if (typeof window !== "undefined" && typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(() => task(), { timeout });
    return;
  }
  setTimeout(task, Math.min(timeout, 1200));
}

function scheduleMQTTBootstrap() {
  if (scheduleMQTTBootstrap._scheduled || scheduleMQTTBootstrap._started || typeof window === "undefined") return;
  if (typeof PHP_SETTINGS === "undefined" || !PHP_SETTINGS?.mqtt_broker || typeof connectMQTT !== "function") return;

  scheduleMQTTBootstrap._scheduled = true;

  const kickoff = () => {
    if (scheduleMQTTBootstrap._started || STATE.mqtt.connected || document.hidden) return;
    scheduleMQTTBootstrap._started = true;
    scheduleIdleTask(() => {
      if (!STATE.mqtt.connected && !document.hidden) {
        connectMQTT();
      }
    }, 1400);
  };

  const cleanup = () => {
    window.removeEventListener("pointerdown", startOnInteraction, true);
    window.removeEventListener("keydown", startOnInteraction, true);
    document.removeEventListener("visibilitychange", startOnVisible, true);
  };

  const startOnInteraction = () => {
    cleanup();
    setTimeout(kickoff, 900);
  };

  const startOnVisible = () => {
    if (document.hidden) return;
    cleanup();
    setTimeout(kickoff, 1200);
  };

  window.addEventListener("pointerdown", startOnInteraction, { once: true, passive: true, capture: true });
  window.addEventListener("keydown", startOnInteraction, { once: true, capture: true });
  document.addEventListener("visibilitychange", startOnVisible, { once: true, capture: true });

  setTimeout(() => {
    cleanup();
    kickoff();
  }, 9000);
}

async function bootstrapDeferredServices() {
  try {
    const realtimeCoreGroup = ensureFeatureGroup("realtimeCore").catch(() => {});

    const startRealtimeServices = async () => {
      syncAllFromServer(true).catch(() => {});
      await realtimeCoreGroup;

      scheduleIdleTask(() => {
        if (typeof loadLogs === "function" && getSyncContext().isDashboardView) {
          loadLogs(typeof getAnalyticsDate === "function" ? getAnalyticsDate() : undefined).catch(() => {});
        }
      }, 3200);

      scheduleMQTTBootstrap();
    };

    const startAutomationServices = async () => {
      await ensureFeatureGroup("automation");
      if (typeof initAutomationRules === "function") {
        await initAutomationRules();
      }
      if (typeof automationEngine !== "undefined") automationEngine.initialize();
    };

    scheduleAfterFirstPaint(() => {
      startRealtimeServices().catch(() => {});
    }, 80);

    scheduleIdleTask(() => {
      startAutomationServices().catch(() => {});
    }, 2200);

    realtimeCoreGroup.finally(() => {
      scheduleOptionalWarmups();
    });
  } catch (e) {
    console.warn("bootstrapDeferredServices error:", e);
  }
}

/* ============================================================
   DOMContentLoaded — BOOTSTRAP UTAMA
   ============================================================ */
document.addEventListener("DOMContentLoaded", async () => {
  // Ekspor ke window agar modul bisa akses
  window.STATE = STATE;
  window.CV    = CV;
  document.documentElement.setAttribute("data-active-page", "dashboard");

  initTheme();
  initClock();         // navigation.js
  initUptimeCounter(); // navigation.js

  initializeCameraSessionState();
  loadFromPHP();
  renderAll();
  revealMainApp();
  bootstrapAIChatTrigger();

  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) {
        refreshCameraSessionContext({ persist: true });
      }
      if (!document.hidden) {
        scheduleOptionalWarmups();
        const syncContext = getSyncContext();
        syncAllFromServer(true, {
          includeAnalytics: syncContext.needsAnalytics,
          includeCamera: syncContext.needsCameraState,
          includeCameraSettings: syncContext.needsCameraSettings,
        }).catch(() => {});
      }
    });
  }

  if (typeof window !== "undefined") {
    window.addEventListener("focus", () => {
      refreshCameraSessionContext({ persist: true });
    });
  }

  syncLightAnalyzerBridge();

  bootstrapDeferredServices();
  scheduleNextSync();
});
