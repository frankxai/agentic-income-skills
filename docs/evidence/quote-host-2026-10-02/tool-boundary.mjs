// Evaluation-only launcher. The committed product implementation is unchanged.
import fs from 'node:fs';
import { resolve, relative, isAbsolute, dirname, sep } from 'node:path';
import { main } from './runtime/scripts/quote-desk.mjs';
const root = fs.realpathSync(process.cwd());
const pathFlags = { workspace: 'scratch', output: 'scratch', principal: 'inputs', catalog: 'inputs', request: 'inputs', draft: 'scratch', clarification: 'scratch' };
const commands = new Set(['init', 'intake', 'show', 'edit', 'clarify', 'history', 'export', 'lock']);
try {
  const args = process.argv.slice(2);
  if (!commands.has(args[0])) throw new Error('Evaluation boundary: no send, connector, credential, approval, unlock or arbitrary execution operation is available');
  for (let i = 1; i < args.length; i += 2) {
    if (!args[i]?.startsWith('--') || !args[i+1] || args[i+1].startsWith('--')) throw new Error('Evaluation boundary: expected explicit option/value pairs');
    const flag = args[i].slice(2);
    if (!Object.hasOwn(pathFlags, flag)) continue;
    const target = resolve(root, args[i+1]);
    const scope = resolve(root, pathFlags[flag]);
    const rel = relative(scope, target);
    if (!rel || rel === '..' || rel.startsWith('..' + sep) || isAbsolute(rel)) throw new Error('Evaluation boundary: path must be strictly inside ' + pathFlags[flag]);
    let cursor = target;
    while (cursor !== root) {
      if (fs.existsSync(cursor) || (() => { try { fs.lstatSync(cursor); return true; } catch { return false; } })()) {
        if (fs.lstatSync(cursor).isSymbolicLink() || fs.realpathSync(cursor) !== cursor) throw new Error('Evaluation boundary: linked or nonordinary path refused');
      }
      const parent = dirname(cursor);
      if (parent === cursor) throw new Error('Evaluation boundary: unresolved root');
      cursor = parent;
    }
  }
  console.log(JSON.stringify(main(args), null, 2));
} catch (error) {
  console.error('[quote-host-eval] ' + error.message);
  process.exitCode = 1;
}
