import { canonicalize, CanonicalizationError } from './canonical-json';

describe('canonicalize', () => {
  describe('primitives', () => {
    it('serializes null', () => {
      expect(canonicalize(null)).toBe('null');
    });

    it('serializes booleans', () => {
      expect(canonicalize(true)).toBe('true');
      expect(canonicalize(false)).toBe('false');
    });

    it('serializes finite numbers', () => {
      expect(canonicalize(0)).toBe('0');
      expect(canonicalize(-0)).toBe('0'); // -0 normalizado
      expect(canonicalize(42)).toBe('42');
      expect(canonicalize(3.14)).toBe('3.14');
      expect(canonicalize(-7.5)).toBe('-7.5');
    });

    it('throws on non-finite numbers', () => {
      expect(() => canonicalize(NaN)).toThrow(CanonicalizationError);
      expect(() => canonicalize(Infinity)).toThrow(CanonicalizationError);
      expect(() => canonicalize(-Infinity)).toThrow(CanonicalizationError);
    });

    it('serializes strings with JSON escaping', () => {
      expect(canonicalize('hola')).toBe('"hola"');
      expect(canonicalize('a"b')).toBe('"a\\"b"');
      expect(canonicalize('linea\nnueva')).toBe('"linea\\nnueva"');
    });

    it('throws on bigint', () => {
      expect(() => canonicalize(BigInt(123))).toThrow(CanonicalizationError);
    });
  });

  describe('arrays', () => {
    it('serializes empty array', () => {
      expect(canonicalize([])).toBe('[]');
    });

    it('preserves order in arrays', () => {
      expect(canonicalize([3, 1, 2])).toBe('[3,1,2]');
    });

    it('serializes nested arrays', () => {
      expect(canonicalize([[1, 2], [3]])).toBe('[[1,2],[3]]');
    });

    it('replaces undefined/function in array with null', () => {
      const out = canonicalize([1, undefined, 2]);
      expect(out).toBe('[1,null,2]');
    });
  });

  describe('objects', () => {
    it('serializes empty object', () => {
      expect(canonicalize({})).toBe('{}');
    });

    it('sorts keys alphabetically', () => {
      const a = canonicalize({ z: 1, a: 2, m: 3 });
      const b = canonicalize({ a: 2, m: 3, z: 1 });
      expect(a).toBe(b);
      expect(a).toBe('{"a":2,"m":3,"z":1}');
    });

    it('omits undefined/function/symbol properties', () => {
      const out = canonicalize({
        a: 1,
        b: undefined,
        c: () => 1,
        d: Symbol('x'),
        e: 5,
      });
      expect(out).toBe('{"a":1,"e":5}');
    });

    it('preserves null and false', () => {
      expect(canonicalize({ a: null, b: false })).toBe('{"a":null,"b":false}');
    });

    it('handles deep nesting with sorted keys at every level', () => {
      const out = canonicalize({
        z: { y: 1, x: 2 },
        a: { b: 3 },
      });
      expect(out).toBe('{"a":{"b":3},"z":{"x":2,"y":1}}');
    });
  });

  describe('Date', () => {
    it('serializes Date as ISO string', () => {
      const d = new Date('2026-05-07T10:00:00.000Z');
      expect(canonicalize(d)).toBe('"2026-05-07T10:00:00.000Z"');
    });

    it('throws on invalid Date', () => {
      expect(() => canonicalize(new Date('invalid'))).toThrow(
        CanonicalizationError,
      );
    });
  });

  describe('toJSON support', () => {
    it('uses .toJSON when present', () => {
      const obj = {
        amount: 100,
        toJSON() {
          return { amount: 100, normalized: true };
        },
      };
      expect(canonicalize(obj)).toBe('{"amount":100,"normalized":true}');
    });

    it('handles Prisma.Decimal-like objects via toJSON', () => {
      const decimal = {
        toJSON: () => '42.5000',
      };
      expect(canonicalize(decimal)).toBe('"42.5000"');
    });
  });

  describe('determinism', () => {
    it('produces identical output for semantically identical inputs', () => {
      const input1 = {
        meta: { date: '2026-05-07', business: 'X' },
        items: [
          { id: 'a', qty: 1 },
          { id: 'b', qty: 2 },
        ],
      };
      const input2 = {
        items: [
          { qty: 1, id: 'a' },
          { qty: 2, id: 'b' },
        ],
        meta: { business: 'X', date: '2026-05-07' },
      };
      expect(canonicalize(input1)).toBe(canonicalize(input2));
    });

    it('produces same output across 100 runs', () => {
      const obj = { a: 1, b: [2, 3], c: { d: 'x' } };
      const baseline = canonicalize(obj);
      for (let i = 0; i < 100; i++) {
        expect(canonicalize(obj)).toBe(baseline);
      }
    });
  });
});
