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
  async setAdmin(@Body() body: { userId: string }) {
    const { userId } = body;
    if (!userId) {
      return { code: 400, msg: '用户 ID 不能为空', data: null };
    }
    return this.authService.setAdmin(userId);
  }
}
