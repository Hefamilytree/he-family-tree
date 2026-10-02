import { Module } from '@nestjs/common';
import { EconomicController } from './economic.controller';
import { EconomicService } from './economic.service';
import { AuthModule } from '@/auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [EconomicController],
  providers: [EconomicService],
  exports: [EconomicService],
})
export class EconomicModule {}
