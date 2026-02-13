/* --- CONFIG & DATA --- */
const CONFIG = {
	fallbackLang: 'pl',
	supportedLangs: ['pl', 'en', 'de', 'cs'],
	speeds: [1.0, 1.25, 1.5],
	vibratePattern: 15, // ms
}

const NEXT_MODAL_TEXTS = {
	pl: { title: 'Przejść dalej?', question: 'Czy chcesz odtworzyć:', yes: 'Tak', no: 'Zostań' },
	en: { title: 'Go to next?', question: 'Do you want to play:', yes: 'Yes', no: 'Stay' },
	de: { title: 'Weitergehen?', question: 'Möchten Sie spielen:', yes: 'Ja', no: 'Bleiben' },
	cs: { title: 'Jít dál?', question: 'Chcete přehrát:', yes: 'Ano', no: 'Zůstat' },
}

const STATIONS = [
	{
		id: 1,
		img: 'img/altar.jpg',
		title: { pl: '1. Ołtarz Główny', en: '1. Main Altar', de: '1. Hauptaltar', cs: '1. Hlavní Oltář' },
		desc: {
			pl: 'Barokowa perła z 1730 roku.',
			en: 'Baroque pearl from 1730.',
			de: 'Barockperle aus 1730.',
			cs: 'Barokní perla z roku 1730.',
		},
		transcript: {
			pl: 'Funkcja transkrypcji dostępna wkrótce',
			en: 'Transcription feature coming soon',
			de: 'Transkriptionsfunktion bald verfügbar',
			cs: 'Funkce přepisu bude brzy k dispozici',
		},
	},
	{
		id: 2,
		img: 'img/pulpit.jpg',
		title: { pl: '2. Ambona', en: '2. The Pulpit', de: '2. Die Kanzel', cs: '2. Kazatelna' },
		desc: {
			pl: 'Mistrzowska snycerka.',
			en: 'Masterful woodcarving.',
			de: 'Meisterhafte Schnitzerei.',
			cs: 'Mistrovská řezba.',
		},
		transcript: {
			pl: 'Funkcja transkrypcji dostępna wkrótce',
			en: 'Transcription feature coming soon.',
			de: 'Transkriptionsfunktion bald verfügbar',
			cs: 'Funkce přepisu bude brzy k dispozici',
		},
	},
]

let state = {
	lang: 'pl',
	currentId: null,
	pendingNextId: null, // ID stacji oczekującej na potwierdzenie w modalu
	isPlaying: false,
	speedIndex: 0,
	fontSize: 16,
	theme: 'dark', // 'dark' or 'light'
	autoNext: true,
	visited: JSON.parse(localStorage.getItem('visited_ids')) || [],
}

/* --- DOM REFS --- */
const $ = id => document.getElementById(id)
const audio = new Audio()

/* --- INIT --- */
function init() {
	loadSettings()
	detectLanguage()
	renderList()
	attachEvents()

	// Init Audio Settings
	audio.playbackRate = CONFIG.speeds[state.speedIndex]
}

/* --- CORE FUNCTIONS --- */
function loadSettings() {
	// Theme
	const savedTheme = localStorage.getItem('theme')
	if (savedTheme) {
		state.theme = savedTheme
		document.body.className = `theme-${state.theme}`
	}
	// Font Size
	const savedFont = localStorage.getItem('fontSize')
	if (savedFont) {
		state.fontSize = parseInt(savedFont)
		document.documentElement.style.setProperty('--font-size-base', `${state.fontSize}px`)
	}
	// Auto Next
	const savedAuto = localStorage.getItem('autoNext')
	if (savedAuto !== null) state.autoNext = JSON.parse(savedAuto)
	if ($('check-autonext')) $('check-autonext').checked = state.autoNext
}

function detectLanguage() {
	const browserLang = navigator.language.slice(0, 2)
	state.lang = CONFIG.supportedLangs.includes(browserLang) ? browserLang : CONFIG.fallbackLang
	if ($('lang-switch')) $('lang-switch').value = state.lang
}

function haptic() {
	if (navigator.vibrate) navigator.vibrate(CONFIG.vibratePattern)
}

