function setCVModelStatus(label) {
  const el = document.getElementById("cvModelStatus");
  if (el) el.textContent = label;
}

function setCVHeadlineStatus(text, className = "muted") {
  const el = document.getElementById("cvSystemStatus");
  if (!el) return;
  el.textContent = text;
  el.className = `status-val ${className}`.trim();
}

function getCVBackendSuffix() {
  if (typeof cvDetector === "undefined" || !cvDetector.backendLabel) return "";
  return ` (${cvDetector.backendLabel})`;
}

let cvInitializationPromise = null;

function setCVLoadingVisibility(visible, message = "Memuat model...") {
  const el = document.getElementById("cvLoadingStatus");
  if (!el) return;
  el.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${message}`;
  el.classList.toggle("hidden", !visible);
}

function resetCVLoadFailureState(message = "Gagal Memuat Model") {
  CV.modelLoading = false;
  CV.modelLoaded = false;
  CV.model = null;
  updateCVBadge("error", "Gagal");
  setCVModelStatus("Gagal");
  setCVHeadlineStatus(message, "");
  setCVLoadingVisibility(false);
  if (typeof toggleCVActionButtons === "function") toggleCVActionButtons();
  apiPost("update_cv_state", { model_loaded: 0 }).catch(e => console.warn('CV model state reset error:', e));
}

function startCVFpsMonitor() {
  stopCVFpsMonitor();
  CV.frameCount = 0;
  CV.fpsTimer = setInterval(() => {
    CV.fps = CV.frameCount;
    if (typeof syncCVInferenceRateUI === "function") {
      syncCVInferenceRateUI(CV.fps);
    } else {
      const fpsEl = document.getElementById("cvFPS");
      if (fpsEl) fpsEl.textContent = String(CV.fps);
    }
    CV.frameCount = 0;
  }, 1000);
}

function stopCVFpsMonitor() {
  if (CV.fpsTimer) {
    clearInterval(CV.fpsTimer);
    CV.fpsTimer = null;
  }
  CV.fps = 0;
  CV.frameCount = 0;
  if (typeof syncCVInferenceRateUI === "function") {
    syncCVInferenceRateUI(0);
  } else {
    const fpsEl = document.getElementById("cvFPS");
    if (fpsEl) fpsEl.textContent = "0";
  }
}

async function initializeCV() {
  if (typeof cvDetector === "undefined") return false;
  if (cvDetector.isReady) return true;
  if (cvInitializationPromise) return cvInitializationPromise;

  cvInitializationPromise = (async () => {
    CV.modelLoading = true;
    updateCVBadge("loading", "Memuat");
    setCVModelStatus("Memuat");
    setCVHeadlineStatus("Memuat Model AI", "muted");
    setCVLoadingVisibility(true, "Memuat model...");
    if (typeof toggleCVActionButtons === "function") toggleCVActionButtons();

    try {
      await loadCVLibraries();
    } catch (error) {
      console.warn("loadCVLibraries error:", error);
      resetCVLoadFailureState("Library AI Gagal");
      showToast("Gagal mengunduh AI library", "error");
      return false;
    }

    const ok = await cvDetector.initialize();
    if (ok) {
      CV.modelLoading = false;
      CV.modelLoaded = true;
      CV.model = cvDetector.model || CV.model;
      updateCVBadge("ready", "Siap");
      setCVModelStatus(`Siap${getCVBackendSuffix()}`);
      setCVLoadingVisibility(false);
      setCVHeadlineStatus(`Model Siap${getCVBackendSuffix()}`, "ok");
      if (typeof toggleCVActionButtons === "function") toggleCVActionButtons();

      if (typeof cvUI !== "undefined") cvUI.renderAutomationSettings();
      showToast("Model CV berhasil dimuat!", "success");
      apiPost("update_cv_state", { model_loaded: 1 }).catch(e => console.warn('CV model state update error:', e));
      return true;
    }

    resetCVLoadFailureState("Gagal Memuat Model");
    showToast("Gagal memuat model CV", "error");
    return false;
  })();

  try {
    return await cvInitializationPromise;
  } finally {
    cvInitializationPromise = null;
  }
}

function updateCVBadge(status, label) {
  const el = document.getElementById("cvModelBadge");
  if (!el) return;
  el.className = `cv-status-badge ${status}`; el.textContent = label;
}

function startCVDetection() {
  const video = document.getElementById("cameraFocus");
  if (!video || !cvDetector.isReady) return;

  CV.detecting = true;
  cvDetector.startDetection(video);
  if (typeof automationEngine !== "undefined" && typeof automationEngine.startCV === "function") {
    automationEngine.startCV();
  }
  startCVFpsMonitor();

  if (typeof lightAnalyzer !== 'undefined') {
    lightAnalyzer.startAnalysis(video);
  }

  if (document.getElementById("btnStartCV")) document.getElementById("btnStartCV").disabled = true;
  if (document.getElementById("btnStopCV"))  document.getElementById("btnStopCV").disabled  = false;
  if (document.getElementById("cvDetectionInfo")) document.getElementById("cvDetectionInfo").style.display = "flex";
  
    updateCVBadge("active", "Aktif");
    setCVModelStatus(`Aktif${getCVBackendSuffix()}`);
    setCVHeadlineStatus("Deteksi Berjalan", "ok");
    if (typeof toggleCVActionButtons === "function") toggleCVActionButtons();
    showToast("Deteksi CV dimulai", "info");
}

function stopCVDetection() {
  CV.detecting = false;
  cvDetector.stopDetection();
  if (typeof automationEngine !== "undefined" && typeof automationEngine.stopCV === "function") {
    automationEngine.stopCV();
  }
  stopCVFpsMonitor();
  if (typeof lightAnalyzer !== 'undefined') lightAnalyzer.stopAnalysis();

  if (document.getElementById("btnStartCV")) document.getElementById("btnStartCV").disabled = false;
  if (document.getElementById("btnStopCV"))  document.getElementById("btnStopCV").disabled  = true;
  if (document.getElementById("cvDetectionInfo")) document.getElementById("cvDetectionInfo").style.display = "none";
  
  updateCVBadge("ready", "Siap");
  setCVModelStatus(CV.modelLoaded ? `Siap${getCVBackendSuffix()}` : "Idle");
  setCVHeadlineStatus(CV.modelLoaded ? `Model Siap${getCVBackendSuffix()}` : "Kamera Aktif", CV.modelLoaded ? "ok" : "muted");
  if (typeof toggleCVActionButtons === "function") toggleCVActionButtons();
  showToast("Deteksi CV dihentikan", "info");
}

async function loadCVModel() {
  if (typeof STATE !== "undefined" && !STATE.camera.active && typeof startCamera === "function") {
    const cameraOk = await startCamera();
    if (!cameraOk) return false;
  }

  if (typeof STATE !== "undefined" && STATE.camera.mode === "remote") {
    showToast("Mode pantau hanya bisa melihat source live, bukan memuat AI lokal", "warning");
    return false;
  }

  const ready = await initializeCV();
  if (ready && typeof toggleCVActionButtons === "function") toggleCVActionButtons();
  return ready;
}

async function startDetection() {
  if (typeof STATE !== "undefined" && !STATE.camera.active && typeof startCamera === "function") {
    const cameraOk = await startCamera();
    if (!cameraOk) return false;
  }

  if (typeof STATE !== "undefined" && STATE.camera.mode === "remote") {
    showToast("Mode pantau hanya untuk melihat source live", "warning");
    return false;
  }

  if (!CV.modelLoaded) {
    showToast("Muat model AI dulu sebelum mulai deteksi", "warning");
    if (typeof toggleCVActionButtons === "function") toggleCVActionButtons();
    return false;
  }

  startCVDetection();
  return true;
}

function stopDetection() {
  stopCVDetection();
}

async function loadCVConfig() {
  const result = await apiPost("get_cv_config", {});
  if (result) {
    if (typeof applyCVConfigState === "function") {
      applyCVConfigState(result);
    } else {
      if (result.showBoundingBox !== undefined) CV.showBoxes  = result.showBoundingBox;
      if (result.showDebugInfo   !== undefined) CV.showDebug  = result.showDebugInfo;
      if (result.minConfidence   !== undefined) CV.confidence = result.minConfidence;
    }
  }
}

async function loadCVRules() {
  const result = await apiPost("get_cv_rules", {});
  if (result) {
    if (typeof applyCVRulesState === "function") {
      applyCVRulesState(result);
    } else {
      CV.cvRules = { ...CV.cvRules, ...result };
      if (typeof automationEngine !== "undefined" && typeof automationEngine.hydrateCVRules === "function") {
        automationEngine.hydrateCVRules(CV.cvRules);
      }
    }
  }
}

async function saveCVRules() {
  await apiPost("save_cv_rules", { rules: CV.cvRules });
}

function toggleBoundingBox(val) {
  if (typeof applyCVConfigState === "function") applyCVConfigState({ showBoundingBox: val });
  else CV.showBoxes = val;
  if (typeof persistCVConfig === "function") persistCVConfig({ showBoundingBox: val }).catch(e => console.warn('CV config save error:', e));
  else apiPost("save_cv_config", { config: { showBoundingBox: val, showDebugInfo: CV.showDebug, minConfidence: CV.confidence } }).catch(e => console.warn('CV config save error:', e));
}

function toggleDebugInfo(val) {
  if (typeof applyCVConfigState === "function") applyCVConfigState({ showDebugInfo: val });
  else CV.showDebug = val;
  if (typeof persistCVConfig === "function") persistCVConfig({ showDebugInfo: val }).catch(e => console.warn('CV config save error:', e));
  else apiPost("save_cv_config", { config: { showBoundingBox: CV.showBoxes, showDebugInfo: val, minConfidence: CV.confidence } }).catch(e => console.warn('CV config save error:', e));
}

function updateCVConfig(val) {
  const confidence = parseFloat(val) / 100;
  if (typeof applyCVConfigState === "function") applyCVConfigState({ minConfidence: confidence });
  else CV.confidence = confidence;
  if (typeof persistCVConfig === "function") persistCVConfig({ minConfidence: confidence }).catch(e => console.warn('CV config save error:', e));
  else apiPost("save_cv_config", { config: { showBoundingBox: CV.showBoxes, showDebugInfo: CV.showDebug, minConfidence: CV.confidence } }).catch(e => console.warn('CV config save error:', e));
}

function onCVPersonCountUpdate(count) {
  STATE.cv.personCount  = count;
  STATE.cv.personPresent = count > 0;
  if (typeof syncCVPersonCountUI === "function") {
    syncCVPersonCountUI(count);
  } else {
    const g = (id) => document.getElementById(id);
    if (g("cvPersonCount")) g("cvPersonCount").textContent = count;
    if (g("cvPersonCountBig")) g("cvPersonCountBig").textContent = count;
    if (g("cvHumanCount")) g("cvHumanCount").textContent = count;
  }
  if (typeof automationEngine !== "undefined" && automationEngine.notifyPersonCount) {
      automationEngine.notifyPersonCount(count);
  }
  if (typeof Overview !== "undefined" && typeof Overview.updateDashboardRoomSummary === "function") {
    Overview.updateDashboardRoomSummary();
  }
  if (typeof updateDashboardStats === 'function') updateDashboardStats();
}

function onLightAnalysisUpdate(condition, brightness) {
  if (typeof syncCVLightUI === "function") {
    syncCVLightUI(condition, brightness);
  } else {
    STATE.cv.lightCondition = condition;
    STATE.cv.brightness = brightness;
    const pct = Math.round(brightness * 100);
    const g = (id) => document.getElementById(id);
    const condMap = { dark: "Gelap", normal: "Normal", bright: "Terang" };
    if (g("cvBrightness")) g("cvBrightness").textContent = `${pct}%`;
    if (g("cvBrightnessLabel")) g("cvBrightnessLabel").textContent = `${pct}%`;
    if (g("cvBrightnessBar")) g("cvBrightnessBar").style.width = pct + "%";
    if (g("cvLightCondition")) g("cvLightCondition").textContent = condMap[condition] || condition;
  }
  if (typeof Overview !== "undefined" && typeof Overview.updateDashboardRoomSummary === "function") {
    Overview.updateDashboardRoomSummary();
  }

  // Trigger automation engine for light rules
  if (typeof automationEngine !== "undefined" && automationEngine.onLightCondition) {
      automationEngine.onLightCondition(condition, brightness);
  }
}

async function loadCVLibraries() {
  if (window.tf && window.cocoSsd) return true;
  const loadScript = (src) => new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[data-src="${src}"]`);
    if (existing?.dataset.loaded === "1") {
      resolve(true);
      return;
    }
    if (existing) existing.remove();

    const s = document.createElement('script');
    let settled = false;
    let timer = null;
    const finalize = (handler, payload) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      s.onload = null;
      s.onerror = null;
      handler(payload);
    };
    s.src = src;
    s.async = true;
    s.dataset.src = src;
    s.dataset.state = "loading";
    s.onload = () => {
      s.dataset.loaded = "1";
      s.dataset.state = "loaded";
      finalize(resolve, true);
    };
    s.onerror = () => {
      s.dataset.error = "1";
      s.dataset.state = "error";
      try { s.remove(); } catch (_) {}
      finalize(reject, new Error(`Failed to load ${src}`));
    };
    timer = setTimeout(() => {
      s.dataset.error = "1";
      s.dataset.state = "timeout";
      try { s.remove(); } catch (_) {}
      finalize(reject, new Error(`Timeout loading ${src}`));
    }, 15000);
    document.head.appendChild(s);
  });
  await loadScript('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.11.0');
  await loadScript('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-backend-wasm@4.11.0/dist/tf-backend-wasm.min.js');
  await loadScript('https://cdn.jsdelivr.net/npm/@tensorflow-models/coco-ssd@2.2.3');
  return !!(window.tf && window.cocoSsd);
}

