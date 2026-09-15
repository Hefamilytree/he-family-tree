import { Controller, Get, Query } from '@nestjs/common';
import { ContactsService } from './contacts.service';

@Controller('contacts')
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  // GET /api/contacts/directory 通讯录（自动聚合已认证宗亲）
  @Get('directory')
  directory() {
    return this.contactsService.directory();
  }

  // GET /api/contacts/nearby?keyword= 附近宗亲（按现居住地聚合）
  @Get('nearby')
  nearby(@Query('keyword') keyword: string) {
    return this.contactsService.nearby(keyword);
  }
}
