import { Module } from '@nestjs/common';
import { AppController } from '@/app.controller';
import { AppService } from '@/app.service';
import { FamilyModule } from '@/family/family.module';
import { MembersModule } from '@/members/members.module';

@Module({
  imports: [FamilyModule, MembersModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
