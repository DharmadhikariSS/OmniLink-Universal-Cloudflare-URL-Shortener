/**
 * OmniLink - Frontend Application Engine
 * Minimalist SaaS (Dub.co style) interface logic
 */

// Application State
const state = {
    links: [],
    totalLinks: 0,
    totalClicks: 0,
    filter: 'all',
    sort: 'newest',
    search: '',
    adminToken: localStorage.getItem('omnilink_token') || '',
    theme: localStorage.getItem('omnilink_theme') || 'dark',
    activeQrLink: null,
    qrColor: '#000000',
    editingLinkId: null,
    isAuthConfigured: false,
    isLocked: true
};

// QR Generator State
const qrStudio = {
    text: '',
    headerText: '',
    captionText: '',
    color: '#000000',
    bgColor: '#ffffff',
    dotShape: 'square',
    presetLogo: 'none',
    customLogoImg: null,
    customLogoDataUrl: null
};

const qrModalState = {
    link: null,
    headerText: '',
    captionText: '',
    color: '#000000',
    bgColor: '#ffffff',
    dotShape: 'square',
    presetLogo: 'none',
    customLogoImg: null,
    customLogoDataUrl: null
};

// DOM Elements
const elements = {
    themeToggleBtn: document.getElementById('themeToggleBtn'),
    deployGuideBtn: document.getElementById('deployGuideBtn'),
    authSettingsBtn: document.getElementById('authSettingsBtn'),
    logoutBtn: document.getElementById('logoutBtn'),
    statPill: document.getElementById('statPill'),
    adminLockGate: document.getElementById('adminLockGate'),
    lockGateTitle: document.getElementById('lockGateTitle'),
    lockGateDesc: document.getElementById('lockGateDesc'),
    lockGateForm: document.getElementById('lockGateForm'),
    lockGateInput: document.getElementById('lockGateInput'),
    lockGateSubmitBtn: document.getElementById('lockGateSubmitBtn'),
    lockGateStatusMsg: document.getElementById('lockGateStatusMsg'),
    shortenerBox: document.getElementById('shortenerBox'),
    mgmtSection: document.getElementById('mgmtSection'),
    brandLogo: document.getElementById('brandLogo'),
    headerLinksCount: document.getElementById('headerLinksCount'),
    headerClicksCount: document.getElementById('headerClicksCount'),
    filteredLinksCount: document.getElementById('filteredLinksCount'),
    protocolBadge: document.getElementById('protocolBadge'),
    mainUrlInput: document.getElementById('mainUrlInput'),
    shortenerForm: document.getElementById('shortenerForm'),
    shortenSubmitBtn: document.getElementById('shortenSubmitBtn'),
    domainPrefix: document.getElementById('domainPrefix'),
    linksListContainer: document.getElementById('linksListContainer'),
    emptyState: document.getElementById('emptyState'),
    searchInput: document.getElementById('searchInput'),
    sortSelect: document.getElementById('sortSelect'),
    exportCsvBtn: document.getElementById('exportCsvBtn'),
    filterTabs: document.querySelectorAll('.filter-tab'),
    toastContainer: document.getElementById('toastContainer'),

    // Tabs
    tabSingle: document.getElementById('tabSingle'),
    tabBulk: document.getElementById('tabBulk'),
    tabQrStudio: document.getElementById('tabQrStudio'),
    bulkFormWrap: document.getElementById('bulkFormWrap'),
    bulkTextarea: document.getElementById('bulkTextarea'),
    bulkSubmitBtn: document.getElementById('bulkSubmitBtn'),
    qrStudioWrap: document.getElementById('qrStudioWrap'),

    // QR Studio Elements
    studioTextInput: document.getElementById('studioTextInput'),
    studioHeaderInput: document.getElementById('studioHeaderInput'),
    studioCaptionInput: document.getElementById('studioCaptionInput'),
    studioLogoPresets: document.getElementById('studioLogoPresets'),
    studioLogoFileInput: document.getElementById('studioLogoFileInput'),
    studioLogoPreviewBadge: document.getElementById('studioLogoPreviewBadge'),
    studioLogoThumb: document.getElementById('studioLogoThumb'),
    studioLogoFileName: document.getElementById('studioLogoFileName'),
    studioLogoRemoveBtn: document.getElementById('studioLogoRemoveBtn'),
    studioShapeSelector: document.getElementById('studioShapeSelector'),
    studioColorSwatches: document.getElementById('studioColorSwatches'),
    studioCustomColor: document.getElementById('studioCustomColor'),
    studioBgSelector: document.getElementById('studioBgSelector'),
    studioQrCanvas: document.getElementById('studioQrCanvas'),
    studioCopyBtn: document.getElementById('studioCopyBtn'),
    studioDownloadPngBtn: document.getElementById('studioDownloadPngBtn'),
    studioDownloadSvgBtn: document.getElementById('studioDownloadSvgBtn'),
    studioSaveQrBtn: document.getElementById('studioSaveQrBtn'),

    // QR History Elements
    qrHistorySection: document.getElementById('qrHistorySection'),
    qrHistoryList: document.getElementById('qrHistoryList'),
    qrHistoryCount: document.getElementById('qrHistoryCount'),
    qrHistoryClearBtn: document.getElementById('qrHistoryClearBtn'),

    // QR Modal Elements
    qrModal: document.getElementById('qrModal'),
    qrCanvas: document.getElementById('qrCanvas'),
    qrLinkText: document.getElementById('qrLinkText'),
    modalHeaderInput: document.getElementById('modalHeaderInput'),
    modalCaptionInput: document.getElementById('modalCaptionInput'),
    modalLogoPresets: document.getElementById('modalLogoPresets'),
    modalLogoFileInput: document.getElementById('modalLogoFileInput'),
    modalLogoPreviewBadge: document.getElementById('modalLogoPreviewBadge'),
    modalLogoThumb: document.getElementById('modalLogoThumb'),
    modalLogoFileName: document.getElementById('modalLogoFileName'),
    modalLogoRemoveBtn: document.getElementById('modalLogoRemoveBtn'),
    modalShapeSelector: document.getElementById('modalShapeSelector'),
    modalColorSwatches: document.getElementById('modalColorSwatches'),
    modalCustomColor: document.getElementById('modalCustomColor'),
    modalBgSelector: document.getElementById('modalBgSelector'),
    modalCopyBtn: document.getElementById('modalCopyBtn'),
    downloadPngBtn: document.getElementById('downloadPngBtn'),
    downloadSvgBtn: document.getElementById('downloadSvgBtn'),

    // Option chips & panels
    optChips: document.querySelectorAll('.option-chip'),
    customSlugInput: document.getElementById('customSlugInput'),
    customTitleInput: document.getElementById('customTitleInput'),
    utmSource: document.getElementById('utmSource'),
    utmMedium: document.getElementById('utmMedium'),
    utmCampaign: document.getElementById('utmCampaign'),
    linkPasswordInput: document.getElementById('linkPasswordInput'),
    expiresAtInput: document.getElementById('expiresAtInput'),
    maxClicksInput: document.getElementById('maxClicksInput'),

    editModal: document.getElementById('editModal'),
    editLinkForm: document.getElementById('editLinkForm'),
    editLinkId: document.getElementById('editLinkId'),
    editTargetUrl: document.getElementById('editTargetUrl'),
    editSlug: document.getElementById('editSlug'),
    editTitle: document.getElementById('editTitle'),
    editExpiresAt: document.getElementById('editExpiresAt'),
    editMaxClicks: document.getElementById('editMaxClicks'),
    editPassword: document.getElementById('editPassword'),
    editRemovePassword: document.getElementById('editRemovePassword'),

    authModal: document.getElementById('authModal'),
    authForm: document.getElementById('authForm'),
    adminPassInput: document.getElementById('adminPassInput'),
    authModalTitle: document.getElementById('authModalTitle'),
    authModalDesc: document.getElementById('authModalDesc'),
    authStatusMsg: document.getElementById('authStatusMsg'),
    deployModal: document.getElementById('deployModal'),

    // Analytics Drawer
    analyticsDrawer: document.getElementById('analyticsDrawer'),
    closeDrawerBtn: document.getElementById('closeDrawerBtn'),
    drawerLinkTitle: document.getElementById('drawerLinkTitle'),
    drawerShortUrl: document.getElementById('drawerShortUrl'),
    drawerTotalClicks: document.getElementById('drawerTotalClicks'),
    drawerUniqueClicks: document.getElementById('drawerUniqueClicks'),
    timelineChartContainer: document.getElementById('timelineChartContainer'),
    countriesList: document.getElementById('countriesList'),
    referrersList: document.getElementById('referrersList'),
    devicesList: document.getElementById('devicesList'),
    recentClicksList: document.getElementById('recentClicksList')
};

// -------------------------------------------------------------
// Initialization
// -------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initPrefix();
    setupEventListeners();
    setupQrEventListeners();
    initStudioDefault();
    renderStudioQr();
    renderQrHistoryList();
    checkAuthStatus();
    if (!state.adminToken) {
        setLockedState(true);
    } else {
        autoLock.start();
        fetchLinks();
    }
});

function initTheme() {
    document.documentElement.setAttribute('data-theme', state.theme);
}

function toggleTheme() {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', state.theme);
    localStorage.setItem('omnilink_theme', state.theme);
    showToast(`Switched to ${state.theme} mode`);
}

function initPrefix() {
    if (elements.domainPrefix) {
        elements.domainPrefix.textContent = window.location.host + '/';
    }
}

