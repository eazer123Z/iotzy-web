const cvUI = (() => {
    let _initialized = false;
    let _overlayCanvas = null;
    let _overlayCtx = null;

    function initialize() {
        if (_initialized) return;
        _initialized = true;
        _createOverlay();
        _hookCallbacks();
    }

    function _createOverlay() {
        let c = document.getElementById('cvOverlayCanvas');
        if (!c) {
            c = document.createElement('canvas');
            c.id = 'cvOverlayCanvas';
        }
        c.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:10';
        _overlayCanvas = c;
        _overlayCtx = c.getContext('2d');
    }

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

    function _onDetectionUpdate(data) {
        const hc = document.getElementById('cvHumanCount');
        const ps = document.getElementById('cvPresenceStatus');
        const cf = document.getElementById('cvConfidence');
        if (hc) hc.textContent = data.humanCount;
        if (ps) {
            ps.textContent = data.humanPresent ? 'Terdeteksi' : 'Tidak Terdeteksi';
            ps.className = 'status-val' + (data.humanPresent ? ' ok' : ' muted');
        }
        if (cf && data.avgConfidence > 0) cf.textContent = (data.avgConfidence * 100).toFixed(0) + '%';
        if (typeof CV_CONFIG !== 'undefined' && CV_CONFIG.ui?.showBoundingBoxes) _drawBoxes(data.detections);
    }

    function _drawBoxes(detections) {
        if (!_overlayCanvas || !_overlayCtx) return;
        const video = document.getElementById('cameraFocus') || document.getElementById('camera');
        if (!video) return;
        _overlayCanvas.width = video.videoWidth || video.offsetWidth || 640;
        _overlayCanvas.height = video.videoHeight || video.offsetHeight || 480;
        _overlayCtx.clearRect(0, 0, _overlayCanvas.width, _overlayCanvas.height);
        const color = CV_CONFIG?.ui?.overlayColor || '#6366f1';
        detections.forEach(d => {
            const [x, y, w, h] = d.bbox;
            _overlayCtx.strokeStyle = color;
            _overlayCtx.lineWidth = 2;
            _overlayCtx.strokeRect(x, y, w, h);
            _overlayCtx.fillStyle = color + '14';
            _overlayCtx.fillRect(x, y, w, h);
            const label = `${d.class} ${(d.score * 100).toFixed(0)}%`;
            _overlayCtx.font = 'bold 11px "Plus Jakarta Sans",sans-serif';
            const tw = _overlayCtx.measureText(label).width;
            _overlayCtx.fillStyle = color + 'dd';
            _overlayCtx.fillRect(x, y > 20 ? y - 20 : y, tw + 10, 18);
            _overlayCtx.fillStyle = '#fff';
            _overlayCtx.fillText(label, x + 5, y > 20 ? y - 5 : y + 12);
        });
    }

    function _onBrightnessUpdate(brightness, condition) {
        const pct = (brightness * 100).toFixed(1) + '%';
        const map = { dark: '🌙 Gelap', normal: '☁️ Normal', bright: '☀️ Terang' };
        const bEl = document.getElementById('cvBrightness');
        const blEl = document.getElementById('cvBrightnessLabel');
        const cEl = document.getElementById('cvLightCondition');
        const bBar = document.getElementById('cvBrightnessBar');
        if (bEl) bEl.textContent = pct;
        if (blEl) blEl.textContent = pct;
        if (cEl) {
            cEl.textContent = map[condition] || condition;
            cEl.className = 'status-val' + (condition === 'normal' ? ' muted' : '');
        }
        if (bBar) bBar.style.width = pct;
    }

    function attachOverlay(containerId) {
        const cont = document.getElementById(containerId);
        if (cont && _overlayCanvas && !cont.querySelector('#cvOverlayCanvas')) cont.appendChild(_overlayCanvas);
    }

    function removeOverlay() { if (_overlayCanvas?.parentNode) _overlayCanvas.parentNode.removeChild(_overlayCanvas); }
    function clearOverlay() { if (_overlayCtx && _overlayCanvas) _overlayCtx.clearRect(0, 0, _overlayCanvas.width, _overlayCanvas.height); }
    function showLoading(msg = 'Memuat…') {
        const el = document.getElementById('cvLoadingStatus');
        if (el) { el.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${msg}`; el.classList.remove('hidden'); }
    }
    function hideLoading() { document.getElementById('cvLoadingStatus')?.classList.add('hidden'); }

    function updateSystemStatus(status) {
        const el = document.getElementById('cvSystemStatus');
        if (!el) return;
        const map = { ready: ['✅ Siap', 'ok'], loading: ['⏳ Memuat…', 'muted'], error: ['❌ Error', ''], inactive: ['⚪ Tidak Aktif', 'muted'] };
        const [txt, cls] = map[status] || map.inactive;
        el.textContent = txt; el.className = 'status-val ' + cls;
    }

    function renderAutomationSettings() {
        const container = document.getElementById('cvAutomationSettings');
        if (!container) return;
        const stateRef = window.STATE || {};
        const devices = stateRef.devices || {};
        const devKeys = Object.keys(devices);
        const rules = _loadRules();
        if (!devKeys.length) {
            container.innerHTML = `<div class="cv-no-dev"><i class="fas fa-microchip" style="font-size:20px;display:block;margin-bottom:8px;opacity:.3"></i>Belum ada perangkat ditambahkan</div>`;
            return;
        }
        function devCheckboxes(selectedList, triggerId) {
            return devKeys.map(id => {
                const dev = devices[id], checked = (selectedList || []).map(String).includes(String(id));
                return `<label class="cv-dev-cb-item ${checked ? 'checked' : ''}" data-trigger="${triggerId}" data-id="${id}"><input type="checkbox" value="${id}" ${checked ? 'checked' : ''} onchange="cvUI.updateCVRule('${triggerId}', this)" style="width:14px;height:14px;accent-color:var(--a);flex-shrink:0"><i class="fas ${dev.icon || 'fa-plug'}"></i><span>${_esc(dev.name)}</span></label>`;
            }).join('');
        }
        const humanR = rules.human || { enabled: true, rules: [], delay: 5000 }, lightR = rules.light || _defaultRules().light;
        let hRulesHtml = (Array.isArray(humanR.rules) && humanR.rules.length > 0) ? humanR.rules.map((r, i) => {
            const devsText = (r.devices || []).map(id => devices[id]?.name || id).join(', ');
            let condTxt = '';
            switch(r.condition) {
                case 'eq': condTxt = `= ${r.count}`; break;
                case 'gt': condTxt = `> ${r.count}`; break;
                case 'gte': condTxt = `≥ ${r.count}`; break;
                case 'lt': condTxt = `< ${r.count}`; break;
                case 'lte': condTxt = `≤ ${r.count}`; break;
                case 'any': condTxt = `Terdeteksi (Berapapun)`; break;
                case 'none': condTxt = `Tidak Ada (0)`; break;
            }
            const labels = { on: 'Nyalakan', off: 'Matikan', speed_high: 'Kipas 75%', speed_mid: 'Kipas 50%', speed_low: 'Kipas 25%' };
            return `<div style="background:var(--surface-2);border:1px solid var(--border);border-radius:var(--r-md);padding:12px;margin-bottom:10px;"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><b>Jika Orang ${condTxt}</b><button onclick="cvUI.deleteHumanRule(${i})" style="color:var(--red);background:none;border:none;cursor:pointer"><i class="fas fa-trash"></i></button></div><div style="font-size:12px;color:var(--ink-4);margin-bottom:8px">Perangkat: <b>${devsText || '-'}</b></div><div style="font-size:12px;display:grid;grid-template-columns:1fr 1fr;gap:8px"><div style="background:var(--green-bg);color:var(--green-dim);padding:6px;border-radius:6px;text-align:center">Memenuhi: <br><b>${labels[r.onTrue] || '-'}</b></div><div style="background:var(--red-bg);color:var(--red-dim);padding:6px;border-radius:6px;text-align:center">Tidak: <br><b>${labels[r.onFalse] || '-'}</b></div></div></div>`;
        }).join('') : `<div style="text-align:center;padding:16px;color:var(--ink-5);font-size:13px">Belum ada aturan jumlah orang.</div>`;

        container.innerHTML = `<div class="cv-auto-section" style="margin-bottom:10px"><div class="cv-auto-head"><div><div class="cv-auto-title"><i class="fas fa-users" style="color:var(--a);margin-right:6px"></i>Automasi Jumlah Orang</div><div class="cv-auto-sub">Aksi berdasarkan jumlah manusia</div></div><label class="toggle-wrapper"><input type="checkbox" class="toggle-input" id="cvHumanToggle" ${humanR.enabled ? 'checked' : ''} onchange="cvUI.toggleCVRuleEnabled('human', this.checked)"><span class="toggle-track"></span></label></div><div class="cv-auto-body">${hRulesHtml}<button onclick="cvUI.showAddHumanRuleModal()" class="btn-primary" style="width:100%;padding:10px;margin-top:8px"><i class="fas fa-plus"></i> Tambah Aturan</button></div></div><div class="cv-auto-section"><div class="cv-auto-head"><div><div class="cv-auto-title"><i class="fas fa-sun" style="color:var(--amber);margin-right:6px"></i>Analisis Cahaya</div><div class="cv-auto-sub">Aksi berdasarkan kondisi cahaya</div></div><label class="toggle-wrapper"><input type="checkbox" class="toggle-input" id="cvLightToggle" ${lightR.enabled ? 'checked' : ''} onchange="cvUI.toggleCVRuleEnabled('light', this.checked)"><span class="toggle-track"></span></label></div><div class="cv-auto-body"><div><span class="cv-trigger-label"><i class="fas fa-moon" style="color:var(--ink-4);margin-right:4px"></i>Nyalakan saat gelap</span><div class="cv-device-list" id="cvOnDarkList">${devCheckboxes(lightR.onDark, 'light_onDark')}</div></div><div><span class="cv-trigger-label"><i class="fas fa-sun" style="color:var(--amber);margin-right:4px"></i>Matikan saat terang</span><div class="cv-device-list" id="cvOnBrightList">${devCheckboxes(lightR.onBright, 'light_onBright')}</div></div><div class="cv-threshold-grid"><div class="cv-field"><label>🌙 Ambang Gelap</label><div style="display:flex;align-items:center;gap:8px"><input type="range" value="${Math.round(CV_CONFIG.light.darkThreshold * 100)}" min="5" max="95" oninput="cvUI.updateLightThreshold('dark', this.value); this.nextElementSibling.textContent=this.value+'%'"><span style="min-width:36px;text-align:right;font-weight:700;font-size:12px">${Math.round(CV_CONFIG.light.darkThreshold * 100)}%</span></div></div><div class="cv-field"><label>☀️ Ambang Terang</label><div style="display:flex;align-items:center;gap:8px"><input type="range" value="${Math.round(CV_CONFIG.light.brightThreshold * 100)}" min="5" max="95" oninput="cvUI.updateLightThreshold('bright', this.value); this.nextElementSibling.textContent=this.value+'%'"><span style="min-width:36px;text-align:right;font-weight:700;font-size:12px">${Math.round(CV_CONFIG.light.brightThreshold * 100)}%</span></div></div></div></div></div><button onclick="cvUI.saveCVRules()" class="btn-primary" style="width:100%;justify-content:center;margin-top:6px"><i class="fas fa-floppy-disk"></i> Simpan Pengaturan CV</button>`;
    }

    function updateCVRule(triggerKey, checkbox) { const label = checkbox.closest('label'); if (label) label.classList.toggle('checked', checkbox.checked); }
    function toggleCVRuleEnabled(type, enabled) {
        if (typeof automationEngine !== 'undefined') automationEngine.updateCVRules({ [type]: { enabled } });
        if (window.CV?.cvRules?.[type]) {
            window.CV.cvRules[type].enabled = enabled;
            if (typeof apiPost === 'function') apiPost('save_cv_config', { config: { minConfidence: CV_CONFIG.detection.minConfidence, darkThreshold: CV_CONFIG.light.darkThreshold, brightThreshold: CV_CONFIG.light.brightThreshold, humanEnabled: window.CV.cvRules.human.enabled, lightEnabled: window.CV.cvRules.light.enabled } }).catch(() => {});
        }
    }

    function updateLightThreshold(which, value) {
        const norm = parseInt(value) / 100;
        if (typeof CV_CONFIG !== 'undefined') {
            if (which === 'dark') CV_CONFIG.light.darkThreshold = norm;
            else CV_CONFIG.light.brightThreshold = norm;
            if (typeof apiPost === 'function') apiPost('save_cv_config', { config: { minConfidence: CV_CONFIG.detection.minConfidence, darkThreshold: CV_CONFIG.light.darkThreshold, brightThreshold: CV_CONFIG.light.brightThreshold, humanEnabled: window.CV?.cvRules?.human?.enabled ?? true, lightEnabled: window.CV?.cvRules?.light?.enabled ?? true } }).catch(() => {});
        }
        if (typeof lightAnalyzer !== 'undefined') lightAnalyzer.setThresholds(which === 'dark' ? norm : null, which === 'bright' ? norm : null);
    }

    function saveCVRules() {
        const rules = _loadRules();
        rules.human.enabled = document.getElementById('cvHumanToggle')?.checked ?? true;
        rules.light.onDark = _getChecked('cvOnDarkList');
        rules.light.onBright = _getChecked('cvOnBrightList');
        rules.light.enabled = document.getElementById('cvLightToggle')?.checked ?? true;
        if (typeof automationEngine !== 'undefined') automationEngine.updateCVRules(rules);
        if (window.CV) window.CV.cvRules = rules;
        if (typeof apiPost === 'function') apiPost('save_cv_rules', { rules }).then(() => showToast('Pengaturan CV disimpan!', 'success')).catch(() => showToast('Gagal simpan ke database', 'error'));
    }

    function deleteHumanRule(index) {
        if (!confirm('Hapus aturan ini?')) return;
        const rules = _loadRules();
        if (rules.human?.rules) {
            rules.human.rules.splice(index, 1);
            if (typeof automationEngine !== 'undefined') automationEngine.updateCVRules({ human: rules.human });
            if (window.CV) window.CV.cvRules.human = rules.human;
            renderAutomationSettings(); showToast('Aturan dihapus', 'info');
        }
    }

    function showAddHumanRuleModal() {
        const id = 'cvAddHumanRuleModal'; if (document.getElementById(id)) document.getElementById(id).remove();
        const devs = window.STATE?.devices || {};
        const opts = Object.keys(devs).map(k => `<option value="${k}">${_esc(devs[k].name)}</option>`).join('');
        document.body.insertAdjacentHTML('beforeend', `<div id="${id}" class="modal-backdrop" style="position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center"><div class="modal-content" style="background:var(--surface);width:90%;max-width:400px;border-radius:var(--r-xl);padding:24px;border:1px solid var(--border)"><h3 style="margin:0 0 16px;font-size:18px">Tambah Aturan Deteksi (Orang)</h3><label style="display:block;margin-bottom:8px;font-size:13px;font-weight:600">Kondisi Jumlah Orang</label><div style="display:flex;gap:8px;margin-bottom:16px"><select id="ahr_cond" class="fi-input" style="flex:1"><option value="gte">≥ (Minimal)</option><option value="eq">= (Tepat)</option><option value="any">Berapapun (>0)</option></select><input type="number" id="ahr_count" class="fi-input" style="width:70px" value="1"></div><label style="display:block;margin-bottom:8px;font-size:13px;font-weight:600">Target Perangkat</label><select id="ahr_dev" class="fi-input" style="width:100%;margin-bottom:16px" multiple size="3">${opts}</select><label style="display:block;margin-bottom:8px;font-size:13px;font-weight:600">Terpenuhi -> Aksi</label><select id="ahr_true" class="fi-input" style="width:100%;margin-bottom:16px"><option value="on">Nyalakan</option><option value="off">Matikan</option></select><label style="display:block;margin-bottom:8px;font-size:13px;font-weight:600">Tidak Terpenuhi -> Aksi</label><select id="ahr_false" class="fi-input" style="width:100%;margin-bottom:24px"><option value="off">Matikan</option><option value="on">Nyalakan</option></select><div style="display:flex;gap:12px;justify-content:flex-end"><button class="btn-secondary" onclick="document.getElementById('${id}').remove()">Batal</button><button class="btn-primary" onclick="cvUI.addHumanRuleSubmit()">Simpan</button></div></div></div>`);
    }

    function addHumanRuleSubmit() {
        const cond = document.getElementById('ahr_cond').value, count = parseInt(document.getElementById('ahr_count').value), devs = Array.from(document.getElementById('ahr_dev').selectedOptions).map(o => o.value);
        if (!devs.length) return showToast('Pilih minimal 1 perangkat!', 'error');
        const rule = { id: Math.random().toString(36).substr(2, 9), condition: cond, count, devices: devs, onTrue: document.getElementById('ahr_true').value, onFalse: document.getElementById('ahr_false').value, delay: 3000 };
        const rules = _loadRules(); if (!rules.human) rules.human = { enabled: true, rules: [], delay: 5000 }; rules.human.rules.push(rule);
        if (typeof automationEngine !== 'undefined') automationEngine.updateCVRules({ human: rules.human });
        if (window.CV) window.CV.cvRules.human = rules.human;
        document.getElementById('cvAddHumanRuleModal')?.remove(); renderAutomationSettings(); showToast('Aturan ditambahkan', 'success');
    }

    function _getChecked(id) { const c = document.getElementById(id); return c ? Array.from(c.querySelectorAll('input[type=checkbox]:checked')).map(cb => cb.value) : []; }
    function _loadRules() { try { if (window.CV?.cvRules) return JSON.parse(JSON.stringify(window.CV.cvRules)); if (typeof automationEngine !== 'undefined') return JSON.parse(JSON.stringify(automationEngine.getCVRules())); } catch(_) {} return _defaultRules(); }
    function _defaultRules() { return { human: { enabled: true, rules: [], delay: 5000 }, light: { enabled: true, onDark: [], onBright: [], delay: 2000 } }; }
    function _esc(s) { return s ? String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;') : ''; }

    return { initialize, attachOverlay, removeOverlay, clearOverlay, showLoading, hideLoading, updateSystemStatus, renderAutomationSettings, updateCVRule, toggleCVRuleEnabled, updateLightThreshold, saveCVRules, deleteHumanRule, showAddHumanRuleModal, addHumanRuleSubmit, destroy() { removeOverlay(); } };
})();
