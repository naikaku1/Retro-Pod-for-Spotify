let ipodPiPWindow = null;
let ipodContainer = null;
let globalRenderMenu = null;
let globalIsMenuOpen = false;

const IPOD_HTML_INNER = `
    <div class="ipod-chassis" id="ipod-chassis">
        <div class="ipod-screen-frame">
            <div class="ipod-screen">
                <div class="ipod-screen-glass"></div>
                
                <div class="ipod-header">
                    <span id="ipod-time-display">12:00 PM</span>
                    <div class="ipod-battery-icon">
                        <div class="ipod-battery-level"></div>
                    </div>
                </div>
                
                <div id="ipod-menu-view" class="ipod-menu-overlay">
                    <div class="ipod-menu-title">iPod</div>
                    <ul id="ipod-menu-list" class="ipod-menu-list"></ul>
                </div>

                <div id="ipod-lyrics-header-bar" class="ipod-lyrics-header-bar">
                    <div id="ipod-lyrics-header-title" class="ipod-lyrics-header-title">Title</div>
                    <div id="ipod-lyrics-header-artist" class="ipod-lyrics-header-artist">Artist</div>
                </div>

                <div class="ipod-content-split">
                    <div id="ipod-lyrics-view" class="ipod-lyrics-overlay">
                        <div id="ipod-lyrics-bg" class="ipod-lyrics-bg"></div>
                        <div id="ipod-lyrics-content" class="ipod-lyrics-content">
                            <div style="margin-top: 50%; color: rgba(255,255,255,0.5);">Waiting for Lyrics...</div>
                        </div>
                    </div>

                    <div class="ipod-cover-art-large" id="ipod-cover-container">
                        <div class="ipod-cover-placeholder">
                            <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 14.5c-2.49 0-4.5-2.01-4.5-4.5S9.51 7.5 12 7.5s4.5 2.01 4.5 4.5-2.01 4.5-4.5 4.5zm0-5.5c-.55 0-1 .45-1 1s.45 1 1 1 1-.45 1-1-.45-1-1-1z"/></svg>
                        </div>
                        <img id="ipod-cover-img" src="" style="display:none;">
                    </div>
                    <div class="ipod-info-side">
                        <div class="ipod-track-info">
                            <div class="ipod-text-title" id="ipod-title">Not Playing</div>
                            <div class="ipod-text-artist" id="ipod-artist">Spotify</div>
                            <div class="ipod-text-album" id="ipod-album"></div>
                        </div>
                    </div>
                </div>
                
                <div class="ipod-progress-area">
                    <div class="ipod-scrubber-bar">
                        <div class="ipod-scrubber-fill" id="ipod-scrubber-fill" style="width: 0%"></div>
                    </div>
                    <div class="ipod-time-labels">
                        <span id="ipod-time-current">0:00</span>
                        <span id="ipod-time-total">-:--</span>
                    </div>
                </div>
            </div>
        </div>

        <div class="ipod-wheel-area">
            <div class="ipod-click-wheel" id="ipod-wheel">
                <div class="wheel-label label-menu" id="btn-menu">MENU</div>
                <div class="wheel-label label-next"><svg class="wheel-icon" viewBox="0 0 24 24"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg></div>
                <div class="wheel-label label-prev"><svg class="wheel-icon" viewBox="0 0 24 24"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg></div>
                <div class="wheel-label label-play">
                        <svg class="wheel-icon" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                        <svg class="wheel-icon" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                </div>
                <div class="ipod-center-btn" id="ipod-center-btn"></div>
            </div>
        </div>
    </div>
`;

function injectStartButton() {
    if (document.getElementById('start-ipod-btn')) return;
    const btn = document.createElement('button');
    btn.id = 'start-ipod-btn';
    btn.innerText = 'iPod Mode';
    btn.style.position = 'fixed';
    btn.style.bottom = '90px';
    btn.style.right = '20px';
    btn.style.zIndex = '9999';
    btn.style.padding = '10px 20px';
    btn.style.borderRadius = '20px';
    btn.style.backgroundColor = '#1db954';
    btn.style.color = '#fff';
    btn.style.border = 'none';
    btn.style.fontWeight = 'bold';
    btn.style.cursor = 'pointer';
    btn.style.boxShadow = '0 4px 12px rgba(0,0,0,0.5)';
    btn.onclick = startIpodMode;
    document.body.appendChild(btn);
}