// -------------------------------------------------------------
// Lock Screen & Auth State Management
// -------------------------------------------------------------
function setLockedState(isLocked) {
    state.isLocked = isLocked;
    if (isLocked) {
        autoLock.stop();
        if (elements.adminLockGate) elements.adminLockGate.style.display = 'block';
        if (elements.shortenerBox) elements.shortenerBox.style.display = 'none';
        if (elements.mgmtSection) elements.mgmtSection.style.display = 'none';
        if (elements.statPill) elements.statPill.style.display = 'none';
        if (elements.logoutBtn) elements.logoutBtn.style.display = 'none';
        state.links = [];
        state.totalLinks = 0;
        state.totalClicks = 0;
        if (elements.linksListContainer) elements.linksListContainer.innerHTML = '';
        if (elements.headerLinksCount) elements.headerLinksCount.textContent = '0';
        if (elements.headerClicksCount) elements.headerClicksCount.textContent = '0';
    } else {
        if (elements.adminLockGate) elements.adminLockGate.style.display = 'none';
        if (elements.shortenerBox) elements.shortenerBox.style.display = 'block';
        if (elements.mgmtSection) elements.mgmtSection.style.display = 'block';
        if (elements.statPill) elements.statPill.style.display = 'flex';
        if (elements.logoutBtn) elements.logoutBtn.style.display = 'inline-flex';
        autoLock.start();
    }
}

function handleLogout() {
    state.adminToken = '';
    localStorage.removeItem('omnilink_token');
    setLockedState(true);
    showToast('Dashboard locked');
}

// -------------------------------------------------------------
// Auto-Lock System
// 5 minutes inactivity → 30s countdown warning → lock
// -------------------------------------------------------------
const autoLock = (() => {
    const IDLE_MS   = 5 * 60 * 1000;  // 5 minutes
    const WARN_MS   = 30 * 1000;       // 30-second countdown
    let idleTimer   = null;
    let warnTimer   = null;
    let countdownInterval = null;
    let warningEl   = null;
    let running     = false;

    function createWarningBanner(seconds) {
        if (warningEl) return;
        warningEl = document.createElement('div');
        warningEl.id = 'autoLockWarning';
        warningEl.setAttribute('role', 'alert');
        warningEl.innerHTML = `
            <span id="autoLockMsg">⏱ Dashboard locking in <strong id="autoLockCount">${seconds}</strong>s due to inactivity</span>
            <button id="autoLockStayBtn" type="button">Stay Logged In</button>
        `;
        document.body.appendChild(warningEl);

        document.getElementById('autoLockStayBtn').addEventListener('click', () => {
            resetIdleTimer();
        });
    }

    function removeWarningBanner() {
        if (warningEl) {
            warningEl.remove();
            warningEl = null;
        }
        clearInterval(countdownInterval);
        countdownInterval = null;
    }

    function startCountdown() {
        let remaining = Math.round(WARN_MS / 1000);
        createWarningBanner(remaining);

        countdownInterval = setInterval(() => {
            remaining--;
            const countEl = document.getElementById('autoLockCount');
            if (countEl) countEl.textContent = remaining;
            if (remaining <= 0) {
                clearInterval(countdownInterval);
                countdownInterval = null;
                removeWarningBanner();
                state.adminToken = '';
                localStorage.removeItem('omnilink_token');
                setLockedState(true);
                showToast('Dashboard locked due to inactivity', 'error');
            }
        }, 1000);
    }

    function resetIdleTimer() {
        if (!running) return;
        // Cancel any active warning + countdown
        clearTimeout(warnTimer);
        removeWarningBanner();

        // Restart idle timer
        clearTimeout(idleTimer);
        idleTimer = setTimeout(() => {
            // After idle period, start the warning countdown
            warnTimer = setTimeout(startCountdown, 0);
        }, IDLE_MS);
    }

    function onActivity() {
        // Only reset if not already in countdown phase
        if (!countdownInterval) resetIdleTimer();
    }

    function start() {
        if (running) return;
        running = true;
        document.addEventListener('click', onActivity, { passive: true });
        document.addEventListener('keypress', onActivity, { passive: true });
        resetIdleTimer();
    }

    function stop() {
        running = false;
        clearTimeout(idleTimer);
        clearTimeout(warnTimer);
        removeWarningBanner();
        document.removeEventListener('click', onActivity);
        document.removeEventListener('keypress', onActivity);
    }

    return { start, stop, reset: resetIdleTimer };
})();

async function handleLockGateSubmit(e) {
    e.preventDefault();
    const pass = elements.lockGateInput.value.trim();
    if (!pass) return;

    elements.lockGateSubmitBtn.disabled = true;
    elements.lockGateSubmitBtn.innerHTML = '<span>Verifying...</span>';
    elements.lockGateStatusMsg.style.display = 'none';

    const action = !state.isAuthConfigured ? 'setup' : 'verify';
    const body = action === 'setup' ? { action, newPassword: pass } : { action, password: pass };

    try {
        const res = await fetch('/api/auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        const data = await res.json();
        if (res.ok && data.success) {
            state.adminToken = pass;
            localStorage.setItem('omnilink_token', pass);
            state.isAuthConfigured = true;
            elements.lockGateInput.value = '';
            setLockedState(false);
            showToast(action === 'setup' ? 'Admin passcode configured & unlocked!' : 'Dashboard unlocked successfully!');
            await fetchLinks();
        } else {
            elements.lockGateStatusMsg.textContent = data.error || 'Incorrect passcode';
            elements.lockGateStatusMsg.style.display = 'block';
            elements.lockGateInput.focus();
        }
    } catch (err) {
        elements.lockGateStatusMsg.textContent = 'Failed to connect to authentication server';
        elements.lockGateStatusMsg.style.display = 'block';
    } finally {
        elements.lockGateSubmitBtn.disabled = false;
        elements.lockGateSubmitBtn.innerHTML = `
            <span>Unlock Dashboard</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
        `;
    }
}

// -------------------------------------------------------------
// Authentication Handling
// -------------------------------------------------------------
async function checkAuthStatus() {
    try {
        const res = await fetch('/api/auth');
        const data = await res.json();
        state.isAuthConfigured = Boolean(data.isConfigured);

        if (state.isAuthConfigured) {
            elements.authSettingsBtn.title = 'Admin Security (Configured)';
            elements.authSettingsBtn.classList.remove('active');
            if (elements.lockGateTitle) elements.lockGateTitle.textContent = 'Admin Access Required';
            if (elements.lockGateDesc) elements.lockGateDesc.textContent = 'OmniLink is private. Enter your master admin passcode to unlock link management and analytics.';
            if (elements.lockGateInput) elements.lockGateInput.placeholder = 'Enter admin passcode';
        } else {
            elements.authSettingsBtn.title = 'Set Admin Security (Action Recommended)';
            elements.authSettingsBtn.classList.add('active');
            if (elements.lockGateTitle) elements.lockGateTitle.textContent = 'Setup Master Admin Passcode';
            if (elements.lockGateDesc) elements.lockGateDesc.textContent = 'OmniLink is configured. Enter Master Admin Passcode below.';
            if (elements.lockGateInput) elements.lockGateInput.placeholder = 'Set new admin passcode (min 4 chars)';
        }
    } catch (e) {
        console.warn('Auth check error:', e);
    }
}

function getAuthHeaders() {
    const headers = { 'Content-Type': 'application/json' };
    if (state.adminToken) {
        headers['Authorization'] = `Bearer ${state.adminToken}`;
        headers['x-admin-key'] = state.adminToken;
    }
    return headers;
}

// -------------------------------------------------------------
// Event Listeners
// -------------------------------------------------------------
function setupEventListeners() {
    // Theme toggle
    elements.themeToggleBtn.addEventListener('click', toggleTheme);

    // Global aggregate analytics pill
    if (elements.statPill) {
        elements.statPill.style.cursor = 'pointer';
        elements.statPill.title = 'View Aggregate Analytics for All Links';
        elements.statPill.addEventListener('click', () => openAnalyticsDrawer('all'));
    }

    // Logout / Lock toggle
    if (elements.logoutBtn) {
        elements.logoutBtn.addEventListener('click', handleLogout);
    }

    // Lock gate form
    if (elements.lockGateForm) {
        elements.lockGateForm.addEventListener('submit', handleLockGateSubmit);
    }

    // Protocol recognition & auto-sync to QR Studio if default
    elements.mainUrlInput.addEventListener('input', () => {
        updateProtocolBadge();
        const mainVal = elements.mainUrlInput.value.trim();
        const fallback = window.location.origin || 'https://omnilink.app';
        if (mainVal && (!qrStudio.text || qrStudio.text === fallback || qrStudio.text === 'https://')) {
            qrStudio.text = mainVal;
            if (elements.studioTextInput) elements.studioTextInput.value = mainVal;
            renderStudioQr();
        }
    });

    // Tabs
    elements.tabSingle.addEventListener('click', () => switchTab('single'));
    elements.tabBulk.addEventListener('click', () => switchTab('bulk'));
    if (elements.tabQrStudio) {
        elements.tabQrStudio.addEventListener('click', () => switchTab('studio'));
    }

    // Option Chips
    elements.optChips.forEach(chip => {
        chip.addEventListener('click', () => {
            const targetId = chip.getAttribute('data-target');
            const panel = document.getElementById(targetId);
            if (!panel) return;
            const isOpen = panel.classList.contains('open');
            panel.classList.toggle('open', !isOpen);
            chip.classList.toggle('active', !isOpen);
        });
    });

    // Form Submissions
    elements.shortenerForm.addEventListener('submit', handleSingleShorten);
    elements.bulkSubmitBtn.addEventListener('click', handleBulkShorten);

    // Search & Filter & Sort
    let searchDebounce = null;
    elements.searchInput.addEventListener('input', (e) => {
        clearTimeout(searchDebounce);
        searchDebounce = setTimeout(() => {
            state.search = e.target.value.trim();
            fetchLinks();
        }, 250);
    });

    elements.sortSelect.addEventListener('change', (e) => {
        state.sort = e.target.value;
        fetchLinks();
    });

    elements.filterTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            elements.filterTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            state.filter = tab.getAttribute('data-status');
            fetchLinks();
        });
    });

    // CSV Export
    elements.exportCsvBtn.addEventListener('click', handleExportCsv);

    // Modals
    elements.deployGuideBtn.addEventListener('click', () => openModal(elements.deployModal));
    elements.authSettingsBtn.addEventListener('click', openAuthModal);
    elements.authForm.addEventListener('submit', handleAuthSubmit);

    // Modal Close buttons
    document.querySelectorAll('.close-modal-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.getAttribute('data-close');
            if (target) closeModal(document.getElementById(target));
        });
    });

    // Close on backdrop click
    document.querySelectorAll('.modal-overlay').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal(modal);
        });
    });

    // Analytics Drawer Close
    elements.closeDrawerBtn.addEventListener('click', closeAnalyticsDrawer);
    elements.analyticsDrawer.addEventListener('click', (e) => {
        if (e.target === elements.analyticsDrawer) closeAnalyticsDrawer();
    });

    // Edit link form
    elements.editLinkForm.addEventListener('submit', handleEditSubmit);

    // Keyboard ESC to close
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal-overlay.open').forEach(m => closeModal(m));
            closeAnalyticsDrawer();
        }
    });
}

