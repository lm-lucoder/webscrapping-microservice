import express, { Request, Response } from 'express';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import puppeteer from 'puppeteer';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';

const app = express();
app.use(express.json());

// Função para extrair conteúdo principal com Readability
function extractMainContent(html: string, url: string) {
  try {
    const dom = new JSDOM(html, { url: url });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();

    if (article) {
      return {
        title: article.title || undefined,
        textContent: article.textContent?.replace(/\s+/g, ' ').trim(),
        excerpt: article.excerpt || undefined
      };
    }
    return null;
  } catch (error) {
    console.error('Erro ao processar com Readability:', error);
    return null;
  }
}

interface ScrapeRequestBody {
  tema: string;
  includeOriginalHtml?: boolean;
  contentType?: 'all' | 'clean' | 'readability' | 'sanitized';
}

interface ScrapeResult {
  url: string;
  title?: string;
  textContent?: string;
  excerpt?: string;
  error?: string;
}

app.post('/scrape', async (req: Request, res: Response) => {
  const { tema, includeOriginalHtml = false, contentType = 'all' } = req.body as ScrapeRequestBody;

  if (!tema) {
    return res.status(400).json({ error: 'Tema é obrigatório.' });
  }

  try {
    const toSearchTheme = tema.split(" ").join("+") + "+blog+ou+portal+de+notícias";
    const searchUrl = `https://www.bing.com/search?q=${toSearchTheme}`;
    console.log(searchUrl);
    const response = await fetch(searchUrl);
    const html = await response.text();
    const $ = cheerio.load(html);

    const links: string[] = [];
    $('li.b_algo h2 a').each((_, el) => {
      const href = $(el).attr('href');
      if (href && !href.includes('bing.com')) links.push(href);
    });

    const topLinks = links.slice(0, 5);
    console.log(topLinks);
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    const results: ScrapeResult[] = [];

    for (const url of topLinks) {
      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
        const content = await page.content();
        const readabilityContent = extractMainContent(content, url);
        const result: ScrapeResult = { url };
        if (readabilityContent) {
          result.title = readabilityContent.title;
          result.textContent = readabilityContent.textContent;
          result.excerpt = readabilityContent.excerpt;
        }

        results.push(result);
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
