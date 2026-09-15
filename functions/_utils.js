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

// Normalizes and validates ANY URL scheme
export function normalizeUrl(rawUrl) {
    if (!rawUrl || typeof rawUrl !== 'string') return null;
    const trimmed = rawUrl.trim();
    if (!trimmed) return null;

    // Check if it already has a protocol/scheme (e.g. https://, http://, mailto:, tel:, magnet:, whatsapp://, tg://, etc.)
    const schemeRegex = /^[a-zA-Z][a-zA-Z0-9+.-]*:/;
    if (schemeRegex.test(trimmed)) {
        return trimmed;
    }

    // If no scheme, default to https://
    return `https://${trimmed}`;
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

