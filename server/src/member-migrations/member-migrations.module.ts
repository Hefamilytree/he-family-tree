import { Module } from '@nestjs/common';
import { MemberMigrationsService } from './member-migrations.service';
import { MemberMigrationsController } from './member-migrations.controller';
import { AuthModule } from '@/auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [MemberMigrationsController],
  providers: [MemberMigrationsService],
  exports: [MemberMigrationsService],
})
export class MemberMigrationsModule {}