import { Module } from '@nestjs/common';
import { BirthdaysService } from './birthdays.service';
import { BirthdaysController } from './birthdays.controller';
import { AuthModule } from '@/auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [BirthdaysController],
  providers: [BirthdaysService],
})
export class BirthdaysModule {}
