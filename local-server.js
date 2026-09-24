// Local Development Server for OmniLink
// Zero external dependencies - uses Node.js 22 native HTTP and node:sqlite

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import crypto from 'node:crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'omnilink-local.db');
const PUBLIC_DIR = path.join(__dirname, 'public');

// Initialize SQLite Database
const db = new DatabaseSync(DB_PATH);
const schemaPath = path.join(__dirname, 'schema.sql');
if (fs.existsSync(schemaPath)) {
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    db.exec(schemaSql);
}

// Utility Functions
function hashPassword(password, salt = 'omnilink-salt-2024') {
    if (!password) return null;
    return crypto.createHash('sha256').update(password + salt).digest('hex');
}

function hashIp(ip, salt = 'omnilink-ip-salt-2024') {
    if (!ip) return 'unknown';
    return crypto.createHash('sha256').update(ip + salt).digest('hex');
}

const rateLimitMap = new Map();
function checkRateLimit(key, maxAttempts = 20, windowMs = 5 * 60 * 1000) {
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

const RESERVED_SLUGS = new Set([
    'api', 'gate', 'index', 'index.html', 'style.css', 'app.js', 'gate.html',
    'qr-code.js', 'favicon.ico', 'robots.txt', 'analytics', 'export', 'auth',
    'settings', 'links', 'verify-gate'
]);

const DANGEROUS_SCHEMES = ['javascript:', 'data:', 'vbscript:', 'file:', 'blob:'];

function parseUserAgent(ua = '') {
    const userAgent = ua.toLowerCase();
    let device_type = 'Desktop';
    if (/mobile|iphone|ipod|android.*mobile|windows phone|blackberry/i.test(userAgent)) {
        device_type = 'Mobile';
    } else if (/ipad|tablet|android(?!.*mobile)/i.test(userAgent)) {
        device_type = 'Tablet';
    } else if (/bot|crawler|spider|crawling/i.test(userAgent)) {
        device_type = 'Bot';
    }

    let os = 'Unknown OS';
    if (/windows nt 10/i.test(userAgent)) os = 'Windows 10/11';
    else if (/windows nt/i.test(userAgent)) os = 'Windows';
    else if (/macintosh|mac os x/i.test(userAgent)) os = 'macOS';
    else if (/iphone|ipad|ipod/i.test(userAgent)) os = 'iOS';
    else if (/android/i.test(userAgent)) os = 'Android';
    else if (/linux/i.test(userAgent)) os = 'Linux';
    else if (/cros/i.test(userAgent)) os = 'ChromeOS';

    let browser = 'Unknown Browser';
    if (/edg\//i.test(userAgent)) browser = 'Microsoft Edge';
    else if (/opr\/|opera/i.test(userAgent)) browser = 'Opera';
    else if (/chrome|crios/i.test(userAgent)) browser = 'Chrome';
    else if (/firefox|fxios/i.test(userAgent)) browser = 'Firefox';
    else if (/safari/i.test(userAgent) && !/chrome/i.test(userAgent)) browser = 'Safari';

    return { device_type, os, browser };
}

function normalizeUrl(rawUrl) {
    if (!rawUrl || typeof rawUrl !== 'string') return null;
    const trimmed = rawUrl.trim();
    if (!trimmed) return null;

    const lower = trimmed.toLowerCase();
    for (const dangerous of DANGEROUS_SCHEMES) {
        if (lower.startsWith(dangerous)) {
            return null;
        }
    }

    const schemeRegex = /^[a-zA-Z][a-zA-Z0-9+.-]*:/;
    if (schemeRegex.test(trimmed)) return trimmed;
    return `https://${trimmed}`;
}

function isExternalScheme(url) {
    if (!url) return false;
    const lower = url.toLowerCase();
    return !lower.startsWith('http://') && !lower.startsWith('https://');
}

function renderProtocolRedirect(url, title = 'Application') {
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

function generateRandomSlug(length = 6) {
    const chars = 'abcdefghjkmnpqrstuvwxyz23456789ABCDEFGHJKMNPQRSTUVWXYZ';
    let result = '';
    const bytes = crypto.randomBytes(length);
    for (let i = 0; i < length; i++) {
        result += chars[bytes[i] % chars.length];
    }
    return result;
}

function checkAdminAuth(req) {
    const authHeader = req.headers['authorization'] || '';
    const customHeader = req.headers['x-admin-key'] || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim() || (typeof customHeader === 'string' ? customHeader.trim() : '');

    if (!token) return false;

    // Check ADMIN_KEY environment variable if defined
    if (process.env.ADMIN_KEY) {
        return token === process.env.ADMIN_KEY;
    }

    try {
        const stmt = db.prepare('SELECT value FROM settings WHERE key = ?');
        const adminSetting = stmt.get('admin_hash');
        if (!adminSetting || !adminSetting.value) {
            // Fail closed: unconfigured DB blocks admin operations
            return false;
        }
        const hashed = hashPassword(token);
        return hashed === adminSetting.value;
    } catch (e) {
        console.error('Error checking admin auth:', e);
        return false;
    }
}

function sendJson(res, data, status = 200) {
    res.writeHead(status, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-admin-key'
    });
    res.end(JSON.stringify(data));
}

function readBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            if (!body) return resolve({});
            try {
                resolve(JSON.parse(body));
            } catch (err) {
                reject(err);
            }
        });
        req.on('error', reject);
    });
}

