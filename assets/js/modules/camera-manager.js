const REMOTE_CAMERA_PREFIX = "live:";

async function getUserMediaCompat(constraints) {
  if (navigator.mediaDevices?.getUserMedia) {
    return navigator.mediaDevices.getUserMedia(constraints);
  }
  const legacy = navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.getUserMedia;
  if (legacy) {
    return new Promise((resolve, reject) => legacy.call(navigator, constraints, resolve, reject));
  }
  throw new Error("Kamera tidak didukung di lingkungan ini");
}

function isRemoteCameraSourceValue(value) {
  return String(value || "").startsWith(REMOTE_CAMERA_PREFIX);
}

function buildRemoteCameraSourceValue(streamKey) {
  return `${REMOTE_CAMERA_PREFIX}${String(streamKey || "").trim()}`;
}

function getRemoteCameraStreamKey(value) {
  return isRemoteCameraSourceValue(value) ? String(value).slice(REMOTE_CAMERA_PREFIX.length).trim() : "";
}

function getAvailableRemoteCameraSessions() {
  return (STATE?.camera?.live?.sessions || [])
    .filter((session) => session && session.stream_key && !session.is_owner && session.status !== "ended");
}

function findRemoteCameraSession(streamKey) {
  const normalizedKey = String(streamKey || "").trim();
  if (!normalizedKey) return null;
  return getAvailableRemoteCameraSessions().find((session) => String(session.stream_key) === normalizedKey) || null;
}

function getRemoteCameraLabel(session) {
  if (!session) return "Source live";
  const name = String(session.publisher_name || "Source live").trim();
  const source = String(session.source_label || "").trim();
  if (source && source.toLowerCase() !== name.toLowerCase()) {
    return `Live: ${name} - ${source}`;
  }
  return `Live: ${name}`;
}

function getSelectedCameraSource() {
  const rawValue = String(STATE.camera.selectedSourceValue || "").trim();
  if (isRemoteCameraSourceValue(rawValue)) {
    const streamKey = getRemoteCameraStreamKey(rawValue);
    const session = findRemoteCameraSession(streamKey);
    return {
      type: "remote",
      value: rawValue,
      streamKey,
      session,
      label: getRemoteCameraLabel(session),
    };
  }

  return {
    type: "local",
    value: String(STATE.camera.selectedDeviceId || rawValue || "").trim(),
    streamKey: "",
    session: null,
    label: getSelectedCameraDeviceLabel(),
  };
}

function getCameraListHint(error = null) {
  if (!navigator.mediaDevices?.enumerateDevices) {
    return "Browser ini belum mendukung daftar kamera";
  }
  if (error) {
    if (!window.isSecureContext) {
      return "Kamera butuh HTTPS atau localhost";
    }
    return "Izinkan akses kamera untuk melihat daftar";
  }
  return "Kamera default browser";
}

function updateCameraSelectionMetaUI() {
  const el = document.getElementById("cvSessionMeta");
  if (!el) return;

  const selection = getSelectedCameraSource();
  const remoteCount = getAvailableRemoteCameraSessions().length;
  if (selection.type === "remote") {
    const remoteLabel = selection.label || STATE.camera.selectedRemoteLabel || "source live device lain";
    const watcherState = STATE.camera.mode === "remote" && STATE.camera.active ? "Sedang memantau" : "Siap memantau";
    el.textContent = `${watcherState}: ${remoteLabel}. Device ini bertindak sebagai viewer, bukan source kamera utama.`;
    return;
  }

  const sessionLabel = sanitizeCameraNameValue(STATE.camera.sessionLabel, "Browser Ini");
  const deviceLabel = sanitizeCameraNameValue(getSelectedCameraDeviceLabel(), "kamera browser");
  const remoteHint = remoteCount > 0
    ? ` ${remoteCount} source live device lain tersedia di dropdown ini untuk mode pantau.`
    : " Device lain pada akun ini bisa melihat source ini saat kamera aktif.";
  el.textContent = `Sesi aktif: ${sessionLabel} - Source utama: ${deviceLabel}.${remoteHint}`;
  return;
}

