import {readFile} from 'node:fs/promises';
import {compileBlueprint} from './core.mjs';
console.log(JSON.stringify(compileBlueprint(JSON.parse(await readFile(new URL('../examples/product-contract.json',import.meta.url),'utf8'))),null,2));
