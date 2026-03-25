/**
 * assets/js/modules/light-analyzer.js
 * ───
 * Analisis kecerahan real-time dari feed kamera menggunakan canvas API.
 */
class LightAnalyzer {
    constructor() {
        this.canvas         = null;
        this.ctx            = null;
        this.isActive       = false;
        this.interval       = null;
        this.lastBrightness = null;
        this.lastCondition  = null;
        this.videoElement   = null;
        this._callbacks = {
            onLightChange:      [],
            onBrightnessUpdate: [],
        };
    }

    startAnalysis(videoElement) {
        if (this.isActive) this.stopAnalysis();

        this.videoElement = videoElement;
        this.isActive     = true;

        const size         = CV_CONFIG?.light?.sampleSize || 80;
        this.canvas        = document.createElement('canvas');
        this.canvas.width  = size;
        this.canvas.height = size;
        this.ctx           = this.canvas.getContext('2d', { willReadFrequently: true });

        this._startInterval();
    }

    _startInterval() {
        if (this.interval) clearInterval(this.interval);
        const ms      = CV_CONFIG?.light?.analysisInterval || 1000;
        this.interval = setInterval(() => this._analyze(), ms);
    }

    restartWithNewInterval() {
        if (!this.isActive) return;
        this._startInterval();
    }

    setThresholds(dark, bright) {
        if (typeof CV_CONFIG !== 'undefined') {
            if (dark   != null) CV_CONFIG.light.darkThreshold   = parseFloat(dark);
            if (bright != null) CV_CONFIG.light.brightThreshold = parseFloat(bright);
        }
        this.lastCondition = null;
    }

    stopAnalysis() {
        if (this.interval) { clearInterval(this.interval); this.interval = null; }
        this.isActive      = false;
        this.lastCondition = null;
    }

    _analyze() {
        const v = this.videoElement;
        if (!v || v.readyState < 2 || v.paused || v.videoWidth < 1) return;
        try {
            const W = this.canvas.width;
            const H = this.canvas.height;
            this.ctx.drawImage(v, 0, 0, W, H);
            const px    = this.ctx.getImageData(0, 0, W, H).data;
            let total   = 0;
            let count   = 0;
            for (let i = 0; i < px.length; i += 16) {
                total += (0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]) / 255;
                count++;
            }
            const brightness = count ? total / count : 0;
            const bright     = CV_CONFIG?.light?.brightThreshold ?? 0.65;
            const dark       = CV_CONFIG?.light?.darkThreshold   ?? 0.35;
            const cond       = brightness > bright ? 'bright'
                             : brightness < dark   ? 'dark'
                             : 'normal';

            this._emit('onBrightnessUpdate', brightness, cond);

            if (cond !== this.lastCondition) {
                this.lastCondition = cond;
                this._emit('onLightChange', cond, brightness);
            }
            this.lastBrightness = brightness;
        } catch (_) {}
    }

    _emit(event, ...args) {
        const list = this._callbacks[event];
        if (!list) return;
        list.forEach(fn => {
            try { fn(...args); } catch (e) { console.warn('LightAnalyzer CB error', event, e); }
        });
    }

    setCallbacks(cb) {
        const addOrReplace = (key, fn) => {
            if (typeof fn !== 'function') return;
            const tag  = cb._tag || null;
            const list = this._callbacks[key] || (this._callbacks[key] = []);
            if (tag) {
                const tagged = fn;
                tagged._tag  = tag;
                const idx    = list.findIndex(f => f._tag === tag);
                if (idx >= 0) list[idx] = tagged;
                else          list.push(tagged);
            } else {
                list.push(fn);
            }
        };
        if (cb.onLightChange)      addOrReplace('onLightChange',      cb.onLightChange);
        if (cb.onBrightnessUpdate) addOrReplace('onBrightnessUpdate', cb.onBrightnessUpdate);
    }

    getBrightness() { return this.lastBrightness; }
    getCondition()  { return this.lastCondition; }

    destroy() { this.stopAnalysis(); }
}

const lightAnalyzer = new LightAnalyzer();
