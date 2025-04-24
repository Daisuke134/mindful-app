class CameraManager {
    constructor() {
        this.video = document.getElementById('video');
        this.faceMesh = new FaceMesh({
            locateFile: (file) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
            }
        });

        this.faceMesh.setOptions({
            maxNumFaces: 1,
            refineLandmarks: true,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
        });

        this.initCamera();
    }

    async initCamera() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: 640,
                    height: 480,
                    facingMode: 'user'
                }
            });
            this.video.srcObject = stream;
        } catch (error) {
            console.error('カメラの初期化に失敗しました:', error);
        }
    }

    onFaceLandmarks(callback) {
        this.faceMesh.onResults((results) => {
            if (results.multiFaceLandmarks) {
                callback(results.multiFaceLandmarks[0]);
            }
        });

        const camera = new Camera(this.video, {
            onFrame: async () => {
                await this.faceMesh.send({image: this.video});
            },
            width: 640,
            height: 480
        });
        camera.start();
    }
}