/* --- AUDIO ENGINE --- */
function playTrack(id) {
	if (state.currentId === id) {
		togglePlay()
		return
	}

	state.currentId = id
	state.isPlaying = true

	// UI Update
	updatePlayerContent()
	highlightActiveCard(id)

	// Audio Load
	audio.src = `./audio/${state.lang}/${id}.mp3`
	audio.load()
	audio.playbackRate = CONFIG.speeds[state.speedIndex]

	audio
		.play()
		.then(() => {
			$('floating-player').classList.remove('hidden')
			updatePlayIcon(true)
			addToVisited(id)

			// Scroll to active card (UX feature)
			setTimeout(() => {
				const card = document.querySelector(`.station-card[data-id="${id}"]`)
				if (card) card.scrollIntoView({ behavior: 'smooth', block: 'center' })
			}, 500)
		})
		.catch(e => console.error('Play error:', e))
}

function togglePlay() {
	haptic()
	if (audio.paused) {
		audio.play()
		state.isPlaying = true
	} else {
		audio.pause()
		state.isPlaying = false
	}
	updatePlayIcon(state.isPlaying)
}

function changeLanguage(newLang) {
	const currentTime = audio.currentTime
	const wasPlaying = !audio.paused

	state.lang = newLang
	renderList() // Re-render texts on list
	updatePlayerContent() // Update player text

	if (state.currentId) {
		audio.src = `./audio/${state.lang}/${state.currentId}.mp3`
		audio.currentTime = currentTime
		if (wasPlaying) audio.play()
	}
}

/* --- UI HELPERS --- */
function renderList() {
	const container = $('app')
	if (!container) return
	container.innerHTML = ''

	STATIONS.forEach(s => {
		const isVisited = state.visited.includes(s.id)
		const isActive = state.currentId === s.id

		const el = document.createElement('div')
		el.className = `station-card ${isActive ? 'active' : ''}`
		el.dataset.id = s.id

		el.innerHTML = `
            <div class="card-top"  ('${s.img}', '${s.title[state.lang]}')">
                <img src="${s.img}" class="card-img" loading="lazy" alt="Station Image">
                ${isVisited ? '<div class="card-badge">Odwiedzono <i class="fa-solid fa-check"></i></div>' : ''}
            </div>
            <div class="card-body">
                <div class="card-text">
                    <h3>${s.title[state.lang]}</h3>
                    <p>${s.desc[state.lang]}</p>
                </div>
                <button class="play-btn-round" onclick="playTrack(${s.id})">
                    <i class="fa-solid ${isActive && state.isPlaying ? 'fa-pause' : 'fa-play'}"></i>
                </button>
            </div>
        `
		container.appendChild(el)
	})
}

function updatePlayIcon(isPlaying) {
	const btnIcon = $('btn-play-pause').querySelector('i')
	if (btnIcon) btnIcon.className = isPlaying ? 'fa-solid fa-pause' : 'fa-solid fa-play'

	// Update list icon as well
	const activeCardBtn = document.querySelector(`.station-card[data-id="${state.currentId}"] .play-btn-round i`)
	if (activeCardBtn) {
		activeCardBtn.className = isPlaying ? 'fa-solid fa-pause' : 'fa-solid fa-play'
	}
}

function updatePlayerContent() {
	const data = STATIONS.find(s => s.id === state.currentId)
	if (!data) return
	$('player-title').innerText = data.title[state.lang]
	if ($('transcript-text')) $('transcript-text').innerText = data.transcript[state.lang]
}

function highlightActiveCard(id) {
	document.querySelectorAll('.station-card').forEach(c => c.classList.remove('active', 'playing'))
	const active = document.querySelector(`.station-card[data-id="${id}"]`)
	if (active) active.classList.add('active', 'playing')
}

function addToVisited(id) {
	if (!state.visited.includes(id)) {
		state.visited.push(id)
		localStorage.setItem('visited_ids', JSON.stringify(state.visited))
		renderList() // Update badges
	}
}

function toggleTheme() {
	haptic()
	state.theme = state.theme === 'dark' ? 'light' : 'dark'
	document.body.className = `theme-${state.theme}`
	localStorage.setItem('theme', state.theme)
}

function changeFontSize(delta) {
	haptic()
	state.fontSize = Math.min(24, Math.max(14, state.fontSize + delta))
	document.documentElement.style.setProperty('--font-size-base', `${state.fontSize}px`)
	localStorage.setItem('fontSize', state.fontSize)
}

function toggleSpeed() {
	haptic()
	state.speedIndex = (state.speedIndex + 1) % CONFIG.speeds.length
	const newSpeed = CONFIG.speeds[state.speedIndex]
	audio.playbackRate = newSpeed
	if ($('btn-speed')) $('btn-speed').innerText = newSpeed + 'x'
}

