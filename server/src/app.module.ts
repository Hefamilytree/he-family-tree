import { Module } from '@nestjs/common';
import { AppController } from '@/app.controller';
import { AppService } from '@/app.service';
import { AuthModule } from '@/auth/auth.module';
import { FamilyModule } from '@/family/family.module';
import { MembersModule } from '@/members/members.module';
import { CulturalModule } from '@/cultural/cultural.module';
import { HarmonyModule } from '@/harmony/harmony.module';
import { EconomicModule } from '@/economic/economic.module';
import { CommentsModule } from '@/comments/comments.module';
import { RegistrationsModule } from '@/registrations/registrations.module';
import { SpousesModule } from '@/spouses/spouses.module';
import { UploadModule } from '@/upload/upload.module';
import { PdfModule } from './pdf/pdf.module';
import { ContactsModule } from './contacts/contacts.module';
import { FamilyApplyModule } from './family-apply/family-apply.module';
import { BirthdaysModule } from './birthdays/birthdays.module';
import { MemberMigrationsModule } from '@/member-migrations/member-migrations.module';

@Module({
  imports: [AuthModule, FamilyModule, MembersModule, CulturalModule, HarmonyModule, EconomicModule,
    UploadModule, CommentsModule, RegistrationsModule, SpousesModule, PdfModule, ContactsModule, FamilyApplyModule, BirthdaysModule, MemberMigrationsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
