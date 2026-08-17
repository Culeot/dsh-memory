import { readFileSync, writeFileSync } from 'node:fs';
const f = 'C:\\ai项目\\dsh-memory\\src\\index.ts';
let c = readFileSync(f, 'utf8');
c = c.replace('`DomainFacility.open`', '"DomainFacility.open"');
writeFileSync(f, c);
console.log('Fixed backtick in comment');
