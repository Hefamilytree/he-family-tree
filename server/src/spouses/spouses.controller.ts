import { Controller, Get, Post, Put, Delete, Body, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { SpousesService } from './spouses.service';

@Controller('spouses')
export class SpousesController {
  constructor(private readonly spousesService: SpousesService) {}

  @Get()
  async findByMember(@Query('memberId') memberId: string) {
    const data = await this.spousesService.findByMember(memberId);
    return { code: 200, msg: 'success', data };
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  async create(@Body() body: { memberId: string; name: string; status: string; birthDate?: string; deathDate?: string }) {
    const data = await this.spousesService.create(body.memberId, body.name, body.status, body.birthDate, body.deathDate);
    return { code: 200, msg: '添加成功', data };
  }

  @Put()
  async update(@Body() body: { id: string; name?: string; status?: string; birthDate?: string; deathDate?: string }) {
    const data = await this.spousesService.update(body.id, {
      name: body.name,
      status: body.status,
      birth_date: body.birthDate,
      death_date: body.deathDate,
    });
    return { code: 200, msg: '更新成功', data };
  }

  @Delete()
  async delete(@Query('id') id: string) {
    const data = await this.spousesService.delete(id);
    return { code: 200, msg: 'success', data };
  }
}
