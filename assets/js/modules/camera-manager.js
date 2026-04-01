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
    STATE.camera.selectedDeviceLabel = "";
    if (typeof refreshCameraSessionContext === "function") {
      refreshCameraSessionContext({ persist: true });
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
  const hint = getCameraListHint(error || STATE.camera.listError);
  const placeholderLabel = devices.length ? "Pilih kamera browser" : hint;
  if (!STATE.camera.selectedDeviceId && devices.length) {
    STATE.camera.selectedDeviceId = devices[0].deviceId || null;
  }
  select.innerHTML = `<option value="">${escHtml(placeholderLabel)}</option>` + devices.map((device, index) => {
    const selected = device.deviceId === STATE.camera.selectedDeviceId ? " selected" : "";
    return `<option value="${device.deviceId}"${selected}>${escHtml(device.label || `Kamera ${index + 1}`)}</option>`;
  }).join("");
  select.disabled = !devices.length && !navigator.mediaDevices?.getUserMedia;
  STATE.camera.selectedDeviceLabel = getSelectedCameraDeviceLabel();
  if (typeof refreshCameraSessionContext === "function") {
    refreshCameraSessionContext({ persist: true });
  }
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

async function startCamera() {
  try {
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
    if (typeof refreshCameraSessionContext === "function") {
      refreshCameraSessionContext({ persist: true });
    }
    return true;
  } catch (error) {
    showToast(`Gagal akses kamera: ${error.message}`, "error");
    STATE.camera.listError = error?.message || "unknown";
    setCVPanelSystemStatus("Akses Kamera Gagal", "");
    renderCameraDeviceSelect(error);
    return false;
  }
}

function stopCamera() {
  if (typeof CV !== "undefined" && CV.detecting && typeof stopCVDetection === "function") {
    stopCVDetection();
  }
  if (STATE.camera.stream) {
    STATE.camera.stream.getTracks().forEach((track) => track.stop());
  }
  STATE.camera.stream = null;
  STATE.camera.active = false;
  updateCameraElements(false);
  toggleCameraButtons(false);
  toggleCVActionButtons();
  setCVPanelSystemStatus("Tidak Aktif", "muted");
  resetCVStageReadouts();
  const hud = document.getElementById("cvDetectionInfo");
  if (hud) hud.style.display = "none";
}

async function toggleCamera() {
  if (STATE.camera.active) {
    stopCamera();
    showToast("Kamera dimatikan", "info");
  } else {
    const ok = await startCamera();
    if (ok) showToast("Kamera aktif", "success");
  }
}

function toggleCameraFocus() {
  toggleCamera();
}

function toggleCameraButtons(isActive) {
  const startBtn = document.getElementById("btnStartCam");
  const stopBtn = document.getElementById("btnStopCam");
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
  list.innerHTML = "<div class='modal-item'>Mencari kamera...</div>";
  listCameraDevices({ ensureLabels: false }).then((devices) => {
    list.innerHTML = "";
    if (!devices.length) {
      list.innerHTML = `<div class='modal-item'>${escHtml(getCameraListHint(STATE.camera.listError))}</div>`;
      return;
    }
    devices.forEach((device, index) => {
      const btn = document.createElement("button");
      btn.className = "modal-item" + (device.deviceId === STATE.camera.selectedDeviceId ? " selected" : "");
      btn.innerHTML = `<i class="fas fa-camera"></i> ${escHtml(device.label || `Kamera ${index + 1}`)}`;
      btn.onclick = () => switchCamera(device.deviceId);
      list.appendChild(btn);
    });
  });
}

function closeCameraSelector() {
  document.getElementById("cameraSelectorModal")?.classList.remove("active");
}

async function switchCamera(deviceId) {
  STATE.camera.selectedDeviceId = deviceId || null;
  STATE.camera.selectedDeviceLabel = getSelectedCameraDeviceLabel();
  if (typeof refreshCameraSessionContext === "function") {
    refreshCameraSessionContext({ persist: true });
  }
  renderCameraDeviceSelect();
  closeCameraSelector();
  if (STATE.camera.active) {
    await startCamera();
  }
}

function updateCameraElements(isActive) {
  [
    { videoId: "camera", placeholderId: "camPlaceholder", tagId: "camTag" },
    { videoId: "cameraFocus", placeholderId: "cameraFocusPlaceholder", tagId: "cameraFocusTag" },
    { videoId: "customCameraMirror", placeholderId: "customCameraPlaceholder", tagId: null },
  ].forEach(({ videoId, placeholderId, tagId }) => {
    const video = document.getElementById(videoId);
    const placeholder = document.getElementById(placeholderId);
    const tag = tagId ? document.getElementById(tagId) : null;
    if (!video || !placeholder) return;
    if (isActive && STATE.camera.stream) {
      video.srcObject = STATE.camera.stream;
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

  toggleCVActionButtons();
}

document.addEventListener("DOMContentLoaded", () => {
  renderCameraDeviceSelect();
  if (window.isSecureContext || /^(localhost|127\.0\.0\.1)$/i.test(window.location.hostname)) {
    listCameraDevices({ ensureLabels: false }).catch(() => {});
  }
});
