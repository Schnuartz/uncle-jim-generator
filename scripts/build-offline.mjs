import { readdir,readFile,writeFile,copyFile,mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const root=new URL('../dist/',import.meta.url);
const version=JSON.parse(await readFile(new URL('../package.json',import.meta.url),'utf8')).version;
const files=[];
async function walk(dir,prefix=''){for(const entry of await readdir(dir,{withFileTypes:true})){if(entry.isDirectory())await walk(new URL(`${entry.name}/`,dir),prefix+entry.name+'/');else files.push(prefix+entry.name);}}
await walk(root);
const { render } = await import('../.prerender/prerender.js');
const template=await readFile(new URL('index.html',root),'utf8');
const html=template.replace('<div id="root"></div>', `<div id="root">${render('en')}</div>`);
await writeFile(new URL('index.html',root),html);
await mkdir(new URL('de/',root),{recursive:true});
// Localize only document metadata; application DOM and runtime assets stay unchanged.
const germanHtml=template.replace('<div id="root"></div>', `<div id="root">${render('de')}</div>`)
  .replace('<html lang="en">','<html lang="de">')
  .replaceAll('Create a printable Bitcoin address sheet privately in your browser, with offline support.','Erstelle ein druckbares Bitcoin-Adressenblatt privat in deinem Browser, mit Offline-Unterstützung.')
  .replaceAll('Uncle Jim PDF Generator | ClavaStack','Uncle Jim PDF-Generator | ClavaStack')
  .replace('rel="canonical" href="https://clavastack.com/uncle-jim-generator"','rel="canonical" href="https://clavastack.com/de/uncle-jim-generator"')
  .replace('property="og:url" content="https://clavastack.com/uncle-jim-generator"','property="og:url" content="https://clavastack.com/de/uncle-jim-generator"')
  .replace('property="og:locale" content="en_US"','property="og:locale" content="de_DE"');
await writeFile(new URL('de/index.html',root),germanHtml);
const assets=files.filter(f=>f!=='index.html').map(f=>'/uncle-jim-generator/'+f);
const manifest=['/uncle-jim-generator/','/uncle-jim-generator','/de/uncle-jim-generator/','/de/uncle-jim-generator',...assets];
const buildId=createHash('sha256').update(html+germanHtml+manifest.join('|')).digest('hex').slice(0,16);
const sw=`/* Application assets only. Never stores user input. */
const CACHE='uncle-jim-${version}-${buildId}';
const ASSETS=${JSON.stringify(manifest)};
self.addEventListener('install',event=>{event.waitUntil((async()=>{const cache=await caches.open(CACHE);await cache.addAll(ASSETS);})());});
self.addEventListener('activate',event=>{event.waitUntil((async()=>{await self.clients.claim();const clients=await self.clients.matchAll();for(const client of clients)client.postMessage({type:'OFFLINE_READY'});})());});
self.addEventListener('message',event=>{if(event.data?.type==='CHECK_READY')event.waitUntil((async()=>{const cache=await caches.open(CACHE);const ready=(await Promise.all(ASSETS.map(url=>cache.match(url)))).every(Boolean);if(ready)event.source?.postMessage({type:'OFFLINE_READY'});})());});
self.addEventListener('fetch',event=>{const url=new URL(event.request.url);if(event.request.method!=='GET'||url.origin!==self.location.origin||url.search||!ASSETS.includes(url.pathname))return;event.respondWith((async()=>{const cache=await caches.open(CACHE);const cached=await cache.match(url.pathname);if(cached)return cached;return fetch(event.request);})());});
`;
await writeFile(new URL('sw.js',root),sw);await copyFile(new URL('sw.js',root),new URL('de/sw.js',root));
await writeFile(new URL('_headers',root),`/*\n  Content-Security-Policy: default-src 'none'; script-src 'self'; style-src 'self'; font-src 'self'; img-src 'self' data: blob:; worker-src 'self'; connect-src 'none'; base-uri 'none'; form-action 'none'; object-src 'none'; frame-ancestors 'none'\n  Referrer-Policy: no-referrer\n  X-Content-Type-Options: nosniff\n/uncle-jim-generator/sw.js\n  Service-Worker-Allowed: /uncle-jim-generator\n  Content-Security-Policy: default-src 'none'; script-src 'self'; connect-src 'self'\n/de/uncle-jim-generator/sw.js\n  Service-Worker-Allowed: /de/uncle-jim-generator\n  Content-Security-Policy: default-src 'none'; script-src 'self'; connect-src 'self'\n`);
await writeFile(new URL('build-manifest.json',root),JSON.stringify({version,buildId,base:'/uncle-jim-generator/',documents:['/uncle-jim-generator/','/de/uncle-jim-generator/'],serviceWorkers:['/uncle-jim-generator/sw.js','/de/uncle-jim-generator/sw.js'],assets},null,2));