function updateCameraPrimaryActionLabels() {
  const startBtn = document.getElementById("btnStartCam");
  const stopBtn = document.getElementById("btnStopCam");
  const selection = getSelectedCameraSource();

  if (startBtn) {
    startBtn.innerHTML = selection.type === "remote"
      ? `<i class="fas fa-eye"></i> Pantau Source`
      : `<i class="fas fa-play"></i> Mulai Kamera`;
  }

  if (stopBtn) {
    stopBtn.innerHTML = selection.type === "remote"
      ? `<i class="fas fa-eye-slash"></i> Stop Pantau`
      : `<i class="fas fa-stop"></i> Stop Kamera`;
  }
}

async function listCameraDevices(options = {}) {
  const ensureLabels = !!options.ensureLabels;
  let tempStream = null;
  try {
    let devices = navigator.mediaDevices?.enumerateDevices ? await navigator.mediaDevices.enumerateDevices() : [];
    let cameras = devices.filter((device) => device.kind === "videoinput");

    const needsPermissionPass = ensureLabels && cameras.some((device) => !device.label);
    if (needsPermissionPass) {
      tempStream = await getUserMediaCompat({ video: true });
      devices = navigator.mediaDevices?.enumerateDevices ? await navigator.mediaDevices.enumerateDevices() : [];
      cameras = devices.filter((device) => device.kind === "videoinput");
    }

    STATE.camera.availableDevices = cameras;
    STATE.camera.listError = "";
    if (STATE.camera.selectedDeviceId && !cameras.some((device) => device.deviceId === STATE.camera.selectedDeviceId)) {
      STATE.camera.selectedDeviceId = cameras[0]?.deviceId || null;
    }
    renderCameraDeviceSelect();
    return STATE.camera.availableDevices;
  } catch (error) {
    console.error("Gagal list kamera:", error);
    STATE.camera.availableDevices = [];
    STATE.camera.listError = error?.message || "unknown";
    renderCameraDeviceSelect(error);
    return [];
  } finally {
    if (tempStream) {
      tempStream.getTracks().forEach((track) => track.stop());
    }
  }
}

function renderCameraDeviceSelect(error = null) {
  const select = document.getElementById("cameraSelect");
  if (!select) return;

  const devices = STATE.camera.availableDevices || [];
  const remoteSessions = getAvailableRemoteCameraSessions();
  const hint = getCameraListHint(error || STATE.camera.listError);

  if (!STATE.camera.selectedDeviceId && devices.length) {
    STATE.camera.selectedDeviceId = devices[0].deviceId || null;
  }

  let selectedValue = String(STATE.camera.selectedSourceValue || "").trim();
  if (isRemoteCameraSourceValue(selectedValue)) {
    const streamKey = getRemoteCameraStreamKey(selectedValue);
    if (!findRemoteCameraSession(streamKey)) {
      selectedValue = "";
      STATE.camera.selectedSourceValue = "";
      STATE.camera.selectedRemoteStreamKey = "";
      STATE.camera.selectedRemoteLabel = "";
    }
  }

  if (!selectedValue) {
    selectedValue = STATE.camera.selectedDeviceId || (remoteSessions[0] ? buildRemoteCameraSourceValue(remoteSessions[0].stream_key) : "");
  }

  if (!selectedValue && devices.length) {
    selectedValue = devices[0].deviceId || "";
  }

  const localOptions = devices.map((device, index) => {
    const value = String(device.deviceId || "");
    const selected = value === selectedValue ? " selected" : "";
    return `<option value="${escHtml(value)}"${selected}>${escHtml(device.label || `Kamera ${index + 1}`)}</option>`;
  }).join("");

  const remoteOptions = remoteSessions.map((session) => {
    const value = buildRemoteCameraSourceValue(session.stream_key);
    const selected = value === selectedValue ? " selected" : "";
    return `<option value="${escHtml(value)}"${selected}>${escHtml(getRemoteCameraLabel(session))}</option>`;
  }).join("");

  const groups = [];
  if (localOptions) {
    groups.push(`<optgroup label="Kamera Browser Ini">${localOptions}</optgroup>`);
  }
  if (remoteOptions) {
    groups.push(`<optgroup label="Pantau Device Lain">${remoteOptions}</optgroup>`);
  }

  const placeholderLabel = groups.length ? "Pilih sumber kamera utama atau live source" : hint;
  select.innerHTML = `<option value="">${escHtml(placeholderLabel)}</option>${groups.join("")}`;
  select.disabled = !groups.length;

  if (selectedValue) {
    select.value = selectedValue;
  }

  STATE.camera.selectedSourceValue = select.value || selectedValue || "";

  if (isRemoteCameraSourceValue(STATE.camera.selectedSourceValue)) {
    const remoteKey = getRemoteCameraStreamKey(STATE.camera.selectedSourceValue);
    const remoteSession = findRemoteCameraSession(remoteKey);
    STATE.camera.selectedRemoteStreamKey = remoteKey;
    STATE.camera.selectedRemoteLabel = getRemoteCameraLabel(remoteSession);
    STATE.camera.mode = STATE.camera.active && STATE.camera.remoteStream ? "remote" : STATE.camera.mode;
  } else {
    STATE.camera.selectedDeviceId = STATE.camera.selectedSourceValue || STATE.camera.selectedDeviceId || null;
    STATE.camera.selectedDeviceLabel = getSelectedCameraDeviceLabel();
    STATE.camera.selectedRemoteStreamKey = "";
    STATE.camera.selectedRemoteLabel = "";
    if (typeof refreshCameraSessionContext === "function") {
      refreshCameraSessionContext({ persist: true });
    }
  }

  updateCameraPrimaryActionLabels();
  updateCameraSelectionMetaUI();
}