// -------------------------------------------------------------
// Protocol Detection
// -------------------------------------------------------------
function updateProtocolBadge() {
    const val = elements.mainUrlInput.value.trim().toLowerCase();
    const badge = elements.protocolBadge;

    if (!val) {
        badge.textContent = 'LINK';
        badge.classList.remove('active');
        return;
    }

    badge.classList.add('active');
    if (val.startsWith('magnet:')) {
        badge.textContent = 'MAGNET';
    } else if (val.startsWith('mailto:')) {
        badge.textContent = 'EMAIL';
    } else if (val.startsWith('tel:')) {
        badge.textContent = 'PHONE';
    } else if (val.startsWith('whatsapp:') || val.includes('wa.me')) {
        badge.textContent = 'WHATSAPP';
    } else if (val.startsWith('tg:') || val.includes('t.me')) {
        badge.textContent = 'TELEGRAM';
    } else if (val.startsWith('ftp:')) {
        badge.textContent = 'FTP';
    } else if (val.startsWith('http://')) {
        badge.textContent = 'HTTP';
    } else if (val.startsWith('https://')) {
        badge.textContent = 'HTTPS';
    } else if (/^[a-z][a-z0-9+.-]*:/.test(val)) {
        badge.textContent = 'DEEP LINK';
    } else {
        badge.textContent = 'WEB URL';
    }
}

// -------------------------------------------------------------
// Tab Switching
// -------------------------------------------------------------
function switchTab(mode) {
    elements.tabSingle.classList.toggle('active', mode === 'single');
    elements.tabBulk.classList.toggle('active', mode === 'bulk');
    if (elements.tabQrStudio) elements.tabQrStudio.classList.toggle('active', mode === 'studio');

    elements.shortenerForm.style.display = mode === 'single' ? 'block' : 'none';
    elements.bulkFormWrap.classList.toggle('open', mode === 'bulk');
    if (elements.qrStudioWrap) {
        elements.qrStudioWrap.style.display = mode === 'studio' ? 'block' : 'none';
        if (mode === 'studio') {
            const mainVal = elements.mainUrlInput ? elements.mainUrlInput.value.trim() : '';
            const fallback = window.location.origin || 'https://omnilink.app';
            if (mainVal && (!qrStudio.text || qrStudio.text === fallback || qrStudio.text === 'https://')) {
                qrStudio.text = mainVal;
                if (elements.studioTextInput) elements.studioTextInput.value = mainVal;
            } else if (elements.studioTextInput && elements.studioTextInput.value.trim()) {
                qrStudio.text = cleanEncodedText(elements.studioTextInput.value);
            }
            renderStudioQr();
            renderQrHistoryList();
        }
    }
}

// -------------------------------------------------------------
// UTM Builder Helper & Sanitizers
// -------------------------------------------------------------
function isSafeUrl(url = '') {
    const lower = String(url).trim().toLowerCase();
    if (lower.startsWith('javascript:') || lower.startsWith('data:') || lower.startsWith('vbscript:')) {
        return false;
    }
    return true;
}

function toLocalDateTimeInputString(dateString) {
    if (!dateString) return '';
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '';
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function buildFinalUrl(rawUrl) {
    let url = rawUrl.trim();
    if (!url) return '';

    const utmSource = elements.utmSource.value.trim();
    const utmMedium = elements.utmMedium.value.trim();
    const utmCampaign = elements.utmCampaign.value.trim();

    if (!utmSource && !utmMedium && !utmCampaign) {
        return url;
    }

    // Do not modify non-HTTP protocols (e.g. magnet, mailto, tel, tg) with query parameters
    const lower = url.toLowerCase();
    if (lower.startsWith('magnet:') || lower.startsWith('mailto:') || lower.startsWith('tel:') || lower.startsWith('tg:') || lower.startsWith('whatsapp:')) {
        return url;
    }

    try {
        // Attempt URL parsing for HTTP/S URLs
        const dummyPrefix = url.includes('://') ? '' : 'https://';
        const urlObj = new URL(dummyPrefix + url);
        if (utmSource) urlObj.searchParams.set('utm_source', utmSource);
        if (utmMedium) urlObj.searchParams.set('utm_medium', utmMedium);
        if (utmCampaign) urlObj.searchParams.set('utm_campaign', utmCampaign);
        return dummyPrefix ? urlObj.toString().replace('https://', '') : urlObj.toString();
    } catch (e) {
        return url;
    }
}

// -------------------------------------------------------------
// Fetch & Render Links
// -------------------------------------------------------------
async function fetchLinks() {
    try {
        const query = new URLSearchParams({
            status: state.filter,
            sort: state.sort,
            search: state.search
        });

        const res = await fetch(`/api/links?${query.toString()}`, {
            headers: getAuthHeaders()
        });

        if (res.status === 401) {
            setLockedState(true);
            return;
        }

        const data = await res.json();
        setLockedState(false);
        state.links = data.links || [];
        state.totalLinks = data.total || 0;
        state.totalClicks = data.total_clicks || 0;

        updateDashboardCounters();
        renderLinksList();
    } catch (e) {
        console.error('Failed to load links:', e);
        showToast('Unable to load links', 'error');
    }
}

function updateDashboardCounters() {
    elements.headerLinksCount.textContent = state.totalLinks;
    elements.headerClicksCount.textContent = state.totalClicks.toLocaleString();
    elements.filteredLinksCount.textContent = state.links.length;

    // Filter tab counts
    const now = Date.now();
    let countActive = 0;
    let countPaused = 0;
    let countExpired = 0;
    let countProtected = 0;

    state.links.forEach(link => {
        if (link.is_active === 0) {
            countPaused++;
        } else if (
            (link.expires_at && new Date(link.expires_at).getTime() < now) ||
            (link.max_clicks !== null && link.clicks_count >= link.max_clicks)
        ) {
            countExpired++;
        } else {
            countActive++;
        }
        if (link.has_password) countProtected++;
    });

    const elCountAll = document.getElementById('countAll');
    const elCountActive = document.getElementById('countActive');
    const elCountPaused = document.getElementById('countPaused');
    const elCountExpired = document.getElementById('countExpired');
    const elCountProtected = document.getElementById('countProtected');

    if (elCountAll) elCountAll.textContent = state.links.length;
    if (elCountActive) elCountActive.textContent = countActive;
    if (elCountPaused) elCountPaused.textContent = countPaused;
    if (elCountExpired) elCountExpired.textContent = countExpired;
    if (elCountProtected) elCountProtected.textContent = countProtected;
}

function renderLinksList() {
    const container = elements.linksListContainer;
    container.innerHTML = '';

    if (state.links.length === 0) {
        elements.emptyState.style.display = 'block';
        return;
    }

    elements.emptyState.style.display = 'none';
    const origin = window.location.origin;

    state.links.forEach(link => {
        const shortUrl = `${origin}/${link.slug}`;
        const isExpired = (link.expires_at && new Date(link.expires_at).getTime() < Date.now()) ||
                          (link.max_clicks !== null && link.clicks_count >= link.max_clicks);

        let statusBadge = '';
        if (link.is_active === 0) {
            statusBadge = '<span class="badge badge-paused">Paused</span>';
        } else if (isExpired) {
            statusBadge = '<span class="badge badge-expired">Expired</span>';
        } else {
            statusBadge = '<span class="badge badge-active">Active</span>';
        }

        const passwordBadge = link.has_password
            ? '<span class="badge badge-protected" title="Protected with passcode">🔒 PIN</span>'
            : '';

        const safeTargetHref = isSafeUrl(link.target_url) ? escapeHtml(link.target_url) : '#';

        const card = document.createElement('div');
        card.className = 'link-card';
        card.innerHTML = `
            <div class="link-card-top">
                <div class="link-main-info">
                    <div class="link-favicon">${getProtocolLetter(link.target_url)}</div>
                    <div class="link-details">
                        <div class="link-title-row">
                            <span class="link-title" title="${escapeHtml(link.title || link.target_url)}">
                                ${escapeHtml(link.title || link.target_url)}
                            </span>
                            ${statusBadge}
                            ${passwordBadge}
                        </div>
                        <div class="link-urls-row">
                            <a href="${shortUrl}" target="_blank" class="short-url-link" title="Open short link in new tab">
                                ${window.location.host}/${escapeHtml(link.slug)}
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                            </a>
                            <a href="${safeTargetHref}" target="_blank" rel="noopener noreferrer" class="target-url-preview" title="${escapeHtml(link.target_url)}">
                                ↳ ${escapeHtml(link.target_url)}
                            </a>
                        </div>
                    </div>
                </div>

                <div class="click-pill" title="View detailed click analytics" data-analytics="${link.id}">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 20V10"></path><path d="M12 20V4"></path><path d="M6 20v-6"></path></svg>
                    <span>${link.clicks_count.toLocaleString()} clicks</span>
                </div>
            </div>

            <div class="link-card-bottom">
                <div class="link-metrics">
                    <span>Created ${formatRelativeTime(link.created_at)}</span>
                    ${link.expires_at ? `<span>Expires ${new Date(link.expires_at).toLocaleDateString()}</span>` : ''}
                    ${link.max_clicks ? `<span>Limit: ${link.clicks_count}/${link.max_clicks}</span>` : ''}
                </div>

                <div class="link-action-buttons">
                    <button class="btn-action" data-copy="${shortUrl}" title="Copy short link">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                        Copy
                    </button>
                    <button class="btn-action" data-qr="${link.id}" title="Generate QR Code">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
                        QR Code
                    </button>
                    <button class="btn-action" data-analytics="${link.id}" title="Analytics & Insights">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 14 14"></polyline></svg>
                        Analytics
                    </button>
                    <button class="btn-action" data-toggle="${link.id}" title="${link.is_active ? 'Pause link' : 'Activate link'}">
                        ${link.is_active ? 'Pause' : 'Activate'}
                    </button>
                    <button class="btn-action" data-edit="${link.id}" title="Edit destination or settings">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                        Edit
                    </button>
                    <button class="btn-action btn-danger" data-delete="${link.id}" title="Delete link">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                </div>
            </div>
        `;

        // Action Handlers
        card.querySelector('[data-copy]').addEventListener('click', (e) => {
            copyToClipboard(e.currentTarget.getAttribute('data-copy'));
        });
        card.querySelector('[data-qr]').addEventListener('click', () => {
            openQrModal(link);
        });
        card.querySelectorAll('[data-analytics]').forEach(el => {
            el.addEventListener('click', () => openAnalyticsDrawer(link.id));
        });
        card.querySelector('[data-toggle]').addEventListener('click', () => {
            toggleLinkStatus(link.id);
        });
        card.querySelector('[data-edit]').addEventListener('click', () => {
            openEditModal(link);
        });
        card.querySelector('[data-delete]').addEventListener('click', () => {
            deleteLink(link.id, link.slug);
        });

        container.appendChild(card);
    });
}

// -------------------------------------------------------------
// Shorten Actions
// -------------------------------------------------------------
async function handleSingleShorten(e) {
    e.preventDefault();
    const rawUrl = elements.mainUrlInput.value.trim();
    if (!rawUrl) return;

    const finalTargetUrl = buildFinalUrl(rawUrl);
    const customSlug = elements.customSlugInput.value.trim();
    const title = elements.customTitleInput.value.trim();
    const password = elements.linkPasswordInput.value.trim();
    const expiresAt = elements.expiresAtInput.value ? new Date(elements.expiresAtInput.value).toISOString() : null;
    const maxClicks = elements.maxClicksInput.value ? parseInt(elements.maxClicksInput.value, 10) : null;

    elements.shortenSubmitBtn.disabled = true;
    elements.shortenSubmitBtn.style.opacity = '0.7';

    try {
        const res = await fetch('/api/links', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
                target_url: finalTargetUrl,
                custom_slug: customSlug || undefined,
                title: title || undefined,
                password: password || undefined,
                expires_at: expiresAt,
                max_clicks: maxClicks
            })
        });

        const data = await res.json();
        if (res.status === 401) {
            promptAuth('Admin Access Required', 'Please enter your admin passcode to create links.');
            return;
        }

        if (!res.ok) {
            showToast(data.error || 'Failed to shorten link', 'error');
            return;
        }

        // Success
        showToast('Link created successfully!');
        const shortUrl = `${window.location.origin}/${data.link.slug}`;
        copyToClipboard(shortUrl, 'Short link copied to clipboard!');

        // Update QR Studio with newly created short link
        qrStudio.text = shortUrl;
        if (elements.studioTextInput) elements.studioTextInput.value = shortUrl;
        renderStudioQr();

        // Reset form inputs
        elements.mainUrlInput.value = '';
        elements.customSlugInput.value = '';
        elements.customTitleInput.value = '';
        elements.linkPasswordInput.value = '';
        elements.expiresAtInput.value = '';
        elements.maxClicksInput.value = '';
        elements.utmSource.value = '';
        elements.utmMedium.value = '';
        elements.utmCampaign.value = '';
        updateProtocolBadge();

        // Refresh links list
        fetchLinks();

    } catch (err) {
        console.error('Error creating link:', err);
        showToast('Network error while creating link', 'error');
    } finally {
        elements.shortenSubmitBtn.disabled = false;
        elements.shortenSubmitBtn.style.opacity = '1';
    }
}

