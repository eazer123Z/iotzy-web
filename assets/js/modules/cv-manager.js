function setCVModelStatus(label) {
  const el = document.getElementById("cvModelStatus");
  if (el) el.textContent = label;
}

function startCVFpsMonitor() {
  stopCVFpsMonitor();
  CV.frameCount = 0;
  CV.fpsTimer = setInterval(() => {
    CV.fps = CV.frameCount;
    const fpsEl = document.getElementById("cvFPS");
    if (fpsEl) fpsEl.textContent = String(CV.fps);
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
  const fpsEl = document.getElementById("cvFPS");
  if (fpsEl) fpsEl.textContent = "0";
}

async function initializeCV() {
  if (typeof cvDetector !== 'undefined') {
      if (cvDetector.isLoading) return;
      if (cvDetector.isReady)   return true;
  } else return false;

  CV.modelLoading = true;
  setCVModelStatus("Memuat");
  if (document.getElementById("cvLoadingStatus")) {
    document.getElementById("cvLoadingStatus").classList.remove("hidden");
  }

  try {
    await loadCVLibraries();
  } catch (e) {
    showToast("Gagal mengunduh AI library", "error");
    return false;
  }

  const ok = await cvDetector.initialize();
  if (ok) {
    CV.modelLoading = false;
    CV.modelLoaded = true;
    CV.model = cvDetector.model || CV.model;
    updateCVBadge("ready", "Siap");
    setCVModelStatus("Siap");
    if (document.getElementById("cvLoadingStatus")) document.getElementById("cvLoadingStatus").classList.add("hidden");
    if (document.getElementById("cvSystemStatus")) {
      document.getElementById("cvSystemStatus").textContent = "Model siap";
      document.getElementById("cvSystemStatus").className   = "status-val ok";
    }
    if (document.getElementById("btnStartCV"))   document.getElementById("btnStartCV").disabled   = false;
    if (document.getElementById("btnLoadModel")) document.getElementById("btnLoadModel").disabled = true;

    if (typeof cvUI !== "undefined") cvUI.renderAutomationSettings();
    showToast("Model CV berhasil dimuat!", "success");
    apiPost('update_cv_state', { model_loaded: 1 }).catch(() => {});
    return true;
  } else {
    CV.modelLoading = false;
    CV.modelLoaded = false;
    updateCVBadge("error", "Gagal");
    setCVModelStatus("Gagal");
    if (document.getElementById("cvLoadingStatus")) document.getElementById("cvLoadingStatus").classList.add("hidden");
    showToast("Gagal memuat model CV", "error");
    return false;
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
  startCVFpsMonitor();

  if (typeof lightAnalyzer !== 'undefined') {
    lightAnalyzer.startAnalysis(video);
  }

  if (document.getElementById("btnStartCV")) document.getElementById("btnStartCV").disabled = true;
  if (document.getElementById("btnStopCV"))  document.getElementById("btnStopCV").disabled  = false;
  if (document.getElementById("cvDetectionInfo")) document.getElementById("cvDetectionInfo").style.display = "flex";
  
  updateCVBadge("active", "Aktif");
  setCVModelStatus("Aktif");
  if (typeof toggleCVActionButtons === "function") toggleCVActionButtons();
  showToast("Deteksi CV dimulai", "info");
}

function stopCVDetection() {
  CV.detecting = false;
  cvDetector.stopDetection();
  stopCVFpsMonitor();
  if (typeof lightAnalyzer !== 'undefined') lightAnalyzer.stopAnalysis();

  if (document.getElementById("btnStartCV")) document.getElementById("btnStartCV").disabled = false;
  if (document.getElementById("btnStopCV"))  document.getElementById("btnStopCV").disabled  = true;
  if (document.getElementById("cvDetectionInfo")) document.getElementById("cvDetectionInfo").style.display = "none";
  
  updateCVBadge("ready", "Siap");
  setCVModelStatus(CV.modelLoaded ? "Siap" : "Idle");
  if (typeof toggleCVActionButtons === "function") toggleCVActionButtons();
  showToast("Deteksi CV dihentikan", "info");
}

async function startDetection() {
  if (typeof STATE !== "undefined" && !STATE.camera.active && typeof startCamera === "function") {
    const cameraOk = await startCamera();
    if (!cameraOk) return false;
  }

  const ready = await initializeCV();
  if (!ready) return false;

  startCVDetection();
  return true;
}

function stopDetection() {
  stopCVDetection();
}

async function loadCVConfig() {
  const result = await apiPost("get_cv_config", {});
  if (result) {
    if (result.showBoundingBox !== undefined) CV.showBoxes  = result.showBoundingBox;
    if (result.showDebugInfo   !== undefined) CV.showDebug  = result.showDebugInfo;
    if (result.minConfidence   !== undefined) CV.confidence = result.minConfidence;
  }
}

async function loadCVRules() {
  const result = await apiPost("get_cv_rules", {});
  if (result) {
    CV.cvRules = { ...CV.cvRules, ...result };
    if (typeof automationEngine !== "undefined") {
      automationEngine.updateCVRules(CV.cvRules);
    }
  }
}

async function saveCVRules() {
  await apiPost("save_cv_rules", { rules: CV.cvRules });
}

function toggleBoundingBox(val) {
  CV.showBoxes = val;
  ["cvShowBoundingBoxCamera", "cvShowBoundingBoxSettings"].forEach((id) => {
    const el = document.getElementById(id); if (el && el.checked !== val) el.checked = val;
  });
  if (!val && CV.overlayCtx && CV.overlayCanvas) CV.overlayCtx.clearRect(0, 0, CV.overlayCanvas.width, CV.overlayCanvas.height);
  apiPost("save_cv_config", { config: { showBoundingBox: val, showDebugInfo: CV.showDebug, minConfidence: CV.confidence } }).catch(() => {});
}

function toggleDebugInfo(val) {
  CV.showDebug = val;
  ["cvShowDebugInfoCamera", "cvShowDebugInfoSettings"].forEach((id) => {
    const el = document.getElementById(id); if (el && el.checked !== val) el.checked = val;
  });
  const hud = document.getElementById("cvDetectionInfo");
  if (hud) hud.style.display = val && CV.detecting ? "flex" : "none";
  apiPost("save_cv_config", { config: { showBoundingBox: CV.showBoxes, showDebugInfo: val, minConfidence: CV.confidence } }).catch(() => {});
}

function updateCVConfig(val) {
  CV.confidence = parseFloat(val) / 100;
  apiPost("save_cv_config", { config: { showBoundingBox: CV.showBoxes, showDebugInfo: CV.showDebug, minConfidence: CV.confidence } }).catch(() => {});
}

function onCVPersonCountUpdate(count) {
  STATE.cv.personCount  = count;
  STATE.cv.personPresent = count > 0;
  const g = (id) => document.getElementById(id);
  if (g("cvPersonCountBig")) g("cvPersonCountBig").textContent = count;
  if (g("cvHumanCount"))     g("cvHumanCount").textContent     = count;
  if (typeof automationEngine !== "undefined" && automationEngine.notifyPersonCount) {
      automationEngine.notifyPersonCount(count);
  }
  if (typeof updateDashboardStats === 'function') updateDashboardStats();
}

function onLightAnalysisUpdate(condition, brightness) {
  STATE.cv.lightCondition = condition;
  STATE.cv.brightness     = brightness;
  const pct = Math.round(brightness * 100);
  const g   = (id) => document.getElementById(id);
  if (g("cvBrightness"))      g("cvBrightness").textContent      = `${pct}%`;
  if (g("cvBrightnessLabel")) g("cvBrightnessLabel").textContent = `${pct}%`;
  if (g("cvBrightnessBar"))   g("cvBrightnessBar").style.width   = pct + "%";
  const condMap = { dark: "Gelap", normal: "Normal", bright: "Terang" };
  if (g("cvLightCondition")) g("cvLightCondition").textContent   = condMap[condition] || condition;

  // Trigger automation engine for light rules
  if (typeof automationEngine !== "undefined" && automationEngine.onLightCondition) {
      automationEngine.onLightCondition(condition, brightness);
  }
}

async function loadCVLibraries() {
  if (window.tf && window.cocoSsd) return true;
  const loadScript = (src) => new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[data-src="${src}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve(true), { once: true });
      existing.addEventListener('error', reject, { once: true });
      if (existing.dataset.loaded === '1') resolve(true);
      return;
    }
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.dataset.src = src;
    s.onload = () => { s.dataset.loaded = '1'; resolve(true); };
    s.onerror = reject;
    document.head.appendChild(s);
  });
  await loadScript('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.11.0');
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
  if (g("cvHumanCount")) g("cvHumanCount").textContent = count;
  if (g("cvConfidence")) g("cvConfidence").textContent = preds && preds.length
    ? Math.round(Math.max(...preds.map((p) => p.score)) * 100) + "%" : "—";
  const presText = count > 0 ? `${count} orang` : "Tidak ada";
  if (g("cvPresenceStatus")) {
    g("cvPresenceStatus").textContent = presText;
    g("cvPresenceStatus").className = "status-val" + (count > 0 ? " ok" : " muted");
  }
}

let _cvLastDetectTime = 0;
