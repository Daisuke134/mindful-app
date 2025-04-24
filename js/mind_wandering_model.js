// Mind Wandering予測モデル
class MindWanderingPredictor {
    constructor() {
        this.lastPredictionTime = Date.now();
        this.predictionInterval = 1000; // 1秒ごとに予測

        // 閾値を設定
        this.thresholds = {
            eyeMovementSpeed: 0.000680,
            pupilAsymmetry: 0.000950
        };
    }

    predict(features) {
        const now = Date.now();
        
        // 1秒経過していない場合は前回の結果を使用
        if (now - this.lastPredictionTime < this.predictionInterval) {
            return false;
        }
        
        this.lastPredictionTime = now;

        // デバッグ出力
        console.log('Current Features:', features);
        console.log('Thresholds:', this.thresholds);

        // Mind Wanderingの検出（eyeMovementSpeedとpupilAsymmetryの両方が閾値を超えた場合）
        const isMindWandering = (
            features.eyeMovementSpeed > this.thresholds.eyeMovementSpeed && 
            features.pupilAsymmetry > this.thresholds.pupilAsymmetry
        );

        // デバッグ出力
        console.log('Mind Wandering Detected:', isMindWandering);
        
        // アラート表示の制御
        this.handleMindWandering(isMindWandering);
        
        return isMindWandering;
    }

    handleMindWandering(isMindWandering) {
        const alertBox = document.getElementById('mw-alert');
        if (!alertBox) return;

        if (isMindWandering) {
            alertBox.style.display = 'block';
            console.log('MW検出: アラート表示');
            
            // 正確に1秒後に非表示
            setTimeout(() => {
                alertBox.style.display = 'none';
                console.log('アラート非表示');
            }, 1000);
        }
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { MindWanderingPredictor };
}
