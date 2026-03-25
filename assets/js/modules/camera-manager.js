async function getUserMediaCompat(constraints) {
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    return await navigator.mediaDevices.getUserMedia(constraints);
  }
  const legacyGetMedia = navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.getUserMedia;
  if (legacyGetMedia) {
    return new Promise((resolve, reject) => legacyGetMedia.call(navigator, constraints, resolve, reject));
  }
  throw new Error('Kamera tidak didukung di lingkungan ini');
}

async function listCameraDevices() {
  try {
    const tempStream = await getUserMediaCompat({ video: true });
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
      tempStream.getTracks().forEach((t) => t.stop());
      return [];
    }
    const devices = await navigator.mediaDevices.enumerateDevices();
    const cams = devices.filter((d) => d.kind === 'videoinput');
    STATE.camera.availableDevices = cams;
    tempStream.getTracks().forEach((t) => t.stop());
    return cams;
  } catch (err) {
    console.error('Gagal list kamera:', err);
    return [];
  }
}

async function startCamera() {
  try {
    if (STATE.camera.stream) STATE.camera.stream.getTracks().forEach((t) => t.stop());
    const constraints = STATE.camera.selectedDeviceId
      ? { video: { deviceId: { exact: STATE.camera.selectedDeviceId } } }
      : { video: { facingMode: 'environment' } };
    const stream = await getUserMediaCompat(constraints);
    STATE.camera.stream = stream;
    STATE.camera.active = true;
    updateCameraElements(true);
    return true;
  } catch (e) {
    console.error('Start Camera Error:', e);
    try {
      const fallbackStream = await getUserMediaCompat({ video: true });
      STATE.camera.stream = fallbackStream;
      STATE.camera.active = true;
      updateCameraElements(true);
      return true;
    } catch (e2) {
      showToast('Gagal akses kamera: ' + e2.message, 'error');
      return false;
    }
  }
}

async function toggleCamera() {
  try {
    if (!STATE.camera.stream) {
      const success = await startCamera();
      if (success) showToast('Kamera aktif', 'success');
    } else {
      STATE.camera.stream.getTracks().forEach((t) => t.stop());
      STATE.camera.stream = null;
      STATE.camera.active = false;
      updateCameraElements(false);
      showToast('Kamera dimatikan', 'info');
    }
  } catch (e) {
    showToast('Error kamera: ' + e.message, 'error');
  }
}

function toggleCameraFocus() { toggleCamera(); }

function openCameraSelector() {
  const modal = document.getElementById('cameraSelectorModal');
  const list = document.getElementById('cameraDevicesList');
  if (!modal || !list) return;
  modal.classList.add('show');
  list.innerHTML = "<div class='modal-item'>Mencari Kamera...</div>";
  listCameraDevices().then((devs) => {
    list.innerHTML = '';
    if (devs.length === 0) {
      const btn = document.createElement('button');
      btn.className = 'modal-item';
      btn.innerHTML = `<i class="fas fa-camera"></i> Gunakan Kamera Utama`;
      btn.onclick = () => { STATE.camera.selectedDeviceId = null; closeCameraSelector(); startCamera(); };
      list.appendChild(btn);
      return;
    }
    devs.forEach((dev, idx) => {
      const btn = document.createElement('button');
      btn.className = 'modal-item' + (dev.deviceId === STATE.camera.selectedDeviceId ? ' selected' : '');
      btn.innerHTML = `<i class="fas fa-camera"></i> ${dev.label || 'Kamera ' + (idx + 1)}`;
      btn.onclick = () => { STATE.camera.selectedDeviceId = dev.deviceId; closeCameraSelector(); if (STATE.camera.active) startCamera(); else showToast('Kamera dipilih', 'info'); };
      list.appendChild(btn);
    });
  });
}

function closeCameraSelector() { document.getElementById('cameraSelectorModal')?.classList.remove('show'); }

async function selectCamera(deviceId) {
  STATE.camera.selectedDeviceId = deviceId;
  if (STATE.camera.stream) {
    STATE.camera.stream.getTracks().forEach((t) => t.stop());
    STATE.camera.stream = null;
    await startCamera();
  } else {
    showToast('Kamera dipilih, klik power untuk aktifkan', 'info');
  }
}

function updateCameraElements(isActive) {
  [
    { v: 'camera', p: 'camPlaceholder', b: 'camTag' },
    { v: 'cameraFocus', p: 'cameraFocusPlaceholder', b: 'cameraFocusTag' },
    { v: 'customCameraMirror', p: 'customCameraPlaceholder', b: null },
  ].forEach(({ v, p, b }) => {
    const vid = document.getElementById(v);
    const ph = document.getElementById(p);
    const tag = b ? document.getElementById(b) : null;
    if (!vid || !ph) return;
    if (isActive && STATE.camera.stream) {
      vid.srcObject = STATE.camera.stream;
      vid.classList.remove('hidden');
      ph.style.display = 'none';
      if (tag) tag.classList.remove('hidden');
      vid.play().catch(() => {});
    } else {
      vid.srcObject = null;
      vid.classList.add('hidden');
      ph.style.display = '';
      if (tag) tag.classList.add('hidden');
    }
  });
}
