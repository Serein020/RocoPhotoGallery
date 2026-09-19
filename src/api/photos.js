import { env } from 'cloudflare:workers';

const ALLOWED_ORIGINS = new Set([
  'http://localhost:4321',
  'http://127.0.0.1:4321',
  'https://rocophotogallery.weykeiii.workers.dev',
  'https://dainty-bavarois-195ac7.netlify.app',
]);

export const prerender = false;

function getCorsHeaders(request) {
  const origin = request.headers.get('Origin');

  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (origin && ALLOWED_ORIGINS.has(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers.Vary = 'Origin';
  }

  return headers;
}

function json(data, status = 200, request) {
  return new Response(JSON.stringify(data), {
    status,
    headers: getCorsHeaders(request),
  });
}

export async function OPTIONS({ request }) {
  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(request),
  });
}

export async function GET({ request }) {
  const db = env.DB;

  if (!db) {
    return json(
      {
        error: 'D1 database binding DB is not available.',
      },
      500,
      request,
    );
  }

  try {
    const result = await db
      .prepare(
        `
          SELECT id, image, date, people, jinies, updated_at
          FROM photo_metadata
          ORDER BY date DESC, id DESC
        `,
      )
      .all();

    const photos = {};

    for (const row of result.results ?? []) {
      photos[row.id] = {
        id: row.id,
        image: row.image,
        date: row.date,
        people: row.people,
        jinies: row.jinies,
        updatedAt: row.updated_at,
      };
    }

    return json({ photos }, 200, request);
  } catch (error) {
    console.error('GET /api/photos failed:', error);

    return json(
      {
        error: 'Failed to load photo metadata.',
      },
      500,
      request,
    );
  }
}

export async function PUT({ request }) {
  const db = env.DB;

  if (!db) {
    return json(
      {
        error: 'D1 database binding DB is not available.',
      },
      500,
      request,
    );
  }

  try {
    const body = await request.json();
    const photos = body?.photos;

    if (!photos || typeof photos !== 'object') {
      return json(
        {
          error: 'Invalid request body. Expected { photos: {...} }.',
        },
        400,
        request,
      );
    }

    const statements = [];

    for (const [id, photo] of Object.entries(photos)) {
      if (!photo || typeof photo !== 'object') {
        continue;
      }

      if (!photo.image || !photo.date) {
        continue;
      }

      statements.push(
        db
          .prepare(
            `
              INSERT INTO photo_metadata (
                id,
                image,
                date,
                people,
                jinies,
                updated_at
              )
              VALUES (?, ?, ?, ?, ?, ?)
              ON CONFLICT(id) DO UPDATE SET
                image = excluded.image,
                date = excluded.date,
                people = excluded.people,
                jinies = excluded.jinies,
                updated_at = excluded.updated_at
            `,
          )
          .bind(
            id,
            photo.image,
            photo.date,
            photo.people ?? null,
            photo.jinies ?? null,
            photo.updatedAt ?? new Date().toISOString(),
          ),
      );
    }

    if (statements.length > 0) {
      await db.batch(statements);
    }

    return json(
      {
        ok: true,
        count: statements.length,
      },
      200,
      request,
    );
  } catch (error) {
    console.error('PUT /api/photos failed:', error);

    return json(
      {
        error: 'Failed to save photo metadata.',
      },
      500,
      request,
    );
  }
}

export async function DELETE({ request }) {
  const db = env.DB;

  if (!db) {
    return json(
      {
        error: 'D1 database binding DB is not available.',
      },
      500,
      request,
    );
  }

  try {
    await db.prepare('DELETE FROM photo_metadata').run();

    return json(
      {
        ok: true,
      },
      200,
      request,
    );
  } catch (error) {
    console.error('DELETE /api/photos failed:', error);

    return json(
      {
        error: 'Failed to clear photo metadata.',
      },
      500,
      request,
    );
  }
}