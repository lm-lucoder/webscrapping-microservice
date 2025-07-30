import express, { Request, Response } from 'express';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import puppeteer from 'puppeteer';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import sanitizeHtml from 'sanitize-html';

const app = express();
app.use(express.json());

// Função para limpar HTML com Cheerio
function cleanHtmlWithCheerio(html: string): string {
  const $ = cheerio.load(html);

  // Remove elementos desnecessários
  $('style, script, nav, footer, header, noscript, iframe, svg, link, meta, form, button, input, textarea, select, aside, .ads, .advertisement, .menu, .sidebar, .widget, .social, .share, .related, .comments').remove();

  // Remove classes comuns de anúncios e elementos irrelevantes
  $('.ad, .ads, .advertisement, .banner, .popup, .modal, .overlay, .cookie, .gdpr').remove();

  // Extrai apenas o texto limpo
  const textContent = $('body').text().replace(/\s+/g, ' ').trim();
  return textContent;
}

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

// Função para sanitizar HTML mantendo elementos básicos
function sanitizeHtmlContent(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'b', 'strong', 'i', 'em', 'br', 'div', 'span'],
    allowedAttributes: {},
    allowedSchemes: ['http', 'https'],
    disallowedTagsMode: 'discard'
  });
}

// Função para limpeza adicional com regex
function cleanTextWithRegex(text: string): string {
  return text
    // Remove múltiplos espaços
    .replace(/\s{2,}/g, ' ')
    // Remove quebras de linha múltiplas
    .replace(/\n{2,}/g, '\n')
    // Remove caracteres especiais desnecessários
    .replace(/[^\w\s\.\,\!\?\;\:\-\(\)\[\]]/g, ' ')
    // Remove espaços no início e fim
    .trim();
}

interface ScrapeRequestBody {
  tema: string;
  includeOriginalHtml?: boolean;
  contentType?: 'all' | 'clean' | 'readability' | 'sanitized';
}

interface ScrapeResult {
  url: string;
  html?: string;
  cleanText?: string;
  readabilityContent?: {
    title?: string;
    textContent?: string;
    excerpt?: string;
  };
  sanitizedHtml?: string;
  error?: string;
}

app.post('/scrape', async (req: Request, res: Response) => {
  const { tema, includeOriginalHtml = false, contentType = 'all' } = req.body as ScrapeRequestBody;

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

        // Processar o conteúdo com todas as técnicas
        const cleanText = cleanHtmlWithCheerio(content);
        const readabilityContent = extractMainContent(content, url);
        const sanitizedHtml = sanitizeHtmlContent(content);
        const finalCleanText = cleanTextWithRegex(cleanText);

        // Construir resultado baseado no tipo de conteúdo solicitado
        const result: ScrapeResult = { url };

        if (includeOriginalHtml) {
          result.html = content;
        }

        switch (contentType) {
          case 'clean':
            result.cleanText = finalCleanText;
            break;
          case 'readability':
            result.readabilityContent = readabilityContent || undefined;
            break;
          case 'sanitized':
            result.sanitizedHtml = sanitizedHtml;
            break;
          case 'all':
          default:
            result.cleanText = finalCleanText;
            result.readabilityContent = readabilityContent || undefined;
            result.sanitizedHtml = sanitizedHtml;
            break;
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