/* --- AUTO NEXT & MODAL LOGIC --- */
audio.addEventListener('ended', () => {
	if (state.autoNext) {
		const currentIndex = STATIONS.findIndex(s => s.id === state.currentId)
		// Sprawdź czy jest następna stacja
		if (currentIndex !== -1 && currentIndex < STATIONS.length - 1) {
			const nextStation = STATIONS[currentIndex + 1]
			promptNextStation(nextStation) // Wywołaj modal zamiast grać od razu
		} else {
			state.isPlaying = false
			updatePlayIcon(false)
		}
	} else {
		state.isPlaying = false
		updatePlayIcon(false)
	}
})

function promptNextStation(station) {
	state.pendingNextId = station.id

	// Ustaw teksty modala zgodnie z językiem
	const texts = NEXT_MODAL_TEXTS[state.lang]
	$('next-modal-title').innerText = texts.title
	$('next-modal-desc').innerText = texts.question
	$('next-station-name').innerText = station.title[state.lang]
	$('btn-next-confirm').innerText = texts.yes
	$('btn-next-cancel').innerText = texts.no

	// Pokaż modal
	$('next-station-modal').classList.remove('hidden')
}

/* --- LIGHTBOX --- */
// window.openLightbox = function (src, caption) {
// 	$('lightbox-img').src = src
// 	$('lightbox-caption').innerText = caption
// 	$('lightbox').classList.remove('hidden')
// }

/* --- EVENT HANDLERS --- */
function attachEvents() {
	// Player Controls
	$('btn-play-pause').onclick = togglePlay
	$('btn-speed').onclick = toggleSpeed

	$('btn-rewind').onclick = () => {
		haptic()
		audio.currentTime = Math.max(0, audio.currentTime - 10)
	}

	$('btn-forward').onclick = () => {
		haptic()
		audio.currentTime = Math.min(audio.duration, audio.currentTime + 10)
	}

	$('btn-transcript').onclick = () => {
		haptic()
		$('transcript-panel').classList.toggle('open')
		$('transcript-panel').classList.toggle('hidden')
	}

	// Progress Bar
	const progressBar = $('progress-bar')
	audio.addEventListener('timeupdate', () => {
		const val = (audio.currentTime / audio.duration) * 100 || 0
		progressBar.value = val
		$('player-time').innerText = `${formatTime(audio.currentTime)} / ${formatTime(audio.duration || 0)}`
	})

	progressBar.addEventListener('input', e => {
		const time = (e.target.value / 100) * audio.duration
		audio.currentTime = time
	})

	// Settings Modal
	$('btn-settings').onclick = () => $('settings-modal').classList.remove('hidden')
	$('btn-close-settings').onclick = () => $('settings-modal').classList.add('hidden')

	$('btn-theme-toggle').onclick = toggleTheme
	$('btn-font-inc').onclick = () => changeFontSize(2)
	$('btn-font-dec').onclick = () => changeFontSize(-2)

	$('check-autonext').addEventListener('change', e => {
		state.autoNext = e.target.checked
		localStorage.setItem('autoNext', state.autoNext)
	})

	// Next Station Modal Buttons
	$('btn-next-confirm').onclick = () => {
		haptic()
		$('next-station-modal').classList.add('hidden')
		if (state.pendingNextId) {
			playTrack(state.pendingNextId)
			state.pendingNextId = null
		}
	}

	$('btn-next-cancel').onclick = () => {
		haptic()
		$('next-station-modal').classList.add('hidden')
		state.pendingNextId = null
		state.isPlaying = false
		updatePlayIcon(false)
	}

	// Globalne kliknięcia (zamykanie modali tłem)
	window.addEventListener('click', e => {
		if (e.target === $('settings-modal')) $('settings-modal').classList.add('hidden')
		if (e.target === $('next-station-modal')) {
			$('next-station-modal').classList.add('hidden')
			state.isPlaying = false
			updatePlayIcon(false)
		}
	})

	// Zmiana języka
	$('lang-switch').addEventListener('change', e => changeLanguage(e.target.value))

	// Lightbox
	// $('lightbox').onclick = () => $('lightbox').classList.add('hidden')
}

function formatTime(s) {
	if (!s || isNaN(s)) return '0:00'
	return new Date(s * 1000).toISOString().substr(14, 5)
}

// Start App
document.addEventListener('DOMContentLoaded', init)
