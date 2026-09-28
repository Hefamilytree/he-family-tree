import { Controller, Post, Get, Put, Body, Headers, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.OK)
  async register(@Body() body: { username: string; password: string; nickname?: string }) {
    const { username, password, nickname } = body;
    if (!username || !password) {
      return { code: 400, msg: '用户名和密码不能为空', data: null };
    }
    return this.authService.register(username, password, nickname);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() body: { username: string; password: string }) {
    const { username, password } = body;
    if (!username || !password) {
      return { code: 400, msg: '用户名和密码不能为空', data: null };
    }
    return this.authService.login(username, password);
  }

  @Get('profile')
  async getProfile(@Headers('authorization') authorization: string) {
    if (!authorization) {
      return { code: 401, msg: '未登录', data: null };
    }

    const token = authorization.replace('Bearer ', '');
    const decoded = this.authService.verifyToken(token) as any;

    if (!decoded) {
      return { code: 401, msg: 'token 无效或已过期', data: null };
    }

    return this.authService.getProfile(decoded.userId);
  }

  @Put('profile')
  @HttpCode(HttpStatus.OK)
  async updateProfile(
    @Headers('authorization') authorization: string,
    @Body() body: { nickname?: string; avatar_url?: string }
  ) {
    if (!authorization) {
      return { code: 401, msg: '未登录', data: null };
    }

    const token = authorization.replace('Bearer ', '');
    const decoded = this.authService.verifyToken(token) as any;

    if (!decoded) {
      return { code: 401, msg: 'token 无效或已过期', data: null };
    }

    return this.authService.updateProfile(decoded.userId, body);
  }

  @Post('set-admin')
  @HttpCode(HttpStatus.OK)
  async setAdmin(
    @Headers('authorization') authorization: string,
    @Body() body: { userId: string }
  ) {
    if (!authorization) {
      return { code: 401, msg: '未登录', data: null };
    }
    const token = authorization.replace('Bearer ', '');
    const decoded = this.authService.verifyToken(token) as any;
    if (!decoded) {
      return { code: 401, msg: 'token 无效或已过期', data: null };
    }
    const { userId } = body;
    if (!userId) {
      return { code: 400, msg: '用户 ID 不能为空', data: null };
    }
    return this.authService.setAdmin(decoded.userId, userId);
  }

  @Post('wx-login')
  @HttpCode(HttpStatus.OK)
  async wxLogin(
    @Body()
    body: {
      loginCode?: string;
      phoneCode?: string;
      openid?: string;
      phone?: string;
      nickname?: string;
      avatar_url?: string;
    }
  ) {
    const b = body || ({} as any);
    // 小程序：loginCode + phoneCode 由后端换取 openid 与手机号
    if (b.loginCode && b.phoneCode) {
      return this.authService.wxCodeLogin(b.loginCode, b.phoneCode, b.nickname, b.avatar_url);
    }
    if (b.openid && b.phone) {
      return this.authService.wxLogin(b.openid, b.phone, b.nickname, b.avatar_url);
    }
    return { code: 400, msg: '缺少微信标识或手机号', data: null };
  }

  @Post('link-member')
  @HttpCode(HttpStatus.OK)
  async linkMember(
    @Headers('authorization') authorization: string,
    @Body() body: { memberId: string; phone?: string; residence?: string; generationTitle?: string }
  ) {
    if (!authorization) {
      return { code: 401, msg: '未登录', data: null };
    }
    const token = authorization.replace('Bearer ', '');
    const decoded = this.authService.verifyToken(token) as any;
    if (!decoded) {
      return { code: 401, msg: 'token 无效或已过期', data: null };
    }
    const { memberId, phone, residence, generationTitle } = body;
    if (!memberId) {
      return { code: 400, msg: '请选择要关联的宗亲', data: null };
    }
    return this.authService.linkMember(decoded.userId, memberId, phone, residence, generationTitle);
  }

  @Post('clear-data')
  @HttpCode(HttpStatus.OK)
  async clearData(@Headers('authorization') authorization: string) {
    if (!authorization) {
      return { code: 401, msg: '未登录', data: null };
    }
    const token = authorization.replace('Bearer ', '');
    const decoded = this.authService.verifyToken(token) as any;
    if (!decoded) {
      return { code: 401, msg: 'token 无效或已过期', data: null };
    }
    return this.authService.clearAllData(decoded.userId);
  }
}
