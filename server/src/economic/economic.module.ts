import { Module } from '@nestjs/common';
import { EconomicController } from './economic.controller';
import { EconomicService } from './economic.service';

@Module({
  controllers: [EconomicController],
  providers: [EconomicService],
  exports: [EconomicService],
})
export class EconomicModule {}
