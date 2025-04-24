class MindfulApp {
    constructor() {
        this.cameraManager = new CameraManager();
        this.featureExtractor = new FeatureExtractor();
        this.isProcessing = false;
        this.lastAlertTime = 0;
        
        this.initializeEventListeners();
        this.startMonitoring();
    }

    initializeEventListeners() {
        // Enterキーのイベントリスナー
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                this.featureExtractor.recordFocusing();
            }
        });
    }

    startMonitoring() {
        this.cameraManager.onFaceLandmarks((landmarks) => {
            // 特徴量の抽出
            const features = this.featureExtractor.extractFeatures(landmarks);
            
            if (features && !this.isProcessing) {
                this.checkMindWandering();
            }
        });
    }

    checkMindWandering() {
        if (this.featureExtractor.isMindWandering()) {
            // アラートを表示せず、コンソールにログのみ出力
            console.log('Mind Wandering Detected');
        }
    }
}

// アプリケーションの起動
document.addEventListener('DOMContentLoaded', () => {
    new MindfulApp();
});
