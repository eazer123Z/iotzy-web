const automationEngine = (() => {
    let _isActive = false;
    let _cvActive = false;
    let _schedTimer = null;
    let _callbacks = {};
    const _cooldowns = {};

    const _api = (action) => {
        const base = (typeof APP_BASE !== 'undefined' ? APP_BASE.replace(/\/$/, "") : '') + '/api/router.php';
        return `${base}?action=${action}`;
    };

    const _post = async (action, body = {}) => {
        const hdrs = { 'Content-Type': 'application/json' };
        if (typeof CSRF_TOKEN !== 'undefined') hdrs['X-CSRF-Token'] = CSRF_TOKEN;
        const res = await fetch(_api(action), {
            method: 'POST',
            headers: hdrs,
            credentials: 'include',
            body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
    };

    let _cvHumanPresent = null;
    let _cvLightCondition = null;
    let _cvRules = {
        human: { enabled: true, rules: [], delay: 5000 },
        light: { enabled: true, onDark: [], onBright: [], delay: 2000 },
    };

    async function _loadCVRules() {
        try {
            const data = await _post('get_cv_rules');
            if (data && typeof data === 'object') {
                _cvRules = { ..._cvRules, ...data };
                _syncToWindowCV();
            }
        } catch (e) { console.warn('Failed to load CV rules:', e); }
    }

    function _syncToWindowCV() {
        if (window.CV) window.CV.cvRules = JSON.parse(JSON.stringify(_cvRules));
    }

    function _execute(deviceId, action, reason, delay = 0) {
        const id = String(deviceId);
        if (!window.STATE?.devices?.[id]) return;
        const exec = () => {
            const isOn = window.STATE?.deviceStates?.[id];
            if (action === 'on' && isOn) return;
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

    let _cvHumanRuleState = {};

    function _onPersonDetected(count) {
        if (!_cvActive || !_cvRules.human?.enabled) return;
        const isPresent = count > 0;
        if (isPresent !== _cvHumanPresent) {
            _cvHumanPresent = isPresent;
            if (typeof addLog === 'function') addLog('CV Otomasi', isPresent ? `${count} orang terdeteksi` : 'Tidak ada orang', 'CV', 'info');
        }
        const rules = Array.isArray(_cvRules.human.rules) ? _cvRules.human.rules : [];
        if (rules.length === 0) return;
        const now = Date.now();
        const baseDelay = _cvRules.human.delay || 5000;
        rules.forEach(rule => {
            const rid = rule.id || Math.random().toString(36).substr(2, 9);
            rule.id = rid;
            let cond = false;
            switch(rule.condition) {
                case 'eq': cond = count === parseInt(rule.count); break;
                case 'gt': cond = count > parseInt(rule.count); break;
                case 'gte': cond = count >= parseInt(rule.count); break;
                case 'lt': cond = count < parseInt(rule.count); break;
                case 'lte': cond = count <= parseInt(rule.count); break;
                case 'any': cond = count > 0; break;
                case 'none': cond = count === 0; break;
            }
            const prev = _cvHumanRuleState[rid] || false;
            if (cond && !prev) {
                _cvHumanRuleState[rid] = true;
                if (!rule.onTrue) return;
                const cdKey = `cv_human_${rid}_true`;
                if (_cooldowns[cdKey] && now - _cooldowns[cdKey] < (rule.delay || baseDelay)) return;
                _cooldowns[cdKey] = now;
                (Array.isArray(rule.devices) ? rule.devices : []).forEach(devId => _execute(devId, rule.onTrue, `CV: ${count} orang`, rule.delay || 0));
            } else if (!cond && prev) {
                _cvHumanRuleState[rid] = false;
                if (!rule.onFalse) return;
                const cdKey = `cv_human_${rid}_false`;
                if (_cooldowns[cdKey] && now - _cooldowns[cdKey] < (rule.delay || baseDelay)) return;
                _cooldowns[cdKey] = now;
                (Array.isArray(rule.devices) ? rule.devices : []).forEach(devId => _execute(devId, rule.onFalse, `CV: Tidak memenuhi kriteria`, rule.delay || 0));
            }
        });
    }

    function _onLight(condition) {
        if (!_cvActive || !_cvRules.light?.enabled || condition === _cvLightCondition) return;
        _cvLightCondition = condition;
        const delay = _cvRules.light.delay || 2000;
        if (condition === 'dark') (_cvRules.light.onDark || []).forEach(id => _execute(id, 'on', 'CV Cahaya Gelap', delay));
        if (condition === 'bright') (_cvRules.light.onBright || []).forEach(id => _execute(id, 'off', 'CV Cahaya Terang', delay));
        if (typeof addLog === 'function') {
            const lbl = { dark: 'Gelap', normal: 'Normal', bright: 'Terang' }[condition] || condition;
            addLog('CV Otomasi', `Kondisi cahaya: ${lbl}`, 'CV', 'info');
        }
    }

    function evaluateSensorRules(sensorId, value) {
        if (!_isActive) return;
        const id = String(sensorId);
        const rules = window.STATE?.automationRules?.[id] || [];
        rules.forEach(rule => {
            if (!rule.enabled || !_shouldFire(rule, value) || !_isInTimeWindow(rule)) return;
            const key = `${id}_${rule.ruleId}`;
            const now = Date.now();
            const cd = (rule.delay || 0) + 5000;
            if (_cooldowns[key] && now - _cooldowns[key] < cd) return;
            _cooldowns[key] = now;
            _execute(String(rule.deviceId), rule.action, `Otomasi Sensor: ${window.STATE?.sensors?.[id]?.name || id}`, rule.delay || 0);
        });
    }

    function _isInTimeWindow(rule) {
        if (!rule.startTime || !rule.endTime) return true;
        const now = new Date();
        const cur = now.getHours() * 60 + now.getMinutes();
        const [sh, sm] = rule.startTime.split(':').map(Number);
        const [eh, em] = rule.endTime.split(':').map(Number);
        const st = sh * 60 + sm, et = eh * 60 + em;
        return st <= et ? (cur >= st && cur <= et) : (cur >= st || cur <= et);
    }

    function _checkTimeRules() {
        if (!_isActive) return;
        const map = window.STATE?.automationRules || {};
        const now = new Date();
        const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        Object.keys(map).forEach(key => {
            map[key].forEach(rule => {
                if (!rule.enabled || rule.condition !== 'time_only') return;
                if (rule.startTime?.substring(0, 5) === hhmm) {
                    const d = `time_rule_${rule.dbId}_start_${hhmm}_${now.toDateString()}`;
                    if (_isDeduped(d)) return;
                    _execute(rule.deviceId, rule.action, `Jadwal Mulai`, rule.delay || 0);
                    if (typeof addLog === 'function') addLog(window.STATE?.devices?.[rule.deviceId]?.name || rule.deviceId, `Jadwal Mulai: ${hhmm}`, 'Schedule', 'info');
                } else if (rule.endTime?.substring(0, 5) === hhmm) {
                    const d = `time_rule_${rule.dbId}_end_${hhmm}_${now.toDateString()}`;
                    if (_isDeduped(d)) return;
                    _execute(rule.deviceId, 'off', `Jadwal Selesai`, rule.delay || 0);
                    if (typeof addLog === 'function') addLog(window.STATE?.devices?.[rule.deviceId]?.name || rule.deviceId, `Jadwal Selesai: ${hhmm}`, 'Schedule', 'info');
                }
            });
        });
    }

    let _schedDedup = {};
    function _isDeduped(key) {
        try {
            if (sessionStorage.getItem(key)) return true;
            sessionStorage.setItem(key, '1');
            return false;
        } catch (_) {
            if (_schedDedup[key]) return true;
            _schedDedup[key] = true; return false;
        }
    }

    function _shouldFire(rule, val) {
        const v = parseFloat(val);
        switch (rule.condition) {
            case 'gt': return v > parseFloat(rule.threshold);
            case 'lt': return v < parseFloat(rule.threshold);
            case 'range': return v < parseFloat(rule.thresholdMin) || v > parseFloat(rule.thresholdMax);
            case 'detected': return !!val;
            case 'absent': return !val;
            default: return false;
        }
    }

    return {
        get isActive() { return _isActive; },
        get cvActive() { return _cvActive; },
        async initialize() {
            _isActive = true;
            await _loadCVRules();
            _schedTimer = setInterval(_checkTimeRules, 30000);
            _checkTimeRules();
        },
        startCV() { _cvActive = true; },
        stopCV() { _cvActive = false; },
        destroy() {
            _isActive = false; _cvActive = false;
            clearInterval(_schedTimer);
            _schedDedup = {};
        },
        evaluateSensorRules,
        notifyPersonCount(c) {
            _onPersonDetected(c);
            Object.keys(_callbacks).filter(k => k.startsWith('person_')).forEach(k => { try { _callbacks[k](c); } catch(_) {} });
        },
        notifyLight(c, b) {
            _onLight(c);
            Object.keys(_callbacks).filter(k => k.startsWith('light_')).forEach(k => { try { _callbacks[k](c, b); } catch(_) {} });
            if (typeof onLightAnalysisUpdate === 'function') onLightAnalysisUpdate(c, b);
        },
        registerPersonCallback(t, f) { _callbacks[`person_${t}`] = f; },
        registerLightCallback(t, f) { _callbacks[`light_${t}`] = f; },
        getCVRules() { return _cvRules; },
        updateCVRules(p) {
            if (p.human) _cvRules.human = { ..._cvRules.human, ...p.human };
            if (p.light) _cvRules.light = { ..._cvRules.light, ...p.light };
            _syncToWindowCV();
            _post('save_cv_rules', { rules: _cvRules }).catch(() => {});
        },
        setEnabled(t, e) { if (_cvRules[t]) { _cvRules[t].enabled = e; this.updateCVRules({}); } }
    };
})();
