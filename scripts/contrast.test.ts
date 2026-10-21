/**
 * WCAG 2.x AA contrast for every text/background pair the UI uses, computed
 * from src/styles/tokens.css itself — so a brand swap (T-03) that breaks
 * contrast fails the suite instead of shipping.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync(new URL('../src/styles/tokens.css', import.meta.url), 'utf8');

function token(name: string): string {
  const match = new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})\\s*;`).exec(css);
  if (!match?.[1]) throw new Error(`token --${name} is not a 6-digit hex colour`);
  return match[1];
}

function luminance(hex: string): number {
  const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r, g, b] = channels.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
}

describe('contrast helper', () => {
  // Reference values from the WCAG definition.
  it('gives 21:1 for black on white and 1:1 for equal colours', () => {
    expect(contrast('#000000', '#ffffff')).toBeCloseTo(21, 5);
    expect(contrast('#777777', '#777777')).toBe(1);
  });
});

describe('design tokens meet WCAG AA (4.5:1 for body text)', () => {
  const backgrounds = ['color-bg', 'color-surface', 'color-surface-raised'];
  const foregrounds = [
    'color-text',
    'color-text-muted',
    'color-accent',
    'color-warning',
    'color-error',
  ];

  it.each(foregrounds.flatMap((fg) => backgrounds.map((bg) => [fg, bg] as const)))(
    '%s on %s',
    (fg, bg) => {
      expect(contrast(token(fg), token(bg))).toBeGreaterThanOrEqual(4.5);
    },
  );

  it('button text on the accent colour', () => {
    expect(contrast(token('color-accent-contrast'), token('color-accent'))).toBeGreaterThanOrEqual(
      4.5,
    );
  });
});
