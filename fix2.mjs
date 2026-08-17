import { readFileSync, writeFileSync } from 'node:fs';
const f = 'C:\\ai项目\\dsh-memory\\src\\index.ts';
let c = readFileSync(f, 'utf8');
// Fix: line 632 ends with .; but should end with .`;
c = c.replace('re-ground yourself.;', 're-ground yourself.`;');
writeFileSync(f, c);
console.log('Fixed PROTOCOL_SECTION closing backtick');
