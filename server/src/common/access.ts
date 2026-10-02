import { UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { AuthService } from '@/auth/auth.service';

/** 角色 → 权限等级：0游客 < 1未认证 < 2认证宗亲 < 3管理人员 < 4主管理人员 */
export function roleLevel(role?: string | null): number {
  switch ((role || '').toLowerCase()) {
    case 'super':
      return 4;
    case 'admin':
      return 3;
    case 'verified':
      return 2;
    case 'member':
      return 1;
    default:
      return 0;
  }
}

/**
 * 校验登录态并要求最低权限等级。
 * 返回解码负载（含 userId / role）；未登录抛 401，权限不足抛 403。
 */
export function requireRole(
  authService: AuthService,
  authorization: string | undefined,
  minLevel: number,
): { userId: string; role: string; username?: string } {
  if (!authorization) throw new UnauthorizedException('请先登录');
  const token = authorization.replace(/^Bearer\s+/i, '');
  const decoded = authService.verifyToken(token) as
    | { userId: string; role: string; username?: string }
    | null;
  if (!decoded?.userId) throw new UnauthorizedException('登录已失效');
  if (roleLevel(decoded.role) < minLevel) {
    throw new ForbiddenException('没有操作权限');
  }
  return decoded;
}
