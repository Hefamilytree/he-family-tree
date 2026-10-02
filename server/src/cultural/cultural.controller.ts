import { Controller, Get, Post, Put, Delete, Body, Param, Res, Headers } from '@nestjs/common';
import { Response } from 'express';
import { CulturalService } from './cultural.service';
import { AuthService } from '@/auth/auth.service';
import { requireRole } from '@/common/access';

@Controller('cultural')
export class CulturalController {
  constructor(
    private readonly culturalService: CulturalService,
    private readonly authService: AuthService,
  ) {}

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

  // 文化传承：仅管理人员 / 主管理人员（3级及以上）可添加
  @Post()
  async create(@Body() body: any, @Headers('authorization') authorization: string, @Res() res: Response) {
    const decoded = requireRole(this.authService, authorization, 3);
    const family = await this.culturalService.findFamilyId();
    const { type, ...rest } = body;
    const data = await this.culturalService.create({
      ...rest,
      category: body.category ?? type,
      family_id: body.family_id ?? family,
      user_id: decoded.userId,
    });
    return res.status(200).json({ code: 200, msg: 'success', data });
  }

  // 编辑：管理员可改全部；其余（理论上文化板块不开放）不放行
  @Put(':id')
  async update(@Param('id') id: string, @Body() body: any, @Headers('authorization') authorization: string, @Res() res: Response) {
    requireRole(this.authService, authorization, 3);
    const data = await this.culturalService.update(id, body);
    return res.status(200).json({ code: 200, msg: 'success', data });
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Headers('authorization') authorization: string, @Res() res: Response) {
    requireRole(this.authService, authorization, 3);
    await this.culturalService.remove(id);
    return res.status(200).json({ code: 200, msg: 'success', data: true });
  }
}
