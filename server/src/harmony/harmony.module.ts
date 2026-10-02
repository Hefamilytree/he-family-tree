import { Module } from '@nestjs/common';
import { HarmonyController } from './harmony.controller';
import { HarmonyService } from './harmony.service';
import { AuthModule } from '@/auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [HarmonyController],
  providers: [HarmonyService],
  exports: [HarmonyService],
})
export class HarmonyModule {}
