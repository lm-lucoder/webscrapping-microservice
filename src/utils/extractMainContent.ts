import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';

export default function extractMainContent(html: string, url: string) {
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