import { Controller, Get, Post, Put, Body, Param, HttpCode, Headers, UnauthorizedException } from '@nestjs/common';
import { FamilyService } from './family.service';
import { AuthService } from '@/auth/auth.service';

@Controller('family')
export class FamilyController {
  constructor(
    private readonly familyService: FamilyService,
    private readonly authService: AuthService,
  ) {}

  @Get()
  @HttpCode(200)
  async getFamily() {
    const data = await this.familyService.getFamily();
    return { code: 200, msg: 'success', data };
  }

  @Post()
  @HttpCode(200)
  async createFamily(
    @Headers('authorization') authorization: string,
    @Body() body: {
      surname: string;
      family_name: string;
      hall_name?: string | null;
      motto?: string | null;
      description?: string | null;
      origin?: string | null;
    },
  ) {
    const token = (authorization || '').replace(/^Bearer\s+/i, '');
    if (!token) throw new UnauthorizedException('请先登录');
    const decoded = this.authService.verifyToken(token) as { userId: string; role: string };
    if (!decoded?.userId) throw new UnauthorizedException('登录已失效');
    const data = await this.familyService.createFamily(body, decoded.userId, decoded.role);
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
