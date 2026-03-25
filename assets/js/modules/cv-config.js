let CV_CONFIG = {
  model: {
    base: "lite_mobilenet_v2",
    inputSize: 300,
  },
  detection: {
    minConfidence: 0.6,
    targetClasses: ["person"],
    maxDetections: 20,
    interval: 300,
    debounceTime: 1500,
  },
  light: {
    darkThreshold: 0.30,
    brightThreshold: 0.70,
    sampleSize: 64,
    analysisInterval: 1500,
  },
  ui: {
    showBoundingBoxes: true,
    showDebugInfo: true,
    overlayColor: "#0ea5e9",
    boxColors: {
      person: "#0ea5e9",
      default: "#f59e0b",
    },
    fontSize: 11,
    fontFamily: "Plus Jakarta Sans, sans-serif",
  },
};
