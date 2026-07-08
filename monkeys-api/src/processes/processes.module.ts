import { Module } from '@nestjs/common';
import { ProcessesController } from './processes.controller';
import { ProcessesService } from './processes.service';
import { ProcessesRepository } from './processes.repository';

@Module({
  controllers: [ProcessesController],
  providers: [ProcessesService, ProcessesRepository],
  exports: [ProcessesService, ProcessesRepository],
})
export class ProcessesModule {}