async function handleBulkShorten() {
    const text = elements.bulkTextarea.value.trim();
    if (!text) {
        showToast('Please paste at least one URL', 'error');
        return;
    }

    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const urls = [];

    lines.forEach(line => {
        const lastCommaIdx = line.lastIndexOf(',');
        let target = line.trim();
        let slug = undefined;
        if (lastCommaIdx !== -1) {
            const candidateSlug = line.slice(lastCommaIdx + 1).trim();
            const candidateTarget = line.slice(0, lastCommaIdx).trim();
            if (/^[a-zA-Z0-9_-]+$/.test(candidateSlug) && (candidateTarget.includes('://') || candidateTarget.includes(':') || candidateTarget.includes('.'))) {
                target = candidateTarget;
                slug = candidateSlug;
            }
        }
        if (target) {
            urls.push({ url: target, slug });
        }
    });

    if (urls.length === 0) return;

    elements.bulkSubmitBtn.disabled = true;
    try {
        const res = await fetch('/api/links', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ bulk: true, urls })
        });
        const data = await res.json();
        if (res.status === 401) {
            promptAuth('Admin Access Required', 'Enter passcode to create links.');
            return;
        }
        if (res.ok && data.success) {
            showToast(`Successfully created ${data.created.length} short links!`);
            elements.bulkTextarea.value = '';
            switchTab('single');
            fetchLinks();
        } else {
            showToast(data.error || 'Error processing batch', 'error');
        }
    } catch (e) {
        showToast('Failed to create bulk links', 'error');
    } finally {
        elements.bulkSubmitBtn.disabled = false;
    }
}

// -------------------------------------------------------------
// Status Toggle & Delete
// -------------------------------------------------------------
async function toggleLinkStatus(linkId) {
    try {
        const res = await fetch(`/api/links/${linkId}`, {
            method: 'PATCH',
            headers: getAuthHeaders()
        });
        if (res.ok) {
            const data = await res.json();
            showToast(data.is_active ? 'Link activated' : 'Link paused');
            fetchLinks();
        } else {
            showToast('Failed to toggle status', 'error');
        }
    } catch (e) {
        showToast('Network error', 'error');
    }
}

