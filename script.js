document.addEventListener('DOMContentLoaded', () => {
	const ageElement = document.getElementById('age');
	const discordStatusElement = document.getElementById('discord-status');
	const weatherDisplayElement = document.getElementById('weather-display');
	const headerElement = document.querySelector('header');
	const starsCanvas = document.getElementById('stars-canvas');
    const titleTextElement = document.getElementById('title-text');
    const taglineTextElement = document.getElementById('tagline-text');
    const dynamicHeaderTextElement = document.getElementById('dynamic-header-text');
	const discordUserId = '1264445751723823245'; 

	const colors = {
		night: '#0d1117', 
		sunriseSunset: '#FF8C00', 
		dayClear: '#5D9CEC',
		dayCloudy: '#A9A9A9' 
	};

	let sunriseTime, sunsetTime, currentWeatherCode, isDayStatus;

	const interpolateColor = (color1, color2, factor) => {
		const result = color1.slice(1).match(/.{2}/g).map((hex, i) => {
			const c1 = parseInt(hex, 16);
			const c2 = parseInt(color2.slice(1).match(/.{2}/g)[i], 16);
			const c = Math.round(c1 + factor * (c2 - c1));
			return c.toString(16).padStart(2, '0');
		}).join('');
		return `#${result}`;
	};

	const updateHeaderBackground = () => {
		if (!dynamicHeaderCheckbox.checked) return;
		if (!sunriseTime || !sunsetTime) return;

		const now = new Date();
		const nowUtc3 = new Date(now.toLocaleString('en-US', {
			timeZone: 'America/Argentina/Buenos_Aires'
		}));
		const currentHour = nowUtc3.getHours();
		const currentMinute = nowUtc3.getMinutes();
		const currentTimeInMinutes = currentHour * 60 + currentMinute;

		const sunriseHour = sunriseTime.getHours();
		const sunriseMinute = sunriseTime.getMinutes();
		const sunriseTimeInMinutes = sunriseHour * 60 + sunriseMinute;

		const sunsetHour = sunsetTime.getHours();
		const sunsetMinute = sunsetTime.getMinutes();
		const sunsetTimeInMinutes = sunsetHour * 60 + sunsetMinute;

		const transitionDuration = 60;
		let targetColor = colors.night;
		let starfieldOpacity = 1;

		if (currentTimeInMinutes >= sunriseTimeInMinutes - transitionDuration && currentTimeInMinutes < sunriseTimeInMinutes) {
			const progress = (currentTimeInMinutes - (sunriseTimeInMinutes - transitionDuration)) / transitionDuration;
			targetColor = interpolateColor(colors.night, colors.sunriseSunset, progress);
			starfieldOpacity = 1 - progress;
		}

		else if (currentTimeInMinutes >= sunriseTimeInMinutes && currentTimeInMinutes < sunriseTimeInMinutes + transitionDuration) {
			const progress = (currentTimeInMinutes - sunriseTimeInMinutes) / transitionDuration;
			const dayColor = (currentWeatherCode >= 2 && currentWeatherCode <= 3) ? colors.dayCloudy : colors.dayClear;
			targetColor = interpolateColor(colors.sunriseSunset, dayColor, progress);
			starfieldOpacity = 0;
		}

		else if (currentTimeInMinutes >= sunriseTimeInMinutes + transitionDuration && currentTimeInMinutes < sunsetTimeInMinutes - transitionDuration) {
			targetColor = (currentWeatherCode >= 2 && currentWeatherCode <= 3) ? colors.dayCloudy : colors.dayClear;
			starfieldOpacity = 0;
		}

		else if (currentTimeInMinutes >= sunsetTimeInMinutes - transitionDuration && currentTimeInMinutes < sunsetTimeInMinutes) {
			const progress = (currentTimeInMinutes - (sunsetTimeInMinutes - transitionDuration)) / transitionDuration;
			const dayColor = (currentWeatherCode >= 2 && currentWeatherCode <= 3) ? colors.dayCloudy : colors.dayClear;
			targetColor = interpolateColor(dayColor, colors.sunriseSunset, progress);
			starfieldOpacity = progress;
		}

		else if (currentTimeInMinutes >= sunsetTimeInMinutes && currentTimeInMinutes < sunsetTimeInMinutes + transitionDuration) {
			const progress = (currentTimeInMinutes - sunsetTimeInMinutes) / transitionDuration;
			targetColor = interpolateColor(colors.sunriseSunset, colors.night, progress);
			starfieldOpacity = 1;
		}

		else {
			targetColor = colors.night;
			starfieldOpacity = 1;
		}

		const darkerTargetColor = interpolateColor(targetColor, '#000000', 0.4);
		headerElement.style.background = `linear-gradient(to bottom, ${targetColor}, ${darkerTargetColor})`;
		starsCanvas.style.opacity = starfieldOpacity;

        const textElements = [titleTextElement, taglineTextElement, dynamicHeaderTextElement, weatherDisplayElement];
        textElements.forEach(el => el.classList.add('text-bg'));
	};

	const getWeatherIcon = (weatherCode, isDay) => {
		switch (weatherCode) {
			case 0:
				return isDay ? "clear-day" : "clear-night";
			case 1:
				return isDay ? "partly-cloudy-day" : "partly-cloudy-night";
			case 2:
				return isDay ? "partly-cloudy-day" : "partly-cloudy-night";
			case 3:
				return "overcast";
			case 45:
			case 48:
				return isDay ? "fog-day" : "fog-night";
			case 51:
			case 53:
			case 55:
				return isDay ? "partly-cloudy-day-drizzle" : "partly-cloudy-night-drizzle";
			case 56:
			case 57:
				return isDay ? "extreme-day-sleet" : "extreme-night-sleet";
			case 61:
			case 63:
			case 65:
				return isDay ? "partly-cloudy-day-rain" : "partly-cloudy-night-rain";
			case 66:
			case 67:
				return isDay ? "extreme-day-sleet" : "extreme-night-sleet";
			case 71:
			case 73:
			case 75:
				return isDay ? "partly-cloudy-day-snow" : "partly-cloudy-night-snow";
			case 77:
				return "snow";
			case 80:
			case 81:
			case 82:
				return isDay ? "thunderstorms-day-rain" : "thunderstorms-night-rain";
			case 85:
			case 86:
				return isDay ? "thunderstorms-day-snow" : "thunderstorms-night-snow";
			case 95:
				return isDay ? "thunderstorms-day" : "thunderstorms-night";
			case 96:
			case 99:
				return isDay ? "thunderstorms-day-extreme" : "thunderstorms-night-extreme";
			default:
				return "not-available";
		}
	};

	const fetchWeatherIconSVG = async (iconName) => {
		try {
			const baseUrl = 'https://raw.githubusercontent.com/basmilius/weather-icons/dev/production/fill/svg-static/';
			const response = await fetch(`${baseUrl}${iconName}.svg`);
			if (!response.ok) throw new Error(`Failed to fetch SVG for ${iconName}`);
			const svgText = await response.text();
			return svgText
		} catch (error) {
			console.error(`Error fetching SVG for ${iconName}:`, error);
			return '';
		}
	};

	const fetchWeatherData = async () => {
		try {
			const response = await fetch('https://gen1x.derpygamer2142.com/weather');
			const data = await response.json();

			if (data && data.current) {
				const temperature = data.current.temperature_2m;
				currentWeatherCode = data.current.weather_code;
				isDayStatus = data.current.is_day;
				const unit = data.current_units.temperature_2m;
                const cloudCover = data.current.cloud_cover;

                if (typeof updateCloudCover === 'function' && cloudsCheckbox.checked) {
                    updateCloudCover(cloudCover);
                }

                if (typeof updateWind === 'function') {
                    updateWind({
                        wind_speed_10m: data.current.wind_speed_10m,
                        wind_gusts_10m: data.current.wind_gusts_10m
                    });
                }

				const iconName = getWeatherIcon(currentWeatherCode, isDayStatus);
				const weatherSvg = await fetchWeatherIconSVG(iconName);

				if (weatherDisplayElement) {
					weatherDisplayElement.innerHTML = `
                        ${weatherSvg} ${Math.round(temperature)}${unit}
                    `;
				}

				if (data.daily && data.daily.sunrise && data.daily.sunset) {
					sunriseTime = new Date(data.daily.sunrise[0]);
					sunsetTime = new Date(data.daily.sunset[0]);
					updateHeaderBackground();
				}

			} else {
				if (weatherDisplayElement) {
					weatherDisplayElement.innerHTML = `Weather data not available.`;
				}
			}
		} catch (error) {
			console.error('Error fetching weather data:', error);
			if (weatherDisplayElement) {
				weatherDisplayElement.innerHTML = `Failed to load weather.`;
			}
		}
	};


	if (ageElement) {
		const birthDate = new Date('2010-03-16T12:27:00-03:00');

		const updateAge = () => {
			const now = new Date();
			const diff = now - birthDate;

			const ageInYears = diff / (1000 * 60 * 60 * 24 * 365.25);

			ageElement.textContent = Math.floor(ageInYears);
		};

		setInterval(updateAge, 50);
		updateAge();
	}

	if (discordStatusElement) {
		const getDisplayStatus = (status) => {
			switch (status) {
				case 'online':
					return 'Online';
				case 'idle':
					return 'Idle';
				case 'dnd':
					return 'Do Not Disturb';
				case 'offline':
					return 'Offline';
				default:
					return status.charAt(0).toUpperCase() + status.slice(1);
			}
		};

		const fetchDiscordStatus = async () => {
			try {
				const response = await fetch(`https://api.lanyard.rest/v1/users/${discordUserId}`);
				const {
					data
				} = await response.json();

				if (data && data.discord_user) {
					discordStatusElement.innerHTML = '';

					let statusHtml = `
                        <div class="discord-user-info">
                            <img src="https://cdn.discordapp.com/avatars/${data.discord_user.id}/${data.discord_user.avatar}.png?size=64" alt="Discord Avatar" class="discord-avatar">
                            <div>
                                <p class="discord-username">${data.discord_user.username}</p>
                                <p class="discord-status-text status-${data.discord_status}">${getDisplayStatus(data.discord_status)}</p>
                            </div>
                        </div>
                    `;

					data.activities.forEach(activity => {
						if (activity.type === 4 && activity.state) {
							statusHtml += `<p class="discord-custom-status"><i>${activity.state}</i></p>`;
						}
						else if (activity.type === 2 && activity.name === "Spotify") {
							const spotify = activity;
							const albumArtUrl = spotify.assets && spotify.assets.large_image ? `https://i.scdn.co/image/${spotify.assets.large_image.replace('spotify:', '')}` : '';
							statusHtml += `
                                <div class="discord-activity spotify-activity">
                                    ${albumArtUrl ? `<img src="${albumArtUrl}" alt="Album Art" class="activity-image">` : ''}
                                    <div class="activity-details">
                                        <p class="activity-type">Listening to Spotify</p>
                                        <p class="activity-name">${spotify.details || ''}</p>
                                        <p class="activity-state">by ${spotify.state || ''}</p>
                                        <p class="activity-details-line">on ${spotify.assets.large_text || ''}</p>
                                    </div>
                                </div>
                            `;
							if (spotify.timestamps && spotify.timestamps.start && spotify.timestamps.end) {
								statusHtml += `
									<div class="spotify-progress" data-start-timestamp="${spotify.timestamps.start}" data-end-timestamp="${spotify.timestamps.end}">
										<div class="time-display">
											<span class="current-time">0:00</span>
											<span class="total-time">0:00</span>
										</div>
										<div class="seek-bar">
											<div class="seek-bar-progress"></div>
										</div>
									</div>
								`;
							}
						}
						else if (activity.type === 0 || activity.type === 1 || activity.type === 2) {
							statusHtml += `<div class="discord-activity">`;
							if (activity.assets && activity.assets.large_image) {
								const largeImage = activity.assets.large_image.startsWith('mp:external/') ?
									`https://media.discordapp.net/${activity.assets.large_image.substring(12)}` :
									`https://cdn.discordapp.com/app-assets/${activity.application_id}/${activity.assets.large_image}.png`;
								statusHtml += `<img src="${largeImage}" alt="Activity Image" class="activity-image">`;
							}
							statusHtml += `
                                <div class="activity-details">
                                    <p class="activity-type">${activity.type === 0 ? 'Playing' : activity.type === 1 ? 'Streaming' : 'Watching'} ${activity.name}</p>
                                    <p class="activity-name">${activity.details || ''}</p>
                                    <p class="activity-state">${activity.state || ''}</p>
									${activity.created_at ? `<p class="activity-elapsed" data-created-at="${activity.created_at}"></p>` : ''}
                                </div>
                            </div>`;
						}
					});
					discordStatusElement.innerHTML = statusHtml;
					updateElapsedTimes();
					updateSpotifyProgress();
				} else {
					discordStatusElement.innerHTML = '<p>Discord status not available.</p>';
				}
			} catch (error) {
				console.error('Error fetching Lanyard data:', error);
				discordStatusElement.innerHTML = '<p>Failed to load Discord status.</p>';
			}
		};


		fetchDiscordStatus();
		setInterval(fetchDiscordStatus, 5000);
	}

	const updateElapsedTimes = () => {
		const elapsedElements = document.querySelectorAll('[data-created-at]');
		elapsedElements.forEach(element => {
			const createdAt = parseInt(element.dataset.createdAt, 10);
			if (!isNaN(createdAt)) {
				const elapsedMs = Date.now() - createdAt;
				const elapsedSeconds = Math.floor(elapsedMs / 1000);
				const minutes = Math.floor(elapsedSeconds / 60).toString().padStart(2, '0');
				const seconds = (elapsedSeconds % 60).toString().padStart(2, '0');
				element.textContent = `${minutes}:${seconds} elapsed`;
			}
		});
	};

	const updateSpotifyProgress = () => {
		const progressElements = document.querySelectorAll('.spotify-progress');
		progressElements.forEach(element => {
			const start = parseInt(element.dataset.startTimestamp, 10);
			const end = parseInt(element.dataset.endTimestamp, 10);

			if (!isNaN(start) && !isNaN(end)) {
				const now = Date.now();
				const duration = end - start;
				const elapsed = now - start;
				const progressPercentage = Math.min((elapsed / duration) * 100, 100);

				const progressBar = element.querySelector('.seek-bar-progress');
				if (progressBar) {
					progressBar.style.width = `${progressPercentage}%`;
				}

				const currentTimeEl = element.querySelector('.current-time');
				const totalTimeEl = element.querySelector('.total-time');

				if (currentTimeEl && totalTimeEl) {
					const formatTime = (ms) => {
						const totalSeconds = Math.floor(ms / 1000);
						const minutes = Math.floor(totalSeconds / 60).toString();
						const seconds = (totalSeconds % 60).toString().padStart(2, '0');
						return `${minutes}:${seconds}`;
					};

					currentTimeEl.textContent = formatTime(elapsed);
					totalTimeEl.textContent = formatTime(duration);
				}
			}
		});
	};

	fetchWeatherData();
	setInterval(fetchWeatherData, 300000);
	setInterval(updateHeaderBackground, 100);
	setInterval(updateElapsedTimes, 1000);
	setInterval(updateSpotifyProgress, 1000);

    const guestbookBtn = document.getElementById('guestbook-btn');
    const backBtn = document.getElementById('back-btn');
    const guestbookContainer = document.getElementById('guestbook-container');
    const profileCard = document.querySelector('.profile-card');

    if (guestbookBtn && backBtn && guestbookContainer && profileCard) {
        guestbookBtn.addEventListener('click', () => {
            profileCard.classList.add('hidden');
            guestbookContainer.classList.remove('hidden');
        });

        backBtn.addEventListener('click', () => {
            guestbookContainer.classList.add('hidden');
            profileCard.classList.remove('hidden');
        });
    }

    const dynamicHeaderCheckbox = document.getElementById('dynamic-header-checkbox');
    const cloudsCheckbox = document.getElementById('clouds-checkbox');

    const loadSettings = () => {
        const dynamicHeaderEnabled = localStorage.getItem('dynamicHeaderEnabled') !== 'false';
        const cloudsEnabled = localStorage.getItem('cloudsEnabled') !== 'false';

        dynamicHeaderCheckbox.checked = dynamicHeaderEnabled;
        cloudsCheckbox.checked = cloudsEnabled;

        handleDynamicHeaderChange();
        handleCloudsChange();
    };

    const saveSettings = () => {
        localStorage.setItem('dynamicHeaderEnabled', dynamicHeaderCheckbox.checked);
        localStorage.setItem('cloudsEnabled', cloudsCheckbox.checked);
    };

    const handleDynamicHeaderChange = () => {
        const dynamicHeaderText = document.getElementById('dynamic-header-text');
        if (dynamicHeaderCheckbox.checked) {
            cloudsCheckbox.disabled = false;
            if (!window.headerInterval) {
                window.headerInterval = setInterval(updateHeaderBackground, 100);
            }
            if(dynamicHeaderText) dynamicHeaderText.style.display = '';
        } else {
            cloudsCheckbox.checked = false;
            cloudsCheckbox.disabled = true;
            handleCloudsChange();
            if (window.headerInterval) {
                clearInterval(window.headerInterval);
                window.headerInterval = null;
            }
            headerElement.style.background = '';

            const textElements = [titleTextElement, taglineTextElement, dynamicHeaderTextElement, weatherDisplayElement];
            textElements.forEach(el => {
                if(el) {
                    el.classList.remove('text-bg');
                    el.style.color = '';
                }
            });
            if(dynamicHeaderText) dynamicHeaderText.style.display = 'none';
        }
        saveSettings();
    };

    const handleCloudsChange = () => {
        if (cloudsCheckbox.checked) {
            fetchWeatherData();
        } else {
            if (typeof updateCloudCover === 'function') {
                updateCloudCover(0);
            }
        }
        saveSettings();
    };

    dynamicHeaderCheckbox.addEventListener('change', handleDynamicHeaderChange);
    cloudsCheckbox.addEventListener('change', handleCloudsChange);

    loadSettings();
});
