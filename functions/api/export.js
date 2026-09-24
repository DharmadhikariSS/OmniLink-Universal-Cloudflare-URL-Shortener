import { checkAdminAuth, jsonResponse } from '../_utils.js';

export async function onRequestGet({ request, env }) {
    if (!env.DB) return jsonResponse({ error: 'Database not bound' }, 500);
    const isAuth = await checkAdminAuth(request, env);
    if (!isAuth) return jsonResponse({ error: 'Unauthorized' }, 401);

    try {
        const url = new URL(request.url);
        const origin = url.origin;

        const { results } = await env.DB.prepare(
            'SELECT id, slug, target_url, title, clicks_count, is_active, expires_at, max_clicks, created_at FROM links ORDER BY created_at DESC'
        ).all();

        const headers = ['ID', 'Short Slug', 'Short URL', 'Target URL', 'Title', 'Clicks', 'Active', 'Expires At', 'Max Clicks', 'Created At'];
        const csvRows = [headers.join(',')];

        for (const row of results) {
            const shortUrl = `${origin}/${row.slug}`;
            const clean = (val) => {
                if (val === null || val === undefined) return '""';
                let str = String(val);
                // Mitigate CSV Formula Injection (CWE-1236)
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

        const csvContent = csvRows.join('\r\n');
        return new Response(csvContent, {
            status: 200,
            headers: {
                'Content-Type': 'text/csv; charset=utf-8',
                'Content-Disposition': `attachment; filename="omnilink-export-${new Date().toISOString().slice(0,10)}.csv"`
            }
        });

    } catch (e) {
        return jsonResponse({ error: e.message }, 500);
    }
}
