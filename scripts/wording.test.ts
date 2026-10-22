import { describe, expect, it } from 'vitest';
import { findHits } from './wording';

describe('wording guard', () => {
  it.each([
    'Demo',
    'demo mode',
    'DEMO',
    'a demonstration',
    'recorded-demo.json',
    'dema',
    'w demie',
    'z demem',
    'do demu',
    'kilka dem',
    'w demach',
    'demom',
    'z demami',
    'Dema i demo',
  ])('flags %s', (text) => {
    expect(findHits('f', text).length).toBeGreaterThanOrEqual(1);
  });

  it.each([
    'demographic data',
    'democracy',
    'democratic',
    'demand',
    'academic',
    'pandemia',
    'Recorded run',
  ])('allows %s', (text) => {
    expect(findHits('f', text)).toHaveLength(0);
  });

  it('reports file, line and an excerpt', () => {
    expect(findHits('README.md', 'ok\nsee the demo here')).toEqual([
      { file: 'README.md', line: 2, excerpt: 'see the demo here' },
    ]);
  });
});
