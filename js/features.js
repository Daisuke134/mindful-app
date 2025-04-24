class FeatureExtractor {
    constructor() {
        // 目のランドマークのインデックス
        this.LEFT_EYE_INDICES = [362, 385, 387, 263, 373, 380];
        this.RIGHT_EYE_INDICES = [33, 160, 158, 133, 153, 144];
        
        // 顔の向きを計算するためのランドマーク
        this.FACE_OVAL = [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109];

        // 目の周りのランドマーク（左目）
        this.LEFT_EYE_MESH = [
            362, 382, 381, 380, 374, 373, 390, 249, 263,
            466, 388, 387, 386, 385, 384, 398
        ];
        
        // 目の周りのランドマーク（右目）
        this.RIGHT_EYE_MESH = [
            33, 7, 163, 144, 145, 153, 154, 155, 133,
            173, 157, 158, 159, 160, 161, 246
        ];

        // 瞳孔関連のランドマーク
        this.LEFT_PUPIL = [468, 469, 470, 471, 472];
        this.RIGHT_PUPIL = [473, 474, 475, 476, 477];
        
        // 目の周りのランドマーク（まぶた、目尻など）
        this.LEFT_EYE_DETAIL = [362, 382, 381, 380, 374, 373, 390, 249, 263, 466, 388, 387, 386, 385, 384, 398];
        this.RIGHT_EYE_DETAIL = [33, 7, 163, 144, 145, 153, 154, 155, 133, 246, 161, 160, 159, 158, 157, 173];

        // データ保存用の配列
        this.sessionData = [];  // セッション全体のデータを保持
        this.recentFeatures = {
            timestamp: 0,
            leftEyeOpenness: 0,
            rightEyeOpenness: 0,
            averageEyeOpenness: 0,
            faceTilt: 0,
            faceRotation: 0,
            blinkCount: 0,
            fps: 0,
            eyeAsymmetry: 0,
            blinkInterval: 0,
            leftPupilSize: 0,
            rightPupilSize: 0,
            averagePupilSize: 0,
            pupilAsymmetry: 0,
            eyeMovementSpeed: 0,
            eyeMovementDirection: 0,
            faceExpressionNeutral: 0,
            faceExpressionTension: 0,
            mindWanderingScore: 0,
            isMindWandering: false
        }; // 最新のデータを保持
        this.focusingPeriods = []; // focusing期間を記録
        this.streamingInterval = 100;  // 100ms毎にデータを記録
        this.sessionStartTime = Date.now();

        // 瞬き検出用の変数
        this.blinkHistory = [];
        this.lastBlinkTime = Date.now();
        this.frameCount = 0;
        this.lastFPSUpdate = Date.now();
        this.currentFPS = 0;

        // Mind Wandering検出用の変数
        this.lastLandmarks = null;
        this.lastBlinkTime = Date.now();
        this.blinkCount = 0;
        this.lastEyePosition = null;
        this.mindWanderingPredictor = new MindWanderingPredictor();
        this.mindWanderingScoreHistory = [];
        this.mindWanderingWindowSize = 30; // 30フレーム（約1秒）の移動平均

        // データストリーミングを開始
        this.startDataCollection();

        // 保存ボタンを追加
        this.addSaveButton();
    }

    // 保存ボタンを追加
    addSaveButton() {
        const button = document.createElement('button');
        button.textContent = 'セッションデータを保存';
        button.className = 'save-button';
        button.onclick = () => this.saveSessionData();
        document.body.appendChild(button);
    }

    // セッションデータを保存
    saveSessionData() {
        if (this.sessionData.length === 0) return;

        // CSVヘッダー
        const headers = [
            'timestamp',
            'label',
            'leftEyeOpenness',
            'rightEyeOpenness',
            'averageEyeOpenness',
            'eyeAsymmetry',
            'blinkInterval',
            'faceTilt',
            'faceRotation',
            'fps',
            'leftPupilSize',
            'rightPupilSize',
            'averagePupilSize',
            'pupilAsymmetry',
            'eyeMovementSpeed',
            'eyeMovementDirection',
            'faceExpressionNeutral',
            'faceExpressionTension',
            'mindWanderingScore',
            'isMindWandering'
        ];

        // データを CSV 形式に変換
        const csvRows = [headers.join(',')];
        
        this.sessionData.forEach(data => {
            const row = [
                new Date(data.timestamp).toISOString(),
                this.determineLabel(data.timestamp),
                data.leftEyeOpenness,
                data.rightEyeOpenness,
                data.averageEyeOpenness,
                data.eyeAsymmetry,
                data.blinkInterval || '',
                data.faceTilt,
                data.faceRotation,
                data.fps,
                data.leftPupilSize,
                data.rightPupilSize,
                data.averagePupilSize,
                data.pupilAsymmetry,
                data.eyeMovementSpeed,
                data.eyeMovementDirection,
                data.faceExpressionNeutral,
                data.faceExpressionTension,
                data.mindWanderingScore,
                data.isMindWandering
            ];
            csvRows.push(row.join(','));
        });

        const csvContent = csvRows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        a.href = url;
        a.download = `attention_data_${timestamp}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        // 保存状態を表示
        document.getElementById('current-state').textContent = 'データ保存完了';
        setTimeout(() => {
            document.getElementById('current-state').textContent = '監視中';
        }, 1000);
    }

    // データ収集を開始
    startDataCollection() {
        setInterval(() => {
            if (this.recentFeatures) {
                const label = this.determineLabel(this.recentFeatures.timestamp);
                
                // ラベル情報を表示
                document.getElementById('current-label').textContent = 
                    label === 'focusing' ? '集中中' : '通常';
                
                // データ数を表示
                document.getElementById('data-count').textContent = this.sessionData.length;
            }
        }, this.streamingInterval);
    }

    // Enterキーが押されたときのfocusingデータを記録
    recordFocusing() {
        if (this.recentFeatures) {
            const startTime = Date.now();
            const endTime = startTime + 1000;  // 1秒間
            this.focusingPeriods.push({ start: startTime, end: endTime });

            // 記録回数を更新
            document.getElementById('record-count').textContent = this.focusingPeriods.length;
            
            // 状態を表示
            document.getElementById('current-state').textContent = 'Focusing記録完了';
            setTimeout(() => {
                document.getElementById('current-state').textContent = '監視中';
            }, 1000);
        }
    }

    // 定期的なデータ保存を開始
    startPeriodicSave() {
        setInterval(() => {
            this.saveDataToFile();
        }, this.saveInterval);
    }

    // データをファイルに保存
    saveDataToFile() {
        if (!this.recentFeatures) return;

        // 前回の保存以降の新しいデータのみを対象にする
        const newFeatures = this.sessionData.filter(f => f.timestamp > this.lastSaveTime);
        if (newFeatures.length === 0) return;

        const dataToSave = newFeatures.map(features => {
            return {
                timestamp: new Date(features.timestamp).toISOString(),
                label: this.determineLabel(features.timestamp),
                features: {
                    leftEyeOpenness: features.leftEyeOpenness,
                    rightEyeOpenness: features.rightEyeOpenness,
                    averageEyeOpenness: features.averageEyeOpenness,
                    eyeAsymmetry: features.eyeAsymmetry,
                    blinkInterval: features.blinkInterval,
                    faceTilt: features.faceTilt,
                    faceRotation: features.faceRotation,
                    fps: features.fps,
                    leftPupilSize: features.leftPupilSize,
                    rightPupilSize: features.rightPupilSize,
                    averagePupilSize: features.averagePupilSize,
                    pupilAsymmetry: features.pupilAsymmetry,
                    eyeMovementSpeed: features.eyeMovementSpeed,
                    eyeMovementDirection: features.eyeMovementDirection,
                    faceExpressionNeutral: features.faceExpressionNeutral,
                    faceExpressionTension: features.faceExpressionTension,
                    mindWanderingScore: features.mindWanderingScore,
                    isMindWandering: features.isMindWandering
                }
            };
        });

        // データを文字列に変換（JSONLines形式）
        const jsonLines = dataToSave.map(data => JSON.stringify(data)).join('\n') + '\n';

        // Blobを作成
        const blob = new Blob([jsonLines], { type: 'application/x-jsonlines' });

        // ダウンロードリンクを作成
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = this.dataFilename;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(a.href);

        // 最後の保存時刻を更新
        this.lastSaveTime = Date.now();
        
        // 保存状態を表示
        document.getElementById('current-state').textContent = 'データ保存完了';
        setTimeout(() => {
            document.getElementById('current-state').textContent = '監視中';
        }, 1000);
    }

    // 現在の時刻のラベルを判定
    determineLabel(timestamp) {
        // いずれかのfocusing期間に含まれているかチェック
        const isFocusing = this.focusingPeriods.some(period => 
            timestamp >= period.start && timestamp <= period.end
        );
        return isFocusing ? 'focusing' : 'normal';
    }

    // 目の開き具合を計算
    calculateEyeOpenness(landmarks, indices) {
        const points = indices.map(index => landmarks[index]);
        
        // 上下の点の距離を計算
        const topPoint = points[1];
        const bottomPoint = points[5];
        const distance = Math.sqrt(
            Math.pow(topPoint.y - bottomPoint.y, 2) +
            Math.pow(topPoint.x - bottomPoint.x, 2)
        );
        
        return distance;
    }

    // 顔の傾きを計算（上下）
    calculateFaceTilt(landmarks) {
        const nose = landmarks[1];  // 鼻先
        const chin = landmarks[152];  // あご
        const forehead = landmarks[10];  // 額
        
        const angle = Math.atan2(chin.y - forehead.y, chin.x - forehead.x) * 180 / Math.PI;
        return angle;
    }

    // 顔の回転を計算（左右）
    calculateFaceRotation(landmarks) {
        const leftEye = landmarks[33];  // 左目
        const rightEye = landmarks[263];  // 右目
        
        const angle = Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x) * 180 / Math.PI;
        return angle;
    }

    // まばたきを検出
    detectBlink(leftEyeOpenness, rightEyeOpenness) {
        const threshold = 0.1;  // まばたき検出の閾値
        const avgOpenness = (leftEyeOpenness + rightEyeOpenness) / 2;
        
        if (avgOpenness < threshold) {
            const currentTime = Date.now();
            if (currentTime - this.lastBlinkTime > 200) {  // 最小間隔200ms
                this.blinkHistory.push(currentTime);
                this.lastBlinkTime = currentTime;
                
                // 3秒以上前のまばたきを削除
                this.blinkHistory = this.blinkHistory.filter(time => 
                    currentTime - time <= 3000
                );
            }
        }
    }

    // FPSを計算
    updateFPS() {
        this.frameCount++;
        const currentTime = Date.now();
        const elapsed = currentTime - this.lastFPSUpdate;
        
        if (elapsed >= 1000) {  // 1秒ごとに更新
            this.currentFPS = Math.round(this.frameCount * 1000 / elapsed);
            this.frameCount = 0;
            this.lastFPSUpdate = currentTime;
        }
    }

    // 目の周りの特徴量を計算
    calculateEyeFeatures(landmarks) {
        const leftEyeMeshPoints = this.LEFT_EYE_MESH.map(index => landmarks[index]);
        const rightEyeMeshPoints = this.RIGHT_EYE_MESH.map(index => landmarks[index]);
        
        // 目の周りの面積を計算
        const leftEyeArea = this.calculateEyeArea(leftEyeMeshPoints);
        const rightEyeArea = this.calculateEyeArea(rightEyeMeshPoints);
        
        // 左右の目の非対称性
        const eyeAsymmetry = Math.abs(leftEyeArea - rightEyeArea) / ((leftEyeArea + rightEyeArea) / 2);
        
        // まばたきの間隔を計算
        const currentTime = Date.now();
        const recentBlinks = this.blinkHistory.filter(time => currentTime - time <= 5000);
        const avgBlinkInterval = recentBlinks.length > 1 ? 
            (recentBlinks[recentBlinks.length - 1] - recentBlinks[0]) / (recentBlinks.length - 1) : 0;
        
        return {
            leftEyeArea,
            rightEyeArea,
            eyeAsymmetry,
            avgBlinkInterval
        };
    }

    // 目の領域の面積を計算
    calculateEyeArea(points) {
        let area = 0;
        for (let i = 0; i < points.length; i++) {
            const j = (i + 1) % points.length;
            area += points[i].x * points[j].y - points[j].x * points[i].y;
        }
        return Math.abs(area) / 2;
    }

    // 顔の特徴量を抽出
    extractFeatures(landmarks) {
        if (!landmarks) return null;

        const leftEyeOpenness = this.calculateEyeOpenness(landmarks, this.LEFT_EYE_INDICES);
        const rightEyeOpenness = this.calculateEyeOpenness(landmarks, this.RIGHT_EYE_INDICES);
        const faceTilt = this.calculateFaceTilt(landmarks);
        const faceRotation = this.calculateFaceRotation(landmarks);
        const eyeFeatures = this.calculateEyeFeatures(landmarks);
        
        // 新しい特徴量を計算
        const leftPupilSize = this.calculatePupilSize(landmarks, this.LEFT_PUPIL);
        const rightPupilSize = this.calculatePupilSize(landmarks, this.RIGHT_PUPIL);
        const eyeMovement = this.calculateEyeMovement(landmarks);
        const faceExpression = this.calculateFaceExpression(landmarks);

        this.detectBlink(leftEyeOpenness, rightEyeOpenness);
        this.updateFPS();

        const features = {
            timestamp: Date.now(),
            leftEyeOpenness,
            rightEyeOpenness,
            averageEyeOpenness: (leftEyeOpenness + rightEyeOpenness) / 2,
            faceTilt,
            faceRotation,
            blinkCount: this.blinkHistory.length,
            fps: this.currentFPS,
            eyeAsymmetry: Math.abs(leftEyeOpenness - rightEyeOpenness),
            blinkInterval: eyeFeatures.avgBlinkInterval,
            // 新しい特徴量を追加
            leftPupilSize,
            rightPupilSize,
            averagePupilSize: (leftPupilSize + rightPupilSize) / 2,
            pupilAsymmetry: Math.abs(leftPupilSize - rightPupilSize),
            eyeMovementSpeed: eyeMovement.speed,
            eyeMovementDirection: eyeMovement.direction,
            faceExpressionNeutral: faceExpression.neutral,
            faceExpressionTension: faceExpression.tension
        };

        // Mind Wanderingスコアの計算と追加
        const mindWanderingState = this.calculateMindWanderingScore(features);
        features.mindWanderingScore = mindWanderingState.averageScore;
        features.isMindWandering = mindWanderingState.isMindWandering;

        this.recentFeatures = features;
        this.sessionData.push(features);
        
        this.updateDebugPanel(features);
        
        return features;
    }

    // 瞳孔の大きさを計算
    calculatePupilSize(landmarks, indices) {
        if (!landmarks || !indices) return 0;
        
        // 瞳孔の輪郭点から面積を計算
        const points = indices.map(i => landmarks[i]);
        const area = this.calculatePolygonArea(points);
        return Math.sqrt(area); // 直径として返す
    }

    // 目の動きを計算
    calculateEyeMovement(landmarks) {
        if (!landmarks) return { speed: 0, direction: 0 };
        
        // 左右の目の中心点の移動を計算
        const leftCenter = this.calculateEyeCenter(landmarks, this.LEFT_EYE_DETAIL);
        const rightCenter = this.calculateEyeCenter(landmarks, this.RIGHT_EYE_DETAIL);
        
        // 前回の位置との差から速度と方向を計算
        if (!this.lastEyePosition) {
            this.lastEyePosition = { left: leftCenter, right: rightCenter };
            return { speed: 0, direction: 0 };
        }
        
        const leftDiff = {
            x: leftCenter.x - this.lastEyePosition.left.x,
            y: leftCenter.y - this.lastEyePosition.left.y
        };
        const rightDiff = {
            x: rightCenter.x - this.lastEyePosition.right.x,
            y: rightCenter.y - this.lastEyePosition.right.y
        };
        
        // 平均の移動速度と方向を計算
        const speed = Math.sqrt(
            (Math.pow(leftDiff.x, 2) + Math.pow(leftDiff.y, 2) +
             Math.pow(rightDiff.x, 2) + Math.pow(rightDiff.y, 2)) / 2
        );
        const direction = Math.atan2((leftDiff.y + rightDiff.y) / 2, (leftDiff.x + rightDiff.x) / 2);
        
        this.lastEyePosition = { left: leftCenter, right: rightCenter };
        return { speed, direction };
    }

    // 顔の表情を計算
    calculateFaceExpression(landmarks) {
        if (!landmarks) return { neutral: 1, tension: 0 };
        
        // 目の周りの筋肉の緊張度を計算
        const leftEyeTension = this.calculateMuscleTension(landmarks, this.LEFT_EYE_DETAIL);
        const rightEyeTension = this.calculateMuscleTension(landmarks, this.RIGHT_EYE_DETAIL);
        
        const tension = (leftEyeTension + rightEyeTension) / 2;
        return {
            neutral: 1 - tension,
            tension: tension
        };
    }

    // 多角形の面積を計算（瞳孔サイズ計算用）
    calculatePolygonArea(points) {
        let area = 0;
        for (let i = 0; i < points.length; i++) {
            const j = (i + 1) % points.length;
            area += points[i].x * points[j].y;
            area -= points[j].x * points[i].y;
        }
        return Math.abs(area) / 2;
    }

    // 目の中心点を計算
    calculateEyeCenter(landmarks, indices) {
        const points = indices.map(i => landmarks[i]);
        const x = points.reduce((sum, p) => sum + p.x, 0) / points.length;
        const y = points.reduce((sum, p) => sum + p.y, 0) / points.length;
        return { x, y };
    }

    // 筋肉の緊張度を計算
    calculateMuscleTension(landmarks, indices) {
        const points = indices.map(i => landmarks[i]);
        let tension = 0;
        
        // 隣接する点間の距離の変化から緊張度を推定
        for (let i = 0; i < points.length; i++) {
            const j = (i + 1) % points.length;
            const dist = Math.sqrt(
                Math.pow(points[i].x - points[j].x, 2) +
                Math.pow(points[i].y - points[j].y, 2)
            );
            tension += dist;
        }
        
        return tension / points.length;
    }

    // Mind Wanderingスコアを計算
    calculateMindWanderingScore(features) {
        // MLモデルを使用して予測
        const isMindWandering = this.mindWanderingPredictor.predict(features);
        
        // デバッグ出力のみ
        console.log(`Mind Wandering Detected: ${isMindWandering}`);

        return {
            instantScore: isMindWandering ? 1 : 0,
            averageScore: isMindWandering ? 1 : 0,
            isMindWandering: isMindWandering
        };
    }

    // デバッグパネルの更新
    updateDebugPanel(features) {
        if (!features) return;
        
        document.getElementById('left-eye').textContent = features.leftEyeOpenness.toFixed(3);
        document.getElementById('right-eye').textContent = features.rightEyeOpenness.toFixed(3);
        document.getElementById('eye-asymmetry').textContent = features.eyeAsymmetry.toFixed(3);
        document.getElementById('blink-interval').textContent = features.blinkInterval ? Math.round(features.blinkInterval) : '計測中';
        document.getElementById('face-tilt').textContent = features.faceTilt.toFixed(1) + '°';
        document.getElementById('face-rotation').textContent = features.faceRotation.toFixed(1) + '°';
        document.getElementById('blink-rate').textContent = features.blinkCount;
        document.getElementById('fps').textContent = features.fps;
        
        // 新しい特徴量の表示を追加
        document.getElementById('pupil-size').textContent = features.averagePupilSize.toFixed(3);
        document.getElementById('pupil-asymmetry').textContent = features.pupilAsymmetry.toFixed(3);
        document.getElementById('eye-movement').textContent = features.eyeMovementSpeed.toFixed(3);
        document.getElementById('face-expression').textContent = features.faceExpressionNeutral.toFixed(3);
        document.getElementById('mind-wandering-score').textContent = features.mindWanderingScore.toFixed(3);
        document.getElementById('is-mind-wandering').textContent = features.isMindWandering ? 'Yes' : 'No';
    }

    // 現在の状態がFocusingから外れているかを判定
    isMindWandering() {
        if (!this.recentFeatures) return false;
        if (this.focusingPeriods.length < 3) return false;

        // MindWanderingPredictorの判定を使用
        return this.mindWanderingPredictor.predict({
            eyeMovementSpeed: this.recentFeatures.eyeMovementSpeed,
            pupilAsymmetry: this.recentFeatures.pupilAsymmetry
        });
    }

    // Focusingデータの平均を計算
    calculateFocusingAverage() {
        // 最新の10個のデータのみを使用
        const recentPeriods = this.focusingPeriods.slice(-10);
        const allData = recentPeriods.flatMap(period => 
            this.sessionData.filter(feature => 
                feature.timestamp >= period.start && feature.timestamp <= period.end
            )
        );

        if (allData.length === 0) return {
            averageEyeOpenness: 0,
            eyeAsymmetry: 0,
            avgBlinkInterval: 0
        };

        return {
            averageEyeOpenness: allData.reduce((sum, f) => sum + f.averageEyeOpenness, 0) / allData.length,
            eyeAsymmetry: allData.reduce((sum, f) => sum + f.eyeAsymmetry, 0) / allData.length,
            avgBlinkInterval: allData.reduce((sum, f) => sum + f.blinkInterval, 0) / allData.length
        };
    }
}
