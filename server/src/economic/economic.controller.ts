import { Controller, Get, Post, Put, Delete, Body, Param, Res } from '@nestjs/common';
import { Response } from 'express';
import { EconomicService } from './economic.service';

@Controller('economic')
export class EconomicController {
  constructor(private readonly economicService: EconomicService) {}

  @Get()
  async findAll(@Res() res: Response) {
    const data = await this.economicService.findAll();
    return res.status(200).json({ code: 200, msg: 'success', data });
  }

  @Get('category/:category')
  async findByCategory(@Param('category') category: string, @Res() res: Response) {
    const data = await this.economicService.findByCategory(category);
    return res.status(200).json({ code: 200, msg: 'success', data });
  }

  @Post()
  async create(@Body() body: any, @Res() res: Response) {
    const data = await this.economicService.create(body);
    return res.status(200).json({ code: 200, msg: 'success', data });
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: any, @Res() res: Response) {
    const data = await this.economicService.update(id, body);
    return res.status(200).json({ code: 200, msg: 'success', data });
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Res() res: Response) {
    await this.economicService.remove(id);
    return res.status(200).json({ code: 200, msg: 'success', data: true });
  }
}
