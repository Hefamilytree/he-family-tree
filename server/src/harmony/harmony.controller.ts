import { Controller, Get, Post, Put, Delete, Body, Param, Res } from '@nestjs/common';
import { Response } from 'express';
import { HarmonyService } from './harmony.service';

@Controller('harmony')
export class HarmonyController {
  constructor(private readonly harmonyService: HarmonyService) {}

  @Get()
  async findAll(@Res() res: Response) {
    const data = await this.harmonyService.findAll();
    return res.status(200).json({ code: 200, msg: 'success', data });
  }

  @Get('category/:category')
  async findByCategory(@Param('category') category: string, @Res() res: Response) {
    const data = await this.harmonyService.findByCategory(category);
    return res.status(200).json({ code: 200, msg: 'success', data });
  }

  @Post()
  async create(@Body() body: any, @Res() res: Response) {
    const data = await this.harmonyService.create(body);
    return res.status(200).json({ code: 200, msg: 'success', data });
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: any, @Res() res: Response) {
    const data = await this.harmonyService.update(id, body);
    return res.status(200).json({ code: 200, msg: 'success', data });
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Res() res: Response) {
    await this.harmonyService.remove(id);
    return res.status(200).json({ code: 200, msg: 'success', data: true });
  }
}
