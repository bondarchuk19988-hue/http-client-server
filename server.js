const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.static('public'));


const db = {
  'javascript': [
    'https://developer.mozilla.org/ru/docs/Web/JavaScript',
    'https://learn.javascript.ru/'
  ],
  'nodejs': [
    'https://nodejs.org/en/docs/',
    'https://expressjs.com/'
  ],
  'react': [
    'https://react.dev/',
    'https://ru.reactjs.org/'
  ]
};


app.get('/api/search', (req, res) => {
  const keyword = req.query.keyword;
  if (!keyword) {
    return res.status(400).json({ error: 'нет ключевого слова' });
  }
  const kw = keyword.toLowerCase().trim();

  const urls = db[kw];
  if (!urls) {
    return res.status(404).json({ error: 'ничего не найдено по этому слову' });
  }

  res.json({ keyword: kw, urls: urls });
});


app.get('/api/download', async (req, res) => {
  const url = req.query.url;
  if (!url) {
    return res.status(400).json({ error: 'нет url' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    const response = await axios.get(url, {
      responseType: 'stream',
      timeout: 15000
    });

    const totalSize = parseInt(response.headers['content-length'] || '0');
    let downloaded = 0;
    let content = '';

    response.data.on('data', (chunk) => {
      downloaded += chunk.length;
      content += chunk.toString();
      let progress = 0;
      if (totalSize > 0) {
        progress = Math.round((downloaded / totalSize) * 100);
      }

      res.write('data: ' + JSON.stringify({
        progress: progress,
        downloaded: downloaded,
        totalSize: totalSize
      }) + '\n\n');
    });

    response.data.on('end', () => {
      res.write('data: ' + JSON.stringify({
        done: true,
        content: content,
        totalSize: downloaded
      }) + '\n\n');
      res.end();
    });

    response.data.on('error', () => {
      res.write('data: ' + JSON.stringify({ error: 'ошибка загрузки' }) + '\n\n');
      res.end();
    });

  } catch (err) {
    res.write('data: ' + JSON.stringify({ error: 'не удалось подключиться к сайту' }) + '\n\n');
    res.end();
  }
});

app.listen(PORT, () => {
  console.log('сервер работает на порту ' + PORT);
});