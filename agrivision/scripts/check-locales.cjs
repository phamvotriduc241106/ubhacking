const fs = require('fs');
const path = require('path');
const root=path.join(__dirname,'../src/i18n/locales');
const locales=['en','es','zh-CN','hi','pt-BR','fr','ar','tr','de','vi'];
const reference=JSON.parse(fs.readFileSync(path.join(root,'en.json'),'utf8'));
for (const locale of locales) {
  const data=JSON.parse(fs.readFileSync(path.join(root,`${locale}.json`),'utf8'));
  const missing=Object.keys(reference).filter(k => typeof data[k] !== 'string' || !data[k].trim());
  const extra=Object.keys(data).filter(k => !(k in reference));
  if (missing.length || extra.length) throw new Error(`${locale}: missing ${missing.join(',')} extra ${extra.join(',')}`);
}
console.log(`Validated ${locales.length} dictionaries with ${Object.keys(reference).length} matching keys each.`);