async function deleteLink(linkId, slug) {
    if (!confirm(`Are you sure you want to permanently delete "/${slug}"? Click stats will also be removed.`)) {
        return;
    }
    try {
        const res = await fetch(`/api/links/${linkId}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        if (res.ok) {
            showToast('Link deleted');
            fetchLinks();
        } else {
            showToast('Failed to delete link', 'error');
        }
    } catch (e) {
        showToast('Network error', 'error');
    }
}

// -------------------------------------------------------------
// Edit Link Modal
// -------------------------------------------------------------
function openEditModal(link) {
    state.editingLinkId = link.id;
    elements.editLinkId.value = link.id;
    elements.editTargetUrl.value = link.target_url;
    elements.editSlug.value = link.slug;
    elements.editTitle.value = link.title || '';
    elements.editExpiresAt.value = link.expires_at ? toLocalDateTimeInputString(link.expires_at) : '';
    elements.editMaxClicks.value = link.max_clicks || '';
    elements.editPassword.value = '';
    elements.editRemovePassword.checked = false;

    openModal(elements.editModal);
}

async function handleEditSubmit(e) {
    e.preventDefault();
    const id = state.editingLinkId;
    if (!id) return;

    const target_url = elements.editTargetUrl.value.trim();
    const slug = elements.editSlug.value.trim();
    const title = elements.editTitle.value.trim();
    const expires_at = elements.editExpiresAt.value ? new Date(elements.editExpiresAt.value).toISOString() : null;
    const max_clicks = elements.editMaxClicks.value ? parseInt(elements.editMaxClicks.value, 10) : null;
    const password = elements.editPassword.value.trim();
    const remove_password = elements.editRemovePassword.checked;

    try {
        const res = await fetch(`/api/links/${id}`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify({
                target_url,
                slug,
                title,
                expires_at,
                max_clicks,
                password: password || undefined,
                remove_password
            })
        });

        const data = await res.json();
        if (res.ok) {
            showToast('Link updated successfully!');
            closeModal(elements.editModal);
            fetchLinks();
        } else {
            showToast(data.error || 'Failed to update link', 'error');
        }
    } catch (err) {
        showToast('Network error updating link', 'error');
    }
}

// -------------------------------------------------------------
// QR Studio & Modal Engine
// -------------------------------------------------------------
function cleanEncodedText(raw) {
    if (!raw) return '';
    let text = raw.trim();
    if (text.startsWith('https://https://')) {
        text = text.substring(8);
    } else if (text.startsWith('http://http://')) {
        text = text.substring(7);
    } else if (text.startsWith('https://http://')) {
        text = text.substring(8);
    }
    return text;
}

function initStudioDefault() {
    if (elements.studioTextInput) {
        const fallback = window.location.origin || 'https://omnilink.app';
        if (!elements.studioTextInput.value.trim()) {
            qrStudio.text = fallback;
        } else {
            qrStudio.text = cleanEncodedText(elements.studioTextInput.value);
        }
    }
}

function setupQrEventListeners() {
    // Studio Text inputs with real-time sync across input, paste, keyup, change
    if (elements.studioTextInput) {
        const updateStudioText = () => {
            const raw = elements.studioTextInput.value;
            const cleaned = cleanEncodedText(raw);
            if (cleaned !== raw && (raw.startsWith('https://https://') || raw.startsWith('http://http://'))) {
                elements.studioTextInput.value = cleaned;
            }
            qrStudio.text = cleaned || (window.location.origin || 'https://omnilink.app');
            renderStudioQr();
        };

        elements.studioTextInput.addEventListener('input', updateStudioText);
        elements.studioTextInput.addEventListener('change', updateStudioText);
        elements.studioTextInput.addEventListener('keyup', updateStudioText);
        elements.studioTextInput.addEventListener('paste', () => {
            setTimeout(updateStudioText, 10);
        });
    }
    if (elements.studioHeaderInput) {
        elements.studioHeaderInput.addEventListener('input', (e) => {
            qrStudio.headerText = e.target.value;
            renderStudioQr();
        });
    }
    if (elements.studioCaptionInput) {
        elements.studioCaptionInput.addEventListener('input', (e) => {
            qrStudio.captionText = e.target.value;
            renderStudioQr();
        });
    }

    // Studio Logo Presets
    if (elements.studioLogoPresets) {
        elements.studioLogoPresets.querySelectorAll('.preset-logo-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                selectPresetLogo(btn.getAttribute('data-preset'), true);
            });
        });
    }

    // Studio Custom Logo File
    if (elements.studioLogoFileInput) {
        elements.studioLogoFileInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files[0]) {
                handleLogoUpload(e.target.files[0], true);
            }
        });
    }
    if (elements.studioLogoRemoveBtn) {
        elements.studioLogoRemoveBtn.addEventListener('click', () => {
            removeCustomLogo(true);
        });
    }

    // Studio Dot Shapes
    if (elements.studioShapeSelector) {
        elements.studioShapeSelector.querySelectorAll('.shape-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                selectDotShape(btn.getAttribute('data-shape'), true);
            });
        });
    }

    // Studio Colors
    if (elements.studioColorSwatches) {
        elements.studioColorSwatches.querySelectorAll('.color-swatch').forEach(swatch => {
            swatch.addEventListener('click', () => {
                selectColor(swatch.getAttribute('data-color'), true);
            });
        });
    }
    if (elements.studioCustomColor) {
        elements.studioCustomColor.addEventListener('input', (e) => {
            selectColor(e.target.value, true);
        });
    }

    // Studio Background
    if (elements.studioBgSelector) {
        elements.studioBgSelector.querySelectorAll('.bg-choice-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                selectBg(btn.getAttribute('data-bg'), true);
            });
        });
    }

    // Studio Actions
    if (elements.studioCopyBtn) {
        elements.studioCopyBtn.addEventListener('click', () => {
            if (!window.OmniQR) return;
            const text = (qrStudio.text || '').trim() || (window.location.origin || 'https://omnilink.app');
            const logoSrc = qrStudio.customLogoDataUrl || qrStudio.customLogoImg || (qrStudio.presetLogo !== 'none' ? qrStudio.presetLogo : null);
            const exportCanvas = OmniQR.renderToExportCanvas({
                text: text,
                color: qrStudio.color,
                bgColor: qrStudio.bgColor,
                dotShape: qrStudio.dotShape,
                headerText: qrStudio.headerText,
                captionText: qrStudio.captionText,
                logoImg: logoSrc,
                margin: 2
            }, 1024);
            copyCanvasToClipboard(exportCanvas);
            saveCurrentToQrHistory(true);
        });
    }
    if (elements.studioDownloadPngBtn) {
        elements.studioDownloadPngBtn.addEventListener('click', () => {
            downloadStudioPng();
            saveCurrentToQrHistory(true);
        });
    }
    if (elements.studioDownloadSvgBtn) {
        elements.studioDownloadSvgBtn.addEventListener('click', () => {
            downloadStudioSvg();
            saveCurrentToQrHistory(true);
        });
    }
    if (elements.studioSaveQrBtn) {
        elements.studioSaveQrBtn.addEventListener('click', () => {
            saveCurrentToQrHistory(false);
        });
    }
    if (elements.qrHistoryClearBtn) {
        elements.qrHistoryClearBtn.addEventListener('click', clearQrHistory);
    }

    // Modal Text inputs
    if (elements.modalHeaderInput) {
        elements.modalHeaderInput.addEventListener('input', (e) => {
            qrModalState.headerText = e.target.value;
            renderModalQr();
        });
    }
    if (elements.modalCaptionInput) {
        elements.modalCaptionInput.addEventListener('input', (e) => {
            qrModalState.captionText = e.target.value;
            renderModalQr();
        });
    }

    // Modal Logo Presets
    if (elements.modalLogoPresets) {
        elements.modalLogoPresets.querySelectorAll('.preset-logo-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                selectPresetLogo(btn.getAttribute('data-preset'), false);
            });
        });
    }

    // Modal Custom Logo File
    if (elements.modalLogoFileInput) {
        elements.modalLogoFileInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files[0]) {
                handleLogoUpload(e.target.files[0], false);
            }
        });
    }
    if (elements.modalLogoRemoveBtn) {
        elements.modalLogoRemoveBtn.addEventListener('click', () => {
            removeCustomLogo(false);
        });
    }

    // Modal Dot Shapes
    if (elements.modalShapeSelector) {
        elements.modalShapeSelector.querySelectorAll('.shape-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                selectDotShape(btn.getAttribute('data-shape'), false);
            });
        });
    }

    // Modal Colors
    if (elements.modalColorSwatches) {
        elements.modalColorSwatches.querySelectorAll('.color-swatch').forEach(swatch => {
            swatch.addEventListener('click', () => {
                selectColor(swatch.getAttribute('data-color'), false);
            });
        });
    }
    if (elements.modalCustomColor) {
        elements.modalCustomColor.addEventListener('input', (e) => {
            selectColor(e.target.value, false);
        });
    }

    // Modal Background
    if (elements.modalBgSelector) {
        elements.modalBgSelector.querySelectorAll('.bg-choice-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                selectBg(btn.getAttribute('data-bg'), false);
            });
        });
    }

    // Modal Actions
    if (elements.modalCopyBtn) {
        elements.modalCopyBtn.addEventListener('click', () => {
            copyCanvasToClipboard(elements.qrCanvas);
        });
    }
    if (elements.downloadPngBtn) {
        elements.downloadPngBtn.addEventListener('click', downloadModalPng);
    }
    if (elements.downloadSvgBtn) {
        elements.downloadSvgBtn.addEventListener('click', downloadModalSvg);
    }
}

function selectPresetLogo(preset, isStudio = true) {
    if (isStudio) {
        qrStudio.presetLogo = preset;
        qrStudio.customLogoImg = null;
        qrStudio.customLogoDataUrl = null;
        if (elements.studioLogoFileInput) elements.studioLogoFileInput.value = '';
        if (elements.studioLogoPreviewBadge) elements.studioLogoPreviewBadge.style.display = 'none';
        if (elements.studioLogoPresets) {
            elements.studioLogoPresets.querySelectorAll('.preset-logo-btn').forEach(b => {
                b.classList.toggle('active', b.getAttribute('data-preset') === preset);
            });
        }
        renderStudioQr();
    } else {
        qrModalState.presetLogo = preset;
        qrModalState.customLogoImg = null;
        qrModalState.customLogoDataUrl = null;
        if (elements.modalLogoFileInput) elements.modalLogoFileInput.value = '';
        if (elements.modalLogoPreviewBadge) elements.modalLogoPreviewBadge.style.display = 'none';
        if (elements.modalLogoPresets) {
            elements.modalLogoPresets.querySelectorAll('.preset-logo-btn').forEach(b => {
                b.classList.toggle('active', b.getAttribute('data-preset') === preset);
            });
        }
        renderModalQr();
    }
}

function handleLogoUpload(file, isStudio = true) {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
        showToast('Please upload an image file (PNG, JPG, SVG, WebP)', 'error');
        return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
        const dataUrl = e.target.result;
        const img = new Image();
        img.onload = () => {
            if (isStudio) {
                qrStudio.customLogoImg = img;
                qrStudio.customLogoDataUrl = dataUrl;
                qrStudio.presetLogo = 'none';
                if (elements.studioLogoPresets) {
                    elements.studioLogoPresets.querySelectorAll('.preset-logo-btn').forEach(b => b.classList.remove('active'));
                }
                if (elements.studioLogoPreviewBadge) {
                    elements.studioLogoPreviewBadge.style.display = 'inline-flex';
                    elements.studioLogoThumb.src = dataUrl;
                    elements.studioLogoFileName.textContent = file.name.length > 14 ? file.name.substring(0, 11) + '...' : file.name;
                }
                renderStudioQr();
            } else {
                qrModalState.customLogoImg = img;
                qrModalState.customLogoDataUrl = dataUrl;
                qrModalState.presetLogo = 'none';
                if (elements.modalLogoPresets) {
                    elements.modalLogoPresets.querySelectorAll('.preset-logo-btn').forEach(b => b.classList.remove('active'));
                }
                if (elements.modalLogoPreviewBadge) {
                    elements.modalLogoPreviewBadge.style.display = 'inline-flex';
                    elements.modalLogoThumb.src = dataUrl;
                    elements.modalLogoFileName.textContent = file.name.length > 14 ? file.name.substring(0, 11) + '...' : file.name;
                }
                renderModalQr();
            }
        };
        img.src = dataUrl;
    };
    reader.readAsDataURL(file);
}

function removeCustomLogo(isStudio = true) {
    if (isStudio) {
        qrStudio.customLogoImg = null;
        qrStudio.customLogoDataUrl = null;
        qrStudio.presetLogo = 'none';
        if (elements.studioLogoFileInput) elements.studioLogoFileInput.value = '';
        if (elements.studioLogoPreviewBadge) elements.studioLogoPreviewBadge.style.display = 'none';
        if (elements.studioLogoPresets) {
            elements.studioLogoPresets.querySelectorAll('.preset-logo-btn').forEach(b => {
                b.classList.toggle('active', b.getAttribute('data-preset') === 'none');
            });
        }
        renderStudioQr();
    } else {
        qrModalState.customLogoImg = null;
        qrModalState.customLogoDataUrl = null;
        qrModalState.presetLogo = 'none';
        if (elements.modalLogoFileInput) elements.modalLogoFileInput.value = '';
        if (elements.modalLogoPreviewBadge) elements.modalLogoPreviewBadge.style.display = 'none';
        if (elements.modalLogoPresets) {
            elements.modalLogoPresets.querySelectorAll('.preset-logo-btn').forEach(b => {
                b.classList.toggle('active', b.getAttribute('data-preset') === 'none');
            });
        }
        renderModalQr();
    }
}

function selectDotShape(shape, isStudio = true) {
    if (isStudio) {
        qrStudio.dotShape = shape;
        if (elements.studioShapeSelector) {
            elements.studioShapeSelector.querySelectorAll('.shape-btn').forEach(b => {
                b.classList.toggle('active', b.getAttribute('data-shape') === shape);
            });
        }
        renderStudioQr();
    } else {
        qrModalState.dotShape = shape;
        if (elements.modalShapeSelector) {
            elements.modalShapeSelector.querySelectorAll('.shape-btn').forEach(b => {
                b.classList.toggle('active', b.getAttribute('data-shape') === shape);
            });
        }
        renderModalQr();
    }
}

function selectColor(color, isStudio = true) {
    if (isStudio) {
        qrStudio.color = color;
        if (elements.studioColorSwatches) {
            elements.studioColorSwatches.querySelectorAll('.color-swatch').forEach(s => {
                s.classList.toggle('selected', s.getAttribute('data-color') === color);
            });
        }
        if (elements.studioCustomColor) {
            elements.studioCustomColor.value = color.startsWith('#') && color.length === 7 ? color : '#000000';
        }
        renderStudioQr();
    } else {
        qrModalState.color = color;
        state.qrColor = color;
        if (elements.modalColorSwatches) {
            elements.modalColorSwatches.querySelectorAll('.color-swatch').forEach(s => {
                s.classList.toggle('selected', s.getAttribute('data-color') === color);
            });
        }
        if (elements.modalCustomColor) {
            elements.modalCustomColor.value = color.startsWith('#') && color.length === 7 ? color : '#000000';
        }
        renderModalQr();
    }
}

function selectBg(bg, isStudio = true) {
    if (isStudio) {
        qrStudio.bgColor = bg;
        if (elements.studioBgSelector) {
            elements.studioBgSelector.querySelectorAll('.bg-choice-btn').forEach(b => {
                b.classList.toggle('active', b.getAttribute('data-bg') === bg);
            });
        }
        renderStudioQr();
    } else {
        qrModalState.bgColor = bg;
        if (elements.modalBgSelector) {
            elements.modalBgSelector.querySelectorAll('.bg-choice-btn').forEach(b => {
                b.classList.toggle('active', b.getAttribute('data-bg') === bg);
            });
        }
        renderModalQr();
    }
}

function renderStudioQr() {
    if (!window.OmniQR || !elements.studioQrCanvas) return;
    const text = (qrStudio.text || '').trim() || (window.location.origin || 'https://omnilink.app');
    const logoImg = qrStudio.customLogoImg || (qrStudio.presetLogo !== 'none' ? qrStudio.presetLogo : null);

    OmniQR.renderCanvas({
        text: text,
        canvas: elements.studioQrCanvas,
        color: qrStudio.color,
        bgColor: qrStudio.bgColor,
        dotShape: qrStudio.dotShape,
        headerText: qrStudio.headerText,
        captionText: qrStudio.captionText,
        logoImg: logoImg,
        margin: 2
    });
}

function renderModalQr() {
    if (!window.OmniQR || !elements.qrCanvas || !qrModalState.link) return;
    const shortUrl = `${window.location.origin}/${qrModalState.link.slug}`;
    const logoImg = qrModalState.customLogoImg || (qrModalState.presetLogo !== 'none' ? qrModalState.presetLogo : null);

    OmniQR.renderCanvas({
        text: shortUrl,
        canvas: elements.qrCanvas,
        color: qrModalState.color,
        bgColor: qrModalState.bgColor,
        dotShape: qrModalState.dotShape,
        headerText: qrModalState.headerText,
        captionText: qrModalState.captionText,
        logoImg: logoImg,
        margin: 2
    });
}

function renderQrCode(link) {
    if (!link) return;
    qrModalState.link = link;
    renderModalQr();
}

function openQrModal(link) {
    state.activeQrLink = link;
    qrModalState.link = link;
    const shortUrl = `${window.location.origin}/${link.slug}`;
    if (elements.qrLinkText) elements.qrLinkText.textContent = shortUrl;
    renderModalQr();
    openModal(elements.qrModal);
}

async function copyCanvasToClipboard(canvas) {
    if (!canvas) return;
    try {
        if (!navigator.clipboard || !window.ClipboardItem) {
            showToast('Clipboard image API not supported by browser', 'error');
            return;
        }
        canvas.toBlob(async (blob) => {
            if (!blob) {
                showToast('Failed to create image blob', 'error');
                return;
            }
            try {
                await navigator.clipboard.write([
                    new ClipboardItem({ 'image/png': blob })
                ]);
                showToast('QR Code copied to clipboard!');
            } catch (err) {
                console.error('Clipboard write error:', err);
                showToast('Could not copy image to clipboard', 'error');
            }
        }, 'image/png');
    } catch (err) {
        console.error(err);
        showToast('Clipboard error', 'error');
    }
}

function downloadCanvasAsPng(opts, filename) {
    if (!window.OmniQR) return;
    const exportCanvas = OmniQR.renderToExportCanvas(opts, 1024);
    const link = document.createElement('a');
    link.download = filename;
    link.href = exportCanvas.toDataURL('image/png');
    link.click();
    showToast('High-Res 1024px PNG downloaded!');
}

function downloadOptsAsSvg(opts, filename) {
    if (!window.OmniQR) return;
    const svgString = OmniQR.generateSVG(opts);
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = filename;
    link.href = url;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast('Vector SVG downloaded!');
}

function downloadStudioPng() {
    const text = (qrStudio.text || '').trim() || (window.location.origin || 'https://omnilink.app');
    const logoImg = qrStudio.customLogoDataUrl || qrStudio.customLogoImg || (qrStudio.presetLogo !== 'none' ? qrStudio.presetLogo : null);
    downloadCanvasAsPng({
        text: text,
        color: qrStudio.color,
        bgColor: qrStudio.bgColor,
        dotShape: qrStudio.dotShape,
        headerText: qrStudio.headerText,
        captionText: qrStudio.captionText,
        logoImg: logoImg,
        margin: 2
    }, 'omnilink-qr-studio.png');
}

function downloadStudioSvg() {
    const text = (qrStudio.text || '').trim() || (window.location.origin || 'https://omnilink.app');
    const logoImg = qrStudio.customLogoDataUrl || (qrStudio.presetLogo !== 'none' ? qrStudio.presetLogo : null);
    downloadOptsAsSvg({
        text: text,
        color: qrStudio.color,
        bgColor: qrStudio.bgColor,
        dotShape: qrStudio.dotShape,
        headerText: qrStudio.headerText,
        captionText: qrStudio.captionText,
        logoImg: logoImg,
        margin: 2
    }, 'omnilink-qr-studio.svg');
}

function downloadModalPng() {
    if (!qrModalState.link) return;
    const shortUrl = `${window.location.origin}/${qrModalState.link.slug}`;
    const logoImg = qrModalState.customLogoImg || (qrModalState.presetLogo !== 'none' ? qrModalState.presetLogo : null);
    downloadCanvasAsPng({
        text: shortUrl,
        color: qrModalState.color,
        bgColor: qrModalState.bgColor,
        dotShape: qrModalState.dotShape,
        headerText: qrModalState.headerText,
        captionText: qrModalState.captionText,
        logoImg: logoImg,
        margin: 2
    }, `omnilink-${qrModalState.link.slug}-qr.png`);
}

function downloadModalSvg() {
    if (!qrModalState.link) return;
    const shortUrl = `${window.location.origin}/${qrModalState.link.slug}`;
    const logoImg = qrModalState.customLogoImg || (qrModalState.presetLogo !== 'none' ? qrModalState.presetLogo : null);
    downloadOptsAsSvg({
        text: shortUrl,
        color: qrModalState.color,
        bgColor: qrModalState.bgColor,
        dotShape: qrModalState.dotShape,
        headerText: qrModalState.headerText,
        captionText: qrModalState.captionText,
        logoImg: logoImg,
        margin: 2
    }, `omnilink-${qrModalState.link.slug}-qr.svg`);
}

// Deprecated aliases for backwards compatibility
function downloadQrPng() { downloadModalPng(); }
function downloadQrSvg() { downloadModalSvg(); }

// -------------------------------------------------------------
// QR Code History Management
// -------------------------------------------------------------
const QR_HISTORY_KEY = 'omnilink_qr_history';

function getQrHistory() {
    try {
        const raw = localStorage.getItem(QR_HISTORY_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch (e) {
        console.error('Failed to parse QR history:', e);
        return [];
    }
}

function setQrHistory(list) {
    try {
        localStorage.setItem(QR_HISTORY_KEY, JSON.stringify(list));
    } catch (e) {
        console.error('Failed to save QR history:', e);
    }
}

function saveCurrentToQrHistory(silent = false) {
    const text = (qrStudio.text || '').trim();
    if (!text) {
        if (!silent) showToast('Please enter a URL or text to encode first', 'error');
        return null;
    }

    const history = getQrHistory();
    // Prevent duplicate saves if identical to most recent entry
    const mostRecent = history[0];
    if (mostRecent &&
        mostRecent.text === text &&
        mostRecent.color === qrStudio.color &&
        mostRecent.bgColor === qrStudio.bgColor &&
        mostRecent.dotShape === qrStudio.dotShape &&
        mostRecent.presetLogo === qrStudio.presetLogo &&
        mostRecent.headerText === (qrStudio.headerText || '') &&
        mostRecent.captionText === (qrStudio.captionText || '') &&
        mostRecent.customLogoDataUrl === qrStudio.customLogoDataUrl
    ) {
        if (!silent) showToast('QR Code is already saved in history');
        return mostRecent;
    }

    // Infer a readable title
    let title = qrStudio.headerText || '';
    if (!title) {
        try {
            if (text.includes('://')) {
                const u = new URL(text);
                title = u.hostname + (u.pathname !== '/' ? u.pathname : '');
            } else {
                title = text.length > 30 ? text.substring(0, 27) + '...' : text;
            }
        } catch (e) {
            title = text.length > 30 ? text.substring(0, 27) + '...' : text;
        }
    }

    const newItem = {
        id: 'qr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        text: text,
        title: title,
        headerText: qrStudio.headerText || '',
        captionText: qrStudio.captionText || '',
        color: qrStudio.color || '#000000',
        bgColor: qrStudio.bgColor || '#ffffff',
        dotShape: qrStudio.dotShape || 'square',
        presetLogo: qrStudio.presetLogo || 'none',
        customLogoDataUrl: qrStudio.customLogoDataUrl || null,
        createdAt: new Date().toISOString()
    };

    history.unshift(newItem);
    if (history.length > 50) history.length = 50;
    setQrHistory(history);

    renderQrHistoryList();
    if (!silent) showToast('QR Code saved to history!');
    return newItem;
}

function deleteQrHistoryItem(id) {
    let history = getQrHistory();
    history = history.filter(item => item.id !== id);
    setQrHistory(history);
    renderQrHistoryList();
    showToast('Removed from QR history');
}

function clearQrHistory() {
    if (!confirm('Are you sure you want to clear your QR Code History?')) return;
    localStorage.removeItem(QR_HISTORY_KEY);
    renderQrHistoryList();
    showToast('QR Code history cleared');
}

function loadHistoryItemIntoStudio(item) {
    if (!item) return;

    qrStudio.text = item.text || '';
    qrStudio.headerText = item.headerText || '';
    qrStudio.captionText = item.captionText || '';
    qrStudio.color = item.color || '#000000';
    qrStudio.bgColor = item.bgColor || '#ffffff';
    qrStudio.dotShape = item.dotShape || 'square';
    qrStudio.presetLogo = item.presetLogo || 'none';
    qrStudio.customLogoDataUrl = item.customLogoDataUrl || null;

    if (elements.studioTextInput) elements.studioTextInput.value = qrStudio.text;
    if (elements.studioHeaderInput) elements.studioHeaderInput.value = qrStudio.headerText;
    if (elements.studioCaptionInput) elements.studioCaptionInput.value = qrStudio.captionText;

    // Dot Shape UI
    selectDotShape(qrStudio.dotShape, true);

    // Color UI
    selectColor(qrStudio.color, true);

    // Bg UI
    selectBg(qrStudio.bgColor, true);

    // Logo UI
    if (item.customLogoDataUrl) {
        const img = new Image();
        img.onload = () => {
            qrStudio.customLogoImg = img;
            renderStudioQr();
        };
        img.src = item.customLogoDataUrl;
        if (elements.studioLogoPreviewBadge) {
            elements.studioLogoPreviewBadge.style.display = 'inline-flex';
            elements.studioLogoThumb.src = item.customLogoDataUrl;
            elements.studioLogoFileName.textContent = 'Saved Custom Logo';
        }
    } else {
        removeCustomLogo(true);
        if (item.presetLogo && item.presetLogo !== 'none') {
            selectPresetLogo(item.presetLogo, true);
        }
    }

    renderStudioQr();
    if (elements.studioCanvasWrap) {
        elements.studioCanvasWrap.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    showToast('QR loaded into Studio!');
}

function renderQrHistoryList() {
    const listEl = elements.qrHistoryList;
    if (!listEl) return;

    const history = getQrHistory();
    const countEl = elements.qrHistoryCount;
    const clearBtn = elements.qrHistoryClearBtn;

    if (countEl) countEl.textContent = history.length;
    if (clearBtn) clearBtn.style.display = history.length > 0 ? 'inline-flex' : 'none';

    if (history.length === 0) {
        listEl.innerHTML = `
            <div class="qr-history-empty">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <rect x="3" y="3" width="7" height="7"></rect>
                    <rect x="14" y="3" width="7" height="7"></rect>
                    <rect x="14" y="14" width="7" height="7"></rect>
                    <rect x="3" y="14" width="7" height="7"></rect>
                </svg>
                <div class="qr-empty-text">No saved QR codes in history yet.</div>
                <div class="qr-empty-sub">Customize any QR code in the Studio above and click "Save to History" or download it.</div>
            </div>
        `;
        return;
    }

    listEl.innerHTML = '';

    history.forEach(item => {
        const card = document.createElement('div');
        card.className = 'qr-history-card';
        card.setAttribute('data-id', item.id);

        const safeTitle = escapeHtml(item.title || item.text);
        const safeText = escapeHtml(item.text);
        const relTime = formatRelativeTime(item.createdAt);

        let logoBadgeText = '';
        if (item.customLogoDataUrl) {
            logoBadgeText = 'Custom Logo';
        } else if (item.presetLogo && item.presetLogo !== 'none') {
            logoBadgeText = item.presetLogo.charAt(0).toUpperCase() + item.presetLogo.slice(1);
        }

        card.innerHTML = `
            <div class="qr-history-card-left">
                <div class="qr-history-thumb-wrap">
                    <canvas class="qr-history-thumb" width="72" height="72"></canvas>
                </div>
                <div class="qr-history-details">
                    <div class="qr-history-title-row">
                        <span class="qr-history-title" title="${safeTitle}">${safeTitle}</span>
                        <span class="qr-badge shape">${escapeHtml(item.dotShape || 'square')}</span>
                        ${logoBadgeText ? `<span class="qr-badge logo">${escapeHtml(logoBadgeText)}</span>` : ''}
                    </div>
                    <div class="qr-history-url-row">
                        <span class="qr-history-url" title="${safeText}">${safeText}</span>
                    </div>
                    <div class="qr-history-meta">
                        <span>${relTime}</span>
                        <span class="qr-color-dot" style="background: ${escapeHtml(item.color || '#000000')};" title="Foreground: ${escapeHtml(item.color || '#000000')}"></span>
                        ${item.headerText ? `<span class="qr-text-tag" title="Header">H: ${escapeHtml(item.headerText)}</span>` : ''}
                        ${item.captionText ? `<span class="qr-text-tag" title="Caption">C: ${escapeHtml(item.captionText)}</span>` : ''}
                    </div>
                </div>
            </div>
            <div class="qr-history-actions">
                <button type="button" class="btn-action qr-load-btn" title="Load into QR Studio">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
                    </svg>
                    <span>Load</span>
                </button>
                <button type="button" class="btn-action qr-copy-btn" title="Copy Image">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                    <span>Copy</span>
                </button>
                <button type="button" class="btn-action qr-png-btn" title="Download PNG (1024px)">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="7 10 12 15 17 10"></polyline>
                        <line x1="12" y1="15" x2="12" y2="3"></line>
                    </svg>
                    <span>PNG</span>
                </button>
                <button type="button" class="btn-action qr-svg-btn" title="Download Vector SVG">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
                        <polyline points="2 17 12 22 22 17"></polyline>
                        <polyline points="2 12 12 17 22 12"></polyline>
                    </svg>
                    <span>SVG</span>
                </button>
                <button type="button" class="btn-action qr-del-btn" title="Delete from History">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                </button>
            </div>
        `;

        listEl.appendChild(card);

        // Render thumbnail: draw at 256px off-screen then scale into the 72px thumb
        // This avoids sub-pixel rendering issues with complex/long URLs on tiny canvases
        if (window.OmniQR) {
            const thumbCanvas = card.querySelector('.qr-history-thumb');
            if (thumbCanvas) {
                const logoKey = (item.presetLogo && item.presetLogo !== 'none') ? item.presetLogo : null;
                // Resolve preset logo key → base64 data URI string (renderCanvas handles async img load)
                const logoSrc = item.customLogoDataUrl || (logoKey ? (OmniQR.PRESET_LOGOS[logoKey] || null) : null);

                // Off-screen 256px canvas for sharp rendering
                const offCanvas = document.createElement('canvas');
                offCanvas.width = 256;
                offCanvas.height = 256;
                OmniQR.renderCanvas({
                    text: item.text,
                    canvas: offCanvas,
                    color: item.color || '#000000',
                    bgColor: item.bgColor || '#ffffff',
                    dotShape: item.dotShape || 'square',
                    headerText: '',
                    captionText: '',
                    logoImg: logoSrc,
                    margin: 2
                });

                // Scale-down into thumb after a short delay (allows async logo onload to complete)
                const drawThumb = () => {
                    const tCtx = thumbCanvas.getContext('2d');
                    tCtx.clearRect(0, 0, 72, 72);
                    tCtx.drawImage(offCanvas, 0, 0, offCanvas.width, offCanvas.height, 0, 0, 72, 72);
                };
                // Draw immediately (QR matrix is sync), then re-draw after logo loads
                drawThumb();
                setTimeout(drawThumb, 300);
            }
        }

        // Resolve logo source for action buttons (use data URI so buttons work independently of PRESET_IMAGES load state)
        const getLogoSrc = () => {
            if (item.customLogoDataUrl) return item.customLogoDataUrl;
            if (item.presetLogo && item.presetLogo !== 'none') {
                return (window.OmniQR && OmniQR.PRESET_LOGOS[item.presetLogo]) || item.presetLogo;
            }
            return null;
        };

        // Action Handlers
        card.querySelector('.qr-load-btn').addEventListener('click', () => loadHistoryItemIntoStudio(item));
        card.querySelector('.qr-copy-btn').addEventListener('click', () => {
            if (!window.OmniQR) return;
            const expCanvas = OmniQR.renderToExportCanvas({
                text: item.text,
                color: item.color,
                bgColor: item.bgColor,
                dotShape: item.dotShape,
                headerText: item.headerText,
                captionText: item.captionText,
                logoImg: getLogoSrc(),
                margin: 2
            }, 1024);
            copyCanvasToClipboard(expCanvas);
        });
        card.querySelector('.qr-png-btn').addEventListener('click', () => {
            downloadCanvasAsPng({
                text: item.text,
                color: item.color,
                bgColor: item.bgColor,
                dotShape: item.dotShape,
                headerText: item.headerText,
                captionText: item.captionText,
                logoImg: getLogoSrc(),
                margin: 2
            }, `omnilink-qr-${item.id}.png`);
        });
        card.querySelector('.qr-svg-btn').addEventListener('click', () => {
            downloadOptsAsSvg({
                text: item.text,
                color: item.color,
                bgColor: item.bgColor,
                dotShape: item.dotShape,
                headerText: item.headerText,
                captionText: item.captionText,
                logoImg: getLogoSrc(),
                margin: 2
            }, `omnilink-qr-${item.id}.svg`);
        });
        card.querySelector('.qr-del-btn').addEventListener('click', () => deleteQrHistoryItem(item.id));
    });
}

// -------------------------------------------------------------
// Analytics Slide-over Drawer
// -------------------------------------------------------------
async function openAnalyticsDrawer(linkId) {
    elements.analyticsDrawer.classList.add('open');
    elements.drawerLinkTitle.textContent = 'Loading Insights...';
    elements.drawerTotalClicks.textContent = '...';
    elements.drawerUniqueClicks.textContent = '...';
    elements.timelineChartContainer.innerHTML = '<div style="margin: auto; color: var(--text-muted);">Loading chart...</div>';

    try {
        const res = await fetch(`/api/analytics/${linkId}`, {
            headers: getAuthHeaders()
        });

        if (res.status === 401) {
            closeAnalyticsDrawer();
            promptAuth('Admin Access Required', 'Enter passcode to view analytics.');
            return;
        }

        const data = await res.json();
        if (!res.ok) {
            showToast(data.error || 'Failed to load analytics', 'error');
            return;
        }

        const link = data.link;
        if (link) {
            elements.drawerLinkTitle.textContent = link.title || link.slug;
            const shortUrl = `${window.location.origin}/${link.slug}`;
            elements.drawerShortUrl.textContent = shortUrl;
            elements.drawerShortUrl.href = shortUrl;
        }

        elements.drawerTotalClicks.textContent = data.total_clicks.toLocaleString();
        elements.drawerUniqueClicks.textContent = data.unique_visitors.toLocaleString();

        renderTimelineChart(data.timeline);
        renderBreakdownList(elements.countriesList, data.countries, data.total_clicks, 'flag');
        renderBreakdownList(elements.referrersList, data.referrers, data.total_clicks, 'link');
        renderBreakdownList(elements.devicesList, data.devices, data.total_clicks, 'device');
        renderRecentClicks(data.recent);

    } catch (e) {
        console.error('Error fetching analytics:', e);
        showToast('Failed to load analytics', 'error');
    }
}

function closeAnalyticsDrawer() {
    elements.analyticsDrawer.classList.remove('open');
}

function renderTimelineChart(timeline = []) {
    const container = elements.timelineChartContainer;
    container.innerHTML = '';

    if (timeline.length === 0) {
        container.innerHTML = '<div style="margin: auto; color: var(--text-muted); font-size: 0.85rem;">No click activity recorded yet.</div>';
        return;
    }

    const maxClicks = Math.max(...timeline.map(t => t.clicks), 1);

    timeline.forEach(item => {
        const barWrap = document.createElement('div');
        barWrap.style.cssText = 'flex: 1; display: flex; flex-direction: column; align-items: center; height: 100%; justify-content: flex-end; gap: 6px;';

        const heightPercent = Math.max(Math.round((item.clicks / maxClicks) * 100), 8);
        const bar = document.createElement('div');
        bar.style.cssText = `
            width: 100%;
            height: ${heightPercent}%;
            background: var(--accent);
            border-radius: 4px 4px 0 0;
            transition: height 0.4s ease;
            position: relative;
            cursor: pointer;
        `;
        bar.title = `${item.date}: ${item.clicks} clicks`;

        const label = document.createElement('span');
        label.style.cssText = 'font-size: 0.68rem; color: var(--text-muted); font-family: monospace;';
        label.textContent = item.date.slice(5); // MM-DD

        barWrap.appendChild(bar);
        barWrap.appendChild(label);
        container.appendChild(barWrap);
    });
}

function renderBreakdownList(container, items = [], totalClicks = 1, type = 'flag') {
    container.innerHTML = '';
    if (!items || items.length === 0) {
        container.innerHTML = '<div style="color: var(--text-muted); font-size: 0.85rem; padding: 6px 0;">No data yet.</div>';
        return;
    }

    const divisor = Math.max(totalClicks, 1);

    items.forEach(item => {
        const name = item.country || item.referrer || item.device_type || 'Direct / Unknown';
        const count = item.count || 0;
        const percent = Math.round((count / divisor) * 100);

        const row = document.createElement('div');
        row.className = 'breakdown-row';
        row.innerHTML = `
            <span style="font-weight: 500; min-width: 110px; max-width: 160px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                ${escapeHtml(name)}
            </span>
            <div class="breakdown-bar-bg">
                <div class="breakdown-bar-fill" style="width: ${percent}%;"></div>
            </div>
            <span style="color: var(--text-muted); font-size: 0.8rem; font-family: monospace; min-width: 60px; text-align: right;">
                ${count} (${percent}%)
            </span>
        `;
        container.appendChild(row);
    });
}

function renderRecentClicks(recent = []) {
    const container = elements.recentClicksList;
    container.innerHTML = '';

    if (!recent || recent.length === 0) {
        container.innerHTML = '<div style="color: var(--text-muted); font-size: 0.85rem; padding: 6px 0;">No clicks recorded yet.</div>';
        return;
    }

    const list = document.createElement('div');
    list.style.cssText = 'display: flex; flex-direction: column; gap: 8px; font-size: 0.82rem;';

    recent.forEach(r => {
        const item = document.createElement('div');
        item.style.cssText = 'display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid var(--border-subtle); color: var(--text-muted);';
        item.innerHTML = `
            <span>${r.country} • ${r.browser} • ${r.os}</span>
            <span style="font-family: monospace;">${formatRelativeTime(r.timestamp)}</span>
        `;
        list.appendChild(item);
    });

    container.appendChild(list);
}

// -------------------------------------------------------------
// Admin Auth Modal Handling
// -------------------------------------------------------------
function openAuthModal() {
    if (!state.isAuthConfigured) {
        elements.authModalTitle.textContent = 'Setup Master Admin Passcode';
        elements.authModalDesc.textContent = 'Protect your OmniLink dashboard with an admin passcode. Only you will be able to create, edit, or view analytics.';
        elements.adminPassLabel.textContent = 'Set New Admin Passcode (min 4 chars)';
    } else if (state.adminToken) {
        elements.authModalTitle.textContent = 'Change Admin Passcode';
        elements.authModalDesc.textContent = 'Set a new master passcode for your OmniLink instance.';
        elements.adminPassLabel.textContent = 'New Admin Passcode (min 4 chars)';
    } else {
        elements.authModalTitle.textContent = 'Admin Authentication';
        elements.authModalDesc.textContent = 'Enter your admin passcode to unlock the dashboard and manage links.';
        elements.adminPassLabel.textContent = 'Admin Passcode';
    }
    elements.adminPassInput.value = '';
    elements.authStatusMsg.style.display = 'none';
    openModal(elements.authModal);
}

function promptAuth(title, desc) {
    elements.authModalTitle.textContent = title;
    elements.authModalDesc.textContent = desc;
    elements.adminPassInput.value = '';
    elements.authStatusMsg.style.display = 'none';
    openModal(elements.authModal);
}

async function handleAuthSubmit(e) {
    e.preventDefault();
    const pass = elements.adminPassInput.value.trim();
    if (!pass) return;

    let action = 'verify';
    if (!state.isAuthConfigured) {
        action = 'setup';
    } else if (state.adminToken) {
        action = 'change';
    }

    const body = (action === 'setup' || action === 'change') ? { action, newPassword: pass } : { action, password: pass };

    try {
        const res = await fetch('/api/auth', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(body)
        });

        const data = await res.json();
        if (res.ok && data.success) {
            state.adminToken = pass;
            localStorage.setItem('omnilink_token', pass);
            state.isAuthConfigured = true;
            elements.authSettingsBtn.classList.remove('active');
            closeModal(elements.authModal);
            setLockedState(false);
            showToast(action === 'setup' ? 'Admin passcode configured!' : (action === 'change' ? 'Admin passcode changed successfully!' : 'Admin unlocked successfully!'));
            fetchLinks();
        } else {
            elements.authStatusMsg.textContent = data.error || 'Invalid passcode';
            elements.authStatusMsg.style.color = 'var(--danger)';
            elements.authStatusMsg.style.display = 'block';
        }
    } catch (err) {
        elements.authStatusMsg.textContent = 'Failed to connect to authentication server';
        elements.authStatusMsg.style.color = 'var(--danger)';
        elements.authStatusMsg.style.display = 'block';
    }
}

// -------------------------------------------------------------
// CSV Export
// -------------------------------------------------------------
function handleExportCsv() {
    const url = `/api/export`;
    // If auth header is required, fetch with blob download
    fetch(url, { headers: getAuthHeaders() })
        .then(res => {
            if (res.status === 401) {
                promptAuth('Admin Access Required', 'Enter passcode to export CSV.');
                return null;
            }
            return res.blob();
        })
        .then(blob => {
            if (!blob) return;
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `omnilink-export-${new Date().toISOString().slice(0, 10)}.csv`;
            a.click();
            showToast('CSV export downloaded!');
        })
        .catch(() => showToast('Failed to export CSV', 'error'));
}

// -------------------------------------------------------------
// Utilities
// -------------------------------------------------------------
function openModal(modal) {
    modal.classList.add('open');
}

function closeModal(modal) {
    modal.classList.remove('open');
}

function copyToClipboard(text, customMsg = 'Copied to clipboard!') {
    navigator.clipboard.writeText(text).then(() => {
        showToast(customMsg);
    }).catch(() => {
        const temp = document.createElement('input');
        temp.value = text;
        document.body.appendChild(temp);
        temp.select();
        document.execCommand('copy');
        document.body.removeChild(temp);
        showToast(customMsg);
    });
}

function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    const icon = type === 'success'
        ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>'
        : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>';

    toast.innerHTML = `${icon}<span>${escapeHtml(message)}</span>`;
    elements.toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(12px)';
        toast.style.transition = 'all 0.25s ease';
        setTimeout(() => toast.remove(), 250);
    }, 2800);
}

function escapeHtml(str = '') {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function getProtocolLetter(url = '') {
    const lower = url.toLowerCase();
    if (lower.startsWith('magnet:')) return '🧲';
    if (lower.startsWith('mailto:')) return '✉️';
    if (lower.startsWith('tel:')) return '📞';
    if (lower.startsWith('whatsapp:') || lower.includes('wa.me')) return '💬';
    if (lower.startsWith('tg:') || lower.includes('t.me')) return '✈️';
    return '🔗';
}

function formatRelativeTime(dateString) {
    if (!dateString) return '';
    const now = Date.now();
    const then = new Date(dateString).getTime();
    const diffSec = Math.floor((now - then) / 1000);

    if (diffSec < 60) return 'just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    return `${Math.floor(diffSec / 86400)}d ago`;
}
