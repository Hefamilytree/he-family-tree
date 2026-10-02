import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '@/auth/auth.service';

interface Row {
  id: string;
  parent_id?: string | null;
  user_id?: string | null;
}

/**
 * 成员级写操作鉴权（成员表 / 宗亲树 统一规则）：
 *  - 未登录：401
 *  - 管理人员及以上（3级）：可操作全部
 *  - 认证宗亲（2级）：仅可操作【本人 及 直系上下2代】
 *      上：父母、(外)祖父母；下：子女、(外)孙子女
 *  - 其余：403
 */
export function assertMemberKin(
  authService: AuthService,
  authorization: string | undefined,
  targetId: string,
  all: Row[],
): { userId: string; role: string } {
  if (!authorization) throw new UnauthorizedException('请先登录');
  const decoded = authService.verifyToken(authorization.replace(/^Bearer\s+/i, '')) as
    | { userId: string; role: string }
    | null;
  if (!decoded?.userId) throw new UnauthorizedException('登录已失效');

  const role = (decoded.role || '').toLowerCase();
  if (role === 'super' || role === 'admin') return decoded;

  // 通过 members.user_id 找到当前登录人对应的成员节点
  const meNode = all.find((r) => r.user_id === decoded.userId);
  if (!meNode) throw new ForbiddenException('没有操作权限');

  const me = meNode.id;
  if (targetId === me) return decoded;

  const byId = new Map(all.map((r) => [r.id, r]));

  // 向上 2 代
  const parentId = byId.get(me)?.parent_id;
  if (parentId) {
    if (targetId === parentId) return decoded;
    const grandId = byId.get(parentId)?.parent_id;
    if (grandId && targetId === grandId) return decoded;
  }

  // 向下 2 代
  const children = all.filter((r) => r.parent_id === me);
  for (const ch of children) {
    if (ch.id === targetId) return decoded;
    if (all.some((g) => g.parent_id === ch.id && g.id === targetId)) return decoded;
  }

  throw new ForbiddenException('仅可维护本人及直系2代信息');
}
