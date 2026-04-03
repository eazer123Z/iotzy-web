/**
 * public/assets/js/modules/automation-engine.js
 * ───
 * Pusat Logika Otomasi IoTzy.
 * Mengoordinasikan pemicu (triggers) dari sensor, jadwal waktu operasional, 
 * serta event dari Computer Vision untuk mengeksekusi aksi perangkat secara mandiri.
 */

const automationEngine = (() => {
    let _isActive   = false;
    let _cvActive   = false;
    let _schedTimer = null;
    let _callbacks  = {};
    const _cooldowns = {};

    // Helper untuk URL API Endpoint
    const _api = (action) => {
        const base = typeof API_BASE !== 'undefined'
            ? API_BASE
            : ((typeof APP_BASE !== 'undefined' ? APP_BASE.replace(/\/$/, "") : '') + '/api/router.php');
        return `${base}?action=${action}`;
    };

    const _post = async (action, body = {}) => {
        const hdrs = { 'Content-Type': 'application/json' };
        if (typeof CSRF_TOKEN !== 'undefined') hdrs['X-CSRF-TOKEN'] = CSRF_TOKEN;
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
    const _scheduleDayMap = {
        minggu: 0, sunday: 0, sun: 0,
        senin: 1, monday: 1, mon: 1,
        selasa: 2, tuesday: 2, tue: 2, tues: 2,
        rabu: 3, wednesday: 3, wed: 3,
        kamis: 4, thursday: 4, thu: 4, thurs: 4,
        jumat: 5, friday: 5, fri: 5,
        sabtu: 6, saturday: 6, sat: 6,
    };

    async function _loadCVRules() {
        try {
            const data = await _post('get_cv_rules');
            if (data && typeof data === 'object') {
                hydrateCVRules(data, { skipEvaluate: true });
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

    function _evaluateHumanRules(count, options = {}) {
        if (!_cvActive) return;
        if (!_cvRules.human?.enabled) return;

        const forceApply = options.forceApply === true;
        const rules = Array.isArray(_cvRules.human.rules) ? _cvRules.human.rules : [];
        if (rules.length === 0) return;

        const now = Date.now();
        const baseDelay = _cvRules.human.delay || 5000;

        rules.forEach(rule => {
            const rid = rule.id || Math.random().toString(36).substr(2, 9);
            rule.id = rid; // Ensure ID exists

            let conditionMet = false;
            switch(rule.condition) {
                case 'eq':  conditionMet = count === parseInt(rule.count); break;
                case 'neq': conditionMet = count !== parseInt(rule.count); break;
                case 'gt':  conditionMet = count >   parseInt(rule.count); break;
                case 'gte': conditionMet = count >=  parseInt(rule.count); break;
                case 'lt':  conditionMet = count <   parseInt(rule.count); break;
                case 'lte': conditionMet = count <=  parseInt(rule.count); break;
                case 'any': conditionMet = count >   0;                    break;
                case 'none':conditionMet = count === 0;                    break;
                default:    conditionMet = false;
            }

            const prevState = Object.prototype.hasOwnProperty.call(_cvHumanRuleState, rid)
                ? !!_cvHumanRuleState[rid]
                : null;

            if (forceApply) {
                _cvHumanRuleState[rid] = true;
                if (!conditionMet) {
                    _cvHumanRuleState[rid] = false;
                }
            }

            const effectivePrevState = forceApply ? null : (prevState === null ? false : prevState);

            if (conditionMet && !effectivePrevState) {
                _cvHumanRuleState[rid] = true;
                if (!rule.onTrue) return;

                const cdKey = `cv_human_${rid}_true`;
                if (_cooldowns[cdKey] && now - _cooldowns[cdKey] < (rule.delay || baseDelay) && !forceApply) return;
                _cooldowns[cdKey] = now;

                const reason = `CV: ${count} orang (${rule.condition} ${rule.count ?? 0})`;
                (Array.isArray(rule.devices) ? rule.devices : []).forEach(devId => {
                    _execute(devId, rule.onTrue, reason, forceApply ? 0 : (rule.delay || 0));
                });
            } else if (!conditionMet && (effectivePrevState || forceApply)) {
                _cvHumanRuleState[rid] = false;
                if (!rule.onFalse) return;

                const cdKey = `cv_human_${rid}_false`;
                if (_cooldowns[cdKey] && now - _cooldowns[cdKey] < (rule.delay || baseDelay) && !forceApply) return;
                _cooldowns[cdKey] = now;

                const reason = `CV: tidak memenuhi ${rule.condition} ${rule.count ?? 0}`;
                (Array.isArray(rule.devices) ? rule.devices : []).forEach(devId => {
                    _execute(devId, rule.onFalse, reason, forceApply ? 0 : (rule.delay || 0));
                });
            }
        });
    }

    function _onPersonDetected(count) {
        if (!_cvActive) return;
        if (!_cvRules.human?.enabled) return;

        const isPresent = count > 0;
        if (isPresent !== _cvHumanPresent) {
            _cvHumanPresent = isPresent;
            if (typeof addLog === 'function') {
                addLog('CV Otomasi', isPresent ? `${count} orang terdeteksi` : 'Tidak ada orang', 'CV', 'info');
            }
        }

        _evaluateHumanRules(count);
    }

    function _evaluateLightRules(condition, options = {}) {
        if (!_cvActive) return;
        if (!_cvRules.light?.enabled) return;
        const forceApply = options.forceApply === true;
        if (condition === _cvLightCondition && !forceApply) return;
        _cvLightCondition = condition;

        const delay = _cvRules.light.delay || 2000;
        if (condition === 'dark')   (_cvRules.light.onDark   || []).forEach(id => _execute(id, 'on',  'CV Cahaya Gelap',  forceApply ? 0 : delay));
        if (condition === 'bright') (_cvRules.light.onBright || []).forEach(id => _execute(id, 'off', 'CV Cahaya Terang', forceApply ? 0 : delay));

        if (typeof addLog === 'function') {
            const lbl = { dark: 'Gelap', normal: 'Normal', bright: 'Terang' }[condition] || condition;
            addLog('CV Otomasi', `Kondisi cahaya: ${lbl}`, 'CV', 'info');
        }

        // Built-in Smart Lamp Automation
        _evaluateBuiltInRules('lamp', condition);
    }

    function _onLight(condition) {
        _evaluateLightRules(condition);
    }

    /**
     * _evaluateBuiltInRules: Mengeksekusi otomasi "Hardcoded" dari User Settings (Smart Lamp/Fan/Lock)
     */
    function _evaluateBuiltInRules(type, payload) {
        if (!_isActive || !window.PHP_SETTINGS) return;
        const s = window.PHP_SETTINGS;

        if (type === 'lamp' && s.automation_lamp) {
            const brightness = payload === 'dark' || payload === 'bright' || payload === 'normal' 
                             ? (payload === 'dark' ? 0.2 : 0.8) : parseFloat(payload);
            const onThr  = parseFloat(s.lamp_on_threshold  || 0.3);
            const offThr = parseFloat(s.lamp_off_threshold || 0.7);

            // Cari semua lampu
            Object.entries(window.STATE?.devices || {}).forEach(([id, dev]) => {
                if (dev.icon === 'fa-lightbulb' || dev.type === 'light' || dev.name.toLowerCase().includes('lampu')) {
                    if (brightness <= onThr) _execute(id, 'on', 'Smart Lamp (Gelap)');
                    else if (brightness >= offThr) _execute(id, 'off', 'Smart Lamp (Terang)');
                }
            });
        }

        if (type === 'fan' && s.automation_fan) {
            const temp = parseFloat(payload);
            const highThr   = parseFloat(s.fan_temp_high   || 30);
            const normalThr = parseFloat(s.fan_temp_normal || 25);

            Object.entries(window.STATE?.devices || {}).forEach(([id, dev]) => {
                if (dev.icon === 'fa-wind' || dev.name.toLowerCase().includes('kipas')) {
                    if (temp >= highThr) _execute(id, 'speed_high', 'Smart Fan (Panas)');
                    else if (temp <= normalThr) _execute(id, 'off', 'Smart Fan (Dingin)');
                    else _execute(id, 'speed_mid', 'Smart Fan (Normal)');
                }
            });
        }

        if (type === 'lock' && s.automation_lock) {
            const deviceId = String(payload.id);
            const state    = payload.state; // true = unlocked/on, false = locked/off
            
            if (state === true) { // Jika baru saja dibuka (ON)
                const delay = parseInt(s.lock_delay || 5000);
                const devName = window.STATE?.devices?.[deviceId]?.name || 'Pintu';
                
                // Set timeout untuk kunci kembali
                setTimeout(() => {
                    _execute(deviceId, 'off', 'Auto-Lock (Berjangka)');
                    if (typeof addLog === 'function') {
                        addLog(devName, 'Pintu dikunci otomatis (Keamanan)', 'System', 'info');
                    }
                }, delay);
            }
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
        const now = new Date();
        if (!_matchesScheduleDay(rule.days, now)) return false;
        if (!rule.startTime || !rule.endTime) return true;

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

    function _normalizeScheduleDay(day) {
        if (day === null || day === undefined || day === '') return null;
        const numericDay = Number(day);
        if (Number.isInteger(numericDay) && numericDay >= 0 && numericDay <= 6) {
            return numericDay;
        }
        const key = String(day).trim().toLowerCase();
        return Object.prototype.hasOwnProperty.call(_scheduleDayMap, key) ? _scheduleDayMap[key] : null;
    }

    function _matchesScheduleDay(days, now) {
        if (!Array.isArray(days) || days.length === 0) return true;
        const today = now.getDay();
        return days.some((day) => _normalizeScheduleDay(day) === today);
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
        
        // 1. Evaluasi 'automation_rules' (Time-only rules)
        Object.keys(rulesMap).forEach(key => {
            const raw = rulesMap[key];
            const rules = Array.isArray(raw) ? raw : (raw && typeof raw === 'object' ? Object.values(raw) : []);
            rules.forEach(rule => {
                if (!rule.enabled) return;
                
                if (rule.condition === 'time_only') {
                    if (!_matchesScheduleDay(rule.days, now)) return;
                    if (rule.startTime && rule.startTime.substring(0, 5) === hhmm) {
                        const dedupKey = `time_rule_${rule.dbId}_start_${hhmm}_${now.toDateString()}`;
                        if (_isDeduped(dedupKey)) return;
                        _execute(rule.deviceId, rule.action, `Jadwal Mulai`, rule.delay || 0);
                    } 
                    else if (rule.endTime && rule.endTime.substring(0, 5) === hhmm) {
                        const dedupKey = `time_rule_${rule.dbId}_end_${hhmm}_${now.toDateString()}`;
                        if (_isDeduped(dedupKey)) return;
                        _execute(rule.deviceId, 'off', `Jadwal Selesai`, rule.delay || 0);
                    }
                }
            });
        });

        // 2. Evaluasi tabel 'Schedules' (Jadwal Terpisah)
        const schedules = window.STATE?.schedules || [];

        schedules.forEach(sch => {
            if (!sch.enabled) return;
            if (sch.time !== hhmm) return;
            if (!_matchesScheduleDay(sch.days, now)) return;

            const dedupKey = `sch_db_${sch.id}_${hhmm}_${now.toDateString()}`;
            if (_isDeduped(dedupKey)) return;

            (sch.devices || []).forEach(devId => {
                _execute(devId, sch.action, `Jadwal: ${sch.label || 'Rutin'}`, 0);
            });
        });
    }

    function _isDeduped(key) {
        if (_schedDedup[key]) return true;
        _schedDedup[key] = true;
        setTimeout(() => delete _schedDedup[key], 65000); // Bersihkan setelah 1 menit lebih sedikit
        return false;
    }

    function _shouldFire(rule, val) {
        const v = parseFloat(val);
        switch (rule.condition) {
            case 'gt':       return v >  parseFloat(rule.threshold);
            case 'lt':       return v <  parseFloat(rule.threshold);
            case 'range':    return v <  parseFloat(rule.thresholdMin) || v > parseFloat(rule.thresholdMax);
            case 'between':  return v >= parseFloat(rule.thresholdMin) && v <= parseFloat(rule.thresholdMax);
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

    function hydrateCVRules(rules, options = {}) {
        const nextRules = (typeof normalizeCVRulesInput === 'function')
            ? normalizeCVRulesInput(rules)
            : { ..._cvRules, ...(rules || {}) };
        _cvRules = nextRules;
        _syncToWindowCV();

        if (_cvActive && !options.skipEvaluate) {
            const currentCount = Math.max(0, Number(window.STATE?.cv?.personCount) || 0);
            const currentLight = window.STATE?.cv?.lightCondition || 'unknown';
            _evaluateHumanRules(currentCount, { forceApply: true });
            _evaluateLightRules(currentLight, { forceApply: true });
        }

        return _cvRules;
    }

    function updateCVRules(partial) {
        const nextRules = {
            human: { ...(_cvRules.human || {}) },
            light: { ...(_cvRules.light || {}) },
        };
        if (partial.human) nextRules.human = { ...nextRules.human, ...partial.human };
        if (partial.light) nextRules.light = { ...nextRules.light, ...partial.light };
        hydrateCVRules(nextRules, { skipEvaluate: true });
        const persistPromise = _post('save_cv_rules', { rules: _cvRules }).catch(() => {});
        if (_cvActive) {
            const currentCount = Math.max(0, Number(window.STATE?.cv?.personCount) || 0);
            const currentLight = window.STATE?.cv?.lightCondition || 'unknown';
            if (partial.human) _evaluateHumanRules(currentCount, { forceApply: true });
            if (partial.light) _evaluateLightRules(currentLight, { forceApply: true });
        }
        return persistPromise;
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
            
            // Sync Schedules into STATE if not already there
            if (typeof ensureSchedulesLoaded === 'function') {
                ensureSchedulesLoaded().then((data) => {
                    if (Array.isArray(data)) {
                        if (!window.STATE) window.STATE = {};
                        window.STATE.schedules = data;
                    }
                }).catch(() => {});
            } else if (typeof apiPost === 'function') {
                apiPost('get_schedules').then(data => {
                    if (Array.isArray(data)) {
                        if (!window.STATE) window.STATE = {};
                        window.STATE.schedules = data;
                    }
                }).catch(() => {});
            }

            _schedTimer = setInterval(_checkTimeRules, 30000);
            _checkTimeRules();
        },

        startCV()  {
            _cvActive = true;
            const currentCount = Math.max(0, Number(window.STATE?.cv?.personCount) || 0);
            const currentLight = window.STATE?.cv?.lightCondition || 'unknown';
            _evaluateHumanRules(currentCount, { forceApply: true });
            _evaluateLightRules(currentLight, { forceApply: true });
        },
        stopCV()   {
            _cvActive = false;
        },

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
        hydrateCVRules,
        updateCVRules,
        setEnabled,
        _evaluateBuiltInRules: _evaluateBuiltInRules,

        onPersonCount(count)               { notifyPersonCount(count); },
        onLightCondition(cond, brightness) { notifyLight(cond, brightness); },
        evaluateBuiltInRules(type, payload){ try { _evaluateBuiltInRules(type, payload); } catch(_) {} },
    };
})();
