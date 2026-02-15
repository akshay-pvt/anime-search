const axios = require('axios');
const cheerio = require('cheerio');
const express = require('express');

class NontonAnimeAPI {
  constructor() {
    this.baseURL = 'https://s9.nontonanimeid.boats';
    this.userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    ];
  }

  getHeaders(customReferer = '') {
    const userAgent =
      this.userAgents[Math.floor(Math.random() * this.userAgents.length)];

    return {
      'accept':
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'accept-language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
      referer: customReferer || this.baseURL,
      'user-agent': userAgent
    };
  }

  generateCookies() {
    const timestamp = Date.now();
    return {
      _lscache_vary: Math.random().toString(36).substring(2, 34),
      _ga_S0L4FL6T3J: `GS2.1.s${timestamp}`,
      _ga: `GA1.2.${Math.floor(Math.random() * 999999999)}.${timestamp}`,
      _gid: `GA1.2.${Math.floor(Math.random() * 999999999)}.${timestamp}`
    };
  }

  async search(query) {
    const cookies = this.generateCookies();
    const cookieString = Object.entries(cookies)
      .map(([key, value]) => `${key}=${value}`)
      .join('; ');

    const response = await axios({
      method: 'GET',
      url: `${this.baseURL}/`,
      headers: {
        ...this.getHeaders(),
        cookie: cookieString
      },
      params: { s: query }
    });

    const $ = cheerio.load(response.data);
    const results = [];

    $('.as-anime-card').each((i, el) => {
      const $el = $(el);

      results.push({
        title: $el.find('.as-anime-title').text().trim(),
        url: $el.attr('href'),
        image: $el.find('img').attr('src'),
        rating: $el.find('.as-rating').text().replace('⭐', '').trim(),
        type: $el.find('.as-type').text().replace('📺', '').trim(),
        season: $el.find('.as-season').text().replace('📅', '').trim(),
        synopsis: $el.find('.as-synopsis').text().trim(),
        genres: $el
          .find('.as-genre-tag')
          .map((i, g) => $(g).text())
          .get()
      });
    });

    return results;
  }

  async getDetail(url) {
    const cookies = this.generateCookies();
    const cookieString = Object.entries(cookies)
      .map(([key, value]) => `${key}=${value}`)
      .join('; ');

    const response = await axios({
      method: 'GET',
      url: url,
      headers: {
        ...this.getHeaders(),
        cookie: cookieString
      },
      timeout: 10000
    });

    const $ = cheerio.load(response.data);

    const genres = [];
    $('.anime-card__genres .genre-tag').each((i, el) => {
      genres.push($(el).text().trim());
    });

    const episodesList = [];
    $('.episode-item').each((i, el) => {
      const $el = $(el);
      episodesList.push({
        title: $el.find('.ep-title').text().trim(),
        url: $el.attr('href'),
        date: $el.find('.ep-date').text().trim()
      });
    });

    return {
      title: $('.entry-title')
        .text()
        .replace('Nonton', '')
        .replace('Sub Indo', '')
        .trim(),
      image: $('.anime-card__sidebar img').attr('src'),
      score: $('.anime-card__score .value').text().trim(),
      type: $('.anime-card__score .type').text().trim(),
      synopsis: $('.synopsis-prose p').text().trim(),
      genres,
      episodesList
    };
  }
}

const app = express();
const PORT = 3000;

app.get('/', (req, res) => {
  res.json({
    message: 'NontonAnime API is running',
    endpoints: {
      search: '/search?q=boruto',
      detail: '/detail?url=FULL_ANIME_URL'
    }
  });
});

app.get('/search', async (req, res) => {
  try {
    const query = req.query.q;
    if (!query)
      return res.json({ error: 'Query parameter ?q= is required' });

    const api = new NontonAnimeAPI();
    const results = await api.search(query);

    res.json(results);
  } catch (err) {
    res.json({ error: err.message });
  }
});

app.get('/detail', async (req, res) => {
  try {
    const url = req.query.url;
    if (!url)
      return res.json({ error: 'Query parameter ?url= is required' });

    const api = new NontonAnimeAPI();
    const detail = await api.getDetail(url);

    res.json(detail);
  } catch (err) {
    res.json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
