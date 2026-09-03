import { Module } from '@nestjs/common';
import { AppController } from '@/app.controller';
import { AppService } from '@/app.service';
import { FamilyModule } from '@/family/family.module';
import { MembersModule } from '@/members/members.module';
import { CulturalModule } from '@/cultural/cultural.module';
import { HarmonyModule } from '@/harmony/harmony.module';
import { EconomicModule } from '@/economic/economic.module';

@Module({
  imports: [FamilyModule, MembersModule, CulturalModule, HarmonyModule, EconomicModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
