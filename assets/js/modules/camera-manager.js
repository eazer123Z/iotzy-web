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

async function listCameraDevices() {
  try {
    const tempStream = await getUserMediaCompat({ video: true });
    const devices = navigator.mediaDevices?.enumerateDevices ? await navigator.mediaDevices.enumerateDevices() : [];
    STATE.camera.availableDevices = devices.filter((device) => device.kind === "videoinput");
    tempStream.getTracks().forEach((track) => track.stop());
    renderCameraDeviceSelect();
    return STATE.camera.availableDevices;
  } catch (error) {
    console.error("Gagal list kamera:", error);
    return [];
  }
}

function renderCameraDeviceSelect() {
  const select = document.getElementById("cameraSelect");
  if (!select) return;
  const devices = STATE.camera.availableDevices || [];
  select.innerHTML = `<option value="">Kamera default</option>` + devices.map((device, index) => {
    const selected = device.deviceId === STATE.camera.selectedDeviceId ? " selected" : "";
    return `<option value="${device.deviceId}"${selected}>${escHtml(device.label || `Kamera ${index + 1}`)}</option>`;
  }).join("");
}

async function startCamera() {
  try {
    if (STATE.camera.stream) {
      STATE.camera.stream.getTracks().forEach((track) => track.stop());
    }
    const constraints = STATE.camera.selectedDeviceId
      ? { video: { deviceId: { exact: STATE.camera.selectedDeviceId } } }
      : { video: { facingMode: "environment" } };
    const stream = await getUserMediaCompat(constraints);
    STATE.camera.stream = stream;
    STATE.camera.active = true;
    updateCameraElements(true);
    toggleCameraButtons(true);
    toggleCVActionButtons();
    await listCameraDevices();
    return true;
  } catch (error) {
    showToast(`Gagal akses kamera: ${error.message}`, "error");
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
  listCameraDevices().then((devices) => {
    list.innerHTML = "";
    if (!devices.length) {
      list.innerHTML = "<div class='modal-item'>Kamera browser default siap dipakai.</div>";
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
