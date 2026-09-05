import { Module } from '@nestjs/common';
import { SpousesService } from './spouses.service';
import { SpousesController } from './spouses.controller';

@Module({
  controllers: [SpousesController],
  providers: [SpousesService],
  exports: [SpousesService],
})
export class SpousesModule {}
