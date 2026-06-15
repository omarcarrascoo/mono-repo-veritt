import {
  filterActive,
  filterByLocation,
  fifoFloorUnitCost,
  quoteFifoConsumption,
  sortFifo,
  totalRemaining,
  totalValueAtCost,
  weightedAverage,
  type OpenLot,
} from './lot-costing.helpers';

const lot = (
  id: string,
  remainingQuantity: number,
  unitCost: number,
  receivedAt: string,
  locationId?: string,
): OpenLot => ({
  id,
  remainingQuantity,
  unitCost,
  receivedAt: new Date(receivedAt),
  locationId,
});

describe('lot-costing.helpers', () => {
  describe('weightedAverage', () => {
    it('returns 0 for empty input', () => {
      expect(weightedAverage([])).toBe(0);
    });

    it('returns 0 when all lots are exhausted', () => {
      expect(
        weightedAverage([
          lot('a', 0, 30, '2026-01-01'),
          lot('b', 0, 50, '2026-01-02'),
        ]),
      ).toBe(0);
    });

    it('computes weighted average over active lots', () => {
      expect(
        weightedAverage([
          lot('a', 10, 30, '2026-01-01'),
          lot('b', 10, 50, '2026-01-02'),
        ]),
      ).toBe(40);
    });

    it('weights by quantity, not by lot count', () => {
      // 9*30 + 1*50 = 320 / 10 = 32
      expect(
        weightedAverage([
          lot('a', 9, 30, '2026-01-01'),
          lot('b', 1, 50, '2026-01-02'),
        ]),
      ).toBe(32);
    });

    it('ignores exhausted lots in mixed input', () => {
      expect(
        weightedAverage([
          lot('a', 0, 30, '2026-01-01'),
          lot('b', 5, 50, '2026-01-02'),
        ]),
      ).toBe(50);
    });
  });

  describe('fifoFloorUnitCost', () => {
    it('returns null for empty input', () => {
      expect(fifoFloorUnitCost([])).toBeNull();
    });

    it('returns null when all lots are exhausted', () => {
      expect(
        fifoFloorUnitCost([lot('a', 0, 30, '2026-01-01')]),
      ).toBeNull();
    });

    it('returns oldest active lot unit cost', () => {
      expect(
        fifoFloorUnitCost([
          lot('b', 10, 50, '2026-01-02'),
          lot('a', 10, 30, '2026-01-01'),
        ]),
      ).toBe(30);
    });

    it('skips exhausted older lots', () => {
      expect(
        fifoFloorUnitCost([
          lot('a', 0, 30, '2026-01-01'),
          lot('b', 5, 50, '2026-01-02'),
        ]),
      ).toBe(50);
    });
  });

  describe('quoteFifoConsumption', () => {
    it('returns empty quote for qty <= 0', () => {
      const q = quoteFifoConsumption(
        [lot('a', 10, 30, '2026-01-01')],
        0,
      );
      expect(q.layers).toHaveLength(0);
      expect(q.totalCost).toBe(0);
      expect(q.shortfall).toBe(0);
      expect(q.coveredQuantity).toBe(0);
    });

    it('returns empty quote for non-finite qty', () => {
      const q = quoteFifoConsumption(
        [lot('a', 10, 30, '2026-01-01')],
        NaN,
      );
      expect(q.layers).toHaveLength(0);
    });

    it('consumes from oldest lot only when qty fits', () => {
      const q = quoteFifoConsumption(
        [
          lot('a', 10, 30, '2026-01-01'),
          lot('b', 10, 50, '2026-01-02'),
        ],
        5,
      );
      expect(q.layers).toEqual([
        { lotId: 'a', quantity: 5, unitCost: 30, totalCost: 150 },
      ]);
      expect(q.totalCost).toBe(150);
      expect(q.unitCost).toBe(30);
      expect(q.coveredQuantity).toBe(5);
      expect(q.shortfall).toBe(0);
    });

    it('crosses lots when qty exceeds first lot', () => {
      const q = quoteFifoConsumption(
        [
          lot('a', 10, 30, '2026-01-01'),
          lot('b', 10, 50, '2026-01-02'),
        ],
        15,
      );
      expect(q.layers).toEqual([
        { lotId: 'a', quantity: 10, unitCost: 30, totalCost: 300 },
        { lotId: 'b', quantity: 5, unitCost: 50, totalCost: 250 },
      ]);
      expect(q.totalCost).toBe(550);
      // 550 / 15 = 36.6667
      expect(q.unitCost).toBe(36.6667);
      expect(q.coveredQuantity).toBe(15);
      expect(q.shortfall).toBe(0);
    });

    it('reports shortfall when qty exceeds total available', () => {
      const q = quoteFifoConsumption(
        [
          lot('a', 10, 30, '2026-01-01'),
          lot('b', 5, 50, '2026-01-02'),
        ],
        20,
      );
      expect(q.coveredQuantity).toBe(15);
      expect(q.shortfall).toBe(5);
      expect(q.totalCost).toBe(550); // 10*30 + 5*50
      expect(q.layers).toHaveLength(2);
    });

    it('reports full shortfall when no lots active', () => {
      const q = quoteFifoConsumption(
        [lot('a', 0, 30, '2026-01-01')],
        5,
      );
      expect(q.coveredQuantity).toBe(0);
      expect(q.shortfall).toBe(5);
      expect(q.layers).toHaveLength(0);
      expect(q.totalCost).toBe(0);
      expect(q.unitCost).toBe(0);
    });

    it('orders by receivedAt, ignoring input order', () => {
      const q = quoteFifoConsumption(
        [
          lot('b', 10, 50, '2026-01-02'),
          lot('a', 10, 30, '2026-01-01'),
        ],
        5,
      );
      expect(q.layers[0].lotId).toBe('a');
      expect(q.layers[0].unitCost).toBe(30);
    });

    it('uses id as deterministic tie-breaker for same receivedAt', () => {
      const q = quoteFifoConsumption(
        [
          lot('z', 10, 50, '2026-01-01'),
          lot('a', 10, 30, '2026-01-01'),
        ],
        5,
      );
      expect(q.layers[0].lotId).toBe('a');
    });
  });

  describe('sortFifo', () => {
    it('does not mutate input', () => {
      const lots = [
        lot('b', 10, 50, '2026-01-02'),
        lot('a', 10, 30, '2026-01-01'),
      ];
      const before = lots.map((l) => l.id).join(',');
      sortFifo(lots);
      const after = lots.map((l) => l.id).join(',');
      expect(before).toBe(after);
    });
  });

  describe('filterByLocation', () => {
    it('filters to a single location', () => {
      const lots = [
        lot('a', 10, 30, '2026-01-01', 'loc-1'),
        lot('b', 10, 50, '2026-01-02', 'loc-2'),
        lot('c', 10, 40, '2026-01-03', 'loc-1'),
      ];
      const filtered = filterByLocation(lots, 'loc-1');
      expect(filtered.map((l) => l.id)).toEqual(['a', 'c']);
    });
  });

  describe('filterActive', () => {
    it('removes lots with effectively zero remaining', () => {
      const lots = [
        lot('a', 10, 30, '2026-01-01'),
        lot('b', 0, 50, '2026-01-02'),
        lot('c', 0.0001, 40, '2026-01-03'), // below epsilon
      ];
      const active = filterActive(lots);
      expect(active.map((l) => l.id)).toEqual(['a']);
    });
  });

  describe('totalRemaining + totalValueAtCost', () => {
    it('totals quantity and value over active lots', () => {
      const lots = [
        lot('a', 10, 30, '2026-01-01'),
        lot('b', 5, 50, '2026-01-02'),
        lot('c', 0, 99, '2026-01-03'),
      ];
      expect(totalRemaining(lots)).toBe(15);
      expect(totalValueAtCost(lots)).toBe(550);
    });

    it('returns zero for empty/exhausted', () => {
      expect(totalRemaining([])).toBe(0);
      expect(totalValueAtCost([])).toBe(0);
    });
  });
});
