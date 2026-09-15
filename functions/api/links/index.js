import { jsonResponse, normalizeUrl, generateRandomSlug, hashPassword, checkAdminAuth } from '../../_utils.js';

export async function onRequestGet({ request, env }) {
    if (!env.DB) return jsonResponse({ error: 'Database not bound' }, 500);

    const isAuth = await checkAdminAuth(request, env);
    if (!isAuth) return jsonResponse({ error: 'Unauthorized' }, 401);

    try {
        const url = new URL(request.url);
        const search = (url.searchParams.get('search') || '').trim();
        const status = (url.searchParams.get('status') || 'all').toLowerCase();
        const sort = (url.searchParams.get('sort') || 'newest').toLowerCase();

        let query = 'SELECT * FROM links WHERE 1=1';
        const params = [];

        if (search) {
            query += ' AND (slug LIKE ? OR target_url LIKE ? OR title LIKE ?)';
            const searchPattern = `%${search}%`;
            params.push(searchPattern, searchPattern, searchPattern);
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
            // Default newest
            query += ' ORDER BY created_at DESC';
        }

        const stmt = env.DB.prepare(query);
        const { results } = params.length > 0 ? await stmt.bind(...params).all() : await stmt.all();

        // Get quick dashboard aggregates
        const totalStats = await env.DB.prepare(
            'SELECT COUNT(*) as total_links, SUM(clicks_count) as total_clicks FROM links'
        ).first();

        // Mask password hashes for security in the response
        const sanitized = results.map(l => ({
            ...l,
            has_password: Boolean(l.password_hash),
            password_hash: undefined
        }));

        return jsonResponse({
            links: sanitized,
            total: totalStats?.total_links || 0,
            total_clicks: totalStats?.total_clicks || 0
        });
    } catch (e) {
        return jsonResponse({ error: e.message }, 500);
    }
}

export async function onRequestPost({ request, env }) {
    if (!env.DB) return jsonResponse({ error: 'Database not bound' }, 500);

    const isAuth = await checkAdminAuth(request, env);
    if (!isAuth) return jsonResponse({ error: 'Unauthorized' }, 401);

    try {
        const body = await request.json();

        // Check if bulk creation
        if (body.bulk && Array.isArray(body.urls)) {
            const created = [];
            const errors = [];
            for (const item of body.urls) {
                const target = normalizeUrl(typeof item === 'string' ? item : item.url);
                if (!target) {
                    errors.push({ item, error: 'Invalid URL' });
                    continue;
                }
                const slug = (item.slug || generateRandomSlug(6)).trim();
                const existing = await env.DB.prepare('SELECT id FROM links WHERE slug = ?').bind(slug).first();
                if (existing) {
                    errors.push({ item, error: `Slug "${slug}" already exists` });
                    continue;
                }
                const id = crypto.randomUUID();
                const now = new Date().toISOString();
                const title = item.title || (target.length > 50 ? target.substring(0, 50) + '...' : target);

                await env.DB.prepare(
                    'INSERT INTO links (id, slug, target_url, title, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, 1, ?, ?)'
                ).bind(id, slug, target, title, now, now).run();

                created.push({ id, slug, target_url: target, title });
            }
            return jsonResponse({ success: true, created, errors });
        }

        // Single creation
        const { target_url, custom_slug, title, password, expires_at, max_clicks } = body;
        const normalized = normalizeUrl(target_url);
        if (!normalized) {
            return jsonResponse({ error: 'Please enter a valid destination URL or protocol' }, 400);
        }

        let slug = (custom_slug || '').trim();
        if (slug) {
            // Slug validation: alphanumeric, dashes, underscores
            if (!/^[a-zA-Z0-9_-]+$/.test(slug)) {
                return jsonResponse({ error: 'Slug can only contain letters, numbers, hyphens, and underscores' }, 400);
            }
            const existing = await env.DB.prepare('SELECT id FROM links WHERE slug = ?').bind(slug).first();
            if (existing) {
                return jsonResponse({ error: `Slug "${slug}" is already in use` }, 409);
            }
        } else {
            // Generate unique slug
            let attempts = 0;
            while (attempts < 5) {
                const candidate = generateRandomSlug(6);
                const existing = await env.DB.prepare('SELECT id FROM links WHERE slug = ?').bind(candidate).first();
                if (!existing) {
                    slug = candidate;
                    break;
                }
                attempts++;
            }
            if (!slug) {
                slug = generateRandomSlug(8);
            }
        }

        const id = crypto.randomUUID();
        const now = new Date().toISOString();
        const finalTitle = (title || '').trim() || (normalized.length > 60 ? normalized.substring(0, 60) + '...' : normalized);
        const passwordHash = password ? await hashPassword(password) : null;
        const maxClicksVal = max_clicks && parseInt(max_clicks, 10) > 0 ? parseInt(max_clicks, 10) : null;
        const expiresAtVal = expires_at ? new Date(expires_at).toISOString() : null;

        await env.DB.prepare(
            `INSERT INTO links (id, slug, target_url, title, password_hash, expires_at, max_clicks, clicks_count, is_active, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, 0, 1, ?, ?)`
        ).bind(id, slug, normalized, finalTitle, passwordHash, expiresAtVal, maxClicksVal, now, now).run();

        return jsonResponse({
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

    } catch (e) {
        return jsonResponse({ error: e.message }, 500);
    }
}