async function runCVLoop() {
  if (!CV.detecting || !CV.modelLoaded) return;
  const video = document.getElementById("cameraFocus");
  if (!video || video.readyState < 2) {
    if (CV.detecting) requestAnimationFrame(runCVLoop);
    return;
  }
  const now = performance.now();
  if (now - (_cvLastDetectTime || 0) < 120) {
    if (CV.detecting) requestAnimationFrame(runCVLoop);
    return;
  }
  _cvLastDetectTime = now;
  try {
    const preds  = await CV.model.detect(video, undefined, CV.confidence);
    CV.frameCount++;
    const people = preds.filter((p) => p.class === "person");
    const count  = people.length;
    if (count !== STATE.cv.personCount) onCVPersonCountUpdate(count);
    if (CV.showBoxes && CV.overlayCtx && CV.overlayCanvas) drawCVOverlay(preds, video);
    updateCVHUD(count, preds);
    CV.humanPresent = count > 0;
  } catch (_) {}
  if (CV.detecting) requestAnimationFrame(runCVLoop);
}

function drawCVOverlay(preds, video) {
  const canvas = CV.overlayCanvas; const ctx = CV.overlayCtx;
  if(!canvas || !ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const scaleX = canvas.width  / (video.videoWidth  || 640);
  const scaleY = canvas.height / (video.videoHeight || 480);
  preds.forEach((p) => {
    const [x, y, w, h] = p.bbox;
    const sx = x * scaleX, sy = y * scaleY, sw = w * scaleX, sh = h * scaleY;
    const color = p.class === "person" ? "#0ea5e9" : "#f59e0b";
    ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.strokeRect(sx, sy, sw, sh);
    ctx.fillStyle = color + "bb"; 
    ctx.fillRect(sx, sy - 22, Math.max(120, (p.class.length + 10) * 7), 22);
    ctx.fillStyle = "#fff"; ctx.font = "600 11px Plus Jakarta Sans, sans-serif";
    ctx.fillText(`${p.class} ${Math.round(p.score * 100)}%`, sx + 6, sy - 7);
  });
}

function updateCVHUD(count, preds) {
  const g = (id) => document.getElementById(id);
  if (typeof syncCVPersonCountUI === "function") {
    syncCVPersonCountUI(count);
  } else if (g("cvPersonCount")) {
    g("cvPersonCount").textContent = count;
  }
  if (g("cvConfidence")) g("cvConfidence").textContent = preds && preds.length
    ? Math.round(Math.max(...preds.map((p) => p.score)) * 100) + "%" : "—";
  const presText = count > 0 ? `${count} orang` : "Tidak ada";
  if (g("cvPresenceStatus")) {
    g("cvPresenceStatus").textContent = presText;
    g("cvPresenceStatus").className = "status-val" + (count > 0 ? " ok" : " muted");
  }
}

let _cvLastDetectTime = 0;
