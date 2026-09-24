// Cloudflare Pages Functions & Local Server Shared Utilities

export async function hashPassword(password, salt = 'omnilink-salt-2024') {
    if (!password) return null;
    const encoder = new TextEncoder();
    const data = encoder.encode(password + salt);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export function parseUserAgent(ua = '') {
    const userAgent = ua.toLowerCase();
    
    // Device detection
    let device_type = 'Desktop';
    if (/mobile|iphone|ipod|android.*mobile|windows phone|blackberry/i.test(userAgent)) {
        device_type = 'Mobile';
    } else if (/ipad|tablet|android(?!.*mobile)/i.test(userAgent)) {
        device_type = 'Tablet';
    } else if (/bot|crawler|spider|crawling/i.test(userAgent)) {
        device_type = 'Bot';
    }

    // OS detection
    let os = 'Unknown OS';
    if (/windows nt 10/i.test(userAgent)) os = 'Windows 10/11';
    else if (/windows nt/i.test(userAgent)) os = 'Windows';
    else if (/macintosh|mac os x/i.test(userAgent)) os = 'macOS';
    else if (/iphone|ipad|ipod/i.test(userAgent)) os = 'iOS';
    else if (/android/i.test(userAgent)) os = 'Android';
    else if (/linux/i.test(userAgent)) os = 'Linux';
    else if (/cros/i.test(userAgent)) os = 'ChromeOS';

    // Browser detection
    let browser = 'Unknown Browser';
    if (/edg\//i.test(userAgent)) browser = 'Microsoft Edge';
    else if (/opr\/|opera/i.test(userAgent)) browser = 'Opera';
    else if (/chrome|crios/i.test(userAgent)) browser = 'Chrome';
    else if (/firefox|fxios/i.test(userAgent)) browser = 'Firefox';
    else if (/safari/i.test(userAgent) && !/chrome/i.test(userAgent)) browser = 'Safari';

    return { device_type, os, browser };
}

// Dangerous schemes that can execute code or lead to XSS
const DANGEROUS_SCHEMES = ['javascript:', 'data:', 'vbscript:', 'file:', 'blob:'];

export const RESERVED_SLUGS = new Set([
    'api', 'gate', 'index', 'index.html', 'style.css', 'app.js', 'gate.html',
    'qr-code.js', 'favicon.ico', 'robots.txt', 'analytics', 'export', 'auth',
    'settings', 'links', 'verify-gate'
]);

// Normalizes and validates ANY URL scheme while blocking XSS/dangerous execution schemes
export function normalizeUrl(rawUrl) {
    if (!rawUrl || typeof rawUrl !== 'string') return null;
    const trimmed = rawUrl.trim();
    if (!trimmed) return null;

    const lower = trimmed.toLowerCase();
    for (const dangerous of DANGEROUS_SCHEMES) {
        if (lower.startsWith(dangerous)) {
            return null;
        }
    }

    // Check if it already has a protocol/scheme (e.g. https://, http://, mailto:, tel:, magnet:, whatsapp://, tg://, etc.)
    const schemeRegex = /^[a-zA-Z][a-zA-Z0-9+.-]*:/;
    if (schemeRegex.test(trimmed)) {
        return trimmed;
    }

    // If no scheme, default to https://
    return `https://${trimmed}`;
}

export function isExternalScheme(url) {
    if (!url) return false;
    const lower = url.toLowerCase();
    return !lower.startsWith('http://') && !lower.startsWith('https://');
}

export function generateProtocolRedirectHtml(url, title = 'Application') {
    const escapedUrl = url.replace(/"/g, '&quot;').replace(/'/g, '&#039;');
    const safeTitle = (title || 'Application').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Opening ${safeTitle} | OmniLink</title>
    <meta http-equiv="refresh" content="0; url=${escapedUrl}">
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #09090b; color: #f4f4f5; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; }
        .card { background: #18181b; border: 1px solid #27272a; border-radius: 16px; padding: 36px 28px; max-width: 440px; width: 100%; text-align: center; }
        h1 { font-size: 1.3rem; margin-bottom: 12px; }
        p { color: #a1a1aa; font-size: 0.95rem; line-height: 1.5; margin-bottom: 24px; word-break: break-all; }
        .btn { display: inline-block; background: #10b981; color: #000; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 0.95rem; transition: opacity 0.2s; }
        .btn:hover { opacity: 0.9; }
    </style>
</head>
<body>
    <div class="card">
        <h1>Redirecting to Application...</h1>
        <p>Opening external protocol application. If your application does not open automatically, click the button below:</p>
        <a href="${escapedUrl}" class="btn">Launch Application</a>
    </div>
    <script>
        setTimeout(function() {
            window.location.href = ${JSON.stringify(url)};
        }, 50);
    </script>
</body>
</html>`;
}

export async function hashIp(ip, salt = 'omnilink-ip-salt-2024') {
    if (!ip) return 'unknown';
    const encoder = new TextEncoder();
    const data = encoder.encode(ip + salt);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

const rateLimitMap = new Map();
export function checkRateLimit(key, maxAttempts = 20, windowMs = 5 * 60 * 1000) {
    const now = Date.now();
    const record = rateLimitMap.get(key) || { count: 0, resetAt: now + windowMs };
    if (now > record.resetAt) {
        record.count = 1;
        record.resetAt = now + windowMs;
        rateLimitMap.set(key, record);
        return true;
    }
    if (record.count >= maxAttempts) {
        return false;
    }
    record.count++;
    rateLimitMap.set(key, record);
    return true;
}

export function jsonResponse(data, status = 200, headers = {}) {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-admin-key',
            ...headers
        }
    });
}

export function generateRandomSlug(length = 6) {
    const chars = 'abcdefghjkmnpqrstuvwxyz23456789ABCDEFGHJKMNPQRSTUVWXYZ';
    let result = '';
    const bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);
    for (let i = 0; i < length; i++) {
        result += chars[bytes[i] % chars.length];
    }
    return result;
}

export async function checkAdminAuth(request, env) {
    const authHeader = request.headers.get('Authorization') || '';
    const customHeader = request.headers.get('x-admin-key') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim() || customHeader.trim();

    // Reject immediately if no token is provided
    if (!token) {
        return false;
    }

    // 1. Check environment variable ADMIN_KEY if set in Cloudflare dashboard
    if (env.ADMIN_KEY) {
        return token === env.ADMIN_KEY;
    }

    // 2. Check settings table in database
    if (env.DB) {
        try {
            const adminSetting = await env.DB.prepare('SELECT value FROM settings WHERE key = ?').bind('admin_hash').first();
            if (!adminSetting || !adminSetting.value) {
                // Fail-closed: unconfigured database blocks admin operations
                return false;
            }
            const hashed = await hashPassword(token);
            return hashed === adminSetting.value;
        } catch (e) {
            console.error('Error checking admin auth:', e);
            return false;
        }
    }

    // Default to reject (fail closed)
    return false;
}

