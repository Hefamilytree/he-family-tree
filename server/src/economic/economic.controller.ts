import { Controller, Get, Post, Put, Delete, Body, Param, Res, Headers, ForbiddenException } from '@nestjs/common';
import { Response } from 'express';
import { EconomicService } from './economic.service';
import { AuthService } from '@/auth/auth.service';
import { requireRole } from '@/common/access';

// 认证宗亲(2级)可编辑的经济单元
const ECONOMIC_EDIT_UNITS = ['entrepreneur', 'supply_demand', 'product'];
// 仅管理员(3级)可编辑的单元：通讯录、附近宗亲（个人/直系2代信息由成员维护接口处理）
const ADMIN_ONLY_UNITS = ['contact', 'relative'];

@Controller('economic')
export class EconomicController {
  constructor(
    private readonly economicService: EconomicService,
    private readonly authService: AuthService,
  ) {}

  @Get()
  async findAll(@Headers('authorization') authorization: string, @Res() res: Response) {
    let level = 0;
    if (authorization) {
      try {
        const d = this.authService.verifyToken(authorization.replace(/^Bearer\s+/i, '')) as any;
        if (d?.userId) level = this.roleToLevel(d.role);
      } catch { /* ignore */ }
    }
    const data = await this.economicService.findAll();
    // 通讯录、附近宗亲：未认证不可见
    const visible = (data || []).filter((i: any) =>
      !ADMIN_ONLY_UNITS.includes(i.category) || level >= 2);
    return res.status(200).json({ code: 200, msg: 'success', data: visible });
  }

  @Get('category/:category')
  async findByCategory(
    @Param('category') category: string,
    @Headers('authorization') authorization: string,
    @Res() res: Response,
  ) {
    if (ADMIN_ONLY_UNITS.includes(category)) {
      requireRole(this.authService, authorization, 2);
    }
    const data = await this.economicService.findByCategory(category);
    return res.status(200).json({ code: 200, msg: 'success', data });
  }

  @Post()
  async create(@Body() body: any, @Headers('authorization') authorization: string, @Res() res: Response) {
    const category = body.category;
    let decoded: { userId: string; role: string; username?: string };
    if (ECONOMIC_EDIT_UNITS.includes(category)) {
      decoded = requireRole(this.authService, authorization, 2);
    } else if (ADMIN_ONLY_UNITS.includes(category)) {
      decoded = requireRole(this.authService, authorization, 3);
    } else {
      decoded = requireRole(this.authService, authorization, 2);
    }
    const familyId = await this.economicService.findFamilyId();
    const data = await this.economicService.create({
      ...body,
      family_id: body.family_id ?? familyId,
      user_id: decoded.userId,
    });
    return res.status(200).json({ code: 200, msg: 'success', data });
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: any, @Headers('authorization') authorization: string, @Res() res: Response) {
    const category = body.category;
    const decoded = requireRole(this.authService, authorization, 2);
    if (ECONOMIC_EDIT_UNITS.includes(category) && this.roleToLevel(decoded.role) < 3) {
      const list = await this.economicService.findByCategory(category);
      const target = (list || []).find((i: any) => i.id === id);
      if (target && target.user_id && target.user_id !== decoded.userId) {
        throw new ForbiddenException('仅可编辑本人发布的内容');
      }
    } else if (ADMIN_ONLY_UNITS.includes(category)) {
      requireRole(this.authService, authorization, 3);
    }
    const data = await this.economicService.update(id, body);
    return res.status(200).json({ code: 200, msg: 'success', data });
  }

  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @Body() body: any,
    @Headers('authorization') authorization: string,
    @Res() res: Response,
  ) {
    const category = body?.category;
    const decoded = requireRole(this.authService, authorization, 2);
    if (ECONOMIC_EDIT_UNITS.includes(category) && this.roleToLevel(decoded.role) < 3) {
      const list = await this.economicService.findByCategory(category);
      const target = (list || []).find((i: any) => i.id === id);
      if (target && target.user_id && target.user_id !== decoded.userId) {
        throw new ForbiddenException('仅可删除本人发布的内容');
      }
    } else if (ADMIN_ONLY_UNITS.includes(category)) {
      requireRole(this.authService, authorization, 3);
    }
    await this.economicService.remove(id);
    return res.status(200).json({ code: 200, msg: 'success', data: true });
  }

  private roleToLevel(role?: string | null): number {
    switch ((role || '').toLowerCase()) {
      case 'super': return 4;
      case 'admin': return 3;
      case 'verified': return 2;
      case 'member': return 1;
      default: return 0;
    }
  }
}
