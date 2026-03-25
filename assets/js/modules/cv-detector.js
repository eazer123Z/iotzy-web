class CVDetector {
    constructor() {
        this.model             = null;
        this.isLoading         = false;
        this.isReady           = false;
        this.detectionActive   = false;
        this._detectionLoopReq = null;
        this.lastDetectionTime = 0;
        this.detectionHistory  = [];
        this.currentDetections = [];
        this.humanPresent      = false;
        this.lastHumanState    = false;
        this.lastPersonCount   = 0;
        this.presenceTimer     = null;
        this.loadAttempts      = 0;
        this.MAX_ATTEMPTS      = 3;
        this.videoElement      = null;
        this._callbacks = {
            onHumanDetected:    [],
            onHumanAbsent:      [],
            onDetectionUpdate:  [],
            onPersonCountChange:[],
            onError:            []
        };
        this.lastSyncTime = 0;
        this.syncInterval = 5000;
    }

    _waitForLibraries(maxWait = 25000) {
        return new Promise((resolve, reject) => {
            const start = Date.now();
            const check = () => {
                const tfOk = typeof tf !== 'undefined' && typeof tf.ready === 'function';
                const sdOk = typeof cocoSsd !== 'undefined';
                if (tfOk && sdOk) { resolve(); return; }
                if (Date.now() - start > maxWait) {
                    reject(new Error(!tfOk ? 'TF.js missing' : 'COCO-SSD missing'));
                    return;
                }
                setTimeout(check, 500);
            };
            check();
        });
    }

    async initialize() {
        if (this.isLoading) return false;
        if (this.isReady && this.model) return true;
        this.isLoading = true;
        this.loadAttempts++;
        try {
            await this._waitForLibraries();
            await tf.ready();
            if (tf.getBackend() !== 'webgl') {
                try { await tf.setBackend('webgl'); } catch(_) {}
            }
            this.model = await cocoSsd.load({
                base: CV_CONFIG?.model?.base || 'lite_mobilenet_v2'
            });
            const dummy = tf.zeros([1, 160, 160, 3]);
            try { await this.model.detect(dummy); } catch (_) {}
            dummy.dispose();
            this.isReady = true;
            this.isLoading = false;
            this.loadAttempts = 0;
            return true;
        } catch (err) {
            this.isLoading = false;
            this.model = null;
            this.isReady = false;
            this._emit('onError', err.message || String(err));
            return false;
        }
    }

    startDetection(videoElement) {
        if (!this.isReady || !this.model) return false;
        if (this.detectionActive) return true;
        this.videoElement = videoElement;
        this.detectionActive = true;
        this.lastDetectionTime = 0;
        const loop = () => {
            if (!this.detectionActive) return;
            this._runDetection().finally(() => {
                this._detectionLoopReq = requestAnimationFrame(loop);
            });
        };
        this._detectionLoopReq = requestAnimationFrame(loop);
        if (typeof apiPost === 'function') apiPost('update_cv_state', { is_active: 1 }).catch(() => {});
        return true;
    }

    stopDetection() {
        this.detectionActive = false;
        if (this._detectionLoopReq) cancelAnimationFrame(this._detectionLoopReq);
        if (this.presenceTimer) { clearTimeout(this.presenceTimer); this.presenceTimer = null; }
        this.currentDetections = [];
        this.humanPresent = false;
        this.lastHumanState = false;
        this.lastPersonCount = 0;
        if (typeof apiPost === 'function') apiPost('update_cv_state', { is_active: 0 }).catch(() => {});
    }

    async _runDetection() {
        if (!this.detectionActive || !this.model || !this.videoElement) return;
        const now = Date.now();
        const interval = CV_CONFIG?.detection?.interval || 500;
        if (now - this.lastDetectionTime < interval) return;
        const v = this.videoElement;
        if (!v || v.readyState < 2 || v.paused) return;
        this.lastDetectionTime = now;
        try {
            const preds = await this.model.detect(v);
            const minConf = CV_CONFIG?.detection?.minConfidence || 0.6;
            const humans = preds.filter(p => p.class === 'person' && p.score >= minConf);
            this.currentDetections = humans;
            this._updatePresence(humans.length > 0);
            if (humans.length !== this.lastPersonCount) {
                this.lastPersonCount = humans.length;
                this._emit('onPersonCountChange', humans.length);
                if (typeof onCVPersonCountUpdate === 'function') onCVPersonCountUpdate(humans.length);
            }
            if (typeof CV !== 'undefined') CV.frameCount++;
            this._emit('onDetectionUpdate', {
                detections: humans,
                humanCount: humans.length,
                humanPresent: this.humanPresent,
                avgConfidence: humans.length ? humans.reduce((s, d) => s + d.score, 0) / humans.length : 0,
                timestamp: now
            });
            if (now - this.lastSyncTime > this.syncInterval) {
                this.lastSyncTime = now;
                if (typeof apiPost === 'function') {
                    const l = (typeof lightAnalyzer !== 'undefined') ? lightAnalyzer.getLatest?.() || { brightness: 0, condition: 'unknown' } : { brightness: 0, condition: 'unknown' };
                    apiPost('update_cv_state', {
                        is_active: 1,
                        person_count: humans.length,
                        brightness: Math.round((l.brightness || 0) * 100),
                        light_condition: l.condition || 'unknown'
                    }).catch(() => {});
                }
            }
        } catch (err) { console.warn('CV Detection Frame Error:', err.message); }
    }

    _updatePresence(detected) {
        if (this.presenceTimer) clearTimeout(this.presenceTimer);
        this.detectionHistory.push({ detected, ts: Date.now() });
        const cutoff = Date.now() - 5000;
        this.detectionHistory = this.detectionHistory.filter(h => h.ts > cutoff);
        const debounce = CV_CONFIG?.detection?.debounceTime || 1500;
        this.presenceTimer = setTimeout(() => {
            if (detected === this.lastHumanState) return;
            this.lastHumanState = detected;
            this.humanPresent = detected;
            if (detected) this._emit('onHumanDetected');
            else this._emit('onHumanAbsent');
        }, debounce);
    }

    _emit(event, data) {
        const list = this._callbacks[event];
        if (!list) return;
        list.forEach(fn => { try { fn(data); } catch (e) { console.warn('CV CB Error:', event, e); } });
    }

    setCallbacks(cb) {
        const add = (key, fn) => {
            if (typeof fn !== 'function') return;
            const tag = cb._tag || null;
            const list = this._callbacks[key] || (this._callbacks[key] = []);
            if (tag) {
                fn._tag = tag;
                const idx = list.findIndex(f => f._tag === tag);
                if (idx >= 0) list[idx] = fn;
                else list.push(fn);
            } else list.push(fn);
        };
        if (cb.onHumanDetected) add('onHumanDetected', cb.onHumanDetected);
        if (cb.onHumanAbsent) add('onHumanAbsent', cb.onHumanAbsent);
        if (cb.onDetectionUpdate) add('onDetectionUpdate', cb.onDetectionUpdate);
        if (cb.onPersonCountChange) add('onPersonCountChange', cb.onPersonCountChange);
        if (cb.onError) add('onError', cb.onError);
    }

    getStatus() { return this.isLoading ? 'loading' : this.isReady ? 'ready' : 'idle'; }
}

const cvDetector = new CVDetector();
