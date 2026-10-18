import { existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { beforeAll, describe, it, expect } from 'vitest';

// Build-output assertions require npm run build first; ordinary unit tests remain standalone.
describe.skipIf(!existsSync('dist/index.html'))('built document SEO and offline invalidation', () => {
  let en: string;
  let de: string;
  beforeAll(() => { en = readFileSync('dist/index.html', 'utf8'); de = readFileSync('dist/de/index.html', 'utf8'); });
  it('prerenders existing localized UI and keeps document metadata reciprocal', () => {
    for (const [locale, html, path] of [['en', en, '/uncle-jim-generator'], ['de', de, '/de/uncle-jim-generator']]) {
      expect(html).toContain(`<html lang="${locale}">`);
      expect(html).toContain(`rel="canonical" href="https://clavastack.com${path}"`);
      expect(html).toContain(`property="og:url" content="https://clavastack.com${path}"`);
      for (const [language, target] of [['en', '/uncle-jim-generator'], ['de', '/de/uncle-jim-generator'], ['x-default', '/uncle-jim-generator']]) {
        expect(html).toContain(`hreflang="${language}" href="https://clavastack.com${target}"`);
      }
      expect(html).toContain('property="og:image:width" content="2500"');
      expect(html).toContain('property="og:image:height" content="2500"');
    }
    expect(de).toContain('Erstelle ein druckbares Bitcoin-Adressenblatt');
    expect(en.match(/<h1>/g)).toHaveLength(1);
    expect(de.match(/<h1>/g)).toHaveLength(1);
    expect(en).toContain('<h1>Uncle Jim PDF Generator</h1>');
    expect(de).toContain('<h1>Uncle Jim PDF-Generator</h1>');
    expect(en).toContain('id="wallet-input"');
    expect(de).toContain('id="wallet-input"');
  });
  it('includes both localized documents in the service-worker build identity', () => {
    const worker = readFileSync('dist/sw.js', 'utf8');
    const manifest = JSON.parse(readFileSync('dist/build-manifest.json', 'utf8'));
    const paths = ['/uncle-jim-generator/', '/uncle-jim-generator', '/de/uncle-jim-generator/', '/de/uncle-jim-generator', ...manifest.assets];
    const id = createHash('sha256').update(en + de + paths.join('|')).digest('hex').slice(0, 16);
    expect(manifest.buildId).toBe(id);
    expect(worker).toContain(`uncle-jim-${manifest.version}-${id}`);
  });
});
