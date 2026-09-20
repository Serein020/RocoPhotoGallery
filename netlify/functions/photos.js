const CLOUDFLARE_API =
  'https://rocophotogallery.weykeiii.workers.dev';

export default async function handler(request) {
  const targetUrl = `${CLOUDFLARE_API}/api/photos${new URL(
    request.url,
  ).search}`;

  try {
    const options = {
      method: request.method,
      headers: {},
    };

    if (request.method !== 'GET' && request.method !== 'HEAD') {
      options.body = await request.text();

      const contentType = request.headers.get('content-type');

      if (contentType) {
        options.headers['Content-Type'] = contentType;
      }
    }

    const response = await fetch(targetUrl, options);

    const body = await response.arrayBuffer();

    const headers = new Headers();

    const contentType = response.headers.get('content-type');

    if (contentType) {
      headers.set('Content-Type', contentType);
    } else {
      headers.set(
        'Content-Type',
        'application/json; charset=utf-8',
      );
    }

    return new Response(body, {
      status: response.status,
      headers,
    });
  } catch (error) {
    console.error('Netlify photo API proxy failed:', error);

    return new Response(
      JSON.stringify({
        error: 'Failed to connect to Cloudflare photo API.',
        detail:
          error instanceof Error
            ? error.message
            : String(error),
      }),
      {
        status: 502,
        headers: {
          'Content-Type':
            'application/json; charset=utf-8',
        },
      },
    );
  }
}