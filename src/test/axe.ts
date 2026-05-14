import axe, { type AxeResults, type RunOptions } from 'axe-core';
import { expect } from 'vitest';

/**
 * Wrapper minimal para correr axe-core contra un container y obtener
 * violations. Si hay violations, falla con un mensaje legible.
 */
export async function expectNoAxeViolations(
  container: Element,
  options?: RunOptions,
): Promise<AxeResults> {
  const results = await axe.run(container, {
    // Reglas que tienen falsos positivos en jsdom o que no aplican en
    // contextos aislados (sin <html>/<head> completos).
    rules: {
      'document-title': { enabled: false },
      'html-has-lang': { enabled: false },
      'landmark-one-main': { enabled: false },
      region: { enabled: false },
      ...(options?.rules ?? {}),
    },
    ...options,
  });
  if (results.violations.length > 0) {
    const summary = results.violations
      .map(
        (v) =>
          `[${v.impact}] ${v.id}: ${v.description}\n  nodes: ${v.nodes
            .map((n) => n.target.join(','))
            .join(' | ')}`,
      )
      .join('\n');
    throw new Error(`Axe violations:\n${summary}`);
  }
  expect(results.violations.length).toBe(0);
  return results;
}
