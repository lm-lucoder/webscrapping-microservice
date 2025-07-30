import express, { Request, Response } from 'express';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import puppeteer from 'puppeteer';

const app = express();
app.use(express.json());

interface ScrapeRequestBody {
  tema: string;
}

interface ScrapeResult {
  url: string;
  html?: string;
  error?: string;
}

app.post('/scrape', async (req: Request, res: Response) => {
  const { tema } = req.body as ScrapeRequestBody;

  if (!tema) {
    return res.status(400).json({ error: 'Tema é obrigatório.' });
  }

  try {
    const searchUrl = `https://www.bing.com/search?q=${encodeURIComponent(tema)}+blog+ou+portal+de+notícias`;
    const response = await fetch(searchUrl);
    const html = await response.text();
    const $ = cheerio.load(html);

    const links: string[] = [];
    $('li.b_algo h2 a').each((_, el) => {
      const href = $(el).attr('href');
      if (href && !href.includes('bing.com')) links.push(href);
    });

    const topLinks = links.slice(0, 5);

    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    const results: ScrapeResult[] = [];

    for (const url of topLinks) {
      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
        const content = await page.content();
        results.push({ url, html: content });
      } catch (err) {
        results.push({ url, error: (err as Error).message });
      }
    }

    await browser.close();

    res.json({ tema, results });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.get('/healthcheck', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok' });
});


const PORT = 3500;
app.listen(PORT, () => {
  console.log(`Microserviço rodando em http://localhost:${PORT}`);
});
