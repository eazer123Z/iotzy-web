/**
 * Engine Automasi IOTZY
 * Mengelola logika pemicu (triggers) berbasis sensor, waktu, dan Computer Vision (YOLO).
 */
const automationEngine = (() => {
    let _isActive   = false;
    let _cvActive   = false;
    let _schedTimer = null;
    let _callbacks  = {};
    const _cooldowns = {};

    // Helper untuk URL API Endpoint
    const _api = (action) => {
        const base = (typeof APP_BASE !== 'undefined' ? APP_BASE.replace(/\/$/, "") : '') + '/api/data_router.php';
        return `${base}?action=${action}`;
    };

    const _post = async (action, body = {}) => {
        const hdrs = { 'Content-Type': 'application/json' };
        if (typeof CSRF_TOKEN !== 'undefined') hdrs['X-CSRF-Token'] = CSRF_TOKEN;
        const res = await fetch(_api(action), {
            method:  'POST',
            headers: hdrs,
            credentials: 'include', // 🔑 CRITICAL
            body:    JSON.stringify(body),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
    };

    let _cvHumanPresent   = null;
    let _cvLightCondition = null;

    let _schedules = [];
    let _cvRules = {
        human: { enabled: true, rules: [], delay: 5000 },
        light: { enabled: true, onDark:   [], onBright: [], delay: 2000 },
    };

    async function _loadCVRules() {
        try {
            const data = await _post('get_cv_rules');
            if (data && typeof data === 'object') {
                _cvRules = { ..._cvRules, ...data };
                _syncToWindowCV();
            }
        } catch (e) {
            console.warn('Failed to load CV rules:', e);
        }
    }

    function _syncToWindowCV() {
        if (window.CV) window.CV.cvRules = JSON.parse(JSON.stringify(_cvRules));
    }

    /**
     * _execute: Fungsi inti pengeksekusi aksi perangkat
     * Menjamin perangkat tidak "dispam" dengan perintah yang sama jika sudah di status yang diinginkan.
     */
    function _execute(deviceId, action, reason, delay = 0) {
        const id = String(deviceId);
        if (!window.STATE?.devices?.[id]) return;

        const exec = () => {
            const isOn = window.STATE?.deviceStates?.[id];
            
            // Cegah redundansi: Jangan ON-kan jika sudah ON, dsb.
            if (action === 'on'  && isOn)  return;
            if (action === 'off' && !isOn) return;

            if (action === 'on' || action === 'off') {
                const newState = action === 'on';
                if (typeof applyDeviceState === 'function') applyDeviceState(id, newState, reason);
            } else if (action === 'speed_high') {
                if (typeof applyDeviceState === 'function' && !isOn) applyDeviceState(id, true, reason);
                if (typeof setFanSpeed === 'function') setFanSpeed(id, 75);
                if (typeof addLog === 'function') addLog(window.STATE.devices[id]?.name, `Kipas 75% — ${reason}`, 'Automation', 'success');
            } else if (action === 'speed_mid') {
                if (typeof applyDeviceState === 'function' && !isOn) applyDeviceState(id, true, reason);
                if (typeof setFanSpeed === 'function') setFanSpeed(id, 50);
            } else if (action === 'speed_low') {
                if (typeof applyDeviceState === 'function' && !isOn) applyDeviceState(id, true, reason);
                if (typeof setFanSpeed === 'function') setFanSpeed(id, 25);
            }
        };

        if (delay > 0) setTimeout(exec, delay);
        else exec();
    }

    // Human rule state tracking to prevent spamming
    let _cvHumanRuleState = {};

    function _onPersonDetected(count) {
        if (!_cvActive) return;
        if (!_cvRules.human?.enabled) return;

        // Core presence detection logging
        const isPresent = count > 0;
        if (isPresent !== _cvHumanPresent) {
            _cvHumanPresent = isPresent;
            if (typeof addLog === 'function') {
                addLog('CV Otomasi', isPresent ? `${count} orang terdeteksi` : 'Tidak ada orang', 'CV', 'info');
            }
        }

        // Evaluate human rules based on counts
        const rules = Array.isArray(_cvRules.human.rules) ? _cvRules.human.rules : [];
        if (rules.length === 0) return; // No custom rules, do nothing

        const now = Date.now();
        const baseDelay = _cvRules.human.delay || 5000;

        rules.forEach(rule => {
            const rid = rule.id || Math.random().toString(36).substr(2, 9);
            rule.id = rid; // Ensure ID exists

            let conditionMet = false;
            switch(rule.condition) {
                case 'eq':  conditionMet = count === parseInt(rule.count); break;
                case 'gt':  conditionMet = count >   parseInt(rule.count); break;
                case 'gte': conditionMet = count >=  parseInt(rule.count); break;
                case 'lt':  conditionMet = count <   parseInt(rule.count); break;
                case 'lte': conditionMet = count <=  parseInt(rule.count); break;
                case 'any': conditionMet = count >   0;                    break;
                case 'none':conditionMet = count === 0;                    break;
                default:    conditionMet = false;
            }

            // Check if state changed
            const prevState = _cvHumanRuleState[rid] || false;
            
            if (conditionMet && !prevState) {
                // Just became true
                _cvHumanRuleState[rid] = true;
                if (!rule.onTrue) return;
                
                // Check cooldown
                const cdKey = `cv_human_${rid}_true`;
                if (_cooldowns[cdKey] && now - _cooldowns[cdKey] < (rule.delay || baseDelay)) return;
                _cooldowns[cdKey] = now;

                const reason = `CV: ${count} orang (Aturan ${rule.condition} ${rule.count || ''})`;
                (Array.isArray(rule.devices) ? rule.devices : []).forEach(devId => {
                    _execute(devId, rule.onTrue, reason, rule.delay || 0);
                });
            } else if (!conditionMet && prevState) {
                // Just became false
                _cvHumanRuleState[rid] = false;
                if (!rule.onFalse) return;

                // Check cooldown
                const cdKey = `cv_human_${rid}_false`;
                if (_cooldowns[cdKey] && now - _cooldowns[cdKey] < (rule.delay || baseDelay)) return;
                _cooldowns[cdKey] = now;
                
                const reason = `CV: Tidak memenuhi ${rule.condition} ${rule.count || ''}`;
                (Array.isArray(rule.devices) ? rule.devices : []).forEach(devId => {
                    _execute(devId, rule.onFalse, reason, rule.delay || 0);
                });
            }
        });
    }

    function _onLight(condition) {
        if (!_cvActive) return;
        if (!_cvRules.light?.enabled) return;
        if (condition === _cvLightCondition) return;
        _cvLightCondition = condition;

        const delay = _cvRules.light.delay || 2000;
        if (condition === 'dark')   (_cvRules.light.onDark   || []).forEach(id => _execute(id, 'on',  'CV Cahaya Gelap',  delay));
        if (condition === 'bright') (_cvRules.light.onBright || []).forEach(id => _execute(id, 'off', 'CV Cahaya Terang', delay));

        if (typeof addLog === 'function') {
            const lbl = { dark: 'Gelap', normal: 'Normal', bright: 'Terang' }[condition] || condition;
            addLog('CV Otomasi', `Kondisi cahaya: ${lbl}`, 'CV', 'info');
        }
    }

    /**
     * evaluateSensorRules: Mengevaluasi aturan berbasis pembacaan data sensor.
     * Dipanggil setiap kali ada data sensor baru yang diterima dari MQTT.
     */
    function evaluateSensorRules(sensorId, value) {
        if (!_isActive) return;
        const id    = String(sensorId);
        const rules = window.STATE?.automationRules?.[id] || [];

        rules.forEach(rule => {
            if (!rule.enabled) return;
            
            // 1. Validasi Nilai: Memastikan data sensor melewati ambang batas yang ditentukan
            if (!_shouldFire(rule, value)) return;

            // 2. Validasi Jendela Waktu: Jika aturan memiliki batasan jam operasional
            if (!_isInTimeWindow(rule)) return;

            // 3. Kontrol Spam (Cooldown): Memastikan aksi tidak dijalankan berkali-kali dalam rentang singkat
            const cooldownKey = `${id}_${rule.ruleId}`;
            const now         = Date.now();
            const cooldown    = (rule.delay || 0) + 5000; // Cooldown dasar 5 detik
            if (_cooldowns[cooldownKey] && now - _cooldowns[cooldownKey] < cooldown) return;
            _cooldowns[cooldownKey] = now;

            const deviceId  = String(rule.deviceId);
            const sensorObj = window.STATE?.sensors?.[id];
            const reason    = `Otomasi Sensor: ${sensorObj?.name || id}`;
            _execute(deviceId, rule.action, reason, rule.delay || 0);
        });
    }

    function _isInTimeWindow(rule) {
        if (!rule.startTime || !rule.endTime) return true;
        
        const now = new Date();
        const currentTime = now.getHours() * 60 + now.getMinutes();
        
        const [startH, startM] = rule.startTime.split(':').map(Number);
        const [endH, endM]     = rule.endTime.split(':').map(Number);
        
        const startTime = startH * 60 + startM;
        const endTime   = endH * 60 + endM;
        
        if (startTime <= endTime) {
            return currentTime >= startTime && currentTime <= endTime;
        } else {
            // Over midnight
            return currentTime >= startTime || currentTime <= endTime;
        }
    }

    /**
     * _checkTimeRules: Mengevaluasi aturan berbasis waktu (Jadwal Operasional).
     * Berjalan secara berkala (setiap ~30 detik) untuk memeriksa apakah ada jadwal yang harus dieksekusi.
     */
    function _checkTimeRules() {
        if (!_isActive) return;
        
        const rulesMap = window.STATE?.automationRules || {};
        const now      = new Date();
        const hhmm     = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        
        Object.keys(rulesMap).forEach(key => {
            const rules = rulesMap[key];
            rules.forEach(rule => {
                if (!rule.enabled) return;
                
                // 1. Kondisi "Time Only": Pemicu utama adalah Jam Mulai atau Jam Selesai
                if (rule.condition === 'time_only') {
                    // Cek Trigger Jam Mulai (Execute Action)
                    if (rule.startTime && rule.startTime.substring(0, 5) === hhmm) {
                        const dedupKey = `time_rule_${rule.dbId}_start_${hhmm}_${now.toDateString()}`;
                        if (_isDeduped(dedupKey)) return;
                        
                        _execute(rule.deviceId, rule.action, `Jadwal Mulai`, rule.delay || 0);
                        if (typeof addLog === 'function') {
                            const dev = window.STATE?.devices?.[rule.deviceId]?.name || rule.deviceId;
                            addLog(dev, `Jadwal Operasional (Mulai: ${hhmm}) dijalankan`, 'Schedule', 'info');
                        }
                    } 
                    // Cek Trigger Jam Selesai (Auto-Off Action)
                    // Jika jam selesai tercapai, sistem otomatis mematikan perangkat untuk efisiensi
                    else if (rule.endTime && rule.endTime.substring(0, 5) === hhmm) {
                        const dedupKey = `time_rule_${rule.dbId}_end_${hhmm}_${now.toDateString()}`;
                        if (_isDeduped(dedupKey)) return;

                        _execute(rule.deviceId, 'off', `Jadwal Selesai`, rule.delay || 0);
                        if (typeof addLog === 'function') {
                            const dev = window.STATE?.devices?.[rule.deviceId]?.name || rule.deviceId;
                            addLog(dev, `Jadwal Operasional (Selesai: ${hhmm}) — Perangkat dimatikan`, 'Schedule', 'info');
                        }
                    }
                }
            });
        });
    }

    function _isDeduped(key) {
        try {
            if (sessionStorage.getItem(key)) return true;
            sessionStorage.setItem(key, '1');
            return false;
        } catch (_) {
            if (!_schedDedup) _schedDedup = {};
            if (_schedDedup[key]) return true;
            _schedDedup[key] = true;
            return false;
        }
    }

    function _shouldFire(rule, val) {
        const v = parseFloat(val);
        switch (rule.condition) {
            case 'gt':       return v >  parseFloat(rule.threshold);
            case 'lt':       return v <  parseFloat(rule.threshold);
            case 'range':    return v <  parseFloat(rule.thresholdMin) || v > parseFloat(rule.thresholdMax);
            case 'detected': return !!val;
            case 'absent':   return !val;
            default:         return false;
        }
    }


    let _schedDedup = {};

    function registerPersonCallback(tag, fn) { _callbacks[`person_${tag}`] = fn; }
    function registerLightCallback(tag, fn)  { _callbacks[`light_${tag}`]  = fn; }

    function notifyPersonCount(count) {
        _onPersonDetected(count);
        Object.keys(_callbacks).filter(k => k.startsWith('person_')).forEach(k => {
            try { _callbacks[k](count); } catch (_) {}
        });
    }

    function notifyLight(condition, brightness) {
        _onLight(condition);
        Object.keys(_callbacks).filter(k => k.startsWith('light_')).forEach(k => {
            try { _callbacks[k](condition, brightness); } catch (_) {}
        });
        if (typeof onLightAnalysisUpdate === 'function') onLightAnalysisUpdate(condition, brightness);
    }

    function getCVRules() { return _cvRules; }

    function updateCVRules(partial) {
        if (partial.human) _cvRules.human = { ..._cvRules.human, ...partial.human };
        if (partial.light) _cvRules.light = { ..._cvRules.light, ...partial.light };
        _syncToWindowCV();
        _post('save_cv_rules', { rules: _cvRules }).catch(() => {});
    }

    function setEnabled(type, enabled) {
        if (_cvRules[type]) {
            _cvRules[type].enabled = enabled;
            updateCVRules({});
        }
    }



    return {
        get isActive() { return _isActive; },
        get cvActive()  { return _cvActive; },

        async initialize() {
            _isActive = true;
            await _loadCVRules();
            _schedTimer = setInterval(_checkTimeRules, 30000);
            _checkTimeRules();
        },

        startCV()  { _cvActive = true; },
        stopCV()   { _cvActive = false; },

        destroy() {
            _isActive = false;
            _cvActive = false;
            clearInterval(_schedTimer);
            _schedDedup = {};
        },

        evaluateSensorRules,
        notifyPersonCount,
        notifyLight,
        registerPersonCallback,
        registerLightCallback,
        getCVRules,
        updateCVRules,
        setEnabled,

        onPersonCount(count)               { notifyPersonCount(count); },
        onLightCondition(cond, brightness) { notifyLight(cond, brightness); },
    };
})();