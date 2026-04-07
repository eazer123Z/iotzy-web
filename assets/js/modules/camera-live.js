const cameraLive = (() => {
  const RTC_CONFIG = {
    iceServers: [
      { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] },
    ],
  };
  const REFRESH_INTERVAL = 2000;
  const POLL_INTERVAL = 2500;
  const SNAPSHOT_PUSH_INTERVAL = 1200;
  const SNAPSHOT_PULL_INTERVAL = 1400;
  const SNAPSHOT_TRACK_WAIT_MS = 2200;

  const state = {
    featureReady: true,
    sessions: [],
    initialized: false,
    refreshTimer: null,
    refreshPromise: null,
    publisher: {
      pc: null,
      streamKey: "",
      lastCandidateId: 0,
      answerApplied: false,
      pollTimer: null,
      recoverTimer: null,
      snapshotTimer: null,
      snapshotCanvas: null,
      snapshotVideo: null,
      snapshotPushing: false,
      starting: false,
      startPromise: null,
      stopping: false,
    },
    viewer: {
      pc: null,
      streamKey: "",
      lastCandidateId: 0,
      pollTimer: null,
      snapshotTimer: null,
      remoteStream: null,
      remoteTrackReady: false,
      joining: false,
      joinPromise: null,
      stopping: false,
      lastError: "",
      fallbackActive: false,
      fallbackSnapshotAt: "",
    },
  };

  function isCameraViewVisible() {
    const view = document.getElementById("camera");
    return !!view && !view.classList.contains("hidden");
  }

  function setStatusChip(text, tone = "muted") {
    const el = document.getElementById("cameraLiveStatusChip");
    if (!el) return;
    el.textContent = text;
    el.className = `cv-summary-chip ${tone}`.trim();
  }

  function setPublisherMeta(text) {
    const el = document.getElementById("cameraLivePublisherMeta");
    if (el) el.textContent = text;
  }

  function setViewerMeta(text, tone = "muted") {
    const el = document.getElementById("cameraLiveViewerMeta");
    if (!el) return;
    el.textContent = text;
    el.className = `cv-live-meta ${tone}`.trim();
  }

  function updateRemoteStage(stream = null) {
    if (STATE?.camera) {
      STATE.camera.remoteStream = stream || null;
    }

    const video = document.getElementById("cameraLiveRemoteVideo");
    const placeholder = document.getElementById("cameraLiveViewerPlaceholder");
    if (!video || !placeholder) {
      if (typeof updateCameraElements === "function") {
        updateCameraElements(!!STATE?.camera?.active);
      }
      return;
    }

    if (stream) {
      video.srcObject = stream;
      video.style.display = "";
      placeholder.style.display = "none";
      video.play().catch(() => {});
      if (typeof updateCameraElements === "function") {
        updateCameraElements(!!STATE?.camera?.active || !!stream);
      }
      return;
    }

    try {
      if (video.srcObject && video.srcObject.getTracks) {
        video.srcObject.getTracks().forEach((track) => track.stop());
      }
    } catch (_) {}

    video.srcObject = null;
    video.style.display = "none";
    placeholder.style.display = "";

    if (typeof updateCameraElements === "function") {
      updateCameraElements(!!STATE?.camera?.active);
    }
  }

  function applyViewerSnapshot(snapshot = null) {
    if (STATE?.camera) {
      STATE.camera.remoteSnapshot = snapshot ? {
        dataUrl: snapshot.data_url || "",
        updatedAt: snapshot.updated_at || "",
        width: Number(snapshot.width) || 0,
        height: Number(snapshot.height) || 0,
      } : null;
    }

    if (typeof updateCameraElements === "function") {
      updateCameraElements(!!STATE?.camera?.active);
    }
  }

  function clearPublisherSnapshotLoop() {
    if (!state.publisher.snapshotTimer) return;
    clearTimeout(state.publisher.snapshotTimer);
    state.publisher.snapshotTimer = null;
  }

  function schedulePublisherSnapshotLoop(delay = SNAPSHOT_PUSH_INTERVAL) {
    clearPublisherSnapshotLoop();
    if (!state.publisher.streamKey || !STATE?.camera?.active || STATE.camera.mode === "remote") {
      return;
    }
    state.publisher.snapshotTimer = setTimeout(() => {
      pushPublisherSnapshot().catch(() => {});
    }, Math.max(300, delay));
  }

  function ensurePublisherSnapshotCanvas(width, height) {
    const safeWidth = Math.max(160, Math.min(640, Number(width) || 0));
    const safeHeight = Math.max(90, Math.min(480, Number(height) || 0));

    if (!state.publisher.snapshotCanvas) {
      state.publisher.snapshotCanvas = document.createElement("canvas");
    }

    if (state.publisher.snapshotCanvas.width !== safeWidth || state.publisher.snapshotCanvas.height !== safeHeight) {
      state.publisher.snapshotCanvas.width = safeWidth;
      state.publisher.snapshotCanvas.height = safeHeight;
    }

    return state.publisher.snapshotCanvas;
  }

  function ensurePublisherSnapshotVideo() {
    if (!state.publisher.snapshotVideo) {
      const video = document.createElement("video");
      video.muted = true;
      video.autoplay = true;
      video.playsInline = true;
      video.setAttribute("muted", "");
      video.setAttribute("playsinline", "");
      state.publisher.snapshotVideo = video;
    }

    return state.publisher.snapshotVideo;
  }

  function syncPublisherSnapshotVideo() {
    const stream = STATE?.camera?.stream || null;
    const video = ensurePublisherSnapshotVideo();

    if (!stream) {
      try {
        video.pause();
      } catch (_) {}
      video.srcObject = null;
      return null;
    }

    if (video.srcObject !== stream) {
      video.srcObject = stream;
      video.onloadedmetadata = () => schedulePublisherSnapshotLoop(120);
      video.onplaying = () => schedulePublisherSnapshotLoop(120);
      video.play().catch(() => {});
    }

    return video;
  }

  function capturePublisherSnapshot() {
    const video = syncPublisherSnapshotVideo();
    if (!video || video.readyState < 2 || !video.videoWidth || !video.videoHeight) {
      return null;
    }

    const sourceWidth = Number(video.videoWidth) || 0;
    const sourceHeight = Number(video.videoHeight) || 0;
    if (sourceWidth <= 0 || sourceHeight <= 0) {
      return null;
    }

    const targetWidth = Math.max(220, Math.min(640, sourceWidth));
    const targetHeight = Math.max(124, Math.round((targetWidth / sourceWidth) * sourceHeight));
    const canvas = ensurePublisherSnapshotCanvas(targetWidth, targetHeight);
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return null;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return {
      imageData: canvas.toDataURL("image/jpeg", 0.58),
      width: canvas.width,
      height: canvas.height,
    };
  }

  async function pushPublisherSnapshot() {
    if (state.publisher.snapshotPushing) {
      return;
    }

    if (!state.publisher.streamKey || !STATE?.camera?.active || STATE.camera.mode === "remote") {
      clearPublisherSnapshotLoop();
      return;
    }

    syncPublisherSnapshotVideo();
    const frame = capturePublisherSnapshot();
    if (!frame?.imageData) {
      schedulePublisherSnapshotLoop(420);
      return;
    }

    state.publisher.snapshotPushing = true;
    try {
      await apiPost("push_camera_stream_snapshot", {
        stream_key: state.publisher.streamKey,
        image_data: frame.imageData,
        width: frame.width,
        height: frame.height,
      }, {
        key: null,
        refresh: false,
        timeout: 7000,
        silentError: true,
      });
    } finally {
      state.publisher.snapshotPushing = false;
      schedulePublisherSnapshotLoop();
    }
  }

  function clearViewerSnapshotLoop() {
    if (!state.viewer.snapshotTimer) return;
    clearTimeout(state.viewer.snapshotTimer);
    state.viewer.snapshotTimer = null;
  }

  function scheduleViewerSnapshotLoop(delay = SNAPSHOT_PULL_INTERVAL) {
    clearViewerSnapshotLoop();
    if (!state.viewer.streamKey) {
      return;
    }
    state.viewer.snapshotTimer = setTimeout(() => {
      pullViewerSnapshot().catch(() => {});
    }, Math.max(450, delay));
  }

  async function pullViewerSnapshot() {
    if (!state.viewer.streamKey) {
      clearViewerSnapshotLoop();
      return;
    }

    const result = await apiPost("get_camera_stream_snapshot", {
      stream_key: state.viewer.streamKey,
    }, {
      key: null,
      refresh: false,
      timeout: 6500,
      silentError: true,
    });

    if (result?.success && !result.session) {
      await stopWatching({ notifyServer: false, silent: true });
      setViewerMeta("Source live sudah berakhir, jadi viewer dihentikan otomatis.", "warn");
      return;
    }

    if (result?.success && result.snapshot?.data_url) {
      const snapshotAt = String(result.snapshot.updated_at || "");
      state.viewer.fallbackSnapshotAt = snapshotAt;
      state.viewer.fallbackActive = true;
      applyViewerSnapshot(result.snapshot);
      if (!state.viewer.remoteTrackReady || !state.viewer.remoteStream) {
        setViewerMeta("Viewer memakai relay frame dari source utama. Pantauan tetap jalan saat koneksi live penuh belum stabil.", "warn");
      }
    }

    scheduleViewerSnapshotLoop();
  }

  function updateButtons() {
    const startBtn = document.getElementById("btnStartLiveCamera");
    const stopBtn = document.getElementById("btnStopLiveCamera");
    const stopWatchBtn = document.getElementById("btnStopWatchingLive");
    const publisherBusy = state.publisher.starting || state.publisher.stopping;
    const viewerBusy = state.viewer.joining || state.viewer.stopping;

    if (startBtn) {
      startBtn.disabled = !state.featureReady || !STATE.camera.active || !!state.publisher.streamKey || publisherBusy || viewerBusy;
      startBtn.style.display = state.publisher.streamKey ? "none" : "";
    }
    if (stopBtn) {
      stopBtn.style.display = state.publisher.streamKey ? "" : "none";
      stopBtn.disabled = publisherBusy;
    }
    if (stopWatchBtn) {
      stopWatchBtn.style.display = state.viewer.streamKey ? "" : "none";
      stopWatchBtn.disabled = viewerBusy;
    }
  }

  function syncSessionSummary(session) {
    if (!session || !session.stream_key) return;
    const streamKey = String(session.stream_key);
    const nextSessions = Array.isArray(state.sessions) ? [...state.sessions] : [];
    const existingIndex = nextSessions.findIndex((item) => String(item?.stream_key || "") === streamKey);

    if (session.status === "ended") {
      if (existingIndex >= 0) {
        nextSessions.splice(existingIndex, 1);
      }
    } else if (existingIndex >= 0) {
      nextSessions[existingIndex] = { ...nextSessions[existingIndex], ...session };
    } else {
      nextSessions.unshift(session);
    }

    state.sessions = nextSessions.slice(0, 12);
    STATE.camera.live.sessions = state.sessions;
    if (typeof renderCameraDeviceSelect === "function") {
      renderCameraDeviceSelect();
    }
    renderSessionList();
    updateButtons();
  }

  function removeSessionSummary(streamKey) {
    const normalizedKey = String(streamKey || "").trim();
    if (!normalizedKey) return;
    state.sessions = (Array.isArray(state.sessions) ? state.sessions : [])
      .filter((session) => String(session?.stream_key || "") !== normalizedKey);
    STATE.camera.live.sessions = state.sessions;
    if (typeof renderCameraDeviceSelect === "function") {
      renderCameraDeviceSelect();
    }
    renderSessionList();
    updateButtons();
  }

  function renderSessionList(message = "") {
    const host = document.getElementById("cameraLiveSessionList");
    if (!host) return;

    if (!state.featureReady) {
      host.innerHTML = `<div class="cv-live-empty">Sinkron source kamera belum aktif di server ini.</div>`;
      return;
    }

    if (message) {
      host.innerHTML = `<div class="cv-live-empty">${escHtml(message)}</div>`;
      return;
    }

    if (!state.sessions.length) {
      host.innerHTML = `<div class="cv-live-empty">Belum ada siaran aktif di akun ini.</div>`;
      return;
    }

    host.innerHTML = state.sessions.map((session) => {
      const statusLabelMap = {
        awaiting_viewer: "Menunggu monitor",
        connecting: "Menyambungkan",
        live: "Sedang live",
        ended: "Berakhir",
        idle: "Idle",
      };
      const actionBusy = state.publisher.starting || state.publisher.stopping || state.viewer.joining || state.viewer.stopping;
      let actionLabel = "Pantau Live";
      let actionDisabled = actionBusy;
      let action = `cameraLive.watchSession('${String(session.stream_key).replace(/'/g, "\\'")}')`;

      if (session.is_owner) {
        actionLabel = state.publisher.streamKey === session.stream_key ? "Sedang Disiarkan" : "Sesi Browser Ini";
        actionDisabled = true;
      } else if (session.is_viewer && state.viewer.streamKey === session.stream_key) {
        actionLabel = "Sedang Ditonton";
        actionDisabled = true;
      } else if (session.is_busy) {
        actionLabel = "Sedang Dipantau";
        actionDisabled = true;
      }

      const viewerMeta = session.viewer_name
        ? `Dipantau: ${session.viewer_name}`
        : "Belum ada viewer";

      return `
        <div class="cv-live-session-item">
          <div class="cv-live-session-main">
            <div class="cv-live-session-title">${escHtml(session.publisher_name || "Browser Camera")}</div>
            <div class="cv-live-session-sub">${escHtml(session.source_label || "Kamera browser aktif")}</div>
            <div class="cv-live-session-meta">${escHtml(viewerMeta)}</div>
          </div>
          <div class="cv-live-session-side">
            <span class="cv-live-session-badge">${escHtml(statusLabelMap[session.status] || session.status || "Aktif")}</span>
            <button class="btn-secondary btn-sm" ${actionDisabled ? "disabled" : `onclick="${action}"`}>
              ${escHtml(actionLabel)}
            </button>
          </div>
        </div>
      `;
    }).join("");
  }

  function buildPublisherPeer() {
    const pc = new RTCPeerConnection(RTC_CONFIG);
    const localStream = STATE.camera.stream;

    if (localStream) {
      localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));
    }

    pc.onicecandidate = (event) => {
      if (!event.candidate || !state.publisher.streamKey) return;
      apiPost("push_camera_stream_candidate", {
        stream_key: state.publisher.streamKey,
        candidate: event.candidate.toJSON ? event.candidate.toJSON() : event.candidate,
      }, {
        key: null,
        refresh: false,
        timeout: 4000,
        silentError: true,
      }).catch(() => {});
    };

    pc.onconnectionstatechange = () => {
      if (!state.publisher.streamKey) return;
      const conn = pc.connectionState;
      if (conn === "connected") {
        clearPublisherRecovery();
        setStatusChip("Live Tersambung", "ok");
        setPublisherMeta("Monitor berhasil tersambung. Saat ini satu viewer aktif didukung untuk tiap siaran.");
      } else if (["failed", "disconnected"].includes(conn)) {
        setPublisherMeta("Koneksi monitor terputus. Source live sedang disiapkan ulang otomatis.");
        if (state.publisher.answerApplied) {
          schedulePublisherRecovery("Koneksi monitor terputus. Source live disiapkan ulang otomatis.", 1400);
        }
      }
    };

    return pc;
  }

  function buildViewerPeer() {
    const pc = new RTCPeerConnection(RTC_CONFIG);

    pc.ontrack = (event) => {
      const stream = event.streams?.[0] || null;
      if (stream) {
        state.viewer.remoteTrackReady = true;
        state.viewer.fallbackActive = false;
        state.viewer.remoteStream = stream;
        updateRemoteStage(stream);
      }
    };

    pc.onicecandidate = (event) => {
      if (!event.candidate || !state.viewer.streamKey) return;
      apiPost("push_camera_stream_candidate", {
        stream_key: state.viewer.streamKey,
        candidate: event.candidate.toJSON ? event.candidate.toJSON() : event.candidate,
      }, {
        key: null,
        refresh: false,
        timeout: 4000,
        silentError: true,
      }).catch(() => {});
    };

    pc.onconnectionstatechange = () => {
      const conn = pc.connectionState;
      if (conn === "connected") {
        state.viewer.remoteTrackReady = true;
        setViewerMeta("Viewer live tersambung. Device ini sedang memantau stream device lain pada akun yang sama.", "ok");
      } else if (["failed", "disconnected"].includes(conn)) {
        state.viewer.remoteTrackReady = false;
        state.viewer.remoteStream = null;
        updateRemoteStage(null);
        if (state.viewer.fallbackActive) {
          setViewerMeta("Koneksi live penuh terputus. Viewer otomatis lanjut memakai relay frame dari source utama.", "warn");
        } else {
          setViewerMeta("Koneksi viewer terputus. Sedang menunggu relay frame atau pilih sesi lagi jika perlu.", "warn");
        }
      }
    };

    return pc;
  }

  function clearPublisherPoll() {
    if (!state.publisher.pollTimer) return;
    clearTimeout(state.publisher.pollTimer);
    state.publisher.pollTimer = null;
  }

  function clearPublisherRecovery() {
    if (!state.publisher.recoverTimer) return;
    clearTimeout(state.publisher.recoverTimer);
    state.publisher.recoverTimer = null;
  }

  async function recoverPublisherSession(reason = "Menyiapkan ulang source live...") {
    if (state.publisher.starting || state.publisher.stopping) return false;
    if (!STATE.camera.active || !STATE.camera.stream) return false;

    clearPublisherRecovery();
    setStatusChip("Menyiapkan Ulang", "warn");
    setPublisherMeta(reason);

    await stopPublishing({ notifyServer: false, silent: true });
    return startPublishing({ silent: true });
  }

  function schedulePublisherRecovery(reason, delay = 1200) {
    if (state.publisher.recoverTimer || state.publisher.starting || state.publisher.stopping) return;
    state.publisher.recoverTimer = setTimeout(() => {
      state.publisher.recoverTimer = null;
      recoverPublisherSession(reason).catch(() => {});
    }, delay);
  }

  function clearViewerPoll() {
    if (!state.viewer.pollTimer) return;
    clearTimeout(state.viewer.pollTimer);
    state.viewer.pollTimer = null;
  }

  function schedulePublisherPoll() {
    clearPublisherPoll();
    if (!state.publisher.streamKey) return;
    state.publisher.pollTimer = setTimeout(() => {
      pollPublisher().catch(() => {});
    }, POLL_INTERVAL);
  }

  function scheduleViewerPoll() {
    clearViewerPoll();
    if (!state.viewer.streamKey) return;
    state.viewer.pollTimer = setTimeout(() => {
      pollViewer().catch(() => {});
    }, POLL_INTERVAL);
  }

  async function refreshSessions(options = {}) {
    if (!options.force && !isCameraViewVisible() && !state.publisher.streamKey && !state.viewer.streamKey) {
      return null;
    }

    if (state.refreshPromise) {
      return state.refreshPromise;
    }

    state.refreshPromise = apiPost("get_camera_stream_sessions", {}, {
      key: null,
      refresh: false,
      timeout: 6000,
      silentError: true,
    }).then((result) => {
      if (!result) return result;
      if (result.success === false) {
        if (result.feature_ready === false) {
          state.featureReady = false;
          STATE.camera.live.featureReady = false;
          setStatusChip("Butuh SQL", "warn");
          renderSessionList(result.error || "Sinkron source kamera belum aktif di server ini.");
          updateButtons();
        }
        return result;
      }

      state.featureReady = result.feature_ready !== false;
      STATE.camera.live.featureReady = state.featureReady;
      state.sessions = Array.isArray(result.sessions) ? result.sessions : [];
      STATE.camera.live.sessions = state.sessions;
      const ownedSession = state.sessions.find((session) => session?.is_owner) || null;
      const canAutoPublish = !!STATE?.camera?.active
        && STATE.camera.mode !== "remote"
        && !!STATE.camera.stream;

      if (ownedSession?.stream_key) {
        state.publisher.streamKey = String(ownedSession.stream_key);
        STATE.camera.live.publishedStreamKey = state.publisher.streamKey;
        schedulePublisherSnapshotLoop(500);
      } else if (canAutoPublish && state.featureReady && !state.publisher.starting && !state.publisher.stopping) {
        schedulePublisherRecovery("Source live sedang dipulihkan otomatis.", 300);
      } else {
        clearPublisherSnapshotLoop();
      }

      if (typeof renderCameraDeviceSelect === "function") {
        renderCameraDeviceSelect();
      }

      if (result.error && !state.featureReady) {
        setStatusChip("Butuh SQL", "warn");
        renderSessionList(result.error);
        updateButtons();
        return result;
      }

      if (!state.publisher.streamKey && !state.viewer.streamKey) {
        setStatusChip("Siap", "muted");
      }

      renderSessionList();
      updateButtons();
      return result;
    }).finally(() => {
      state.refreshPromise = null;
    });

    return state.refreshPromise;
  }

  async function stopPublishing(options = {}) {
    if (state.publisher.stopping) return;

    const notifyServer = options.notifyServer !== false;
    const silent = options.silent === true;
    const streamKey = state.publisher.streamKey;

    state.publisher.stopping = true;
    updateButtons();

    try {
      clearPublisherPoll();
      clearPublisherRecovery();
      clearPublisherSnapshotLoop();
      if (state.publisher.pc) {
        try { state.publisher.pc.close(); } catch (_) {}
      }

      state.publisher.pc = null;
      state.publisher.streamKey = "";
      state.publisher.lastCandidateId = 0;
      state.publisher.answerApplied = false;
      state.publisher.snapshotPushing = false;
      if (state.publisher.snapshotVideo) {
        try { state.publisher.snapshotVideo.pause(); } catch (_) {}
        state.publisher.snapshotVideo.srcObject = null;
      }
      state.publisher.starting = false;
      state.publisher.startPromise = null;
      STATE.camera.live.publishedStreamKey = "";

      if (notifyServer && streamKey) {
        await apiPost("stop_camera_stream", { stream_key: streamKey }, {
          key: "stop_camera_stream_publisher",
          refresh: false,
          timeout: 5000,
          silentError: true,
        }).catch(() => {});
      }

      removeSessionSummary(streamKey);
      setStatusChip("Siap", "muted");
      setPublisherMeta("Gunakan tombol ini agar device lain pada akun yang sama bisa memantau stream browser ini.");

      if (!silent) {
        showToast("Siaran live dihentikan", "info");
      }
    } finally {
      state.publisher.stopping = false;
      updateButtons();
    }
  }

  async function startPublishing(options = {}) {
    if (state.publisher.streamKey) return true;
    if (state.publisher.startPromise) return state.publisher.startPromise;
    const silent = options.silent === true;

    clearPublisherRecovery();
    state.publisher.starting = true;
    updateButtons();
    setStatusChip("Menyiapkan Live", "warn");
    setPublisherMeta("Menyiapkan sesi live kamera untuk device lain pada akun yang sama...");

    const startTask = (async () => {
      try {
        await refreshSessions({ force: true });
        if (!state.featureReady) {
          if (!silent) showToast("Sinkron source kamera belum aktif di server ini.", "error");
          return false;
        }

        if (!STATE.camera.active || !STATE.camera.stream) {
          if (typeof startCamera !== "function") return false;
          const ok = await startCamera();
          if (!ok) return false;
        }

        const pc = buildPublisherPeer();
        state.publisher.pc = pc;
        state.publisher.lastCandidateId = 0;
        state.publisher.answerApplied = false;

        try {
          const offer = await pc.createOffer({ offerToReceiveAudio: false, offerToReceiveVideo: true });
          await pc.setLocalDescription(offer);

          const result = await apiPost("start_camera_stream", {
            offer_sdp: pc.localDescription?.sdp || "",
            source_label: typeof getSelectedCameraDeviceLabel === "function" ? getSelectedCameraDeviceLabel() : "",
            publisher_name: STATE.camera.displayName || STATE.camera.sessionLabel || "Browser Camera",
          }, {
            key: "start_camera_stream",
            refresh: false,
            timeout: 10000,
          });

          if (!result?.success) {
            throw new Error(result?.error || "Gagal memulai siaran live");
          }

          state.publisher.streamKey = result.stream_key || result.session?.stream_key || "";
          STATE.camera.live.publishedStreamKey = state.publisher.streamKey;
          syncSessionSummary(result.session || null);
          setStatusChip("Menunggu Monitor", "live");
          setPublisherMeta("Siaran aktif. Device lain pada akun ini bisa memilih sesi ini lalu klik Pantau Live.");
          schedulePublisherSnapshotLoop(320);
          schedulePublisherPoll();
          if (!silent) showToast("Siaran live kamera dimulai", "success");
          return true;
        } catch (error) {
          try { pc.close(); } catch (_) {}
          state.publisher.pc = null;
          state.publisher.streamKey = "";
          clearPublisherSnapshotLoop();
          setStatusChip("Siap", "muted");
          setPublisherMeta(error?.message || "Gagal memulai siaran live.");
          if (!silent) showToast(error?.message || "Gagal memulai siaran live", "error");
          return false;
        }
      } finally {
        state.publisher.starting = false;
        state.publisher.startPromise = null;
        updateButtons();
      }
    })();

    state.publisher.startPromise = startTask;
    return startTask;
  }

  async function pollPublisher() {
    if (!state.publisher.streamKey || !state.publisher.pc) return;

    const result = await apiPost("poll_camera_stream_updates", {
      stream_key: state.publisher.streamKey,
      last_candidate_id: state.publisher.lastCandidateId || 0,
    }, {
      key: "poll_camera_stream_updates_publisher",
      refresh: false,
      timeout: 4500,
      silentError: true,
    });

    if (!result?.success) {
      schedulePublisherPoll();
      schedulePublisherSnapshotLoop();
      return;
    }

    state.featureReady = result.feature_ready !== false;
    const session = result.session || null;

    if (!session || session.status === "ended") {
      await stopPublishing({ notifyServer: false, silent: true });
      if (STATE.camera.active && STATE.camera.stream) {
        setPublisherMeta("Sesi live berakhir. Source live sedang disiapkan ulang otomatis.");
        schedulePublisherRecovery("Sesi live berakhir. Source live disiapkan ulang otomatis.", 500);
      } else {
        setPublisherMeta("Sesi live berakhir. Klik Siarkan Live lagi untuk memulai ulang.");
      }
      return;
    }

    const candidates = Array.isArray(result.candidates) ? result.candidates : [];
    for (const item of candidates) {
      state.publisher.lastCandidateId = Math.max(state.publisher.lastCandidateId, Number(item.id) || 0);
      if (!item.candidate) continue;
      try {
        await state.publisher.pc.addIceCandidate(item.candidate);
      } catch (_) {}
    }

    if (result.answer_sdp && !state.publisher.answerApplied) {
      try {
        await state.publisher.pc.setRemoteDescription({ type: "answer", sdp: result.answer_sdp });
        state.publisher.answerApplied = true;
        clearPublisherRecovery();
        setStatusChip("Live Tersambung", "ok");
      } catch (_) {
        await stopPublishing({ notifyServer: false, silent: true });
        if (STATE.camera.active && STATE.camera.stream) {
          setPublisherMeta("Answer viewer tidak valid. Source live sedang disiapkan ulang otomatis.");
          schedulePublisherRecovery("Answer viewer tidak valid. Source live disiapkan ulang otomatis.", 500);
        } else {
          setPublisherMeta("Answer viewer tidak valid. Klik Siarkan Live lagi untuk membuat sesi baru.");
        }
        return;
      }
    }

    if (state.publisher.answerApplied && session.status === "awaiting_viewer") {
      setStatusChip("Menunggu Monitor", "live");
      setPublisherMeta("Viewer keluar. Source live tetap aktif dan sedang disiapkan ulang otomatis.");
      schedulePublisherRecovery("Viewer keluar. Source live disiapkan ulang otomatis.", 300);
      return;
    }

    if (!state.publisher.answerApplied) {
      setStatusChip(session.viewer_camera_key ? "Menyambungkan" : "Menunggu Monitor", session.viewer_camera_key ? "warn" : "live");
    }

    syncSessionSummary(session);
    schedulePublisherSnapshotLoop();
    schedulePublisherPoll();
  }

  async function stopWatching(options = {}) {
    if (state.viewer.stopping) return;

    const notifyServer = options.notifyServer !== false;
    const silent = options.silent === true;
    const streamKey = state.viewer.streamKey;

    state.viewer.stopping = true;
    updateButtons();

    try {
      clearViewerPoll();
      clearViewerSnapshotLoop();
      if (state.viewer.pc) {
        try { state.viewer.pc.close(); } catch (_) {}
      }

      state.viewer.pc = null;
      state.viewer.streamKey = "";
      state.viewer.lastCandidateId = 0;
      state.viewer.remoteStream = null;
      state.viewer.remoteTrackReady = false;
      state.viewer.joining = false;
      state.viewer.joinPromise = null;
      state.viewer.lastError = "";
      state.viewer.fallbackActive = false;
      state.viewer.fallbackSnapshotAt = "";
      STATE.camera.live.watchedStreamKey = "";
      applyViewerSnapshot(null);
      updateRemoteStage(null);
      setViewerMeta("Mode ini menonton stream device lain pada akun yang sama.");

      if (notifyServer && streamKey) {
        await apiPost("stop_camera_stream", { stream_key: streamKey }, {
          key: "stop_camera_stream_viewer",
          refresh: false,
          timeout: 5000,
          silentError: true,
        }).catch(() => {});
      }

      refreshSessions({ force: true }).catch(() => {});
      if (!silent) {
        showToast("Mode monitor dihentikan", "info");
      }
    } finally {
      state.viewer.stopping = false;
      updateButtons();
    }
  }

  async function watchSession(streamKey, options = {}) {
    if (!streamKey) return false;
    if (state.viewer.streamKey === streamKey) return true;
    if (state.viewer.joinPromise) return state.viewer.joinPromise;
    const silent = options.silent === true;

    state.viewer.lastError = "";
    state.viewer.joining = true;
    updateButtons();
    setViewerMeta("Menyambungkan viewer live ke sesi yang dipilih...", "muted");

    const joinTask = (async () => {
      try {
        await refreshSessions({ force: true });
        if (!state.featureReady) {
          state.viewer.lastError = "Sinkron source kamera belum aktif di server ini.";
          if (!silent) showToast("Sinkron source kamera belum aktif di server ini.", "error");
          return false;
        }

        if (state.viewer.streamKey) {
          await stopWatching({ notifyServer: true, silent: true });
        }

        const join = await apiPost("join_camera_stream", { stream_key: streamKey }, {
          key: "join_camera_stream",
          refresh: false,
          timeout: 9000,
        });
        if (!join?.success) {
          state.viewer.lastError = join?.error || "Gagal masuk ke sesi live";
          if (!silent) showToast(join?.error || "Gagal masuk ke sesi live", "error");
          return false;
        }

        const offerSdp = join.offer_sdp || "";
        state.viewer.streamKey = streamKey;
        state.viewer.lastCandidateId = 0;
        state.viewer.remoteTrackReady = false;
        state.viewer.fallbackActive = false;
        state.viewer.fallbackSnapshotAt = "";
        STATE.camera.live.watchedStreamKey = streamKey;
        scheduleViewerSnapshotLoop(260);

        if (!offerSdp) {
          state.viewer.lastError = "Offer stream belum siap. Viewer memakai relay frame dulu.";
          state.viewer.fallbackActive = true;
          syncSessionSummary(join.session || null);
          setViewerMeta("Offer live belum siap. Viewer memakai relay frame dari source utama dulu.", "warn");
          scheduleViewerPoll();
          if (!silent) showToast("Viewer menunggu WebRTC dan memakai relay frame dulu", "info");
          return true;
        }

        const pc = buildViewerPeer();
        state.viewer.pc = pc;

        try {
          if (offerSdp) {
            await pc.setRemoteDescription({ type: "offer", sdp: offerSdp });
          }
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);

          const answerResult = await apiPost("submit_camera_stream_answer", {
            stream_key: streamKey,
            answer_sdp: pc.localDescription?.sdp || "",
          }, {
            key: "submit_camera_stream_answer",
            refresh: false,
            timeout: 9000,
          });

          if (!answerResult?.success) {
            throw new Error(answerResult?.error || "Gagal mengirim answer viewer");
          }

          setViewerMeta(`Sedang memantau ${join.session?.publisher_name || "kamera live"}${join.session?.source_label ? ` - ${join.session.source_label}` : ""}.`, "ok");
          state.viewer.lastError = "";
          syncSessionSummary(answerResult.session || join.session || null);
          setTimeout(() => {
            if (state.viewer.streamKey === streamKey && !state.viewer.remoteTrackReady) {
              state.viewer.fallbackActive = true;
              setViewerMeta("Koneksi live penuh masih disiapkan. Viewer memakai relay frame dari source utama dulu.", "warn");
            }
          }, SNAPSHOT_TRACK_WAIT_MS);
          scheduleViewerPoll();
          if (!silent) showToast("Live monitor terhubung", "success");
          return true;
        } catch (error) {
          try { pc.close(); } catch (_) {}
          state.viewer.pc = null;
          state.viewer.remoteTrackReady = false;
          state.viewer.lastError = error?.message || "Koneksi live penuh belum stabil.";
          state.viewer.fallbackActive = true;
          syncSessionSummary(join.session || null);
          setViewerMeta("WebRTC belum stabil. Viewer otomatis lanjut memakai relay frame dari source utama.", "warn");
          scheduleViewerPoll();
          if (!silent) showToast("Viewer beralih ke relay frame karena koneksi live penuh belum stabil", "info");
          return true;
        }
      } finally {
        state.viewer.joining = false;
        state.viewer.joinPromise = null;
        updateButtons();
      }
    })();

    state.viewer.joinPromise = joinTask;
    return joinTask;
  }

  async function pollViewer() {
    if (!state.viewer.streamKey || !state.viewer.pc) return;

    const result = await apiPost("poll_camera_stream_updates", {
      stream_key: state.viewer.streamKey,
      last_candidate_id: state.viewer.lastCandidateId || 0,
    }, {
      key: "poll_camera_stream_updates_viewer",
      refresh: false,
      timeout: 4500,
      silentError: true,
    });

    if (!result?.success) {
      scheduleViewerPoll();
      return;
    }

    const session = result.session || null;
    if (!session || session.status === "ended" || !session.is_viewer) {
      await stopWatching({ notifyServer: false, silent: true });
      setViewerMeta("Siaran live berakhir atau viewer ini dilepas dari sesi.", "warn");
      return;
    }

    const candidates = Array.isArray(result.candidates) ? result.candidates : [];
    for (const item of candidates) {
      state.viewer.lastCandidateId = Math.max(state.viewer.lastCandidateId, Number(item.id) || 0);
      if (!item.candidate) continue;
      try {
        await state.viewer.pc.addIceCandidate(item.candidate);
      } catch (_) {}
    }

    syncSessionSummary(session);
    scheduleViewerSnapshotLoop();
    scheduleViewerPoll();
  }

  function startRefreshLoop() {
    if (state.refreshTimer) return;
    state.refreshTimer = setInterval(() => {
      refreshSessions({ force: false }).catch(() => {});
    }, REFRESH_INTERVAL);
  }

  function onCameraStateChange(isActive) {
    updateButtons();
    if (!isActive && state.publisher.streamKey) {
      stopPublishing({ notifyServer: true, silent: true }).catch(() => {});
    } else if (isActive && state.publisher.streamKey) {
      syncPublisherSnapshotVideo();
      schedulePublisherSnapshotLoop(260);
    }
  }

  function initialize() {
    if (state.initialized) {
      updateButtons();
      if (isCameraViewVisible() || state.publisher.streamKey || state.viewer.streamKey) {
        refreshSessions({ force: true }).catch(() => {});
      }
      return;
    }

    state.initialized = true;
    renderSessionList("Memuat sesi live...");
    updateButtons();
    startRefreshLoop();

    if (isCameraViewVisible() || state.publisher.streamKey || state.viewer.streamKey) {
      refreshSessions({ force: true }).catch(() => {});
    }
  }

  return {
    initialize,
    refreshSessions,
    startPublishing,
    stopPublishing,
    watchSession,
    stopWatching,
    onCameraStateChange,
    isPublishing() {
      return !!state.publisher.streamKey;
    },
    isWatching() {
      return !!state.viewer.streamKey;
    },
    getLastViewerError() {
      return state.viewer.lastError || "";
    },
  };
})();

window.cameraLive = cameraLive;

function initCameraLive() {
  if (initCameraLive._initialized) return;
  initCameraLive._initialized = true;
  if (typeof cameraLive !== "undefined" && typeof cameraLive.initialize === "function") {
    cameraLive.initialize();
  }
}

window.initCameraLive = initCameraLive;

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initCameraLive);
} else {
  initCameraLive();
}
