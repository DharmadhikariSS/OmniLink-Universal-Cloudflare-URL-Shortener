import { jsonResponse, normalizeUrl, hashPassword, checkAdminAuth, RESERVED_SLUGS } from '../../_utils.js';

export async function onRequestGet({ params, env, request }) {
    if (!env.DB) return jsonResponse({ error: 'Database not bound' }, 500);
    const isAuth = await checkAdminAuth(request, env);
    if (!isAuth) return jsonResponse({ error: 'Unauthorized' }, 401);

    const id = params.id;
    try {
        const link = await env.DB.prepare('SELECT * FROM links WHERE id = ?').bind(id).first();
        if (!link) return jsonResponse({ error: 'Link not found' }, 404);

        return jsonResponse({
            link: {
                ...link,
                has_password: Boolean(link.password_hash),
                password_hash: undefined
            }
        });
    } catch (e) {
        return jsonResponse({ error: e.message }, 500);
    }
}

export async function onRequestPut({ params, request, env }) {
    if (!env.DB) return jsonResponse({ error: 'Database not bound' }, 500);
    const isAuth = await checkAdminAuth(request, env);
    if (!isAuth) return jsonResponse({ error: 'Unauthorized' }, 401);

    const id = params.id;
    try {
        const body = await request.json();
        const existing = await env.DB.prepare('SELECT * FROM links WHERE id = ?').bind(id).first();
        if (!existing) return jsonResponse({ error: 'Link not found' }, 404);

        const target_url = body.target_url ? normalizeUrl(body.target_url) : existing.target_url;
        if (!target_url) {
            return jsonResponse({ error: 'Please enter a valid destination URL or protocol (unsafe schemes disallowed)' }, 400);
        }
        const title = body.title !== undefined ? body.title : existing.title;
        const newSlug = body.slug ? body.slug.trim() : existing.slug;

        if (newSlug !== existing.slug) {
            if (!/^[a-zA-Z0-9_-]+$/.test(newSlug)) {
                return jsonResponse({ error: 'Slug can only contain letters, numbers, hyphens, and underscores' }, 400);
            }
            if (RESERVED_SLUGS.has(newSlug.toLowerCase())) {
                return jsonResponse({ error: `Slug "${newSlug}" is a reserved system route and cannot be used` }, 400);
            }
            const duplicate = await env.DB.prepare('SELECT id FROM links WHERE slug = ? AND id != ?').bind(newSlug, id).first();
            if (duplicate) {
                return jsonResponse({ error: `Slug "${newSlug}" is already taken` }, 409);
            }
        }

        let passwordHash = existing.password_hash;
        if (body.remove_password) {
            passwordHash = null;
        } else if (body.password) {
            passwordHash = await hashPassword(body.password);
        }

        const expiresAt = body.expires_at !== undefined ? (body.expires_at ? new Date(body.expires_at).toISOString() : null) : existing.expires_at;
        const maxClicks = body.max_clicks !== undefined ? (body.max_clicks ? parseInt(body.max_clicks, 10) : null) : existing.max_clicks;
        const now = new Date().toISOString();

        await env.DB.prepare(
            `UPDATE links 
             SET slug = ?, target_url = ?, title = ?, password_hash = ?, expires_at = ?, max_clicks = ?, updated_at = ?
             WHERE id = ?`
        ).bind(newSlug, target_url, title, passwordHash, expiresAt, maxClicks, now, id).run();

        return jsonResponse({
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
    } catch (e) {
        return jsonResponse({ error: e.message }, 500);
    }
}

export async function onRequestPatch({ params, request, env }) {
    if (!env.DB) return jsonResponse({ error: 'Database not bound' }, 500);
    const isAuth = await checkAdminAuth(request, env);
    if (!isAuth) return jsonResponse({ error: 'Unauthorized' }, 401);

    const id = params.id;
    try {
        const body = await request.json();
        const existing = await env.DB.prepare('SELECT id, is_active FROM links WHERE id = ?').bind(id).first();
        if (!existing) return jsonResponse({ error: 'Link not found' }, 404);

        const newStatus = body.is_active !== undefined ? (body.is_active ? 1 : 0) : (existing.is_active ? 0 : 1);
        const now = new Date().toISOString();

        await env.DB.prepare(
            'UPDATE links SET is_active = ?, updated_at = ? WHERE id = ?'
        ).bind(newStatus, now, id).run();

        return jsonResponse({ success: true, is_active: newStatus });
    } catch (e) {
        return jsonResponse({ error: e.message }, 500);
    }
}

export async function onRequestDelete({ params, request, env }) {
    if (!env.DB) return jsonResponse({ error: 'Database not bound' }, 500);
    const isAuth = await checkAdminAuth(request, env);
    if (!isAuth) return jsonResponse({ error: 'Unauthorized' }, 401);

    const id = params.id;
    try {
        await env.DB.batch([
            env.DB.prepare('DELETE FROM clicks WHERE link_id = ?').bind(id),
            env.DB.prepare('DELETE FROM links WHERE id = ?').bind(id)
        ]);
        return jsonResponse({ success: true, message: 'Link deleted' });
    } catch (e) {
        return jsonResponse({ error: e.message }, 500);
    }
}
