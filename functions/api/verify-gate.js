import { jsonResponse, hashPassword } from '../_utils.js';

export async function onRequestPost({ request, env }) {
    if (!env.DB) return jsonResponse({ error: 'Database not bound' }, 500);

    try {
        const body = await request.json();
        const { slug, password } = body;

        if (!slug || !password) {
            return jsonResponse({ error: 'Slug and password required' }, 400);
        }

        const link = await env.DB.prepare('SELECT target_url, password_hash FROM links WHERE slug = ?').bind(slug).first();
        if (!link) {
            return jsonResponse({ error: 'Link not found' }, 404);
        }

        if (!link.password_hash) {
            return jsonResponse({ success: true, target_url: link.target_url });
        }

        const hashed = await hashPassword(password);
        if (hashed === link.password_hash) {
            return jsonResponse({ success: true, target_url: link.target_url });
        }

        return jsonResponse({ error: 'Incorrect passcode' }, 401);
    } catch (e) {
        return jsonResponse({ error: e.message }, 500);
    }
}
