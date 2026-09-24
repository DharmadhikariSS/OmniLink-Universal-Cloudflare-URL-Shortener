import { jsonResponse, hashPassword, hashIp, parseUserAgent, checkRateLimit } from '../_utils.js';

export async function onRequestPost({ request, env, waitUntil }) {
    if (!env.DB) return jsonResponse({ error: 'Database not bound' }, 500);

    const clientIp = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || '127.0.0.1';
    if (!checkRateLimit(`gate:${clientIp.split(',')[0].trim()}`, 15)) {
        return jsonResponse({ error: 'Too many attempts. Please wait a few minutes before trying again.' }, 429);
    }

    try {
        const body = await request.json();
        const { slug, password } = body;

        if (!slug || !password) {
            return jsonResponse({ error: 'Slug and password required' }, 400);
        }

        const link = await env.DB.prepare('SELECT * FROM links WHERE slug = ?').bind(slug).first();
        if (!link) {
            return jsonResponse({ error: 'Link not found' }, 404);
        }

        // Check active status
        if (link.is_active === 0) {
            return jsonResponse({ error: 'This link is currently inactive or has been paused by the owner.' }, 410);
        }

        // Check expiration
        if (link.expires_at) {
            const expireTime = new Date(link.expires_at).getTime();
            if (Date.now() > expireTime) {
                return jsonResponse({ error: 'This link has expired.' }, 410);
            }
        }

        // Check click limit
        if (link.max_clicks !== null && link.max_clicks > 0 && link.clicks_count >= link.max_clicks) {
            return jsonResponse({ error: 'This link has reached its maximum permitted number of clicks.' }, 410);
        }

        // Verify password
        if (link.password_hash) {
            const hashed = await hashPassword(password);
            if (hashed !== link.password_hash) {
                return jsonResponse({ error: 'Incorrect passcode' }, 401);
            }
        }

        // Asynchronously record click stats
        const recordClick = async () => {
            try {
                const ipHash = await hashIp(clientIp.split(',')[0].trim());
                const userAgent = request.headers.get('user-agent') || '';
                const { device_type, os, browser } = parseUserAgent(userAgent);
                
                const cf = request.cf || {};
                const country = cf.country || request.headers.get('cf-ipcountry') || 'Unknown';
                const city = cf.city || 'Unknown';
                const rawReferrer = request.headers.get('referer') || 'Direct';
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

                await env.DB.batch([
                    env.DB.prepare(
                        'INSERT INTO clicks (id, link_id, timestamp, country, city, referrer, device_type, browser, os, ip_hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
                    ).bind(clickId, link.id, now, country, city, referrer, device_type, browser, os, ipHash),
                    env.DB.prepare(
                        'UPDATE links SET clicks_count = clicks_count + 1 WHERE id = ?'
                    ).bind(link.id)
                ]);
            } catch (err) {
                console.error('Error recording gate click analytics:', err);
            }
        };

        if (waitUntil) {
            waitUntil(recordClick());
        } else {
            recordClick();
        }

        return jsonResponse({ success: true, target_url: link.target_url });
    } catch (e) {
        return jsonResponse({ error: e.message }, 500);
    }
}
