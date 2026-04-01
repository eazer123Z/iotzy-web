const cameraLive = (() => {
  const RTC_CONFIG = {
    iceServers: [
      { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] },
    ],
  };
  const REFRESH_INTERVAL = 4000;
  const POLL_INTERVAL = 1200;

  const state = {
    featureReady: true,
    sessions: [],
    refreshTimer: null,
    publisher: {
      pc: null,
      streamKey: "",
      lastCandidateId: 0,
      answerApplied: false,
      pollTimer: null,
    },
    viewer: {
      pc: null,
      streamKey: "",
      lastCandidateId: 0,
      pollTimer: null,
      remoteStream: null,
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
    const video = document.getElementById("cameraLiveRemoteVideo");
    const placeholder = document.getElementById("cameraLiveViewerPlaceholder");
    if (!video || !placeholder) return;

    if (stream) {
      video.srcObject = stream;
      video.style.display = "";
      placeholder.style.display = "none";
      video.play().catch(() => {});
    } else {
      try {
        if (video.srcObject && video.srcObject.getTracks) {
          video.srcObject.getTracks().forEach((track) => track.stop());
        }
      } catch (_) {}
      video.srcObject = null;
      video.style.display = "none";
      placeholder.style.display = "";
    }
  }

  function updateButtons() {
    const startBtn = document.getElementById("btnStartLiveCamera");
    const stopBtn = document.getElementById("btnStopLiveCamera");
    const stopWatchBtn = document.getElementById("btnStopWatchingLive");

    if (startBtn) {
      startBtn.disabled = !state.featureReady || !STATE.camera.active || !!state.publisher.streamKey;
      startBtn.style.display = state.publisher.streamKey ? "none" : "";
    }
    if (stopBtn) {
      stopBtn.style.display = state.publisher.streamKey ? "" : "none";
    }
    if (stopWatchBtn) {
      stopWatchBtn.style.display = state.viewer.streamKey ? "" : "none";
    }
  }

  function renderSessionList(message = "") {
    const host = document.getElementById("cameraLiveSessionList");
    if (!host) return;

    if (!state.featureReady) {
      host.innerHTML = `<div class="cv-live-empty">Fitur live camera butuh migrasi tabel SQL baru terlebih dahulu.</div>`;
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
      let actionLabel = "Pantau Live";
      let actionDisabled = false;
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
        setStatusChip("Live Tersambung", "ok");
        setPublisherMeta("Monitor berhasil tersambung. Saat ini satu sesi viewer aktif didukung untuk tiap siaran.");
      } else if (["failed", "disconnected"].includes(conn)) {
        setPublisherMeta("Koneksi monitor terputus. Klik Siarkan Live lagi jika ingin menyambung ulang.");
      }
    };

    return pc;
  }

  function buildViewerPeer() {
    const pc = new RTCPeerConnection(RTC_CONFIG);

    pc.ontrack = (event) => {
      const stream = event.streams?.[0] || null;
      if (stream) {
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
        setViewerMeta("Viewer live tersambung. Anda sedang memantau stream device lain pada akun ini.", "ok");
      } else if (["failed", "disconnected"].includes(conn)) {
        setViewerMeta("Koneksi viewer terputus. Pilih sesi live lagi jika perlu.", "warn");
      }
    };

    return pc;
  }

  function clearPublisherPoll() {
    if (state.publisher.pollTimer) {
      clearTimeout(state.publisher.pollTimer);
      state.publisher.pollTimer = null;
    }
  }

  function clearViewerPoll() {
    if (state.viewer.pollTimer) {
      clearTimeout(state.viewer.pollTimer);
      state.viewer.pollTimer = null;
    }
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
      return;
    }

    const result = await apiPost("get_camera_stream_sessions", {}, {
      key: "get_camera_stream_sessions",
      refresh: false,
      timeout: 6000,
      silentError: true,
    });

    if (!result) return;

    state.featureReady = result.feature_ready !== false;
    STATE.camera.live.featureReady = state.featureReady;
    state.sessions = Array.isArray(result.sessions) ? result.sessions : [];
    STATE.camera.live.sessions = state.sessions;

    if (result.error && !state.featureReady) {
      setStatusChip("Butuh SQL", "warn");
      renderSessionList(result.error);
      updateButtons();
      return;
    }

    if (!state.publisher.streamKey && !state.viewer.streamKey) {
      setStatusChip("Siap", "muted");
    }

    renderSessionList();
    updateButtons();
  }

  async function stopPublishing(options = {}) {
    const notifyServer = options.notifyServer !== false;
    const silent = options.silent === true;
    const streamKey = state.publisher.streamKey;

    clearPublisherPoll();
    if (state.publisher.pc) {
      try { state.publisher.pc.close(); } catch (_) {}
    }

    state.publisher.pc = null;
    state.publisher.streamKey = "";
    state.publisher.lastCandidateId = 0;
    state.publisher.answerApplied = false;
    STATE.camera.live.publishedStreamKey = "";

    if (notifyServer && streamKey) {
      await apiPost("stop_camera_stream", { stream_key: streamKey }, {
        key: "stop_camera_stream_publisher",
        refresh: false,
        timeout: 5000,
        silentError: true,
      }).catch(() => {});
    }

    setStatusChip("Siap", "muted");
    setPublisherMeta("Gunakan tombol ini agar device lain pada akun yang sama bisa memantau stream browser ini.");
    updateButtons();
    await refreshSessions({ force: true });

    if (!silent) {
      showToast("Siaran live dihentikan", "info");
    }
  }

  async function startPublishing() {
    await refreshSessions({ force: true });
    if (!state.featureReady) {
      showToast("Fitur live camera belum aktif. Jalankan migrasi SQL terlebih dahulu.", "error");
      return false;
    }

    if (!STATE.camera.active || !STATE.camera.stream) {
      if (typeof startCamera !== "function") return false;
      const ok = await startCamera();
      if (!ok) return false;
    }

    if (state.publisher.streamKey) {
      return true;
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
      setStatusChip("Menunggu Monitor", "live");
      setPublisherMeta("Siaran aktif. Device lain pada akun ini bisa memilih sesi ini lalu klik Pantau Live.");
      updateButtons();
      await refreshSessions({ force: true });
      schedulePublisherPoll();
      showToast("Siaran live kamera dimulai", "success");
      return true;
    } catch (error) {
      try { pc.close(); } catch (_) {}
      state.publisher.pc = null;
      state.publisher.streamKey = "";
      setPublisherMeta(error?.message || "Gagal memulai siaran live.");
      updateButtons();
      showToast(error?.message || "Gagal memulai siaran live", "error");
      return false;
    }
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
      return;
    }

    state.featureReady = result.feature_ready !== false;
    const session = result.session || null;
    if (!session || session.status === "ended") {
      await stopPublishing({ notifyServer: false, silent: true });
      setPublisherMeta("Sesi live berakhir. Klik Siarkan Live lagi untuk memulai ulang.");
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
        setStatusChip("Live Tersambung", "ok");
      } catch (_) {
        await stopPublishing({ notifyServer: false, silent: true });
        setPublisherMeta("Answer viewer tidak valid. Klik Siarkan Live lagi untuk membuat sesi baru.");
        return;
      }
    }

    if (state.publisher.answerApplied && session.status === "awaiting_viewer") {
      await stopPublishing({ notifyServer: false, silent: true });
      setPublisherMeta("Viewer keluar. Untuk koneksi baru, klik Siarkan Live lagi.");
      return;
    }

    if (!state.publisher.answerApplied) {
      setStatusChip(session.viewer_camera_key ? "Menyambungkan" : "Menunggu Monitor", session.viewer_camera_key ? "warn" : "live");
    }

    await refreshSessions({ force: false });
    schedulePublisherPoll();
  }

  async function stopWatching(options = {}) {
    const notifyServer = options.notifyServer !== false;
    const silent = options.silent === true;
    const streamKey = state.viewer.streamKey;

    clearViewerPoll();
    if (state.viewer.pc) {
      try { state.viewer.pc.close(); } catch (_) {}
    }
    state.viewer.pc = null;
    state.viewer.streamKey = "";
    state.viewer.lastCandidateId = 0;
    state.viewer.remoteStream = null;
    STATE.camera.live.watchedStreamKey = "";
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

    updateButtons();
    await refreshSessions({ force: true });
    if (!silent) {
      showToast("Mode monitor dihentikan", "info");
    }
  }

  async function watchSession(streamKey) {
    await refreshSessions({ force: true });
    if (!state.featureReady) {
      showToast("Fitur live camera belum aktif. Jalankan migrasi SQL dahulu.", "error");
      return false;
    }

    if (!streamKey) return false;
    if (state.viewer.streamKey === streamKey) return true;
    if (state.viewer.streamKey) {
      await stopWatching({ notifyServer: true, silent: true });
    }

    const join = await apiPost("join_camera_stream", { stream_key: streamKey }, {
      key: "join_camera_stream",
      refresh: false,
      timeout: 9000,
    });
    if (!join?.success) {
      showToast(join?.error || "Gagal masuk ke sesi live", "error");
      return false;
    }

    const offerSdp = join.offer_sdp || "";
    if (!offerSdp) {
      showToast("Offer stream belum siap. Coba lagi sebentar.", "error");
      return false;
    }

    const pc = buildViewerPeer();
    state.viewer.pc = pc;
    state.viewer.streamKey = streamKey;
    state.viewer.lastCandidateId = 0;
    STATE.camera.live.watchedStreamKey = streamKey;

    try {
      await pc.setRemoteDescription({ type: "offer", sdp: offerSdp });
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

      setViewerMeta(`Sedang memantau ${join.session?.publisher_name || "kamera live"}${join.session?.source_label ? ` • ${join.session.source_label}` : ""}.`, "ok");
      updateButtons();
      await refreshSessions({ force: true });
      scheduleViewerPoll();
      showToast("Live monitor terhubung", "success");
      return true;
    } catch (error) {
      try { pc.close(); } catch (_) {}
      state.viewer.pc = null;
      state.viewer.streamKey = "";
      STATE.camera.live.watchedStreamKey = "";
      setViewerMeta(error?.message || "Gagal membuka monitor live.", "warn");
      updateButtons();
      showToast(error?.message || "Gagal membuka monitor live", "error");
      return false;
    }
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

    await refreshSessions({ force: false });
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
    }
  }

  function initialize() {
    renderSessionList("Memuat sesi live...");
    updateButtons();
    startRefreshLoop();
    refreshSessions({ force: true }).catch(() => {});
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
  };
})();

window.cameraLive = cameraLive;

document.addEventListener("DOMContentLoaded", () => {
  if (typeof cameraLive !== "undefined" && typeof cameraLive.initialize === "function") {
    cameraLive.initialize();
  }
});
