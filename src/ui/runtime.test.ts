import { describe, expect, it } from 'vitest';
import { appMode, isEmbed } from './runtime';

describe('isEmbed', () => {
  it.each([
    ['?embed=1', true],
    ['?embed=true', true],
    ['?foo=bar&embed=1', true],
    ['', false],
    ['?embed=0', false],
    ['?embed', false],
  ])('%j → %s', (search, expected) => {
    expect(isEmbed(search)).toBe(expected);
  });
});

describe('appMode', () => {
  it('is live only for the live Vite mode', () => {
    expect(appMode('live')).toBe('live');
    expect(appMode('production')).toBe('recorded');
    expect(appMode('development')).toBe('recorded');
  });
});
