import { Controller, Post, Get, Put, Body, Param, Headers, HttpCode } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { FamilyApplyService } from './family-apply.service';

const JWT_SECRET = process.env.JWT_SECRET || 'he-family-tree-secret-key-2024';

@Controller('family-apply')
export class FamilyApplyController {
  constructor(private readonly familyApplyService: FamilyApplyService) {}

  private resolveUser(authorization?: string): string | null {
    if (!authorization) return null;
    try {
      const token = authorization.replace('Bearer ', '');
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      return decoded?.userId || null;
    } catch {
      return null;
    }
  }

  @Post()
  @HttpCode(200)
  async apply(@Headers('authorization') authorization: string, @Body() body: any) {
    const userId = this.resolveUser(authorization);
    if (!userId) return { code: 401, msg: '未登录', data: null };
    return this.familyApplyService.apply(userId, body);
  }

  @Get('mine')
  @HttpCode(200)
  async mine(@Headers('authorization') authorization: string) {
    const userId = this.resolveUser(authorization);
    if (!userId) return { code: 401, msg: '未登录', data: null };
    return this.familyApplyService.mine(userId);
  }

  @Get('admin')
  @HttpCode(200)
  async admin(@Headers('authorization') authorization: string) {
    const userId = this.resolveUser(authorization);
    if (!userId) return { code: 401, msg: '未登录', data: null };
    return this.familyApplyService.adminInbox(userId);
  }

  @Put(':id/approve')
  @HttpCode(200)
  async approve(@Headers('authorization') authorization: string, @Param('id') id: string) {
    const userId = this.resolveUser(authorization);
    if (!userId) return { code: 401, msg: '未登录', data: null };
    return this.familyApplyService.approve(userId, id);
  }

  @Put(':id/reject')
  @HttpCode(200)
  async reject(@Headers('authorization') authorization: string, @Param('id') id: string) {
    const userId = this.resolveUser(authorization);
    if (!userId) return { code: 401, msg: '未登录', data: null };
    return this.familyApplyService.reject(userId, id);
  }
}