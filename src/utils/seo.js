import fetch from 'node-fetch';

/**
 * Pings IndexNow (Bing, Yandex, etc.) to immediately crawl a new or updated URL.
 * Requires an IndexNow key hosted at the root of the domain (e.g. key.txt).
 * @param {string} url - The canonical URL to index
 */
export async function pingIndexNow(url) {
  try {
    const key = process.env.INDEXNOW_KEY;
    if (!key) {
      console.warn('INDEXNOW_KEY is not set. Skipping IndexNow ping.');
      return false;
    }

    const host = new URL(url).hostname;
    const endpoint = `https://api.indexnow.org/indexnow`;

    const payload = {
      host,
      key,
      keyLocation: `https://${host}/${key}.txt`,
      urlList: [url]
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8'
      },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      console.log(`IndexNow ping successful for ${url}`);
      return true;
    } else {
      console.warn(`IndexNow ping failed for ${url} with status ${response.status}`);
      return false;
    }
  } catch (err) {
    console.error('Error pinging IndexNow:', err);
    return false;
  }
}
