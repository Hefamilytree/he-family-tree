import { Controller, Get, Post, Put, Delete, Body, Param, Res, Headers, ForbiddenException } from '@nestjs/common';
import { Response } from 'express';
import { HarmonyService } from './harmony.service';
import { AuthService } from '@/auth/auth.service';
import { requireRole } from '@/common/access';

@Controller('harmony')
export class HarmonyController {
  constructor(
    private readonly harmonyService: HarmonyService,
    private readonly authService: AuthService,
  ) {}

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

  // 孝亲睦族：认证宗亲（2级）及以上可添加
  @Post()
  async create(@Body() body: any, @Headers('authorization') authorization: string, @Res() res: Response) {
    const decoded = requireRole(this.authService, authorization, 2);
    const familyId = await this.harmonyService.findFamilyId();
    const { type, activity_date, ...rest } = body;
    const data = await this.harmonyService.create({
      ...rest,
      category: body.category ?? type,
      event_date: body.event_date ?? activity_date,
      family_id: body.family_id ?? familyId,
      user_id: decoded.userId,
    });
    return res.status(200).json({ code: 200, msg: 'success', data });
  }

  // 编辑：认证宗亲可改本人发布，管理人员及以上可改全部
  @Put(':id')
  async update(@Param('id') id: string, @Body() body: any, @Headers('authorization') authorization: string, @Res() res: Response) {
    const decoded = requireRole(this.authService, authorization, 2);
    if (!['super', 'admin'].includes((decoded.role || '').toLowerCase())) {
      const list = await this.harmonyService.findByCategory(body.category || '');
      const target = (list || []).find((i: any) => i.id === id);
      if (target && target.user_id && target.user_id !== decoded.userId) {
        throw new ForbiddenException('仅可编辑本人发布的内容');
      }
    }
    const data = await this.harmonyService.update(id, body);
    return res.status(200).json({ code: 200, msg: 'success', data });
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Body() body: any, @Headers('authorization') authorization: string, @Res() res: Response) {
    const decoded = requireRole(this.authService, authorization, 2);
    if (!['super', 'admin'].includes((decoded.role || '').toLowerCase())) {
      const list = await this.harmonyService.findByCategory(body?.category || '');
      const target = (list || []).find((i: any) => i.id === id);
      if (target && target.user_id && target.user_id !== decoded.userId) {
        throw new ForbiddenException('仅可删除本人发布的内容');
      }
    }
    await this.harmonyService.remove(id);
    return res.status(200).json({ code: 200, msg: 'success', data: true });
  }
}
