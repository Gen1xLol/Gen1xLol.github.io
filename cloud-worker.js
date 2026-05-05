// cloud-worker.js

// This is a simplified NoiseGenerator for the worker.
// The full implementation will be moved here.
let noise;

// This will hold the full Cloud objects
let clouds = [];
let cloudCover = 0;
let windSpeed = 0;
let windGusts = 0;
let canvasWidth = 0;
let canvasHeight = 0;

class NoiseGenerator {
    constructor(seed = 12345) {
        this.seed = seed;
        this.permutation = new Array(512);
        for (let i = 0; i < 256; i++) {
            this.permutation[i] = i;
        }
        // Shuffle with seed
        for (let i = 255; i > 0; i--) {
            const j = Math.floor(((seed + i) * 9301 + 49297) % 233280 / 233280 * (i + 1));
            [this.permutation[i], this.permutation[j]] = [this.permutation[j], this.permutation[i]];
        }
        for (let i = 0; i < 256; i++) {
            this.permutation[256 + i] = this.permutation[i];
        }
    }
    
    fade(t) {
        return t * t * t * (t * (t * 6 - 15) + 10);
    }
    
    lerp(a, b, t) {
        return a + t * (b - a);
    }
    
    grad(hash, x, y) {
        const h = hash & 3;
        return ((h & 1) ? -x : x) + ((h & 2) ? -y : y);
    }
    
    noise(x, y) {
        const X = Math.floor(x) & 255;
        const Y = Math.floor(y) & 255;
        
        x -= Math.floor(x);
        y -= Math.floor(y);
        
        const u = this.fade(x);
        const v = this.fade(y);
        
        const a = this.permutation[X] + Y;
        const b = this.permutation[X + 1] + Y;
        
        return this.lerp(
            this.lerp(this.grad(this.permutation[a], x, y),
                     this.grad(this.permutation[b], x - 1, y), u),
            this.lerp(this.grad(this.permutation[a + 1], x, y - 1),
                     this.grad(this.permutation[b + 1], x - 1, y - 1), u),
            v
        ) * 0.5 + 0.5;
    }
    
    fbm(x, y, octaves = 5, persistence = 0.5, lacunarity = 2.0) {
        let total = 0;
        let frequency = 1;
        let amplitude = 1;
        let maxValue = 0;
        
        for (let i = 0; i < octaves; i++) {
            total += this.noise(x * frequency, y * frequency) * amplitude;
            maxValue += amplitude;
            amplitude *= persistence;
            frequency *= lacunarity;
        }
        
        return total / maxValue;
    }
}

class Cloud {
    constructor(id) {
        this.id = id;
        this.x = Math.random() * canvasWidth;
        this.y = Math.random() * canvasHeight;
        this.baseRadius = Math.random() * 60 + 40;
        this.baseOpacity = Math.random() * 0.25 + 0.5;
        this.depth = Math.random() * 0.4 + 0.6;
        this.lightAngle = Math.random() * Math.PI * 2;
        this.seed = Math.random() * 100000;
        this.time = Math.random() * 1000;
        
        this.blobs = [];
        const numBlobs = Math.floor(Math.random() * 8) + 14;
        
        for (let i = 0; i < numBlobs; i++) {
            const angle = (i / numBlobs) * Math.PI * 2 + (Math.random() - 0.5) * 1.2;
            const distVariation = noise.fbm(i * 0.5 + this.seed, 0, 3);
            const dist = (distVariation * 0.8 + 0.2) * this.baseRadius * 1.8;
            
            this.blobs.push({
                x: Math.cos(angle) * dist,
                y: Math.sin(angle) * dist * 0.55,
                size: Math.random() * this.baseRadius * 1.5 + this.baseRadius * 0.3,
                irregularity: Math.random() * 0.5 + 0.4,
                density: Math.random() * 0.4 + 0.6,
                lightFacing: Math.random() * 0.6 + 0.4,
                noiseOffset: Math.random() * 100,
                softness: Math.random() * 0.3 + 0.7
            });
        }
        
        const maxExtent = this.baseRadius * 5;
        this.offscreenCanvas = new OffscreenCanvas(maxExtent * 2, maxExtent * 2);
        this.centerX = maxExtent;
        this.centerY = maxExtent;
        
        this.renderToOffscreen();
    }
    
