const cloudCanvas = document.getElementById('clouds-canvas');
const cloudCtx = cloudCanvas.getContext('2d', { alpha: true, desynchronized: true });
let clouds = new Map();
let cloudCover = 0;
let cloudWorker;

let cloudsReady = false;
let expectedCloudsCount = 0;
let renderedCloudsCount = 0;

function initCloudWorker() {
    cloudWorker = new Worker('cloud-worker.js');

    cloudWorker.onmessage = function(e) {
        const { type, id, bitmap, centerX, centerY, x, y, positions, ids } = e.data;

        switch (type) {
            case 'cloudRendered':
                clouds.set(id, { bitmap, centerX, centerY, x: x, y: y });
                renderedCloudsCount++;
                if (renderedCloudsCount === expectedCloudsCount) {
                    cloudsReady = true;
                }
                break;
            case 'update':
                positions.forEach(pos => {
                    const cloud = clouds.get(pos.id);
                    if (cloud) {
                        cloud.x = pos.x;
                        cloud.y = pos.y;
                    }
                });
                break;
            case 'removeClouds':
                ids.forEach(id => {
                    clouds.delete(id);
                });
                renderedCloudsCount = clouds.size;
                expectedCloudsCount = clouds.size;
                cloudsReady = (renderedCloudsCount === expectedCloudsCount);
                break;
        }
    };
}

function resizeCloudCanvas() {
    cloudCanvas.width = window.innerWidth;
    cloudCanvas.height = cloudCanvas.parentElement.offsetHeight;
    if (cloudWorker) {
        cloudWorker.postMessage({
            type: 'resize',
            data: {
                width: cloudCanvas.width,
                height: cloudCanvas.height
            }
        });
    }
}

function initClouds() {
    resizeCloudCanvas();
    if (cloudWorker) {
        expectedCloudsCount = Math.ceil((cloudCover / 100) * 25);
        renderedCloudsCount = 0;
        cloudsReady = false;

        cloudWorker.postMessage({
            type: 'init',
            data: {
                width: cloudCanvas.width,
                height: cloudCanvas.height,
                cloudCover: cloudCover
            }
        });
    }
}

function animateClouds() {
    cloudCtx.clearRect(0, 0, cloudCanvas.width, cloudCanvas.height);
    if (cloudsReady) {
        for (const [id, cloud] of clouds) {
            if (cloud.bitmap) {
                cloudCtx.drawImage(
                    cloud.bitmap,
                    cloud.x - cloud.centerX,
                    cloud.y - cloud.centerY
                );
            }
        }
    }
    requestAnimationFrame(animateClouds);
}

function updateCloudCover(newCloudCover) {
    cloudCover = newCloudCover;
    if (cloudWorker) {
        const newExpectedCloudsCount = Math.ceil((newCloudCover / 100) * 25);
        if (newExpectedCloudsCount !== expectedCloudsCount) {
            cloudsReady = false;
            renderedCloudsCount = 0;
            expectedCloudsCount = newExpectedCloudsCount;
        }

        cloudWorker.postMessage({
            type: 'updateCloudCover',
            data: {
                cloudCover: newCloudCover
            }
        });
    }
}

function updateWind(weatherData) {
    if (cloudWorker) {
        cloudWorker.postMessage({
            type: 'updateWind',
            data: weatherData
        });
    }
}

window.addEventListener('resize', resizeCloudCanvas);
document.addEventListener('DOMContentLoaded', () => {
    initCloudWorker();
    initClouds();
    animateClouds();
});