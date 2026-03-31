const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'assets', 'js', 'modules', 'ai-chat.js');
const src = fs.readFileSync(file, 'utf8');

const checks = [
  { ok: src.includes('DOMPurify.sanitize'), msg: 'DOMPurify sanitize tidak ditemukan' },
  { ok: src.includes('FORBID_TAGS'), msg: 'Konfigurasi FORBID_TAGS tidak ditemukan' },
  { ok: !src.includes(".replace(/&lt;b&gt;"), msg: 'Whitelist regex lama masih ada' }
];

const failed = checks.filter(c => !c.ok);
if (failed.length) {
  failed.forEach(f => console.error(`[FAIL] ${f.msg}`));
  process.exit(1);
}
console.log('xss_policy_check: OK');
