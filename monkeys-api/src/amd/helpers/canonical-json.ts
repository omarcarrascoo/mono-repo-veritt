// ── Canonical JSON (RFC 8785 / JCS) ──────────────────────────────────
// Serializa cualquier valor a una representacion deterministica:
// - Claves de objetos en orden alfabetico
// - Sin espacios innecesarios
// - Numbers en notacion JSON estandar (sin '+', sin trailing zeros raros)
// - Strings con escape conservador (solo lo que JSON.stringify ya hace)
// - undefined/funciones se omiten en objetos
// - null/booleans/arrays se serializan como JSON normal
//
// El proposito: hash inmutable. El mismo objeto produce el mismo string,
// independiente de en que motor JS o que orden de propiedades llegue.
//
// Documentado en INVENTORY_COSTING.md decision 1.

const NUMBER_PRECISION = 1e-15;

export class CanonicalizationError extends Error {
  constructor(message: string) {
    super(`CanonicalizationError: ${message}`);
    this.name = 'CanonicalizationError';
  }
}

/**
 * Serializa `value` a un string JSON canonico determinista.
 *
 * Reglas:
 * - Objects: claves ordenadas alfabeticamente; undefined y functions se omiten
 * - Arrays: orden preservado (es semantica del array)
 * - Numbers: deben ser finitos. NaN, Infinity, -Infinity → throw
 * - BigInt: no soportado → throw (usar string explicito si se necesita)
 * - Date: se serializa como ISO string. Caller debe convertir explicitamente
 *   si quiere otro formato — el canonicalizer no decide formato de date
 * - Decimal-like (objetos con toString): se convierten a string si tienen
 *   `.toString` y no son objetos planos
 * - Symbols: ignorados como JSON.stringify
 *
 * Esta implementacion sigue RFC 8785 simplificado: cubre los casos que
 * el AMD necesita (numbers, strings, booleans, null, arrays, objects).
 */
export function canonicalize(value: unknown): string {
  return serialize(value);
}

function serialize(value: unknown): string {
  if (value === null) return 'null';

  switch (typeof value) {
    case 'boolean':
      return value ? 'true' : 'false';

    case 'number':
      return serializeNumber(value);

    case 'bigint':
      throw new CanonicalizationError(
        'BigInt no soportado. Convierte a string explicitamente.',
      );

    case 'string':
      return JSON.stringify(value);

    case 'undefined':
    case 'function':
    case 'symbol':
      // Se manejan en serializeObject (omitidos). Aqui no deberian llegar
      // como root — devolvemos null para mantener determinismo.
      throw new CanonicalizationError(
        `Tipo no serializable como root: ${typeof value}`,
      );

    case 'object':
      // Date → ISO string canonico
      if (value instanceof Date) {
        if (Number.isNaN(value.getTime())) {
          throw new CanonicalizationError('Date invalida');
        }
        return JSON.stringify(value.toISOString());
      }
      if (Array.isArray(value)) return serializeArray(value);
      // Objetos custom con toJSON (e.g. Prisma.Decimal) — respetamos
      const maybeToJSON = (value as { toJSON?: () => unknown }).toJSON;
      if (typeof maybeToJSON === 'function') {
        return serialize(maybeToJSON.call(value));
      }
      return serializeObject(value as Record<string, unknown>);

    default:
      throw new CanonicalizationError(`Tipo desconocido: ${typeof value}`);
  }
}

function serializeNumber(n: number): string {
  if (!Number.isFinite(n)) {
    throw new CanonicalizationError(
      `Number no finito (${n}). Usa null o un string explicito si necesitas representar ausencia.`,
    );
  }
  // -0 → 0 (JSON treats them the same; canonical preference is "0")
  if (Object.is(n, -0)) return '0';
  // Para integers (incluso muy grandes dentro del rango safe), JS imprime
  // sin notacion cientifica. Para floats, JSON.stringify ya da la
  // representacion canonica (sin trailing zeros, etc).
  // Caso especial: numeros muy cerca de cero por imprecision.
  if (Math.abs(n) < NUMBER_PRECISION) return '0';
  return JSON.stringify(n);
}

function serializeArray(arr: unknown[]): string {
  const parts: string[] = [];
  for (const item of arr) {
    // En arrays, undefined/function/symbol se serializan como null
    // (mismo comportamiento que JSON.stringify) para mantener indices.
    if (
      item === undefined ||
      typeof item === 'function' ||
      typeof item === 'symbol'
    ) {
      parts.push('null');
    } else {
      parts.push(serialize(item));
    }
  }
  return `[${parts.join(',')}]`;
}

function serializeObject(obj: Record<string, unknown>): string {
  const keys = Object.keys(obj).sort();
  const parts: string[] = [];

  for (const key of keys) {
    const v = obj[key];
    // Omit propiedades undefined/function/symbol (igual que JSON.stringify)
    if (
      v === undefined ||
      typeof v === 'function' ||
      typeof v === 'symbol'
    ) {
      continue;
    }
    parts.push(`${JSON.stringify(key)}:${serialize(v)}`);
  }

  return `{${parts.join(',')}}`;
}
