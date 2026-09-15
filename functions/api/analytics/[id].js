import { jsonResponse, checkAdminAuth } from '../../_utils.js';

export async function onRequestGet({ params, request, env }) {
    if (!env.DB) return jsonResponse({ error: 'Database not bound' }, 500);
    const isAuth = await checkAdminAuth(request, env);
    if (!isAuth) return jsonResponse({ error: 'Unauthorized' }, 401);

    const id = params.id;
    const isAll = id === 'all';

    try {
        let link = null;
        if (!isAll) {
            link = await env.DB.prepare('SELECT id, slug, target_url, title, created_at, clicks_count, is_active FROM links WHERE id = ?').bind(id).first();
            if (!link) return jsonResponse({ error: 'Link not found' }, 404);
        }

        const linkFilter = isAll ? '' : 'WHERE link_id = ?';
        const linkParams = isAll ? [] : [id];

        // 1. Total and Unique Clicks
        const countQuery = `SELECT COUNT(*) as total_clicks, COUNT(DISTINCT ip_hash) as unique_visitors FROM clicks ${linkFilter}`;
        const counts = linkParams.length > 0
            ? await env.DB.prepare(countQuery).bind(...linkParams).first()
            : await env.DB.prepare(countQuery).first();

        // 2. Timeline (Last 7 Days)
        const timelineQuery = `
            SELECT substr(timestamp, 1, 10) as date, COUNT(*) as clicks 
            FROM clicks 
            ${linkFilter ? linkFilter + ' AND ' : 'WHERE '} timestamp >= datetime('now', '-7 days')
            GROUP BY date 
            ORDER BY date ASC
        `;
        const { results: timeline } = linkParams.length > 0
            ? await env.DB.prepare(timelineQuery).bind(...linkParams).all()
            : await env.DB.prepare(timelineQuery).all();

        // 3. Countries
        const countryQuery = `
            SELECT country, COUNT(*) as count 
            FROM clicks 
            ${linkFilter}
            GROUP BY country 
            ORDER BY count DESC 
            LIMIT 8
        `;
        const { results: countries } = linkParams.length > 0
            ? await env.DB.prepare(countryQuery).bind(...linkParams).all()
            : await env.DB.prepare(countryQuery).all();

        // 4. Referrers
        const referrerQuery = `
            SELECT referrer, COUNT(*) as count 
            FROM clicks 
            ${linkFilter}
            GROUP BY referrer 
            ORDER BY count DESC 
            LIMIT 8
        `;
        const { results: referrers } = linkParams.length > 0
            ? await env.DB.prepare(referrerQuery).bind(...linkParams).all()
            : await env.DB.prepare(referrerQuery).all();

        // 5. Devices
        const deviceQuery = `
            SELECT device_type, COUNT(*) as count 
            FROM clicks 
            ${linkFilter}
            GROUP BY device_type 
            ORDER BY count DESC
        `;
        const { results: devices } = linkParams.length > 0
            ? await env.DB.prepare(deviceQuery).bind(...linkParams).all()
            : await env.DB.prepare(deviceQuery).all();

        // 6. Browsers
        const browserQuery = `
            SELECT browser, COUNT(*) as count 
            FROM clicks 
            ${linkFilter}
            GROUP BY browser 
            ORDER BY count DESC 
            LIMIT 6
        `;
        const { results: browsers } = linkParams.length > 0
            ? await env.DB.prepare(browserQuery).bind(...linkParams).all()
            : await env.DB.prepare(browserQuery).all();

        // 7. Recent Clicks Log (for deep dive)
        const recentQuery = `
            SELECT timestamp, country, city, referrer, device_type, browser, os 
            FROM clicks 
            ${linkFilter}
            ORDER BY timestamp DESC 
            LIMIT 25
        `;
        const { results: recent } = linkParams.length > 0
            ? await env.DB.prepare(recentQuery).bind(...linkParams).all()
            : await env.DB.prepare(recentQuery).all();

        return jsonResponse({
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

    } catch (e) {
        return jsonResponse({ error: e.message }, 500);
    }
}