function setCVPanelSystemStatus(text, className = "muted") {
  const el = document.getElementById("cvSystemStatus");
  if (!el) return;
  el.textContent = text;
  el.className = `status-val ${className}`.trim();
}

function resetCVStageReadouts() {
  const presence = document.getElementById("cvPresenceStatus");
  const confidence = document.getElementById("cvConfidence");
  const brightnessLabel = document.getElementById("cvBrightnessLabel");
  const brightnessBar = document.getElementById("cvBrightnessBar");
  if (presence) {
    presence.textContent = "Tidak Terdeteksi";
    presence.className = "status-val muted";
  }
  if (confidence) confidence.textContent = "0%";
  if (brightnessLabel) brightnessLabel.textContent = "0%";
  if (brightnessBar) brightnessBar.style.width = "0%";
}

async function startRemoteViewer(selection) {
  if (!selection.streamKey || typeof cameraLive === "undefined") {
    throw new Error("Source live tidak tersedia");
  }

  if (typeof CV !== "undefined" && CV.detecting && typeof stopCVDetection === "function") {
    stopCVDetection();
  }

  if (STATE.camera.stream) {
    STATE.camera.stream.getTracks().forEach((track) => track.stop());
  }
  STATE.camera.stream = null;

  if (typeof cameraLive.stopPublishing === "function" && cameraLive.isPublishing()) {
    await cameraLive.stopPublishing({ notifyServer: true, silent: true });
  }

  const ok = await cameraLive.watchSession(selection.streamKey, { silent: true });
  if (!ok) {
    throw new Error("Gagal terhubung ke source live");
  }

  STATE.camera.mode = "remote";
  STATE.camera.active = true;
  STATE.camera.selectedRemoteStreamKey = selection.streamKey;
  STATE.camera.selectedRemoteLabel = selection.label || STATE.camera.selectedRemoteLabel;
  STATE.camera.listError = "";
  updateCameraElements(true);
  toggleCameraButtons(true);
  toggleCVActionButtons();
  setCVPanelSystemStatus("Monitor Live Aktif", "ok");
  updateCameraSelectionMetaUI();
  return true;
}

async function startLocalCamera() {
  if (typeof CV !== "undefined" && CV.detecting && typeof stopCVDetection === "function") {
    stopCVDetection();
  }

  if (typeof cameraLive !== "undefined" && typeof cameraLive.isWatching === "function" && cameraLive.isWatching()) {
    await cameraLive.stopWatching({ notifyServer: true, silent: true });
  }

  STATE.camera.remoteStream = null;
  STATE.camera.mode = "local";

  if (STATE.camera.stream) {
    STATE.camera.stream.getTracks().forEach((track) => track.stop());
  }

  const hasExplicitDevice = !!STATE.camera.selectedDeviceId
    && (STATE.camera.availableDevices || []).some((device) => device.deviceId === STATE.camera.selectedDeviceId);
  const constraints = hasExplicitDevice
    ? { video: { deviceId: { exact: STATE.camera.selectedDeviceId } } }
    : { video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } } };
  const stream = await getUserMediaCompat(constraints);

  STATE.camera.stream = stream;
  STATE.camera.active = true;
  STATE.camera.listError = "";
  updateCameraElements(true);
  toggleCameraButtons(true);
  toggleCVActionButtons();
  setCVPanelSystemStatus("Kamera Aktif", "ok");
  resetCVStageReadouts();
  await listCameraDevices({ ensureLabels: true });
  STATE.camera.selectedSourceValue = STATE.camera.selectedDeviceId || STATE.camera.selectedSourceValue || "";
  if (typeof refreshCameraSessionContext === "function") {
    refreshCameraSessionContext({ persist: true });
  }
  updateCameraSelectionMetaUI();
  if (typeof cameraLive !== "undefined" && typeof cameraLive.onCameraStateChange === "function") {
    cameraLive.onCameraStateChange(true);
  }
  if (typeof cameraLive !== "undefined" && typeof cameraLive.startPublishing === "function") {
    cameraLive.startPublishing({ silent: true }).catch(() => {});
  }
  return true;
}

