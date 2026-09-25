import Taro from '@tarojs/taro'

/**
 * 权限工具：根据登录身份（游客/未认证/认证宗亲/管理人员/主管理人员）
 * 控制板块可见性与编辑、打印、敏感字段展示。
 *
 * 角色体系（users.role）：
 *  - guest    ：游客（未登录，本地兜底）
 *  - member   ：已注册但未关联成员（未认证）
 *  - verified ：已关联成员（认证宗亲）
 *  - admin    ：管理人员（由主管理人员设置）
 *  - super    ：主管理人员（首个注册用户）
 */

export interface AuthUser {
  id: string
  username: string
  nickname?: string
  role?: string
  member_id?: string | null
  phone?: string
  residence?: string
}

/** 板块标识 */
export type BlockKey = 'cultural' | 'harmony' | 'economic' | 'other'

/** 权限级别：0游客 < 1未认证 < 2认证宗亲 < 3管理人员 < 4主管理人员 */
export function permissionLevel(u: AuthUser | null): number {
  if (!u) return 0
  const r = (u.role || '').toLowerCase()
  if (r === 'super') return 4
  if (r === 'admin') return 3
  if (r === 'verified' || u.member_id) return 2
  if (r === 'member') return 1
  return 0
}

export function isAdmin(u: AuthUser | null): boolean {
  return permissionLevel(u) >= 3
}

export function isSuper(u: AuthUser | null): boolean {
  return (u?.role || '').toLowerCase() === 'super'
}

/** 读取当前登录用户（未登录返回 null） */
export function getAuthUser(): AuthUser | null {
  const token = Taro.getStorageSync('token')
  if (!token) return null
  const u = Taro.getStorageSync('userInfo')
  return u && u.role ? (u as AuthUser) : null
}

export function logout(): void {
  Taro.removeStorageSync('token')
  Taro.removeStorageSync('userInfo')
}

/** 是否可查看指定板块：游客仅 文化传承(cultural)、孝亲睦族(harmony)；已登录全部可看 */
export function canViewBlock(u: AuthUser | null, block: BlockKey): boolean {
  if (permissionLevel(u) >= 1) return true
  return block === 'cultural' || block === 'harmony'
}

/** 是否可编辑指定板块：认证宗亲可编辑 孝亲睦族、发展经济；管理人员编辑全部 */
export function canEditBlock(u: AuthUser | null, block: BlockKey): boolean {
  const lv = permissionLevel(u)
  if (lv >= 3) return true
  if (lv >= 2) return block === 'harmony' || block === 'economic'
  return false
}

/** 是否可打印族谱：认证宗亲及以上 */
export function canPrint(u: AuthUser | null): boolean {
  return permissionLevel(u) >= 2
}

/** 是否仅显示成员/宗亲姓名（未认证仅姓名，认证及以上显示联系方式等） */
export function memberDetailVisible(u: AuthUser | null): boolean {
  return permissionLevel(u) >= 2
}