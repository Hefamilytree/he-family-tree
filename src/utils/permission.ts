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
export type BlockKey =
  | 'cultural' // 文化传承
  | 'harmony' // 孝亲睦族
  | 'economic' // 企业家圈 / 发展经济
  | 'supply' // 供需信息
  | 'product' // 产品展示
  | 'other'

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

/** 轻量成员结构（用于亲属关系判定） */
export interface KinMember {
  id: string
  parent_id?: string | null
}

/**
 * 是否可维护某成员信息：
 *  - 管理人员及以上：可维护全部
 *  - 所有登录成员：可维护【本人、父母、子女】
 *    · 本人：memberId === 用户.member_id
 *    · 父母：目标成员的 parent_id 指向本人 或 本人的 parent_id 指向目标成员
 *    · 子女：目标成员的 parent_id === 本人
 *  @param allMembers 用于判定子女关系的成员集合
 */
export function canManageMember(
  u: AuthUser | null,
  target: KinMember,
  allMembers: KinMember[] = [],
): boolean {
  if (permissionLevel(u) >= 3) return true
  if (!u || !u.member_id) return false
  const me = u.member_id
  // 本人
  if (target.id === me) return true
  // 父母：我是目标的子女（target 是我的父辈）
  if (target.id && allMembers.find((m) => m.id === me)?.parent_id === target.id) return true
  // 子女：目标的父亲是我
  if (target.parent_id === me) return true
  return false
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

/**
 * 是否可查看指定板块：
 *  - 供需信息、产品展示：对外开放，全部用户（含游客）均可查看
 *  - 游客 / 未认证宗亲：另可查看 文化传承、孝亲睦族
 *  - 认证宗亲及以上：所有板块可查看
 */
export function canViewBlock(u: AuthUser | null, block: BlockKey): boolean {
  if (block === 'supply' || block === 'product') return true
  if (permissionLevel(u) >= 2) return true
  return block === 'cultural' || block === 'harmony'
}

/**
 * 是否可编辑指定板块：
 *  - 认证宗亲：孝亲睦族、企业家圈、供需信息、产品展示（仅本人发布的数据）
 *  - 管理人员及以上：所有板块
 */
export function canEditBlock(u: AuthUser | null, block: BlockKey): boolean {
  const lv = permissionLevel(u)
  if (lv >= 3) return true
  if (lv >= 2)
    return block === 'harmony' || block === 'economic' || block === 'supply' || block === 'product'
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

/**
 * 是否可操作某条数据：
 *  - 管理人员及以上：可操作全部
 *  - 其余成员：仅能操作本人发布的数据（ownerId 与当前用户 id 一致）
 */
export function canOperateItem(
  u: AuthUser | null,
  ownerId?: string | null,
): boolean {
  if (permissionLevel(u) >= 3) return true
  if (!u || !ownerId) return false
  return u.id === ownerId
}