async function startCamera() {
  try {
    const selection = getSelectedCameraSource();
    if (selection.type === "remote") {
      return await startRemoteViewer(selection);
    }
    return await startLocalCamera();
  } catch (error) {
    showToast(`Gagal akses kamera: ${error.message}`, "error");
    STATE.camera.listError = error?.message || "unknown";
    setCVPanelSystemStatus(isRemoteCameraSourceValue(STATE.camera.selectedSourceValue) ? "Monitor Gagal" : "Akses Kamera Gagal", "");
    renderCameraDeviceSelect(error);
    return false;
  }
}

async function stopCamera() {
  if (typeof CV !== "undefined" && CV.detecting && typeof stopCVDetection === "function") {
    stopCVDetection();
  }

  if (typeof cameraLive !== "undefined" && typeof cameraLive.isWatching === "function" && cameraLive.isWatching()) {
    await cameraLive.stopWatching({ notifyServer: true, silent: true });
  }

  if (STATE.camera.stream) {
    STATE.camera.stream.getTracks().forEach((track) => track.stop());
  }

  STATE.camera.stream = null;
  STATE.camera.remoteStream = null;
  STATE.camera.active = false;
  STATE.camera.mode = "local";
  updateCameraElements(false);
  toggleCameraButtons(false);
  toggleCVActionButtons();
  setCVPanelSystemStatus("Tidak Aktif", "muted");
  resetCVStageReadouts();
  updateCameraSelectionMetaUI();
  const hud = document.getElementById("cvDetectionInfo");
  if (hud) hud.style.display = "none";
  if (typeof cameraLive !== "undefined" && typeof cameraLive.onCameraStateChange === "function") {
    cameraLive.onCameraStateChange(false);
  }
}

async function toggleCamera() {
  if (STATE.camera.active) {
    await stopCamera();
    showToast(isRemoteCameraSourceValue(STATE.camera.selectedSourceValue) ? "Monitor live dihentikan" : "Kamera dimatikan", "info");
  } else {
    const ok = await startCamera();
    if (ok) {
      showToast(isRemoteCameraSourceValue(STATE.camera.selectedSourceValue) ? "Monitor live aktif" : "Kamera aktif", "success");
    }
  }
}

function toggleCameraFocus() {
  toggleCamera().catch(() => {});
}

function toggleCameraButtons(isActive) {
  const startBtn = document.getElementById("btnStartCam");
  const stopBtn = document.getElementById("btnStopCam");
  updateCameraPrimaryActionLabels();
  if (startBtn) startBtn.style.display = isActive ? "none" : "";
  if (stopBtn) stopBtn.style.display = isActive ? "" : "none";
}

function toggleCVActionButtons() {
  const startBtn = document.getElementById("btnStartCV");
  const stopBtn = document.getElementById("btnStopCV");
  if (!startBtn || !stopBtn) return;

  const cameraReady = !!STATE.camera.active;
  const detecting = typeof CV !== "undefined" && !!CV.detecting;

  startBtn.style.display = cameraReady && !detecting ? "" : "none";
  stopBtn.style.display = cameraReady && detecting ? "" : "none";
  startBtn.disabled = !cameraReady;
  stopBtn.disabled = !cameraReady;
}