const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

function serveStatic(req, res, filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('404 Not Found');
            return;
        }
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
    });
}

function renderHtmlError(title, message) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title} | OmniLink</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #09090b; color: #f4f4f5; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; }
        .card { background: #18181b; border: 1px solid #27272a; border-radius: 16px; padding: 40px 32px; max-width: 440px; width: 100%; text-align: center; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5); }
        .icon { display: inline-flex; align-items: center; justify-content: center; width: 56px; height: 56px; border-radius: 50%; background: rgba(239, 68, 68, 0.1); color: #ef4444; margin-bottom: 20px; }
        h1 { font-size: 1.5rem; font-weight: 700; margin-bottom: 12px; }
        p { color: #a1a1aa; font-size: 0.95rem; line-height: 1.5; margin-bottom: 24px; }
        .btn { display: inline-block; background: #27272a; color: #f4f4f5; text-decoration: none; padding: 10px 20px; border-radius: 8px; font-size: 0.9rem; font-weight: 500; transition: all 0.2s; }
        .btn:hover { background: #3f3f46; color: #fff; }
    </style>
</head>
<body>
    <div class="card">
        <div class="icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
        </div>
        <h1>${title}</h1>
        <p>${message}</p>
        <a href="/" class="btn">Go to Dashboard</a>
    </div>
</body>
</html>`;
}

// Request Router
const server = http.createServer(async (req, res) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        res.writeHead(204, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-admin-key'
        });
        return res.end();
    }

    const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost:3000'}`);
    const pathname = parsedUrl.pathname;

    try {
        // ---------------------------------------------
        // API: Auth
        // ---------------------------------------------
        if (pathname === '/api/auth') {
            if (req.method === 'GET') {
                const row = db.prepare('SELECT value FROM settings WHERE key = ?').get('admin_hash');
                return sendJson(res, { isConfigured: Boolean(row && row.value) });
            }
            if (req.method === 'POST') {
                const body = await readBody(req);
                const { action, password, newPassword } = body;

                const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
                if (!checkRateLimit(`auth:${String(clientIp).split(',')[0].trim()}`, 15)) {
                    return sendJson(res, { error: 'Too many attempts. Please try again later.' }, 429);
                }

                if (action === 'verify') {
                    if (!password) return sendJson(res, { error: 'Password is required' }, 400);
                    if (process.env.ADMIN_KEY) {
                        if (password === process.env.ADMIN_KEY) {
                            return sendJson(res, { success: true, token: password });
                        }
                        return sendJson(res, { error: 'Invalid admin passcode' }, 401);
                    }
                    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get('admin_hash');
                    if (!row || !row.value) {
                        return sendJson(res, { error: 'Admin passcode is not configured' }, 401);
                    }
                    const hashed = hashPassword(password);
                    if (hashed === row.value) {
                        return sendJson(res, { success: true, token: password });
                    }
                    return sendJson(res, { error: 'Invalid admin passcode' }, 401);
                }

                if (action === 'setup') {
                    if (process.env.ADMIN_KEY) {
                        return sendJson(res, { error: 'Admin key is managed via environment variable ADMIN_KEY.' }, 400);
                    }
                    if (!newPassword || newPassword.length < 4) {
                        return sendJson(res, { error: 'Password must be at least 4 characters' }, 400);
                    }
                    const existing = db.prepare('SELECT value FROM settings WHERE key = ?').get('admin_hash');
                    if (existing && existing.value) {
                        return sendJson(res, { error: 'Admin key is already configured. Use change instead.' }, 400);
                    }
                    const hashed = hashPassword(newPassword);
                    db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('admin_hash', hashed);
                    return sendJson(res, { success: true, message: 'Admin key configured successfully', token: newPassword });
                }

                if (action === 'change') {
                    if (process.env.ADMIN_KEY) {
                        return sendJson(res, { error: 'Admin key is managed via environment variable ADMIN_KEY.' }, 400);
                    }
                    if (!checkAdminAuth(req)) return sendJson(res, { error: 'Unauthorized' }, 401);
                    if (!newPassword || newPassword.length < 4) {
                        return sendJson(res, { error: 'New password must be at least 4 characters' }, 400);
                    }
                    const hashed = hashPassword(newPassword);
                    db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('admin_hash', hashed);
                    return sendJson(res, { success: true, message: 'Admin key updated successfully', token: newPassword });
                }

                return sendJson(res, { error: 'Invalid action' }, 400);
            }
        }

        // ---------------------------------------------
        // API: Verify Gate Password
        // ---------------------------------------------
        if (pathname === '/api/verify-gate' && req.method === 'POST') {
            const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
            if (!checkRateLimit(`gate:${String(clientIp).split(',')[0].trim()}`, 15)) {
                return sendJson(res, { error: 'Too many attempts. Please try again later.' }, 429);
            }

            const { slug, password } = await readBody(req);
            if (!slug || !password) return sendJson(res, { error: 'Slug and password required' }, 400);

            const link = db.prepare('SELECT * FROM links WHERE slug = ?').get(slug);
            if (!link) return sendJson(res, { error: 'Link not found' }, 404);

            // Check active status
            if (link.is_active === 0) {
                return sendJson(res, { error: 'This link is currently inactive or has been paused by the owner.' }, 410);
            }

            // Check expiration
            if (link.expires_at) {
                const expireTime = new Date(link.expires_at).getTime();
                if (Date.now() > expireTime) {
                    return sendJson(res, { error: 'This link has expired.' }, 410);
                }
            }

            // Check click limit
            if (link.max_clicks !== null && link.max_clicks > 0 && link.clicks_count >= link.max_clicks) {
                return sendJson(res, { error: 'This link has reached its maximum permitted number of clicks.' }, 410);
            }

            if (link.password_hash) {
                const hashed = hashPassword(password);
                if (hashed !== link.password_hash) {
                    return sendJson(res, { error: 'Incorrect passcode' }, 401);
                }
            }

            // Record click asynchronously
            setImmediate(() => {
                try {
                    const ipHash = hashIp(String(clientIp).split(',')[0].trim());
                    const userAgent = req.headers['user-agent'] || '';
                    const { device_type, os, browser } = parseUserAgent(userAgent);
                    const clickId = crypto.randomUUID();
                    const now = new Date().toISOString();
                    db.prepare(
                        'INSERT INTO clicks (id, link_id, timestamp, country, city, referrer, device_type, browser, os, ip_hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
                    ).run(clickId, link.id, now, 'Local', 'Localhost', 'Direct', device_type, browser, os, ipHash);
                    db.prepare('UPDATE links SET clicks_count = clicks_count + 1 WHERE id = ?').run(link.id);
                } catch (err) {
                    console.error('Error logging gate click:', err);
                }
            });

            return sendJson(res, { success: true, target_url: link.target_url });
        }

        // ---------------------------------------------
        // API: Export CSV
        // ---------------------------------------------
        if (pathname === '/api/export' && req.method === 'GET') {
            if (!checkAdminAuth(req)) return sendJson(res, { error: 'Unauthorized' }, 401);

            const rows = db.prepare('SELECT id, slug, target_url, title, clicks_count, is_active, expires_at, max_clicks, created_at FROM links ORDER BY created_at DESC').all();
            const origin = `http://${req.headers.host || 'localhost:3000'}`;

            const headers = ['ID', 'Short Slug', 'Short URL', 'Target URL', 'Title', 'Clicks', 'Active', 'Expires At', 'Max Clicks', 'Created At'];
            const csvRows = [headers.join(',')];

            for (const row of rows) {
                const shortUrl = `${origin}/${row.slug}`;
                const clean = (val) => {
                    if (val === null || val === undefined) return '""';
                    let str = String(val);
                    if (/^[=+\-@\t\r]/.test(str)) {
                        str = "'" + str;
                    }
                    str = str.replace(/"/g, '""');
                    return `"${str}"`;
                };

                csvRows.push([
                    clean(row.id),
                    clean(row.slug),
                    clean(shortUrl),
                    clean(row.target_url),
                    clean(row.title),
                    row.clicks_count || 0,
                    row.is_active ? 'Yes' : 'No',
                    clean(row.expires_at),
                    row.max_clicks || '',
                    clean(row.created_at)
                ].join(','));
            }

            res.writeHead(200, {
                'Content-Type': 'text/csv; charset=utf-8',
                'Content-Disposition': `attachment; filename="omnilink-export-${new Date().toISOString().slice(0, 10)}.csv"`
            });
            return res.end(csvRows.join('\r\n'));
        }

        // ---------------------------------------------
        // API: Analytics (/api/analytics/:id)
        // ---------------------------------------------
        if (pathname.startsWith('/api/analytics/')) {
            if (!checkAdminAuth(req)) return sendJson(res, { error: 'Unauthorized' }, 401);
            const id = pathname.replace('/api/analytics/', '').trim();
            const isAll = id === 'all';

            let link = null;
            if (!isAll) {
                link = db.prepare('SELECT id, slug, target_url, title, created_at, clicks_count, is_active FROM links WHERE id = ?').get(id);
                if (!link) return sendJson(res, { error: 'Link not found' }, 404);
            }

            const filter = isAll ? '' : 'WHERE link_id = ?';
            const params = isAll ? [] : [id];

            const counts = isAll
                ? db.prepare('SELECT COUNT(*) as total_clicks, COUNT(DISTINCT ip_hash) as unique_visitors FROM clicks').get()
                : db.prepare('SELECT COUNT(*) as total_clicks, COUNT(DISTINCT ip_hash) as unique_visitors FROM clicks WHERE link_id = ?').get(id);

            const timeline = isAll
                ? db.prepare("SELECT substr(timestamp, 1, 10) as date, COUNT(*) as clicks FROM clicks WHERE timestamp >= datetime('now', '-7 days') GROUP BY date ORDER BY date ASC").all()
                : db.prepare("SELECT substr(timestamp, 1, 10) as date, COUNT(*) as clicks FROM clicks WHERE link_id = ? AND timestamp >= datetime('now', '-7 days') GROUP BY date ORDER BY date ASC").all(id);

            const countries = isAll
                ? db.prepare('SELECT country, COUNT(*) as count FROM clicks GROUP BY country ORDER BY count DESC LIMIT 8').all()
                : db.prepare('SELECT country, COUNT(*) as count FROM clicks WHERE link_id = ? GROUP BY country ORDER BY count DESC LIMIT 8').all(id);

            const referrers = isAll
                ? db.prepare('SELECT referrer, COUNT(*) as count FROM clicks GROUP BY referrer ORDER BY count DESC LIMIT 8').all()
                : db.prepare('SELECT referrer, COUNT(*) as count FROM clicks WHERE link_id = ? GROUP BY referrer ORDER BY count DESC LIMIT 8').all(id);

            const devices = isAll
                ? db.prepare('SELECT device_type, COUNT(*) as count FROM clicks GROUP BY device_type ORDER BY count DESC').all()
                : db.prepare('SELECT device_type, COUNT(*) as count FROM clicks WHERE link_id = ? GROUP BY device_type ORDER BY count DESC').all(id);

            const browsers = isAll
                ? db.prepare('SELECT browser, COUNT(*) as count FROM clicks GROUP BY browser ORDER BY count DESC LIMIT 6').all()
                : db.prepare('SELECT browser, COUNT(*) as count FROM clicks WHERE link_id = ? GROUP BY browser ORDER BY count DESC LIMIT 6').all(id);

            const recent = isAll
                ? db.prepare('SELECT timestamp, country, city, referrer, device_type, browser, os FROM clicks ORDER BY timestamp DESC LIMIT 25').all()
                : db.prepare('SELECT timestamp, country, city, referrer, device_type, browser, os FROM clicks WHERE link_id = ? ORDER BY timestamp DESC LIMIT 25').all(id);

            return sendJson(res, {
                link,
                total_clicks: counts?.total_clicks || 0,
                unique_visitors: counts?.unique_visitors || 0,
                timeline: timeline || [],
                countries: countries || [],
                referrers: referrers || [],
                devices: devices || [],
                browsers: browsers || [],
                recent: recent || []
            });
        }

        // ---------------------------------------------
        // API: Links Collection (/api/links)
        // ---------------------------------------------
        if (pathname === '/api/links') {
            if (!checkAdminAuth(req)) return sendJson(res, { error: 'Unauthorized' }, 401);

            if (req.method === 'GET') {
                const search = (parsedUrl.searchParams.get('search') || '').trim();
                const status = (parsedUrl.searchParams.get('status') || 'all').toLowerCase();
                const sort = (parsedUrl.searchParams.get('sort') || 'newest').toLowerCase();

                let query = 'SELECT * FROM links WHERE 1=1';
                const params = [];

                if (search) {
                    query += ' AND (slug LIKE ? OR target_url LIKE ? OR title LIKE ?)';
                    const p = `%${search}%`;
                    params.push(p, p, p);
                }

                const now = new Date().toISOString();
                if (status === 'active') {
                    query += ' AND is_active = 1 AND (expires_at IS NULL OR expires_at > ?) AND (max_clicks IS NULL OR clicks_count < max_clicks)';
                    params.push(now);
                } else if (status === 'paused') {
                    query += ' AND is_active = 0';
                } else if (status === 'expired') {
                    query += ' AND ((expires_at IS NOT NULL AND expires_at <= ?) OR (max_clicks IS NOT NULL AND clicks_count >= max_clicks))';
                    params.push(now);
                } else if (status === 'protected') {
                    query += ' AND password_hash IS NOT NULL';
                }

                if (sort === 'clicks') {
                    query += ' ORDER BY clicks_count DESC, created_at DESC';
                } else if (sort === 'title') {
                    query += ' ORDER BY title ASC, created_at DESC';
                } else {
                    query += ' ORDER BY created_at DESC';
                }

                const stmt = db.prepare(query);
                const results = stmt.all(...params);

                const totalStats = db.prepare('SELECT COUNT(*) as total_links, SUM(clicks_count) as total_clicks FROM links').get();

                const sanitized = results.map(l => ({
                    ...l,
                    has_password: Boolean(l.password_hash),
                    password_hash: undefined
                }));

                return sendJson(res, {
                    links: sanitized,
                    total: totalStats?.total_links || 0,
                    total_clicks: totalStats?.total_clicks || 0
                });
            }

            if (req.method === 'POST') {
                const body = await readBody(req);

                // Bulk creation
                if (body.bulk && Array.isArray(body.urls)) {
                    const created = [];
                    const errors = [];
                    for (const item of body.urls) {
                        const target = normalizeUrl(typeof item === 'string' ? item : item.url);
                        if (!target) {
                            errors.push({ item, error: 'Invalid URL or unsafe scheme' });
                            continue;
                        }
                        let slug = (item.slug || '').trim();
                        if (slug) {
                            if (!/^[a-zA-Z0-9_-]+$/.test(slug)) {
                                errors.push({ item, error: `Slug "${slug}" can only contain letters, numbers, hyphens, and underscores` });
                                continue;
                            }
                            if (RESERVED_SLUGS.has(slug.toLowerCase())) {
                                errors.push({ item, error: `Slug "${slug}" is a reserved system route` });
                                continue;
                            }
                        } else {
                            slug = generateRandomSlug(6);
                            while (RESERVED_SLUGS.has(slug.toLowerCase())) {
                                slug = generateRandomSlug(6);
                            }
                        }
                        const existing = db.prepare('SELECT id FROM links WHERE slug = ?').get(slug);
                        if (existing) {
                            errors.push({ item, error: `Slug "${slug}" already exists` });
                            continue;
                        }
                        const id = crypto.randomUUID();
                        const now = new Date().toISOString();
                        const title = item.title || (target.length > 50 ? target.substring(0, 50) + '...' : target);

                        db.prepare(
                            'INSERT INTO links (id, slug, target_url, title, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, 1, ?, ?)'
                        ).run(id, slug, target, title, now, now);

                        created.push({ id, slug, target_url: target, title });
                    }
                    return sendJson(res, { success: true, created, errors });
                }

                // Single link creation
                const { target_url, custom_slug, title, password, expires_at, max_clicks } = body;
                const normalized = normalizeUrl(target_url);
                if (!normalized) {
                    return sendJson(res, { error: 'Please enter a valid destination URL or protocol (unsafe schemes disallowed)' }, 400);
                }

                let slug = (custom_slug || '').trim();
                if (slug) {
                    if (!/^[a-zA-Z0-9_-]+$/.test(slug)) {
                        return sendJson(res, { error: 'Slug can only contain letters, numbers, hyphens, and underscores' }, 400);
                    }
                    if (RESERVED_SLUGS.has(slug.toLowerCase())) {
                        return sendJson(res, { error: `Slug "${slug}" is a reserved system route and cannot be used` }, 400);
                    }
                    const existing = db.prepare('SELECT id FROM links WHERE slug = ?').get(slug);
                    if (existing) {
                        return sendJson(res, { error: `Slug "${slug}" is already in use` }, 409);
                    }
                } else {
                    let attempts = 0;
                    while (attempts < 5) {
                        const candidate = generateRandomSlug(6);
                        if (RESERVED_SLUGS.has(candidate.toLowerCase())) {
                            attempts++;
                            continue;
                        }
                        const existing = db.prepare('SELECT id FROM links WHERE slug = ?').get(candidate);
                        if (!existing) {
                            slug = candidate;
                            break;
                        }
                        attempts++;
                    }
                    if (!slug) slug = generateRandomSlug(8);
                }

                const id = crypto.randomUUID();
                const now = new Date().toISOString();
                const finalTitle = (title || '').trim() || (normalized.length > 60 ? normalized.substring(0, 60) + '...' : normalized);
                const passwordHash = password ? hashPassword(password) : null;
                const maxClicksVal = max_clicks && parseInt(max_clicks, 10) > 0 ? parseInt(max_clicks, 10) : null;
                const expiresAtVal = expires_at ? new Date(expires_at).toISOString() : null;

                db.prepare(
                    `INSERT INTO links (id, slug, target_url, title, password_hash, expires_at, max_clicks, clicks_count, is_active, created_at, updated_at)
                     VALUES (?, ?, ?, ?, ?, ?, ?, 0, 1, ?, ?)`
                ).run(id, slug, normalized, finalTitle, passwordHash, expiresAtVal, maxClicksVal, now, now);

                return sendJson(res, {
                    success: true,
                    link: {
                        id,
                        slug,
                        target_url: normalized,
                        title: finalTitle,
                        has_password: Boolean(passwordHash),
                        expires_at: expiresAtVal,
                        max_clicks: maxClicksVal,
                        clicks_count: 0,
                        is_active: 1,
                        created_at: now
                    }
                }, 201);
            }
        }

        // ---------------------------------------------
        // API: Single Link Actions (/api/links/:id)
        // ---------------------------------------------
        if (pathname.startsWith('/api/links/')) {
            if (!checkAdminAuth(req)) return sendJson(res, { error: 'Unauthorized' }, 401);
            const id = pathname.replace('/api/links/', '').trim();

            if (req.method === 'GET') {
                const link = db.prepare('SELECT * FROM links WHERE id = ?').get(id);
                if (!link) return sendJson(res, { error: 'Link not found' }, 404);
                return sendJson(res, {
                    link: {
                        ...link,
                        has_password: Boolean(link.password_hash),
                        password_hash: undefined
                    }
                });
            }

            if (req.method === 'PUT') {
                const body = await readBody(req);
                const existing = db.prepare('SELECT * FROM links WHERE id = ?').get(id);
                if (!existing) return sendJson(res, { error: 'Link not found' }, 404);

                const target_url = body.target_url ? normalizeUrl(body.target_url) : existing.target_url;
                if (!target_url) {
                    return sendJson(res, { error: 'Please enter a valid destination URL or protocol (unsafe schemes disallowed)' }, 400);
                }
                const title = body.title !== undefined ? body.title : existing.title;
                const newSlug = body.slug ? body.slug.trim() : existing.slug;

                if (newSlug !== existing.slug) {
                    if (!/^[a-zA-Z0-9_-]+$/.test(newSlug)) {
                        return sendJson(res, { error: 'Slug can only contain letters, numbers, hyphens, and underscores' }, 400);
                    }
                    if (RESERVED_SLUGS.has(newSlug.toLowerCase())) {
                        return sendJson(res, { error: `Slug "${newSlug}" is a reserved system route and cannot be used` }, 400);
                    }
                    const duplicate = db.prepare('SELECT id FROM links WHERE slug = ? AND id != ?').get(newSlug, id);
                    if (duplicate) return sendJson(res, { error: `Slug "${newSlug}" is already taken` }, 409);
                }

                let passwordHash = existing.password_hash;
                if (body.remove_password) {
                    passwordHash = null;
                } else if (body.password) {
                    passwordHash = hashPassword(body.password);
                }

                const expiresAt = body.expires_at !== undefined ? (body.expires_at ? new Date(body.expires_at).toISOString() : null) : existing.expires_at;
                const maxClicks = body.max_clicks !== undefined ? (body.max_clicks ? parseInt(body.max_clicks, 10) : null) : existing.max_clicks;
                const now = new Date().toISOString();

                db.prepare(
                    `UPDATE links 
                     SET slug = ?, target_url = ?, title = ?, password_hash = ?, expires_at = ?, max_clicks = ?, updated_at = ?
                     WHERE id = ?`
                ).run(newSlug, target_url, title, passwordHash, expiresAt, maxClicks, now, id);

                return sendJson(res, {
                    success: true,
                    link: {
                        id,
                        slug: newSlug,
                        target_url,
                        title,
                        has_password: Boolean(passwordHash),
                        expires_at: expiresAt,
                        max_clicks: maxClicks,
                        updated_at: now
                    }
                });
            }

            if (req.method === 'PATCH') {
                const body = await readBody(req);
                const existing = db.prepare('SELECT id, is_active FROM links WHERE id = ?').get(id);
                if (!existing) return sendJson(res, { error: 'Link not found' }, 404);

                const newStatus = body.is_active !== undefined ? (body.is_active ? 1 : 0) : (existing.is_active ? 0 : 1);
                const now = new Date().toISOString();

                db.prepare('UPDATE links SET is_active = ?, updated_at = ? WHERE id = ?').run(newStatus, now, id);
                return sendJson(res, { success: true, is_active: newStatus });
            }

            if (req.method === 'DELETE') {
                db.prepare('DELETE FROM clicks WHERE link_id = ?').run(id);
                db.prepare('DELETE FROM links WHERE id = ?').run(id);
                return sendJson(res, { success: true, message: 'Link deleted' });
            }
        }

        // ---------------------------------------------
        // Static Files Serving (Secured against path traversal)
        // ---------------------------------------------
        let staticFile = null;
        if (pathname === '/' || pathname === '/index.html') {
            staticFile = path.join(PUBLIC_DIR, 'index.html');
        } else if (pathname === '/gate' || pathname === '/gate.html') {
            staticFile = path.join(PUBLIC_DIR, 'gate.html');
        } else {
            const safePath = path.resolve(PUBLIC_DIR, '.' + pathname);
            if (safePath.startsWith(PUBLIC_DIR) && fs.existsSync(safePath) && fs.statSync(safePath).isFile()) {
                staticFile = safePath;
            }
        }

        if (staticFile) {
            return serveStatic(req, res, staticFile);
        }

        // ---------------------------------------------
        // Dynamic Slug Redirection (/:slug)
        // ---------------------------------------------
        const slug = pathname.replace(/^\//, '').trim();
        if (slug && !slug.includes('/') && !RESERVED_SLUGS.has(slug.toLowerCase()) && !slug.includes('.')) {
            const link = db.prepare('SELECT * FROM links WHERE slug = ?').get(slug);

            if (!link) {
                res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
                return res.end(renderHtmlError('Link Not Found', `The short link "/${slug}" does not exist or has been removed.`));
            }

            if (link.is_active === 0) {
                res.writeHead(410, { 'Content-Type': 'text/html; charset=utf-8' });
                return res.end(renderHtmlError('Link Paused', 'This link is currently inactive or has been paused by the owner.'));
            }

            if (link.expires_at) {
                const expireTime = new Date(link.expires_at).getTime();
                if (Date.now() > expireTime) {
                    res.writeHead(410, { 'Content-Type': 'text/html; charset=utf-8' });
                    return res.end(renderHtmlError('Link Expired', 'This link expired on ' + new Date(link.expires_at).toUTCString()));
                }
            }

            if (link.max_clicks !== null && link.max_clicks > 0 && link.clicks_count >= link.max_clicks) {
                res.writeHead(410, { 'Content-Type': 'text/html; charset=utf-8' });
                return res.end(renderHtmlError('Click Limit Reached', 'This link has reached its maximum permitted number of clicks.'));
            }

            if (link.password_hash) {
                const authParam = parsedUrl.searchParams.get('auth');
                let isAuthorized = false;
                if (authParam) {
                    const hashedParam = hashPassword(authParam);
                    if (hashedParam === link.password_hash) {
                        isAuthorized = true;
                    }
                }
                if (!isAuthorized) {
                    res.writeHead(302, { 'Location': `/gate.html?slug=${encodeURIComponent(slug)}` });
                    return res.end();
                }
            }

            // Record click analytics asynchronously
            setImmediate(() => {
                try {
                    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
                    const ipHash = hashIp(String(clientIp).split(',')[0].trim());
                    const userAgent = req.headers['user-agent'] || '';
                    const { device_type, os, browser } = parseUserAgent(userAgent);
                    
                    const country = 'Local';
                    const city = 'Localhost';
                    const rawReferrer = req.headers['referer'] || 'Direct';
                    let referrer = 'Direct';
                    if (rawReferrer && rawReferrer !== 'Direct') {
                        try {
                            referrer = new URL(rawReferrer).hostname;
                        } catch (e) {
                            referrer = rawReferrer.substring(0, 50);
                        }
                    }

                    const clickId = crypto.randomUUID();
                    const now = new Date().toISOString();

                    db.prepare(
                        'INSERT INTO clicks (id, link_id, timestamp, country, city, referrer, device_type, browser, os, ip_hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
                    ).run(clickId, link.id, now, country, city, referrer, device_type, browser, os, ipHash);

                    db.prepare('UPDATE links SET clicks_count = clicks_count + 1 WHERE id = ?').run(link.id);
                } catch (err) {
                    console.error('Error logging click:', err);
                }
            });

            // Redirect visitor (with fallback HTML for non-HTTP schemes)
            if (isExternalScheme(link.target_url)) {
                res.writeHead(302, {
                    'Location': link.target_url,
                    'Content-Type': 'text/html; charset=utf-8'
                });
                return res.end(renderProtocolRedirect(link.target_url, link.title));
            }

            res.writeHead(302, { 'Location': link.target_url });
            return res.end();
        }

        // Fallback 404
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');

    } catch (error) {
        console.error('Server error:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
    }
});

server.listen(PORT, () => {
    console.log(`\n======================================================`);
    console.log(`  OmniLink URL Shortener Local Dev Server running!`);
    console.log(`  Dashboard URL: http://localhost:${PORT}`);
    console.log(`  SQLite DB:     ${DB_PATH}`);
    console.log(`======================================================\n`);
});
