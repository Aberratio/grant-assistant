/**
 * WCAG 2.x AA contrast for every text/background pair the UI uses, computed
 * from src/styles/tokens.css itself — so a brand change that breaks contrast
 * fails the suite instead of shipping.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync(new URL('../src/styles/tokens.css', import.meta.url), 'utf8');

/**
 * Dark-theme value of a token: its first definition in the file (the :root block,
 * not the [data-theme='paper'] overrides further down), following var(--x) chains
 * to a 6-digit hex colour.
 */
function token(name: string, depth = 0): string {
  const value = new RegExp(`--${name}:\\s*([^;]+);`).exec(css)?.[1]?.trim();
  if (!value) throw new Error(`token --${name} not found`);
  if (/^#[0-9a-fA-F]{6}$/.test(value)) return value;
  const ref = /^var\(--([a-z0-9-]+)\)$/.exec(value)?.[1];
  if (!ref || depth > 5) throw new Error(`token --${name} is not a hex colour: ${value}`);
  return token(ref, depth + 1);
}

function luminance(hex: string): number {
  const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r, g, b] = channels.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
}

describe('contrast helper', () => {
  // Reference values from the WCAG definition.
  it('gives 21:1 for black on white and 1:1 for equal colours', () => {
    expect(contrast('#000000', '#ffffff')).toBeCloseTo(21, 5);
    expect(contrast('#777777', '#777777')).toBe(1);
  });

  it('resolves var() chains to the dark-theme hex value', () => {
    expect(token('color-bg')).toMatch(/^#[0-9a-f]{6}$/i);
    expect(token('color-text')).not.toBe(token('paper-0'));
  });
});

describe('design tokens meet WCAG AA (4.5:1 for body text)', () => {
  const backgrounds = ['color-bg', 'color-surface', 'color-surface-raised'];
  const foregrounds = [
    'color-text',
    'color-text-muted',
    'color-accent',
    'color-accent-2',
    'color-success',
    'color-warning',
    'color-danger',
  ];

  it.each(foregrounds.flatMap((fg) => backgrounds.map((bg) => [fg, bg] as const)))(
    '%s on %s',
    (fg, bg) => {
      expect(contrast(token(fg), token(bg))).toBeGreaterThanOrEqual(4.5);
    },
  );

  it.each(['color-accent', 'color-accent-hover'])('button text on %s', (bg) => {
    expect(contrast(token('color-on-accent'), token(bg))).toBeGreaterThanOrEqual(4.5);
  });
});
