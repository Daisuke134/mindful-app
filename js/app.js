// MediaPipeの設定
const faceMesh = new FaceMesh({
    locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
    }
});

// カメラの設定
const camera = new Camera(document.querySelector('video'), {
    onFrame: async () => {
        await faceMesh.send({ image: document.querySelector('video') });
    },
    width: 640,
    height: 480
});

// 特徴抽出器のインスタンス化
const featureExtractor = new FeatureExtractor();
const mindWanderingPredictor = new MindWanderingPredictor();

// MediaPipeの結果を処理
faceMesh.onResults((results) => {
    if (results.multiFaceLandmarks) {
        const features = featureExtractor.extractFeatures(results.multiFaceLandmarks[0]);
        // デバッグパネルを更新
        featureExtractor.updateDebugPanel(features);
        
        // Mind Wanderingの検出
        const isMindWandering = mindWanderingPredictor.predict(features);
        document.getElementById('mind-wandering-score').textContent = 
            (features.eyeMovementSpeed > mindWanderingPredictor.thresholds.eyeMovementSpeed && 
             features.pupilAsymmetry > mindWanderingPredictor.thresholds.pupilAsymmetry) ? "1.000" : "0.000";
        document.getElementById('is-mind-wandering').textContent = isMindWandering ? "Yes" : "No";
    }
});

// カメラを開始
camera.start();