    drawSoftBlob(ctx, x, y, size, irregularity, noiseOffset) {
        const points = 24;
        const coords = [];
        
        for (let i = 0; i <= points; i++) {
            const angle = (i / points) * Math.PI * 2;
            const noiseVal = noise.fbm(
                Math.cos(angle) * 2 + this.seed + noiseOffset,
                Math.sin(angle) * 2 + this.seed + noiseOffset,
                4,
                0.6,
                2.1
            );
            const radiusVariation = 1 + (noiseVal - 0.5) * irregularity;
            const r = size * radiusVariation;
            coords.push({
                x: x + Math.cos(angle) * r,
                y: y + Math.sin(angle) * r * 0.6,
                angle: angle
            });
        }
        
        ctx.beginPath();
        ctx.moveTo(coords[0].x, coords[0].y);
        
        for (let i = 1; i < coords.length; i++) {
            const prev = coords[i - 1];
            const curr = coords[i];
            const tension = 0.4;
            
            const cp1x = prev.x + Math.cos(prev.angle + Math.PI * 0.5) * size * tension;
            const cp1y = prev.y + Math.sin(prev.angle + Math.PI * 0.5) * size * tension * 0.6;
            const cp2x = curr.x - Math.cos(curr.angle + Math.PI * 0.5) * size * tension;
            const cp2y = curr.y - Math.sin(curr.angle + Math.PI * 0.5) * size * tension * 0.6;
            
            ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, curr.x, curr.y);
        }
        
