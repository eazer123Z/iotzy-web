/**
 * ==================================================================================
 * CV UI MODULE (Computer Vision User Interface)
 * ==================================================================================
 * Mengelola semua aspek visual dari Computer Vision (Overlay, Bounding Boxes, dsb).
 * Menghubungkan detektor AI dengan elemen-elemen dashboard untuk interaksi user.
 */
const cvUI = (() => {

    let _initialized   = false;
    let _overlayCanvas = null;
    let _overlayCtx    = null;

    /**
     * Memulai modul UI CV: membuat elemen overlay dan mendaftarkan callback.
     */
    function initialize() {
        if (_initialized) return;
        _initialized = true;
        _createOverlay();
        _hookCallbacks();
    }

    /**
     * Membuat elemen Canvas transparan untuk menggambar kotak deteksi (Bounding Boxes).
     */
    function _createOverlay() {
        let c = document.getElementById('cvOverlayCanvas');
        if (!c) {
            c    = document.createElement('canvas');
            c.id = 'cvOverlayCanvas';
        }
        // Pastikan canvas menutupi video dan tidak menghalangi interaksi klik
        c.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:10';
        _overlayCanvas  = c;
        _overlayCtx     = c.getContext('2d');
    }

    /**
     * Menghubungkan modul UI dengan detektor CV & Analyzer Cahaya.
     */
    function _hookCallbacks() {
        if (typeof cvDetector !== 'undefined') {
            cvDetector.setCallbacks({
                _tag: 'cvUI',
                onDetectionUpdate: (d) => _onDetectionUpdate(d),
            });
        }
        if (typeof lightAnalyzer !== 'undefined') {
            lightAnalyzer.setCallbacks({
                _tag: 'cvUI',
                onBrightnessUpdate: (b, c) => _onBrightnessUpdate(b, c),
            });
        }
    }

    /**
     * Handler saat detektor mengirimkan data hasil scan frame terbaru.
     */
    function _onDetectionUpdate(data) {
        const hc = document.getElementById('cvPersonCount') || document.getElementById('cvHumanCount');
        const ps = document.getElementById('cvPresenceStatus');
        const cf = document.getElementById('cvConfidence');

        // Update statistik jumlah orang di dashboard
        if (typeof syncCVPersonCountUI === 'function') syncCVPersonCountUI(data.humanCount);
        else if (hc) hc.textContent = data.humanCount;

        if (ps) {
            ps.textContent = data.humanPresent ? 'Terdeteksi' : 'Tidak Terdeteksi';
            ps.className   = 'status-val' + (data.humanPresent ? ' ok' : ' muted');
        }

        if (cf && data.avgConfidence > 0)
            cf.textContent = (data.avgConfidence * 100).toFixed(0) + '%';

        // Gambar bounding boxes jika fitur diaktifkan di konfigurasi
        if (typeof CV_CONFIG !== 'undefined' && CV_CONFIG.ui?.showBoundingBoxes)
            _drawBoxes(data.detections);
    }

    /**
     * Menggambar kotak pembatas (Bounding Boxes) dan label nama objek pada kanvas overlay.
     */
    function _drawBoxes(detections) {
        if (!_overlayCanvas || !_overlayCtx) return;
        const video = document.getElementById('cameraFocus') || document.getElementById('camera');
        if (!video) return;

        // Sinkronisasi ukuran kanvas dengan elemen video agar koordinat akurat
        _overlayCanvas.width  = video.videoWidth  || video.offsetWidth  || 640;
        _overlayCanvas.height = video.videoHeight || video.offsetHeight || 480;
        _overlayCtx.clearRect(0, 0, _overlayCanvas.width, _overlayCanvas.height);

        const color = CV_CONFIG?.ui?.overlayColor || '#38bdf8';
        detections.forEach(d => {
            const [x, y, w, h] = d.bbox;
            // Gambar kotak luar
            _overlayCtx.strokeStyle = color;
            _overlayCtx.lineWidth   = 2;
            _overlayCtx.strokeRect(x, y, w, h);
            
            // Gambar background transparan di dalam kotak
            _overlayCtx.fillStyle = color + '14';
            _overlayCtx.fillRect(x, y, w, h);

            // Tampilkan label (e.g. "person 85%")
            const label = `${d.class} ${(d.score * 100).toFixed(0)}%`;
            _overlayCtx.font = 'bold 11px "Plus Jakarta Sans",sans-serif';
            const tw = _overlayCtx.measureText(label).width;
            
            _overlayCtx.fillStyle = color + 'dd';
            _overlayCtx.fillRect(x, y > 20 ? y - 20 : y, tw + 10, 18);
            _overlayCtx.fillStyle = '#fff';
            _overlayCtx.fillText(label, x + 5, y > 20 ? y - 5 : y + 12);
        });
    }

    /**
     * Handler update data intensitas cahaya dari Analyzer.
     */
    function _onBrightnessUpdate(brightness, condition) {
        const pct  = (brightness * 100).toFixed(1) + '%';
        const map  = { dark: '🌙 Gelap', normal: '☁️ Normal', bright: '☀️ Terang' };

        const bEl  = document.getElementById('cvBrightness');
        const blEl = document.getElementById('cvBrightnessLabel');
        const cEl  = document.getElementById('cvLightCondition');
        const bBar = document.getElementById('cvBrightnessBar');

        if (bEl)  bEl.textContent  = pct;
        if (blEl) blEl.textContent = pct;

        if (cEl) {
            cEl.textContent = map[condition] || condition;
            cEl.className   = 'status-val' + (condition === 'normal' ? ' muted' : '');
        }

        if (bBar) bBar.style.width = (brightness * 100).toFixed(1) + '%';
    }

    /**
     * Menempelkan (Append) kanvas overlay ke container video.
     */
    function attachOverlay(containerId) {
        const cont = document.getElementById(containerId);
        if (cont && _overlayCanvas && !cont.querySelector('#cvOverlayCanvas'))
            cont.appendChild(_overlayCanvas);
    }

    function removeOverlay() {
        if (_overlayCanvas?.parentNode)
            _overlayCanvas.parentNode.removeChild(_overlayCanvas);
    }

    function clearOverlay() {
        if (_overlayCtx && _overlayCanvas)
            _overlayCtx.clearRect(0, 0, _overlayCanvas.width, _overlayCanvas.height);
    }

    /**
     * Menampilkan/Update status loading sistem CV di UI.
     */
    function showLoading(msg = 'Memuat…') {
        const el = document.getElementById('cvLoadingStatus');
        if (el) {
            el.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${msg}`;
            el.classList.remove('hidden');
        }
    }

    function hideLoading() {
        document.getElementById('cvLoadingStatus')?.classList.add('hidden');
    }

    /**
     * Update teks status sistem (Siap, Memuat, Error) di panel dashboard.
     */
    function updateSystemStatus(status) {
        const el = document.getElementById('cvSystemStatus');
        if (!el) return;
        const map = {
            ready:    ['✅ Siap',           'ok'],
            loading:  ['⏳ Memuat…',        'muted'],
            error:    ['❌ Error',           ''],
            inactive: ['⚪ Tidak Aktif',     'muted'],
        };
        const [txt, cls] = map[status] || map.inactive;
        el.textContent = txt;
        el.className   = 'status-val ' + cls;
    }

    function _humanConditionLabel(condition, count) {
        const normalized = typeof normalizeHumanRuleConditionInput === 'function'
            ? normalizeHumanRuleConditionInput(condition, count)
            : { condition, count: Number.isFinite(Number(count)) ? Number(count) : 0 };
        switch (normalized.condition) {
            case 'eq': return `Sama ${normalized.count}`;
            case 'neq': return `Tidak sama ${normalized.count}`;
            case 'gt': return `Lebih dari ${normalized.count}`;
            case 'lt': return `Kurang dari ${normalized.count}`;
            default: return `${normalized.condition || 'Kondisi'} ${normalized.count}`.trim();
        }
    }

    function _humanActionLabel(action) {
        if (action === 'on') return 'Nyalakan';
        if (action === 'off') return 'Matikan';
        if (action === 'speed_high') return 'Kipas 75%';
        if (action === 'speed_mid') return 'Kipas 50%';
        if (action === 'speed_low') return 'Kipas 25%';
        return '-';
    }

    function _renderHumanRuleDeviceChoices(devices, selectedList = [], name = 'ahr_dev') {
        const selected = new Set((selectedList || []).map(String));
        return Object.keys(devices).map((id) => {
            const dev = devices[id];
            const checked = selected.has(String(id));
            return `<label class="cv-dev-cb-item ${checked ? 'checked' : ''}" style="margin-bottom:8px">
                <input type="checkbox" name="${name}" value="${id}" ${checked ? 'checked' : ''}
                    onchange="this.closest('label').classList.toggle('checked', this.checked)"
                    style="width:14px;height:14px;accent-color:var(--a);flex-shrink:0">
                <i class="fas ${dev.icon || 'fa-plug'}"></i>
                <span>${_esc(dev.name)}</span>
            </label>`;
        }).join('');
    }

    /**
     * Merender panel konfigurasi otomasi CV secara dinamis.
     * Membuat daftar perangkat dengan checkbox untuk memicu aksi.
     */
    function renderAutomationSettings() {
        const container = document.getElementById('cvAutomationSettings');
        if (!container) return;

        // Mendapatkan state terbaru perangkat dari global STATE
        const stateRef = (typeof STATE !== 'undefined' ? STATE : null)
                      || (typeof window !== 'undefined' ? window.STATE : null)
                      || {};
        const devices  = stateRef.devices || {};
        const devKeys  = Object.keys(devices);
        const rules    = _loadRules();

        if (!devKeys.length) {
            container.innerHTML = `<div class="cv-no-dev">
                <i class="fas fa-microchip" style="font-size:20px;display:block;margin-bottom:8px;opacity:.3"></i>
                Belum ada perangkat ditambahkan
            </div>`;
            return;
        }

        // Helper untuk merender list checkbox perangkat
        function devCheckboxes(selectedList, triggerId) {
            return devKeys.map(id => {
                const dev     = devices[id];
                const checked = (selectedList || []).map(String).includes(String(id));
                return `<label class="cv-dev-cb-item ${checked ? 'checked' : ''}" data-trigger="${triggerId}" data-id="${id}">
                    <input type="checkbox" value="${id}" ${checked ? 'checked' : ''}
                        onchange="cvUI.updateCVRule('${triggerId}', this)"
                        style="width:14px;height:14px;accent-color:var(--a);flex-shrink:0">
                    <i class="fas ${dev.icon || 'fa-plug'}"></i>
                    <span>${_esc(dev.name)}</span>
                </label>`;
            }).join('');
        }

        const humanR = rules.human || { enabled: true, rules: [], delay: 5000 };
        const lightR = rules.light || _defaultRules().light;

        let humanRulesHtml = '';
        if (Array.isArray(humanR.rules) && humanR.rules.length > 0) {
            humanRulesHtml = humanR.rules.map((r, i) => {
                const devsText = (r.devices || []).map(id => devices[id]?.name || id).join(', ');
                const condTxt = _humanConditionLabel(r.condition, r.count);
                const onTrueTxt = _humanActionLabel(r.onTrue);
                const onFalseTxt = _humanActionLabel(r.onFalse);
                
                return `
                <div style="background:var(--surface-2);border:1px solid var(--border);border-radius:var(--r-md);padding:12px;margin-bottom:10px;">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
                        <b>Jika jumlah orang ${condTxt}</b>
                        <button onclick="cvUI.deleteHumanRule(${i})" style="color:var(--red);background:none;border:none;cursor:pointer"><i class="fas fa-trash"></i></button>
                    </div>
                    <div style="font-size:12px;color:var(--ink-4);margin-bottom:8px">
                        Perangkat: <b>${devsText || '-'}</b>
                    </div>
                    <div style="font-size:12px;display:grid;grid-template-columns:1fr 1fr;gap:8px">
                        <div style="background:var(--green-bg);color:var(--green-dim);padding:6px;border-radius:6px;text-align:center">
                            Memenuhi: <br><b>${onTrueTxt || '-'}</b>
                        </div>
                        <div style="background:var(--red-bg);color:var(--red-dim);padding:6px;border-radius:6px;text-align:center">
                            Tidak Memenuhi: <br><b>${onFalseTxt || '-'}</b>
                        </div>
                    </div>
                </div>`;
            }).join('');
        } else {
            humanRulesHtml = `<div style="text-align:center;padding:16px;color:var(--ink-5);font-size:13px">Belum ada aturan jumlah orang.</div>`;
        }

        // Tampilan UI utama panel otomasi CV
        container.innerHTML = `
        <div class="cv-auto-section" style="margin-bottom:10px">
            <div class="cv-auto-head">
                <div>
                    <div class="cv-auto-title">
                        <i class="fas fa-users" style="color:var(--a);margin-right:6px"></i>Automasi Jumlah Orang
                    </div>
                    <div class="cv-auto-sub">Aksi berdasarkan jumlah deteksi manusia</div>
                </div>
                <label class="toggle-wrapper">
                    <input type="checkbox" class="toggle-input" id="cvHumanToggle" ${humanR.enabled ? 'checked' : ''}
                        onchange="cvUI.toggleCVRuleEnabled('human', this.checked)">
                    <span class="toggle-track"></span>
                </label>
            </div>
            <div class="cv-auto-body">
                ${humanRulesHtml}
                <button onclick="cvUI.showAddHumanRuleModal()" class="btn-primary" style="width:100%;padding:10px;margin-top:8px">
                    <i class="fas fa-plus"></i> Tambah Aturan
                </button>
            </div>
        </div>

        <div class="cv-auto-section">
            <div class="cv-auto-head">
                <div>
                    <div class="cv-auto-title">
                        <i class="fas fa-sun" style="color:var(--amber);margin-right:6px"></i>Analisis Cahaya
                    </div>
                    <div class="cv-auto-sub">Aksi berdasarkan kondisi cahaya kamera</div>
                </div>
                <label class="toggle-wrapper">
                    <input type="checkbox" class="toggle-input" id="cvLightToggle" ${lightR.enabled ? 'checked' : ''}
                        onchange="cvUI.toggleCVRuleEnabled('light', this.checked)">
                    <span class="toggle-track"></span>
                </label>
            </div>
            <div class="cv-auto-body">
                <div>
                    <span class="cv-trigger-label">
                        <i class="fas fa-moon" style="color:var(--ink-4);margin-right:4px"></i>Nyalakan saat gelap
                    </span>
                    <div class="cv-device-list" id="cvOnDarkList">
                        ${devCheckboxes(lightR.onDark, 'light_onDark')}
                    </div>
                </div>
                <div>
                    <span class="cv-trigger-label">
                        <i class="fas fa-sun" style="color:var(--amber);margin-right:4px"></i>Matikan saat terang
                    </span>
                    <div class="cv-device-list" id="cvOnBrightList">
                        ${devCheckboxes(lightR.onBright, 'light_onBright')}
                    </div>
                </div>
                <div class="cv-threshold-grid">
                    <div class="cv-field">
                        <label>🌙 Ambang Gelap</label>
                        <div style="display:flex;align-items:center;gap:8px">
                            <input type="range" id="cvDarkThreshold"
                                value="${Math.round((CV_CONFIG?.light?.darkThreshold || 0.30) * 100)}"
                                min="5" max="95" step="1"
                                style="flex:1;accent-color:var(--blue)"
                                oninput="cvUI.updateLightThreshold('dark', this.value); document.getElementById('cvDarkVal').textContent=this.value+'%'">
                            <span id="cvDarkVal" style="min-width:36px;text-align:right;font-weight:700;font-size:12px;color:var(--ink-3)">${Math.round((CV_CONFIG?.light?.darkThreshold || 0.30) * 100)}%</span>
                        </div>
                        <div style="font-size:10px;color:var(--ink-5);margin-top:2px">Kecerahan di bawah nilai ini = <b>Gelap</b></div>
                    </div>
                    <div class="cv-field">
                        <label>☀️ Ambang Terang</label>
                        <div style="display:flex;align-items:center;gap:8px">
                            <input type="range" id="cvBrightThreshold"
                                value="${Math.round((CV_CONFIG?.light?.brightThreshold || 0.70) * 100)}"
                                min="5" max="95" step="1"
                                style="flex:1;accent-color:var(--amber)"
                                oninput="cvUI.updateLightThreshold('bright', this.value); document.getElementById('cvBrightVal').textContent=this.value+'%'">
                            <span id="cvBrightVal" style="min-width:36px;text-align:right;font-weight:700;font-size:12px;color:var(--ink-3)">${Math.round((CV_CONFIG?.light?.brightThreshold || 0.70) * 100)}%</span>
                        </div>
                        <div style="font-size:10px;color:var(--ink-5);margin-top:2px">Kecerahan di atas nilai ini = <b>Terang</b></div>
                    </div>
                </div>
                <div class="cv-delay-row">
                    <span class="setting-label">Delay aksi cahaya</span>
                    <div class="fi-group">
                        <input type="number" class="fi-input" id="cvLightDelay"
                            value="${Math.round((lightR.delay || 2000) / 1000)}"
                            min="0" max="60"
                            onchange="cvUI.updateCVDelay('light', this.value)">
                        <span class="fi-unit">detik</span>
                    </div>
                </div>
            </div>
        </div>

        <button onclick="cvUI.saveCVRules()"
            class="btn-primary" style="width:100%;justify-content:center;margin-top:6px">
            <i class="fas fa-floppy-disk"></i> Simpan Pengaturan CV
        </button>`;
    }

    /**
     * Update visual status checkbox pada rule UI.
     */
    function updateCVRule(triggerKey, checkbox) {
        const label = checkbox.closest('label');
        if (label) label.classList.toggle('checked', checkbox.checked);
    }

    /**
     * Mengaktifkan/Mematikan (Enable/Disable) otomasi CV tanpa menghapus aturan.
     */
    function toggleCVRuleEnabled(type, enabled) {
        if (typeof automationEngine !== 'undefined') {
            automationEngine.updateCVRules({ [type]: { enabled } });
        }
        if (window.CV?.cvRules?.[type]) {
            window.CV.cvRules[type].enabled = enabled;
            
            // 🔥 Persist to DB (Granular Columns in user_settings)
            if (typeof apiPost === 'function') {
                const config = {
                    minConfidence: CV_CONFIG.detection.minConfidence,
                    darkThreshold: CV_CONFIG.light.darkThreshold,
                    brightThreshold: CV_CONFIG.light.brightThreshold,
                    humanEnabled: window.CV.cvRules.human.enabled,
                    lightEnabled: window.CV.cvRules.light.enabled
                };
                apiPost('save_cv_config', { config }).catch(() => {});
            }
        }
    }

    /**
     * Memperbarui durasi delay sebelum aksi otomasi dieksekusi.
     */
    function updateCVDelay(type, seconds) {
        const delay = parseInt(seconds) * 1000;
        if (typeof automationEngine !== 'undefined') {
            automationEngine.updateCVRules({ [type]: { delay } });
        }
        if (window.CV?.cvRules?.[type]) {
            window.CV.cvRules[type].delay = delay;
            // 🔥 Persist to DB
            if (typeof apiPost === 'function') {
                apiPost('save_cv_rules', { rules: window.CV.cvRules }).catch(() => {});
            }
        }
    }

    /**
     * Memperbarui batas nilai kecerahan (Threshold) untuk deteksi kondisi cahaya.
     */
    function updateLightThreshold(which, value) {
        const pct = parseInt(value);
        const normalized = pct / 100;
        if (typeof CV_CONFIG !== 'undefined') {
            if (which === 'dark')   CV_CONFIG.light.darkThreshold   = normalized;
            if (which === 'bright') CV_CONFIG.light.brightThreshold = normalized;
            
            // 🔥 Persist to DB (Dedicated CV Config API)
            if (typeof apiPost === 'function') {
                const config = {
                    minConfidence: CV_CONFIG.detection.minConfidence,
                    darkThreshold: CV_CONFIG.light.darkThreshold,
                    brightThreshold: CV_CONFIG.light.brightThreshold,
                    humanEnabled: window.CV?.cvRules?.human?.enabled ?? true,
                    lightEnabled: window.CV?.cvRules?.light?.enabled ?? true
                };
                apiPost('save_cv_config', { config }).catch(e => console.warn("Save CV Config Error:", e));
            }
        }
        if (typeof lightAnalyzer !== 'undefined') {
            lightAnalyzer.setThresholds(
                which === 'dark'   ? normalized : null,
                which === 'bright' ? normalized : null
            );
        }
    }

    /**
     * Mengambil semua nilai dari UI dan menyimpannya ke state otomasi global.
     */
    function saveCVRules() {
        const rules = _loadRules();

        rules.human.enabled  = document.getElementById('cvHumanToggle')?.checked ?? true;

        rules.light.onDark   = _getChecked('cvOnDarkList');
        rules.light.onBright = _getChecked('cvOnBrightList');
        rules.light.enabled  = document.getElementById('cvLightToggle')?.checked ?? true;
        const ld = document.getElementById('cvLightDelay');
        if (ld) rules.light.delay = parseInt(ld.value) * 1000;

        const persistPromise = typeof automationEngine !== 'undefined'
            ? automationEngine.updateCVRules(rules)
            : (typeof apiPost === 'function' ? apiPost('save_cv_rules', { rules }) : Promise.resolve({ success: true }));
        if (window.CV) window.CV.cvRules = rules;
        Promise.resolve(persistPromise)
            .then(() => { if (typeof showToast === 'function') showToast('Pengaturan CV disimpan!', 'success'); })
            .catch(() => { if (typeof showToast === 'function') showToast('Gagal simpan ke database', 'error'); });
    }

    /**
     * Menghapus aturan deteksi manusia spesifik berdasarkan index.
     */
    function deleteHumanRule(index) {
        if (!confirm('Hapus aturan ini?')) return;
        const rules = _loadRules();
        if (rules.human && rules.human.rules) {
            rules.human.rules.splice(index, 1);
            if (typeof automationEngine !== 'undefined') automationEngine.updateCVRules({ human: rules.human });
            if (window.CV) window.CV.cvRules.human = rules.human;
            renderAutomationSettings();
            if (typeof showToast === 'function') showToast('Aturan dihapus', 'info');
        }
    }

    /**
     * Menampilkan modal dialog untuk menambah aturan deteksi manusia baru.
     */
    function showAddHumanRuleModal() {
        const _id = 'cvAddHumanRuleModal';
        let modal = document.getElementById(_id);
        if (modal) modal.remove();

        const stateRef = (typeof STATE !== 'undefined' ? STATE : null) || (typeof window !== 'undefined' ? window.STATE : null) || {};
        const devices  = stateRef.devices || {};
        const devKeys  = Object.keys(devices);

        const html = `
        <div id="${_id}" class="modal-backdrop" style="position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;opacity:1;pointer-events:all">
            <div class="modal-content" style="background:var(--surface);width:90%;max-width:400px;border-radius:var(--r-xl);padding:24px;border:1px solid var(--border)">
                <h3 style="margin:0 0 16px;font-size:18px">Tambah Aturan Deteksi (Orang)</h3>
                
                <label style="display:block;margin-bottom:8px;font-size:13px;font-weight:600">Kondisi Jumlah Orang</label>
                <div style="display:flex;gap:8px;margin-bottom:16px">
                    <select id="ahr_cond" class="fi-input" style="flex:1">
                        <option value="eq">Sama</option>
                        <option value="gt">Lebih dari</option>
                        <option value="lt">Kurang dari</option>
                        <option value="neq">Tidak sama</option>
                    </select>
                    <input type="number" id="ahr_count" class="fi-input" style="width:70px" value="1" min="0" max="20">
                </div>

                <label style="display:block;margin-bottom:8px;font-size:13px;font-weight:600">Target Perangkat</label>
                <div id="ahr_dev" class="cv-device-list" style="margin-bottom:16px;max-height:180px;overflow:auto">
                    ${devKeys.length ? _renderHumanRuleDeviceChoices(devices, [], 'ahr_dev') : '<div class="muted" style="font-size:12px">Belum ada perangkat tersedia.</div>'}
                </div>

                <label style="display:block;margin-bottom:8px;font-size:13px;font-weight:600">Terpenuhi -> Aksi</label>
                <select id="ahr_true" class="fi-input" style="width:100%;margin-bottom:16px">
                    <option value="">(Tidak ada aksi)</option>
                    <option value="on">Nyalakan</option>
                    <option value="off">Matikan</option>
                    <option value="speed_low">Kipas 25%</option>
                    <option value="speed_mid">Kipas 50%</option>
                    <option value="speed_high">Kipas 75%</option>
                </select>

                <label style="display:block;margin-bottom:8px;font-size:13px;font-weight:600">Tidak Terpenuhi -> Aksi</label>
                <select id="ahr_false" class="fi-input" style="width:100%;margin-bottom:24px">
                    <option value="">(Tidak ada aksi)</option>
                    <option value="off" selected>Matikan</option>
                    <option value="on">Nyalakan</option>
                    <option value="speed_low">Kipas 25%</option>
                    <option value="speed_mid">Kipas 50%</option>
                    <option value="speed_high">Kipas 75%</option>
                </select>

                <div style="display:flex;gap:12px;justify-content:flex-end">
                    <button class="btn-secondary" onclick="document.getElementById('${_id}').remove()">Batal</button>
                    <button class="btn-primary" onclick="cvUI.addHumanRuleSubmit()">Simpan Aturan</button>
                </div>
            </div>
        </div>`;
        
        document.body.insertAdjacentHTML('beforeend', html);
    }

    /**
     * Memproses pengiriman data dari modal tambah aturan manusia.
     */
    function addHumanRuleSubmit() {
        const cond = document.getElementById('ahr_cond').value;
        const count = parseInt(document.getElementById('ahr_count').value);
        const devs = Array.from(document.querySelectorAll('#ahr_dev input[type=checkbox]:checked')).map((input) => input.value);
        const onTrue = document.getElementById('ahr_true').value;
        const onFalse = document.getElementById('ahr_false').value;

        if (devs.length === 0) {
            if (typeof showToast === 'function') showToast('Pilih minimal 1 perangkat!', 'error');
            return;
        }
        if (!Number.isFinite(count) || count < 0) {
            if (typeof showToast === 'function') showToast('Jumlah orang harus angka 0 atau lebih.', 'error');
            return;
        }

        const newRule = {
            id: Math.random().toString(36).substr(2, 9),
            condition: cond,
            count: count || 0,
            devices: devs,
            onTrue: onTrue,
            onFalse: onFalse,
            delay: 3000 // default internal delay
        };

        const rulesObj = _loadRules();
        if (!rulesObj.human) rulesObj.human = { enabled: true, rules: [], delay: 5000 };
        if (!Array.isArray(rulesObj.human.rules)) rulesObj.human.rules = [];
        
        rulesObj.human.rules.push(newRule);

        if (typeof automationEngine !== 'undefined') automationEngine.updateCVRules({ human: rulesObj.human });
        if (window.CV) window.CV.cvRules.human = rulesObj.human;
        
        document.getElementById('cvAddHumanRuleModal')?.remove();
        renderAutomationSettings();
        if (typeof showToast === 'function') showToast('Aturan berhasil ditambahkan', 'success');
    }

    function toggleCVRuleEnabled(type, enabled) {
        const nextRules = _loadRules();
        if (!nextRules[type]) nextRules[type] = {};
        nextRules[type].enabled = enabled;

        if (typeof applyCVConfigState === 'function') {
            applyCVConfigState(type === 'human' ? { humanEnabled: enabled } : { lightEnabled: enabled });
        }

        if (typeof automationEngine !== 'undefined') {
            automationEngine.updateCVRules({ [type]: { enabled } });
        } else if (window.CV) {
            window.CV.cvRules = typeof normalizeCVRulesInput === 'function'
                ? normalizeCVRulesInput(nextRules)
                : nextRules;
            if (typeof persistCVConfig === 'function') {
                persistCVConfig(type === 'human' ? { humanEnabled: enabled } : { lightEnabled: enabled }).catch(() => {});
            }
        }
    }

    function updateCVDelay(type, seconds) {
        const delay = parseInt(seconds) * 1000;
        if (typeof automationEngine !== 'undefined') {
            automationEngine.updateCVRules({ [type]: { delay } });
        } else if (window.CV?.cvRules?.[type]) {
            window.CV.cvRules[type].delay = delay;
            if (typeof saveCVRules === 'function') {
                try { saveCVRules(); } catch (_) {}
            }
        }
    }

    function saveCVRules() {
        const rules = _loadRules();

        rules.human.enabled  = document.getElementById('cvHumanToggle')?.checked ?? true;
        rules.light.onDark   = _getChecked('cvOnDarkList');
        rules.light.onBright = _getChecked('cvOnBrightList');
        rules.light.enabled  = document.getElementById('cvLightToggle')?.checked ?? true;
        const ld = document.getElementById('cvLightDelay');
        if (ld) rules.light.delay = parseInt(ld.value) * 1000;

        const persistPromise = typeof automationEngine !== 'undefined'
            ? automationEngine.updateCVRules(rules)
            : (typeof apiPost === 'function' ? apiPost('save_cv_rules', { rules }) : Promise.resolve({ success: true }));

        if (window.CV) {
            window.CV.cvRules = typeof normalizeCVRulesInput === 'function'
                ? normalizeCVRulesInput(rules)
                : rules;
        }
        Promise.resolve(persistPromise)
            .then(() => { if (typeof showToast === 'function') showToast('Pengaturan CV disimpan!', 'success'); })
            .catch(() => { if (typeof showToast === 'function') showToast('Gagal simpan ke database', 'error'); });
    }

    function addHumanRuleSubmit() {
        const cond = document.getElementById('ahr_cond').value;
        const count = parseInt(document.getElementById('ahr_count').value);
        const devs = Array.from(document.querySelectorAll('#ahr_dev input[type=checkbox]:checked')).map((input) => input.value);
        const onTrue = document.getElementById('ahr_true').value;
        const onFalse = document.getElementById('ahr_false').value;

        if (devs.length === 0) {
            if (typeof showToast === 'function') showToast('Pilih minimal 1 perangkat!', 'error');
            return;
        }
        if (!Number.isFinite(count) || count < 0) {
            if (typeof showToast === 'function') showToast('Jumlah orang harus angka 0 atau lebih.', 'error');
            return;
        }

        const normalizedCondition = typeof normalizeHumanRuleConditionInput === 'function'
            ? normalizeHumanRuleConditionInput(cond, count)
            : { condition: cond, count: count || 0 };
        const newRule = {
            id: Math.random().toString(36).substr(2, 9),
            condition: normalizedCondition.condition,
            count: normalizedCondition.count,
            devices: devs,
            onTrue: onTrue,
            onFalse: onFalse,
            delay: 3000
        };

        const rulesObj = _loadRules();
        if (!rulesObj.human) rulesObj.human = { enabled: true, rules: [], delay: 5000 };
        if (!Array.isArray(rulesObj.human.rules)) rulesObj.human.rules = [];

        rulesObj.human.rules.push(newRule);

        if (typeof automationEngine !== 'undefined') automationEngine.updateCVRules({ human: rulesObj.human });
        if (window.CV) {
            window.CV.cvRules = typeof normalizeCVRulesInput === 'function'
                ? normalizeCVRulesInput(rulesObj)
                : rulesObj;
        }

        document.getElementById('cvAddHumanRuleModal')?.remove();
        renderAutomationSettings();
        if (typeof showToast === 'function') showToast('Aturan berhasil ditambahkan', 'success');
    }

    /**
     * Mengumpulkan daftar ID perangkat yang dicentang dalam container tertentu.
     */
    function _getChecked(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return [];
        return Array.from(container.querySelectorAll('input[type=checkbox]:checked'))
            .map(cb => cb.value);
    }

    /**
     * Memuat konfigurasi aturan otomasi CV dari state global atau default.
     */
    function _loadRules() {
        try {
            if (window.CV?.cvRules) {
                const rules = JSON.parse(JSON.stringify(window.CV.cvRules));
                return typeof normalizeCVRulesInput === 'function' ? normalizeCVRulesInput(rules) : rules;
            }
            if (typeof automationEngine !== 'undefined') {
                const r = automationEngine.getCVRules?.();
                if (r) {
                    const rules = JSON.parse(JSON.stringify(r));
                    return typeof normalizeCVRulesInput === 'function' ? normalizeCVRulesInput(rules) : rules;
                }
            }
        } catch (_) {}
        return _defaultRules();
    }

    /**
     * Definisi struktur default untuk aturan otomasi CV.
     */
    function _defaultRules() {
        return {
            human: { enabled: true, rules: [], delay: 5000 },
            light: { enabled: true, onDark:   [], onBright: [], delay: 2000 },
        };
    }

    /**
     * Helper untuk sanitasi string HTML agar aman dari XSS.
     */
    function _esc(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    // Ekspor fungsi publik modul
    return {
        initialize,
        get _initialized() { return _initialized; },

        attachOverlay,
        removeOverlay,
        clearOverlay,

        showLoading,
        hideLoading,
        updateSystemStatus,

        renderAutomationSettings,
        updateCVRule,
        toggleCVRuleEnabled,
        updateCVDelay,
        updateLightThreshold,
        saveCVRules,
        deleteHumanRule,
        showAddHumanRuleModal,
        addHumanRuleSubmit,

        destroy() { removeOverlay(); },
    };
})();
