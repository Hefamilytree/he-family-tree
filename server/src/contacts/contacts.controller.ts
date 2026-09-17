import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { ContactsService } from './contacts.service';

@Controller('contacts')
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  // GET /api/contacts/directory 通讯录（自动认证 + 手动维护）
  @Get('directory')
  async directory(@Res() res: Response) {
    const result = await this.contactsService.directory();
    return res.status(200).json(result);
  }

  // GET /api/contacts/nearby?keyword= 附近宗亲（按现居住地聚合）
  @Get('nearby')
  async nearby(@Query('keyword') keyword: string, @Res() res: Response) {
    const result = await this.contactsService.nearby(keyword);
    return res.status(200).json(result);
  }

  // POST /api/contacts 手动新建联系人
  @Post()
  async create(@Body() body: any, @Res() res: Response) {
    const result = await this.contactsService.create(body);
    return res.status(200).json(result);
  }

  // PUT /api/contacts/:id 手动修改联系人（仅手动条目）
  @Put(':id')
  async update(@Param('id') id: string, @Body() body: any, @Res() res: Response) {
    const result = await this.contactsService.update(id, body);
    return res.status(200).json(result);
    }

  // DELETE /api/contacts/:id 删除手动联系人
  @Delete(':id')
  async remove(@Param('id') id: string, @Res() res: Response) {
    const result = await this.contactsService.remove(id);
    return res.status(200).json(result);
  }
}
