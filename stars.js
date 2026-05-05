document.addEventListener('DOMContentLoaded', () => {
	const canvas = document.getElementById('stars-canvas');
	const header = document.querySelector('header');
	if (!canvas || !header) return;

	const ctx = canvas.getContext('2d');
	let stars = [];
	let mouse = {
		x: 0,
		y: 0
	};
	let targetMouse = {
		x: 0,
		y: 0
	};
	let isMouseInHeader = false;
	let animationFrameId;

	const setCanvasSize = () => {
		canvas.width = header.offsetWidth;
		canvas.height = header.offsetHeight;
	};

	const createStars = () => {
		stars = [];
		const starCount = Math.floor((canvas.width * canvas.height) / 2000);
		const minDistance = 30;

		        const noSpawnZones = [
		            document.getElementById('title-text'),
		            document.getElementById('tagline-text'),
		            document.getElementById('weather-display')
		        ].map(el => el ? el.getBoundingClientRect() : null).filter(Boolean);
		const headerRect = header.getBoundingClientRect();

		for (let i = 0; i < starCount; i++) {
			let x, y, valid;
			let retries = 0;
			do {
				x = Math.random() * canvas.width;
				y = Math.random() * canvas.height;
				valid = true;

				for (const star of stars) {
					const distance = Math.sqrt(Math.pow(star.x - x, 2) + Math.pow(star.y - y, 2));
					if (distance < minDistance) {
						valid = false;
						break;
					}
				}
				if (!valid) {
					retries++;
					continue;
				}

				for (const zone of noSpawnZones) {
					if (x > zone.left - headerRect.left && x < zone.right - headerRect.left &&
						y > zone.top - headerRect.top && y < zone.bottom - headerRect.top) {
						valid = false;
						break;
					}
				}
				retries++;
			} while (!valid && retries < 20);

			if (valid) {
				stars.push({
					x: x,
					y: y,
					radius: Math.random() * 1.5 + 0.5,
					originalX: x,
					originalY: y,
					vx: 0,
					vy: 0,
					opacity: Math.random() * 0.5 + 0.5,
					twinkleSpeed: Math.random() * 0.02
				});
			}
		}
	};

	const drawGlow = () => {
		if (!isMouseInHeader) return;

		const outerRadius = 75;
		const outerGradient = ctx.createRadialGradient(targetMouse.x, targetMouse.y, 0, targetMouse.x, targetMouse.y, outerRadius);
		outerGradient.addColorStop(0, 'rgba(255, 255, 255, 0.05)');
		outerGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
		ctx.fillStyle = outerGradient;
		ctx.beginPath();
		ctx.arc(targetMouse.x, targetMouse.y, outerRadius, 0, Math.PI * 2);
		ctx.fill();

		const innerRadius = 30;
		const innerGradient = ctx.createRadialGradient(targetMouse.x, targetMouse.y, 0, targetMouse.x, targetMouse.y, innerRadius);
		innerGradient.addColorStop(0, 'rgba(255, 255, 255, 0.1)');
		innerGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
		ctx.fillStyle = innerGradient;
		ctx.beginPath();
		ctx.arc(targetMouse.x, targetMouse.y, innerRadius, 0, Math.PI * 2);
		ctx.fill();
	};

	const drawStars = (time) => {
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		drawGlow();

		stars.forEach(star => {
			const twinkle = Math.abs(Math.sin(time * star.twinkleSpeed + Math.PI / 2));
			ctx.fillStyle = `rgba(255, 255, 255, ${star.opacity * twinkle})`;
			ctx.beginPath();
			ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
			ctx.fill();
		});
	};

	const updateStars = () => {
		mouse.x += (targetMouse.x - mouse.x) * 0.1;
		mouse.y += (targetMouse.y - mouse.y) * 0.1;

		const isMoving = stars.some(star => Math.abs(star.vx) > 0.01 || Math.abs(star.vy) > 0.01);
		if (!isMouseInHeader && !isMoving) return;

		const magneticRange = 150;
		const magneticForce = 0.5;
		const friction = 0.9;
		const deadZoneRadius = 5;

		stars.forEach(star => {
			const dx = mouse.x - star.x;
			const dy = mouse.y - star.y;
			const distance = Math.sqrt(dx * dx + dy * dy);

			if (distance < deadZoneRadius) {
				star.vx = 0;
				star.vy = 0;
				return;
			}

			if (isMouseInHeader && distance < magneticRange) {
				const forceDirectionX = dx / distance;
				const forceDirectionY = dy / distance;
				const force = (magneticRange - distance) / magneticRange * magneticForce;

				star.vx += forceDirectionX * force;
				star.vy += forceDirectionY * force;
			}

			star.vx += (star.originalX - star.x) * 0.01;
			star.vy += (star.originalY - star.y) * 0.01;

			star.vx *= friction;
			star.vy *= friction;
			star.x += star.vx;
			star.y += star.vy;
		});
	};

	const animate = (time) => {
		updateStars();
		drawStars(time / 1000);
		animationFrameId = requestAnimationFrame(animate);
	};

	const init = () => {
		if (animationFrameId) {
			cancelAnimationFrame(animationFrameId);
		}
		setCanvasSize();
		createStars();
		targetMouse = {
			x: canvas.width / 2,
			y: canvas.height / 2
		};
		mouse = {
			...targetMouse
		};
		animate(0);
	};

	header.addEventListener('mouseenter', () => {
		isMouseInHeader = true;
	});

	header.addEventListener('mousemove', (e) => {
		const rect = header.getBoundingClientRect();
		targetMouse.x = e.clientX - rect.left;
		targetMouse.y = e.clientY - rect.top;
	});

	header.addEventListener('mouseleave', () => {
		isMouseInHeader = false;
		targetMouse.x = canvas.width / 2;
		targetMouse.y = canvas.height / 2;
	});

	window.addEventListener('resize', init);

	init();
});