import { Controller, Get, Post, Put, Body, Param, HttpCode } from '@nestjs/common';
import { FamilyService } from './family.service';

@Controller('family')
export class FamilyController {
  constructor(private readonly familyService: FamilyService) {}

  @Get()
  @HttpCode(200)
  async getFamily() {
    const data = await this.familyService.getFamily();
    return { code: 200, msg: 'success', data };
  }

  @Post()
  @HttpCode(200)
  async createFamily(@Body() body: {
    surname: string;
    family_name: string;
    hall_name?: string | null;
    motto?: string | null;
    description?: string | null;
    origin?: string | null;
  }) {
    const data = await this.familyService.createFamily(body);
    return { code: 200, msg: '创建成功', data };
  }

  @Put(':id')
  @HttpCode(200)
  async updateFamily(@Param('id') id: string, @Body() body: {
    surname?: string;
    family_name?: string;
    hall_name?: string | null;
    motto?: string | null;
    description?: string | null;
    origin?: string | null;
  }) {
    const data = await this.familyService.updateFamily(id, body);
    return { code: 200, msg: '更新成功', data };
  }
}
