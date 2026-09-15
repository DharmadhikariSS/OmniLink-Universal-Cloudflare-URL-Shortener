import { hashPassword, jsonResponse, checkAdminAuth } from '../_utils.js';

export async function onRequestGet({ env }) {
    if (!env.DB) {
        return jsonResponse({ error: 'Database not bound' }, 500);
    }
    try {
        const row = await env.DB.prepare('SELECT value FROM settings WHERE key = ?').bind('admin_hash').first();
        const hasEnvKey = Boolean(env.ADMIN_KEY);
        const isConfigured = hasEnvKey || Boolean(row && row.value);
        return jsonResponse({ isConfigured });
    } catch (e) {
        return jsonResponse({ error: e.message }, 500);
    }
}

export async function onRequestPost({ request, env }) {
    if (!env.DB) {
        return jsonResponse({ error: 'Database not bound' }, 500);
    }
    try {
        const body = await request.json();
        const { action, password, newPassword } = body;

        if (action === 'verify') {
            if (!password) {
                return jsonResponse({ error: 'Password is required' }, 400);
            }
            if (env.ADMIN_KEY) {
                if (password === env.ADMIN_KEY) {
                    return jsonResponse({ success: true, token: password });
                }
                return jsonResponse({ error: 'Invalid admin passcode' }, 401);
            }

            const row = await env.DB.prepare('SELECT value FROM settings WHERE key = ?').bind('admin_hash').first();
            if (!row || !row.value) {
                return jsonResponse({ error: 'Admin passcode is not configured. Set ADMIN_KEY in Cloudflare Pages Environment Variables.' }, 401);
            }

            const hashed = await hashPassword(password);
            if (hashed === row.value) {
                return jsonResponse({ success: true, token: password });
            }
            return jsonResponse({ error: 'Invalid admin passcode' }, 401);
        }

        if (action === 'setup') {
            if (env.ADMIN_KEY) {
                return jsonResponse({ error: 'Admin key is managed via environment variable ADMIN_KEY in Cloudflare dashboard.' }, 400);
            }
            if (!newPassword || newPassword.length < 4) {
                return jsonResponse({ error: 'Passcode must be at least 4 characters' }, 400);
            }
            const existing = await env.DB.prepare('SELECT value FROM settings WHERE key = ?').bind('admin_hash').first();
            if (existing && existing.value) {
                return jsonResponse({ error: 'Admin passcode is already configured. Use change instead.' }, 400);
            }

            const hashed = await hashPassword(newPassword);
            await env.DB.prepare(
                'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)'
            ).bind('admin_hash', hashed).run();

            return jsonResponse({ success: true, message: 'Admin passcode configured successfully', token: newPassword });
        }

        if (action === 'change') {
            if (env.ADMIN_KEY) {
                return jsonResponse({ error: 'Admin key is managed via environment variable ADMIN_KEY in Cloudflare dashboard.' }, 400);
            }
            const isAuth = await checkAdminAuth(request, env);
            if (!isAuth) {
                return jsonResponse({ error: 'Unauthorized to change admin passcode' }, 401);
            }
            if (!newPassword || newPassword.length < 4) {
                return jsonResponse({ error: 'New passcode must be at least 4 characters' }, 400);
            }

            const hashed = await hashPassword(newPassword);
            await env.DB.prepare(
                'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)'
            ).bind('admin_hash', hashed).run();

            return jsonResponse({ success: true, message: 'Admin passcode updated successfully', token: newPassword });
        }

        return jsonResponse({ error: 'Invalid action' }, 400);
    } catch (e) {
        return jsonResponse({ error: e.message }, 500);
    }
}
