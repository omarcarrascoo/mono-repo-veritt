import { computeAmdHash, verifyAmdHash } from './amd-hash';

describe('amd-hash', () => {
  it('computes 64-char hex hash', () => {
    const hash = computeAmdHash({ a: 1 });
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('produces same hash for same content', () => {
    const a = computeAmdHash({ a: 1, b: [2, 3] });
    const b = computeAmdHash({ a: 1, b: [2, 3] });
    expect(a).toBe(b);
  });

  it('produces same hash regardless of key order', () => {
    const a = computeAmdHash({ a: 1, b: 2 });
    const b = computeAmdHash({ b: 2, a: 1 });
    expect(a).toBe(b);
  });

  it('produces different hash for different content', () => {
    const a = computeAmdHash({ a: 1 });
    const b = computeAmdHash({ a: 2 });
    expect(a).not.toBe(b);
  });

  describe('verifyAmdHash', () => {
    it('returns valid=true when hash matches', () => {
      const content = { foo: 'bar' };
      const hash = computeAmdHash(content);
      const result = verifyAmdHash(content, hash);
      expect(result.valid).toBe(true);
      expect(result.computedHash).toBe(hash);
    });

    it('returns valid=false when content modified', () => {
      const original = { foo: 'bar' };
      const hash = computeAmdHash(original);
      const modified = { foo: 'baz' };
      const result = verifyAmdHash(modified, hash);
      expect(result.valid).toBe(false);
      expect(result.computedHash).not.toBe(hash);
    });

    it('detects nested field tampering', () => {
      const original = {
        meta: { date: '2026-05-07' },
        sales: { total: 1000 },
      };
      const hash = computeAmdHash(original);

      const tampered = JSON.parse(JSON.stringify(original));
      tampered.sales.total = 1001; // 1 peso de diferencia
      const result = verifyAmdHash(tampered, hash);
      expect(result.valid).toBe(false);
    });
  });
});