function openCameraSelector() {
  const modal = document.getElementById("cameraSelectorModal");
  const list = document.getElementById("cameraDevicesList");
  if (!modal || !list) return;
  modal.classList.add("active");
  list.innerHTML = "<div class='modal-item'>Mencari source kamera...</div>";

  listCameraDevices({ ensureLabels: false }).then(() => {
    const localDevices = STATE.camera.availableDevices || [];
    const remoteSessions = getAvailableRemoteCameraSessions();
    list.innerHTML = "";

    if (!localDevices.length && !remoteSessions.length) {
      list.innerHTML = `<div class='modal-item'>${escHtml(getCameraListHint(STATE.camera.listError))}</div>`;
      return;
    }

    localDevices.forEach((device, index) => {
      const btn = document.createElement("button");
      const value = String(device.deviceId || "");
      btn.className = "modal-item" + (STATE.camera.selectedSourceValue === value ? " selected" : "");
      btn.innerHTML = `<i class="fas fa-camera"></i> ${escHtml(device.label || `Kamera ${index + 1}`)}`;
      btn.onclick = () => switchCamera(value);
      list.appendChild(btn);
    });

    remoteSessions.forEach((session) => {
      const btn = document.createElement("button");
      const value = buildRemoteCameraSourceValue(session.stream_key);
      btn.className = "modal-item" + (STATE.camera.selectedSourceValue === value ? " selected" : "");
      btn.innerHTML = `<i class="fas fa-tower-broadcast"></i> ${escHtml(getRemoteCameraLabel(session))}`;
      btn.onclick = () => switchCamera(value);
      list.appendChild(btn);
    });
  });
}

function closeCameraSelector() {
  document.getElementById("cameraSelectorModal")?.classList.remove("active");
}

async function switchCamera(value) {
  const selectedValue = String(value || "").trim();
  STATE.camera.selectedSourceValue = selectedValue;

  if (isRemoteCameraSourceValue(selectedValue)) {
    const streamKey = getRemoteCameraStreamKey(selectedValue);
    const session = findRemoteCameraSession(streamKey);
    STATE.camera.selectedRemoteStreamKey = streamKey;
    STATE.camera.selectedRemoteLabel = getRemoteCameraLabel(session);
  } else {
    STATE.camera.selectedDeviceId = selectedValue || STATE.camera.selectedDeviceId || null;
    STATE.camera.selectedDeviceLabel = getSelectedCameraDeviceLabel();
    STATE.camera.selectedRemoteStreamKey = "";
    STATE.camera.selectedRemoteLabel = "";
    if (typeof refreshCameraSessionContext === "function") {
      refreshCameraSessionContext({ persist: true });
    }
  }

  renderCameraDeviceSelect();
  closeCameraSelector();

  if (STATE.camera.active) {
    await startCamera();
  }
}

function updateCameraElements(isActive) {
  const activeStream = STATE.camera.remoteStream || STATE.camera.stream;

  [
    { videoId: "camera", placeholderId: "camPlaceholder", tagId: "camTag" },
    { videoId: "cameraFocus", placeholderId: "cameraFocusPlaceholder", tagId: "cameraFocusTag" },
    { videoId: "customCameraMirror", placeholderId: "customCameraPlaceholder", tagId: null },
  ].forEach(({ videoId, placeholderId, tagId }) => {
    const video = document.getElementById(videoId);
    const placeholder = document.getElementById(placeholderId);
    const tag = tagId ? document.getElementById(tagId) : null;
    if (!video || !placeholder) return;
    if (isActive && activeStream) {
      video.srcObject = activeStream;
      video.classList.remove("hidden");
      video.style.display = "";
      placeholder.style.display = "none";
      if (tag) tag.style.display = "none";
      video.play().catch(() => {});
    } else {
      video.srcObject = null;
      video.classList.add("hidden");
      video.style.display = "none";
      placeholder.style.display = "";
      if (tag) tag.style.display = "";
    }
  });

  updateCameraPrimaryActionLabels();
  updateCameraSelectionMetaUI();
  toggleCVActionButtons();
}

function initCameraManager() {
  if (initCameraManager._initialized) return;
  initCameraManager._initialized = true;
  renderCameraDeviceSelect();
  if (window.isSecureContext || /^(localhost|127\.0\.0\.1)$/i.test(window.location.hostname)) {
    listCameraDevices({ ensureLabels: false }).catch(() => {});
  }
}

window.initCameraManager = initCameraManager;

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initCameraManager);
} else {
  initCameraManager();
}
