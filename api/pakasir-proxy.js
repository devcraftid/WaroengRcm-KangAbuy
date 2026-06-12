export default async function handler(req, res) {
  // Hanya berlaku di Vercel, req.url biasanya berbunyi "/api/pakasir/transactioncreate/qris" atau semacamnya
  try {
    let targetPath = req.url.replace(/^\/api\/pakasir/, '');
    if (!targetPath) targetPath = '/';

    const url = `https://app.pakasir.com/api${targetPath}`;

    console.log(`[Proxy] Proxying ${req.method} to ${url}`);

    const options = {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    };

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      options.body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    }

    const response = await fetch(url, options);

    // Set response headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');

    const text = await response.text();

    try {
      res.status(response.status).json(JSON.parse(text));
    } catch (e) {
      res.status(response.status).send(text);
    }
  } catch (error) {
    console.error('[Proxy Error]', error);
    res.status(500).json({ error: 'Proxy failed', details: error.message });
  }
}
