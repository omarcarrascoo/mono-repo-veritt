// One-shot: generate a missing FOP for an already-approved FAF.
//
// Use this when a FAF was approved before the "generate FOP on DISCREPANCY"
// change was deployed and is now stuck without an FOP.
//
// Usage:
//   npx ts-node scripts/backfill-fop.ts <businessId> <operationalDate YYYY-MM-DD>

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { DailyChainService } from '../src/daily-chain/daily-chain.service';
import { DailyChainRepository } from '../src/daily-chain/daily-chain.repository';

async function main() {
  const [businessId, dateStr] = process.argv.slice(2);
  if (!businessId || !dateStr) {
    console.error('Usage: npx ts-node scripts/backfill-fop.ts <businessId> <YYYY-MM-DD>');
    process.exit(1);
  }

  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  const repo = app.get(DailyChainRepository);
  const service = app.get(DailyChainService);

  const opDate = new Date(`${dateStr}T00:00:00Z`);

  const existing = await repo.findFOP(businessId, opDate);
  if (existing) {
    console.log(`FOP already exists: ${existing.id} (status=${existing.status})`);
    await app.close();
    return;
  }

  const faf = await repo.findReconciliation(businessId, opDate);
  if (!faf) {
    console.error(`No FAF found for ${businessId} on ${dateStr}`);
    await app.close();
    process.exit(1);
  }
  if (faf.status !== 'RECONCILED' && faf.status !== 'DISCREPANCY') {
    console.error(`FAF status is ${faf.status} — must be RECONCILED or DISCREPANCY to backfill FOP`);
    await app.close();
    process.exit(1);
  }

  const fop = await service.backfillFOP(businessId, opDate);

  console.log(`FOP generated: ${fop.id} (status=${fop.status})`);
  console.log('Validations:');
  for (const v of fop.validationItems) {
    console.log(`  - ${v.validationType}: ${v.isWithinThreshold ? 'OK' : 'FAIL'} (diff=${v.difference})`);
  }

  await app.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
