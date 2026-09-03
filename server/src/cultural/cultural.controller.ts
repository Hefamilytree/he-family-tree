import { Controller, Get, Post, Put, Delete, Body, Param, Res, Query } from '@nestjs/common';
import { Response } from 'express';
import { CulturalService } from './cultural.service';

@Controller('cultural')
export class CulturalController {
  constructor(private readonly culturalService: CulturalService) {}

  @Get()
  async findAll(@Res() res: Response) {
    const data = await this.culturalService.findAll();
    return res.status(200).json({ code: 200, msg: 'success', data });
  }

  @Get('category/:category')
  async findByCategory(@Param('category') category: string, @Res() res: Response) {
    const data = await this.culturalService.findByCategory(category);
    return res.status(200).json({ code: 200, msg: 'success', data });
  }

  @Post()
  async create(@Body() body: any, @Res() res: Response) {
    const data = await this.culturalService.create(body);
    return res.status(200).json({ code: 200, msg: 'success', data });
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: any, @Res() res: Response) {
    const data = await this.culturalService.update(id, body);
    return res.status(200).json({ code: 200, msg: 'success', data });
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Res() res: Response) {
    await this.culturalService.remove(id);
    return res.status(200).json({ code: 200, msg: 'success', data: true });
  }
}