        ctx.closePath();
    }
    
    renderToOffscreen() {
        const ctx = this.offscreenCanvas.getContext('2d', { alpha: true });
        ctx.clearRect(0, 0, this.offscreenCanvas.width, this.offscreenCanvas.height);
        
        const lightX = Math.cos(this.lightAngle);
        const lightY = Math.sin(this.lightAngle);
        
        const sortedBlobs = [...this.blobs].sort((a, b) => b.size - a.size);
        
        ctx.globalCompositeOperation = 'source-over';
        
        ctx.filter = 'blur(18px)';
        sortedBlobs.forEach((blob, idx) => {
            if (idx % 2 === 0) {
                const x = this.centerX + blob.x + lightX * blob.size * 0.15;
                const y = this.centerY + blob.y + lightY * blob.size * 0.15 + blob.size * 0.4;
                
                ctx.save();
                this.drawSoftBlob(ctx, x, y, blob.size * 0.85, blob.irregularity * 0.8, blob.noiseOffset);
                
                const gradient = ctx.createRadialGradient(x, y, 0, x, y, blob.size * 1.3);
                const shadowAlpha = this.baseOpacity * blob.density * 0.15;
                gradient.addColorStop(0, `rgba(140, 150, 180, ${shadowAlpha})`);
                gradient.addColorStop(0.5, `rgba(170, 180, 200, ${shadowAlpha * 0.6})`);
                gradient.addColorStop(1, `rgba(200, 205, 215, 0)`);
                
                ctx.fillStyle = gradient;
                ctx.fill();
                ctx.restore();
            }
        });
        
        ctx.filter = 'blur(10px)';
        sortedBlobs.forEach((blob, idx) => {
            if (idx % 3 === 0) {
                const x = this.centerX + blob.x + lightX * blob.size * 0.08;
                const y = this.centerY + blob.y + lightY * blob.size * 0.08 + blob.size * 0.25;
                
                ctx.save();
                this.drawSoftBlob(ctx, x, y, blob.size * 0.9, blob.irregularity * 0.9, blob.noiseOffset + 20);
                
                const gradient = ctx.createRadialGradient(x, y, 0, x, y, blob.size * 1.1);
                const shadowAlpha = this.baseOpacity * blob.density * 0.18;
                gradient.addColorStop(0, `rgba(160, 170, 195, ${shadowAlpha})`);
                gradient.addColorStop(0.6, `rgba(190, 195, 210, ${shadowAlpha * 0.5})`);
                gradient.addColorStop(1, `rgba(210, 215, 225, 0)`);
                
                ctx.fillStyle = gradient;
                ctx.fill();
                ctx.restore();
            }
        });
        
        ctx.filter = 'blur(5px)';
        sortedBlobs.forEach(blob => {
            const x = this.centerX + blob.x;
            const y = this.centerY + blob.y;
            
            const angle = Math.atan2(blob.y, blob.x);
            const lightDot = Math.cos(angle - this.lightAngle) * 0.5 + 0.5;
            const illumination = Math.pow(lightDot, 1.5) * blob.lightFacing;
            
            ctx.save();
            this.drawSoftBlob(ctx, x, y, blob.size, blob.irregularity, blob.noiseOffset);
            
            const gx = x - blob.size * 0.4 * lightX;
            const gy = y - blob.size * 0.4 * lightY;
            const gradient = ctx.createRadialGradient(gx, gy, 0, x, y, blob.size * 1.5);
            
            const baseAlpha = this.baseOpacity * blob.density * blob.softness;
            const highlightAlpha = baseAlpha * (0.75 + illumination * 0.25);
            
            gradient.addColorStop(0, `rgba(255, 255, 255, ${highlightAlpha})`);
            gradient.addColorStop(0.08, `rgba(254, 254, 255, ${highlightAlpha * 0.98})`);
            gradient.addColorStop(0.15, `rgba(252, 253, 255, ${highlightAlpha * 0.93})`);
            gradient.addColorStop(0.25, `rgba(248, 250, 254, ${baseAlpha * 0.88})`);
            gradient.addColorStop(0.35, `rgba(244, 247, 252, ${baseAlpha * 0.78})`);
            gradient.addColorStop(0.45, `rgba(239, 243, 250, ${baseAlpha * 0.65})`);
            gradient.addColorStop(0.55, `rgba(234, 239, 248, ${baseAlpha * 0.52})`);
            gradient.addColorStop(0.65, `rgba(228, 235, 246, ${baseAlpha * 0.38})`);
            gradient.addColorStop(0.75, `rgba(222, 230, 243, ${baseAlpha * 0.25})`);
            gradient.addColorStop(0.85, `rgba(216, 225, 240, ${baseAlpha * 0.14})`);
            gradient.addColorStop(0.95, `rgba(210, 220, 236, ${baseAlpha * 0.05})`);
            gradient.addColorStop(1, `rgba(205, 215, 232, 0)`);
            
            ctx.fillStyle = gradient;
            ctx.fill();
            ctx.restore();
        });
        
        ctx.filter = 'blur(8px)';
        ctx.globalAlpha = 0.4;
        sortedBlobs.slice(0, 10).forEach(blob => {
            const x = this.centerX + blob.x;
            const y = this.centerY + blob.y;
            
            ctx.save();
            const outerGradient = ctx.createRadialGradient(x, y, blob.size * 0.6, x, y, blob.size * 2);
            outerGradient.addColorStop(0, `rgba(245, 248, 252, ${this.baseOpacity * 0.3})`);
            outerGradient.addColorStop(0.5, `rgba(230, 238, 246, ${this.baseOpacity * 0.15})`);
            outerGradient.addColorStop(1, `rgba(220, 230, 242, 0)`);
            
            ctx.beginPath();
            ctx.arc(x, y, blob.size * 2, 0, Math.PI * 2);
            ctx.fillStyle = outerGradient;
            ctx.fill();
            ctx.restore();
        });
        
        ctx.globalAlpha = 1;
        
        ctx.filter = 'blur(2.5px)';
        ctx.globalCompositeOperation = 'screen';
        
        sortedBlobs.slice(0, 8).forEach(blob => {
            const x = this.centerX + blob.x;
            const y = this.centerY + blob.y;
            
            const angle = Math.atan2(blob.y, blob.x);
            const lightDot = Math.cos(angle - this.lightAngle) * 0.5 + 0.5;
            
            if (lightDot > 0.55) {
                const highlightX = x - blob.size * 0.6 * lightX;
                const highlightY = y - blob.size * 0.6 * lightY;
                const highlightRadius = blob.size * 0.7;
                const highlightAlpha = Math.pow((lightDot - 0.55) / 0.45, 1.2) * 0.25 * this.baseOpacity;
                
                const highlight = ctx.createRadialGradient(
                    highlightX, highlightY, 0,
                    highlightX, highlightY, highlightRadius
                );
                highlight.addColorStop(0, `rgba(255, 255, 255, ${highlightAlpha})`);
                highlight.addColorStop(0.3, `rgba(255, 254, 250, ${highlightAlpha * 0.5})`);
                highlight.addColorStop(0.6, `rgba(250, 248, 245, ${highlightAlpha * 0.2})`);
                highlight.addColorStop(1, `rgba(245, 245, 245, 0)`);
                
                ctx.beginPath();
                ctx.arc(highlightX, highlightY, highlightRadius, 0, Math.PI * 2);
                ctx.fillStyle = highlight;
                ctx.fill();
            }
        });
        
        ctx.globalCompositeOperation = 'source-over';
        ctx.filter = 'none';
        
        const imageData = ctx.getImageData(0, 0, this.offscreenCanvas.width, this.offscreenCanvas.height);
        const data = imageData.data;
        
        for (let y = 0; y < this.offscreenCanvas.height; y += 1) {
            for (let x = 0; x < this.offscreenCanvas.width; x += 1) {
                const idx = (y * this.offscreenCanvas.width + x) * 4;
                if (data[idx + 3] > 5) {
                    const n = noise.fbm(x * 0.04 + this.seed, y * 0.04 + this.seed, 5, 0.55);
                    const microNoise = noise.noise(x * 0.2 + this.seed, y * 0.2 + this.seed);
                    
                    const textureMod = 0.88 + n * 0.12;
                    const microMod = 0.97 + microNoise * 0.03;
                    
                    data[idx] = data[idx] * textureMod * microMod;
                    data[idx + 1] = data[idx + 1] * textureMod * microMod;
                    data[idx + 2] = Math.min(255, data[idx + 2] * textureMod * microMod * 1.02);
                    
                    const alphaMod = 0.92 + n * 0.08;
                    data[idx + 3] = data[idx + 3] * alphaMod;
                }
            }
        }
        
        ctx.putImageData(imageData, 0, 0);

        const bitmap = this.offscreenCanvas.transferToImageBitmap();
        self.postMessage({
            type: 'cloudRendered',
            id: this.id,
            bitmap: bitmap,
            centerX: this.centerX,
            centerY: this.centerY,
            x: this.x,
            y: this.y
        }, [bitmap]);
    }
    
    update() {
        const speed = (windSpeed / 10) * this.depth;
        this.x += speed;

        if (this.x > canvasWidth + this.centerX) {
            this.x = -this.centerX;
            this.y = Math.random() * canvasHeight;
        }
    }
}