async function startIpodMode() {
    if (!('documentPictureInPicture' in window)) {
        alert("Document Picture-in-Picture API is not supported.");
        return;
    }
    const container = document.createElement('div');
    container.id = 'ipod-pip-container';
    container.innerHTML = IPOD_HTML_INNER;

    const styleSheetUrl = chrome.runtime.getURL('ipod_pip_styles.css');
    const cssResponse = await fetch(styleSheetUrl);
    const cssText = await cssResponse.text();
    const styleTag = document.createElement('style');
    styleTag.textContent = cssText;

    try {
        ipodPiPWindow = await documentPictureInPicture.requestWindow({ width: 320, height: 520 });
        ipodPiPWindow.document.body.classList.add('ipod-pip-body');
        ipodPiPWindow.document.head.appendChild(styleTag);
        ipodPiPWindow.document.body.appendChild(container);

        initIpodControls(ipodPiPWindow.document);
        updateMetadata(ipodPiPWindow.document);
        tryOpenSpotifyLyrics();

        ipodPiPWindow.addEventListener('pagehide', () => { 
            ipodPiPWindow = null; 
            globalRenderMenu = null;
            globalIsMenuOpen = false;
        });
    } catch (err) {
        console.error("Failed to open PIP window:", err);
    }
}

function initIpodControls(doc) {
    const centerBtn = doc.getElementById('ipod-center-btn');
    const menuBtn = doc.getElementById('btn-menu');
    const nextBtn = doc.querySelector('.label-next');
    const prevBtn = doc.querySelector('.label-prev');
    const playBtnLabel = doc.querySelector('.label-play');

    const lyricsView = doc.getElementById('ipod-lyrics-view');
    const coverContainer = doc.getElementById('ipod-cover-container');
    const lyricsHeader = doc.getElementById('ipod-lyrics-header-bar');
    const screen = doc.querySelector('.ipod-screen');
    const chassis = doc.getElementById('ipod-chassis');
    
    const menuView = doc.getElementById('ipod-menu-view');
    const menuList = doc.getElementById('ipod-menu-list');

    let menuIndex = 0;
    let currentTheme = 0;
    const themes = ['', 'theme-black', 'theme-u2'];
    const themeNames = ['Silver', 'Black', 'U2 (Black & Red)'];

    function findVolumeSlider() {
        let slider = document.querySelector('[data-testid="volume-bar"] input[type="range"]');
        if (slider) return slider;

        slider = document.querySelector('.volume-bar input[type="range"]');
        if (slider) return slider;

        const allRanges = document.querySelectorAll('input[type="range"]');
        for (let r of allRanges) {
            const label = (r.getAttribute('aria-label') || "").toLowerCase();
            const valueText = (r.getAttribute('aria-valuetext') || "");
            
            if (label.includes('volume') || label.includes('音量')) return r;
            
            if (valueText.includes(':') && parseFloat(r.max) > 10) continue;
            
            if (parseFloat(r.max) === 1) return r;
        }
        return null;
    }

    function findControlBtn(testId, labelKeywords) {
        const footer = document.querySelector('footer');
        if (footer) {
            const footerBtn = footer.querySelector(`button[data-testid="${testId}"]`);
            if (footerBtn) return footerBtn;
            
            const footerBtns = footer.querySelectorAll('button[aria-label]');
            for (let b of footerBtns) {
                const label = (b.getAttribute('aria-label') || "").toLowerCase();
                for (let kw of labelKeywords) {
                    if (label.includes(kw.toLowerCase())) return b;
                }
            }
        }
        
        let btn = document.querySelector(`button[data-testid="${testId}"]`);
        if (btn) return btn;
        
        const allBtns = document.querySelectorAll('button[aria-label]');
        for (let b of allBtns) {
            const label = (b.getAttribute('aria-label') || "").toLowerCase();
            for (let kw of labelKeywords) {
                if (label.includes(kw.toLowerCase())) return b;
            }
        }
        return null;
    }

    function getShuffleState() {
        let btn = findControlBtn('control-button-shuffle', ['Shuffle', 'シャッフル']);
        if (!btn) btn = findControlBtn('control-button-smart-shuffle', ['Smart Shuffle', 'スマート']);
        
        if (!btn) return 'Unknown';
        
        const checked = btn.getAttribute('aria-checked');
        if (checked === 'true' || checked === 'mixed') return 'On';

        const label = (btn.getAttribute('aria-label') || "");
        if (label.includes('有効')) return 'Off';
        if (label.includes('無効')) return 'On';
        if (label.includes('Enable')) return 'Off';
        if (label.includes('Disable')) return 'On';

        return 'Off';
    }

    function getRepeatState() {
        const btn = findControlBtn('control-button-repeat', ['Repeat', 'リピート']);
        if (!btn) return 'Unknown';
        
        const checked = btn.getAttribute('aria-checked');
        const label = (btn.getAttribute('aria-label') || "").toLowerCase();
        
        if (checked === 'true') {
            if (label.includes('one') || label.includes('1') || label.includes('1曲')) return 'One';
            return 'All';
        } else if (checked === 'mixed') {
            return 'On';
        }
        return 'Off';
    }

    globalRenderMenu = function() {
        menuList.innerHTML = '';
        const menuItems = [
            { label: 'Now Playing', action: 'close' },
            { label: `Shuffle: ${getShuffleState()}`, action: 'toggle_shuffle' },
            { label: `Repeat: ${getRepeatState()}`, action: 'toggle_repeat' },
            { label: `Theme: ${themeNames[currentTheme]}`, action: 'cycle_theme' }
        ];

        menuItems.forEach((item, index) => {
            const li = doc.createElement('li');
            li.className = 'ipod-menu-item';
            if (index === menuIndex) li.classList.add('selected');
            
            li.innerHTML = `<span>${item.label}</span><span class="ipod-menu-arrow">&gt;</span>`;
            li.onclick = () => {
                menuIndex = index;
                globalRenderMenu();
                executeMenu(menuItems[index].action);
            };
            menuList.appendChild(li);
        });
        return menuItems;
    };

    function executeMenu(action) {
        if (action === 'close') {
            toggleMenu();
        } else if (action === 'toggle_shuffle') {
            let btn = findControlBtn('control-button-shuffle', ['Shuffle', 'シャッフル']);
            if (!btn) btn = findControlBtn('control-button-smart-shuffle', ['Smart Shuffle', 'スマート']);
            if (btn) btn.click();
        } else if (action === 'toggle_repeat') {
            const btn = findControlBtn('control-button-repeat', ['Repeat', 'リピート']);
            if (btn) btn.click();
        } else if (action === 'cycle_theme') {
            currentTheme = (currentTheme + 1) % themes.length;
            chassis.className = 'ipod-chassis ' + themes[currentTheme];
            globalRenderMenu();
        }
    }

    function toggleMenu() {
        if (globalIsMenuOpen) {
            menuView.style.display = 'none';
            globalIsMenuOpen = false;
        } else {
            menuView.style.display = 'flex';
            globalIsMenuOpen = true;
            globalRenderMenu();
        }
    }

    menuBtn.onclick = (e) => { e.stopPropagation(); toggleMenu(); };

    centerBtn.onclick = (e) => {
        e.stopPropagation();
        if (globalIsMenuOpen) {
            const items = globalRenderMenu();
            executeMenu(items[menuIndex].action);
        } else {
            if (getComputedStyle(lyricsView).display === 'none') {
                lyricsView.style.display = 'flex';
                coverContainer.style.visibility = 'hidden';
                if (lyricsHeader) lyricsHeader.style.display = 'flex';
                if (screen) screen.classList.add('lyrics-active');
                tryOpenSpotifyLyrics();
            } else {
                lyricsView.style.display = 'none';
                coverContainer.style.visibility = 'visible';
                if (lyricsHeader) lyricsHeader.style.display = 'none';
                if (screen) screen.classList.remove('lyrics-active');
            }
        }
    };

    const togglePlay = (e) => {
        e.stopPropagation();
        let btn = document.querySelector('button[data-testid="control-button-playpause"]') ||
                  document.querySelector('button[aria-label="Play"], button[aria-label="Pause"]') ||
                  document.querySelector('button[aria-label="再生"], button[aria-label="一時停止"]');
        if (btn) btn.click();
    };

    const nextTrack = (e) => {
        e.stopPropagation();
        let btn = document.querySelector('button[data-testid="control-button-skip-forward"]') ||
                  document.querySelector('button[aria-label="Next track"], button[aria-label="次の曲"]');
        if (btn) btn.click();
    };
    const prevTrack = (e) => {
        e.stopPropagation();
        let btn = document.querySelector('button[data-testid="control-button-skip-back"]') ||
                  document.querySelector('button[aria-label="Previous track"], button[aria-label="前の曲"]');
        if (btn) btn.click();
    };

    if (playBtnLabel) playBtnLabel.onclick = togglePlay;
    if (nextBtn) nextBtn.onclick = nextTrack;
    if (prevBtn) prevBtn.onclick = prevTrack;

    const wheel = doc.getElementById('ipod-wheel');
    if (wheel) {
        wheel.addEventListener('wheel', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const delta = Math.sign(e.deltaY); 
            
            if (globalIsMenuOpen) {
                const currentItems = globalRenderMenu();
                if (delta > 0) { 
                    if (menuIndex < currentItems.length - 1) menuIndex++;
                } else { 
                    if (menuIndex > 0) menuIndex--;
                }
                globalRenderMenu();
            } else {
                const volInput = findVolumeSlider();
                if (volInput) {
                    const d = delta * -1;
                    let currentVal = parseFloat(volInput.value);
                    const maxVal = parseFloat(volInput.max) || 1; 
                    const step = parseFloat(volInput.step) || 0.1; 
                    
                    let newVal = currentVal + (d * step);
                    newVal = Math.round(newVal * 100) / 100;

                    if (newVal > maxVal) newVal = maxVal;
                    if (newVal < 0) newVal = 0;
                    
                    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
                    nativeInputValueSetter.call(volInput, newVal);
                    
                    volInput.dispatchEvent(new Event('input', { bubbles: true }));
                    volInput.dispatchEvent(new Event('change', { bubbles: true }));
                }
            }
        });
    }
}

