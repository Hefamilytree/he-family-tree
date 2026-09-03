import { Module } from '@nestjs/common';
import { HarmonyController } from './harmony.controller';
import { HarmonyService } from './harmony.service';

@Module({
  controllers: [HarmonyController],
  providers: [HarmonyService],
  exports: [HarmonyService],
})
export class HarmonyModule {}
