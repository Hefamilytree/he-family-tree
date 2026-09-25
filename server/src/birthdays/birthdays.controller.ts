import { Controller, Get, Headers, HttpCode } from '@nestjs/common';
import { BirthdaysService } from './birthdays.service';
import { AuthService } from '@/auth/auth.service';

@Controller('birthdays')
export class BirthdaysController {
  constructor(
    private readonly birthdaysService: BirthdaysService,
    private readonly authService: AuthService,
  ) {}

  /** 我的生日提醒：本人 + 四代直系健在亲属 */
  @Get('mine')
  @HttpCode(200)
  async mine(@Headers('authorization') authorization: string) {
    if (!authorization) return { code: 401, msg: '请先登录', data: null };
    const token = authorization.replace('Bearer ', '');
    const decoded = this.authService.verifyToken(token) as any;
    if (!decoded) return { code: 401, msg: 'token 无效或已过期', data: null };
    return this.birthdaysService.mine(decoded.userId);
  }
}