function tryOpenSpotifyLyrics() {
    const selectors = ['button[data-testid="lyrics-button"]', 'button[aria-label="Lyrics"]', 'button[aria-label="歌詞"]', 'button[title="Lyrics"]', 'button[title="歌詞"]'];
    let btn = null;
    for (let sel of selectors) {
        btn = document.querySelector(sel);
        if (btn) break;
    }
    if (btn) {
        const isAriaChecked = btn.getAttribute('aria-checked') === 'true';
        const isDataActive = btn.getAttribute('data-active') === 'true';
        const hasActiveClass = btn.className.includes('active') || btn.className.includes('Active');
        const style = window.getComputedStyle(btn);
        const color = style.color || style.fill;
        const isGreen = color.includes('29, 185, 84') || color.includes('1db954');
        if (isAriaChecked || isDataActive || hasActiveClass || isGreen) return;
        const existingContainer = document.querySelector('[data-testid="lyrics-container"]');
        if (existingContainer && existingContainer.offsetParent !== null) return;
        btn.click();
    }
}

function parseTimeStr(str) {
    if (!str) return 0;
    const parts = str.split(':');
    if (parts.length === 2) return parseInt(parts[0]) * 60 + parseInt(parts[1]);
    if (parts.length === 3) return parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2]);
    return 0;
}

