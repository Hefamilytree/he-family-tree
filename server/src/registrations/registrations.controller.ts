import { Controller, Get, Post, Delete, Body, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { RegistrationsService } from './registrations.service';

@Controller('registrations')
export class RegistrationsController {
  constructor(private readonly registrationsService: RegistrationsService) {}

  @Get()
  async findByActivity(@Query('activityId') activityId: string) {
    const data = await this.registrationsService.findByActivity(activityId);
    return { code: 200, msg: 'success', data };
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  async create(@Body() body: { activityId: string; userId: string; memberName: string; phone: string; note?: string }) {
    const data = await this.registrationsService.create(body.activityId, body.userId, body.memberName, body.phone, body.note);
    return { code: 200, msg: '报名成功', data };
  }

  @Delete()
  async delete(@Query('id') id: string) {
    const data = await this.registrationsService.delete(id);
    return { code: 200, msg: 'success', data };
  }
}
