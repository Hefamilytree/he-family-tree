import { Module } from '@nestjs/common';
import { FamilyApplyController } from './family-apply.controller';
import { FamilyApplyService } from './family-apply.service';

@Module({
  controllers: [FamilyApplyController],
  providers: [FamilyApplyService],
})
export class FamilyApplyModule {}