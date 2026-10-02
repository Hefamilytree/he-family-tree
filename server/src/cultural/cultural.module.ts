import { Module } from '@nestjs/common';
import { CulturalController } from './cultural.controller';
import { CulturalService } from './cultural.service';
import { AuthModule } from '@/auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [CulturalController],
  providers: [CulturalService],
  exports: [CulturalService],
})
export class CulturalModule {}
