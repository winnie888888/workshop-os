import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export async function resolve(spec, ctx, next) {
  if ((spec.startsWith('./') || spec.startsWith('../')) && !/\.[a-zA-Z]+$/.test(spec)) {
    const base = new URL(spec, ctx.parentURL);
    for (const cand of [base.href + '.ts', base.href + '/index.ts']) {
      if (existsSync(fileURLToPath(cand))) return { url: cand, shortCircuit: true };
    }
  }
  return next(spec, ctx);
}