let lastTrackTitle = "";
function updateMetadata(doc) {
    if (!ipodPiPWindow) return;

    if (globalIsMenuOpen && globalRenderMenu) {
        globalRenderMenu();
    }

    let currentTitle = "Unknown Title";
    if (navigator.mediaSession && navigator.mediaSession.metadata) {
        const meta = navigator.mediaSession.metadata;
        const titleEl = doc.getElementById('ipod-title');
        const artistEl = doc.getElementById('ipod-artist');
        const albumEl = doc.getElementById('ipod-album');
        const coverImg = doc.getElementById('ipod-cover-img');
        const coverPlaceholder = doc.querySelector('.ipod-cover-placeholder');
        const lyricsHeaderTitle = doc.getElementById('ipod-lyrics-header-title');
        const lyricsHeaderArtist = doc.getElementById('ipod-lyrics-header-artist');
        const lyricsBg = doc.getElementById('ipod-lyrics-bg');

        currentTitle = meta.title || "Unknown Title";
        const currentArtist = meta.artist || "Unknown Artist";

        if (lastTrackTitle !== currentTitle) {
            lastTrackTitle = currentTitle;
            const lyricsContent = doc.getElementById('ipod-lyrics-content');
            if (lyricsContent) lyricsContent.innerHTML = '<div style="margin-top: 50%; color: rgba(255,255,255,0.5);">Loading...</div>';
            const lyricsView = doc.getElementById('ipod-lyrics-view');
            if (lyricsView) lyricsView.setAttribute('data-signature', '');
        }

        if (titleEl) titleEl.textContent = currentTitle;
        if (artistEl) artistEl.textContent = currentArtist;
        if (albumEl) albumEl.textContent = meta.album || "";
        if (lyricsHeaderTitle) lyricsHeaderTitle.textContent = currentTitle;
        if (lyricsHeaderArtist) lyricsHeaderArtist.textContent = currentArtist;

        if (meta.artwork && meta.artwork.length > 0) {
            const bestArt = meta.artwork.reduce((prev, current) => {
                return (parseInt(prev.sizes?.split('x')[0] || 0) > parseInt(current.sizes?.split('x')[0] || 0)) ? prev : current;
            });
            if (bestArt.src && coverImg.src !== bestArt.src) {
                coverImg.src = bestArt.src;
                coverImg.style.display = 'block';
                if (coverPlaceholder) coverPlaceholder.style.display = 'none';
                if (lyricsBg) lyricsBg.style.backgroundImage = `url('${bestArt.src}')`;
            }
        }
    }

    const lyricsView = doc.getElementById('ipod-lyrics-view');
    const lyricsContent = doc.getElementById('ipod-lyrics-content');
    if (lyricsView && getComputedStyle(lyricsView).display !== 'none' && lyricsContent) {
        const selectorQuery = ['[data-testid="lyric"]', '[data-testid="lyrics-line"]', '.lyrics-lyricsContent-lyric', 'div[class*="Lyrics__Line"]', 'div[class*="Lyrics-sc-"]', '.EnORM'].join(', ');
        const allSourceLines = document.querySelectorAll(selectorQuery);
        const validLines = Array.from(allSourceLines).filter(el => el.offsetParent !== null && el.innerText.trim().length > 0);

        if (validLines.length > 0) {
            const currentSignature = validLines.map(el => el.innerText).join('').length;
            const prevSignature = lyricsView.getAttribute('data-signature');
            if (currentSignature != prevSignature) {
                lyricsView.setAttribute('data-signature', currentSignature);
                lyricsContent.innerHTML = ''; 
                validLines.forEach((line, index) => {
                    const p = document.createElement('div');
                    p.className = 'ipod-lyric-line';
                    p.innerText = line.innerText;
                    p.id = `pip-lyric-${index}`;
                    lyricsContent.appendChild(p);
                });
            }
            validLines.forEach((line, index) => {
                const pipLine = doc.getElementById(`pip-lyric-${index}`);
                if (!pipLine) return;
                const style = window.getComputedStyle(line);
                const isActive = line.classList.contains('lyrics-lyricsContent-active') || line.getAttribute('data-active') === 'true' || style.color === 'rgb(255, 255, 255)' || (line.style.color === 'white');
                if (isActive) {
                    if (!pipLine.classList.contains('active')) {
                        const currents = lyricsContent.querySelectorAll('.active');
                        currents.forEach(c => c.classList.remove('active'));
                        pipLine.classList.add('active');
                        const containerH = lyricsContent.clientHeight;
                        const elemTop = pipLine.offsetTop;
                        const elemH = pipLine.offsetHeight;
                        const offset = 50; 
                        lyricsContent.scrollTo({
                            top: elemTop - (containerH / 2) + (elemH / 2) + offset,
                            behavior: 'smooth'
                        });
                    }
                }
            });
        }
    }

    const progressEl = document.querySelector('[data-testid="playback-position"]');
    const durationEl = document.querySelector('[data-testid="playback-duration"]');
    let currentStr = "0:00"; let totalStr = "-:--"; let progressPercent = 0;
    if (progressEl) currentStr = progressEl.textContent;
    if (durationEl) totalStr = durationEl.textContent;
    const curSec = parseTimeStr(currentStr);
    const totalSec = parseTimeStr(totalStr);
    if (totalSec > 0) progressPercent = (curSec / totalSec) * 100;
    const timeCurrentEl = doc.getElementById('ipod-time-current');
    const timeTotalEl = doc.getElementById('ipod-time-total');
    const scrubberFill = doc.getElementById('ipod-scrubber-fill');
    if (timeCurrentEl) timeCurrentEl.textContent = currentStr;
    if (timeTotalEl) timeTotalEl.textContent = totalStr;
    if (scrubberFill) scrubberFill.style.width = `${progressPercent}%`;

    const timeDisplay = doc.getElementById('ipod-time-display');
    if (timeDisplay) {
        const now = new Date();
        timeDisplay.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    requestAnimationFrame(() => updateMetadata(doc));
}

setInterval(injectStartButton, 2000);