function animate() {
    if (clouds.length > 0) {
        const cloudPositions = clouds.map(cloud => {
            cloud.update();
            return {
                id: cloud.id,
                x: cloud.x,
                y: cloud.y
            };
        });

        self.postMessage({
            type: 'update',
            positions: cloudPositions
        });
    }
    requestAnimationFrame(animate);
}

let nextCloudId = 0;

self.onmessage = function(e) {
    const { type, data } = e.data;

    switch (type) {
        case 'init':
            canvasWidth = data.width;
            canvasHeight = data.height;
            cloudCover = data.cloudCover;
            noise = new NoiseGenerator(Math.random() * 100000);
            const numClouds = Math.ceil((cloudCover / 100) * 25);
            for (let i = 0; i < numClouds; i++) {
                const cloud = new Cloud(nextCloudId++);
                clouds.push(cloud);
            }
            animate();
            break;
        case 'updateCloudCover':
            cloudCover = data.cloudCover;
            const targetNumClouds = Math.ceil((cloudCover / 100) * 25);
            const currentNumClouds = clouds.length;

            if (targetNumClouds > currentNumClouds) {
                for (let i = 0; i < targetNumClouds - currentNumClouds; i++) {
                    const cloud = new Cloud(nextCloudId++);
                    clouds.push(cloud);
                }
            } else if (targetNumClouds < currentNumClouds) {
                const numToRemove = currentNumClouds - targetNumClouds;
                const removedClouds = clouds.splice(clouds.length - numToRemove, numToRemove);
                self.postMessage({
                    type: 'removeClouds',
                    ids: removedClouds.map(c => c.id)
                });
            }
            break;
        case 'updateWind':
            windSpeed = data.wind_speed_10m;
            windGusts = data.wind_gusts_10m;
            break;
        case 'resize':
            canvasWidth = data.width;
            canvasHeight = data.height;
            break;
    }
};
