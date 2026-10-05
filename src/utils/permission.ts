import Taro from '@tarojs/taro'

/**
 * 权限工具：按【单元（category）】粒度控制查看 / 编辑，并支持直系2代亲属维护。
 *
 * 角色体系（users.role）：
 *  - guest    ：游客（未登录，本地兜底）
 *  - member   ：已注册但未关联成员（登录未认证）
 *  - verified ：已关联成员（认证宗亲）
 *  - admin    ：管理人员（由主管理人员授权）
 *  - super    ：主管理人员（唯一）
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
  | 'economic' // 发展经济
  | 'other'

/** 单元标识（各 category） */
export type UnitKey =
  // 文化传承
  | 'family_style' | 'family_instruction' | 'honor' | 'merit' | 'migration'
  | 'family_history' | 'person_history' | 'afterword' | 'editorial_note'
  // 孝亲睦族
  | 'activity' | 'ancestor_worship' | 'coming_of_age' | 'talent'
  | 'elderly_care' | 'education' | 'relief' | 'birthday'
  // 发展经济
  | 'contact' | 'relative' | 'entrepreneur' | 'supply_demand' | 'product'

/** 文化传承 9 单元：游客可查看，3级可编辑 */
const CULTURAL_UNITS: UnitKey[] = [
  'family_style', 'family_instruction', 'honor', 'merit', 'migration',
  'family_history', 'person_history', 'afterword', 'editorial_note',
]

/** 孝亲睦族 8 单元：游客可查看，2级可编辑 */
const HARMONY_UNITS: UnitKey[] = [
  'activity', 'ancestor_worship', 'coming_of_age', 'talent',
  'elderly_care', 'education', 'relief', 'birthday',
]

/** 认证宗亲(2级)可编辑的经济单元（企业家圈/供需/产品）；通讯录、附近宗亲不在此列 */
const ECONOMIC_EDIT_UNITS: UnitKey[] = ['entrepreneur', 'supply_demand', 'product']

/** 需认证(2级)才可查看的单元：通讯录、附近宗亲 */
const RESTRICTED_VIEW_UNITS: UnitKey[] = ['contact', 'relative']

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
 * 是否可维护某成员信息（成员表 / 宗亲树 / 通讯录 / 附近宗亲统一规则）：
 *  - 管理人员及以上（3级）：可维护全部
 *  - 认证宗亲（2级）：可维护【本人 及其 直系上下2代】
 *      上2代：父母、(外)祖父母
 *      下2代：子女、(外)孙子女
 *      即沿 parent_id 链向上 1~2 层、向下 1~2 层。
 *  @param allMembers 完整成员集合，用于沿血缘链判定
 */
export function canManageMember(
  u: AuthUser | null,
  target: KinMember,
  allMembers: KinMember[] = [],
): boolean {
  if (permissionLevel(u) >= 3) return true
  if (!u || !u.member_id) return false
  const me = u.member_id
  if (target.id === me) return true

  const byId = new Map(allMembers.map((m) => [m.id, m]))

  // —— 向上：我的父母(1)、祖父母(2) ——
  const meNode = byId.get(me)
  const parentId = meNode?.parent_id
  if (parentId) {
    if (target.id === parentId) return true // 父母
    const grandId = byId.get(parentId)?.parent_id
    if (grandId && target.id === grandId) return true // 祖父母
  }

  // —— 向下：我的子女(1)、孙子女(2) ——
  const children = allMembers.filter((m) => m.parent_id === me)
  for (const ch of children) {
    if (ch.id === target.id) return true // 子女
    const grandChildren = allMembers.filter((m) => m.parent_id === ch.id)
    if (grandChildren.some((g) => g.id === target.id)) return true // 孙子女
  }

  return false
}

/** 读取当前登录用户（未登录返回 null） */
/** base64 解码（兼容小程序无全局 atob 的环境） */
function base64Decode(input: string): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
  const str = input.replace(/=+$/, '')
  let output = ''
  let i = 0
  while (i < str.length) {
    const e1 = chars.indexOf(str.charAt(i++))
    const e2 = chars.indexOf(str.charAt(i++))
    const e3 = chars.indexOf(str.charAt(i++))
    const e4 = chars.indexOf(str.charAt(i++))
    const c1 = (e1 << 2) | (e2 >> 4)
    const c2 = ((e2 & 15) << 4) | (e3 >> 2)
    const c3 = ((e3 & 3) << 6) | e4
    output += String.fromCharCode(c1)
    if (e3 !== 64) output += String.fromCharCode(c2)
    if (e4 !== 64) output += String.fromCharCode(c3)
  }
  return output
}

/** 解析 JWT payload（不校验签名，仅用于前端展示角色实时校正） */
function decodeJwtPayload(token: string): { userId?: string; username?: string; role?: string } | null {
  try {
    const part = token.split('.')[1]
    if (!part) return null
    const json = decodeURIComponent(
      base64Decode(part).split('').map((c) => `%${c.charCodeAt(0).toString(16).padStart(2, '0')}`).join('')
    )
    return JSON.parse(json)
  } catch {
    return null
  }
}

export function getAuthUser(): AuthUser | null {
  const token = Taro.getStorageSync('token')
  if (!token) return null
  const u = (Taro.getStorageSync('userInfo') || {}) as AuthUser
  const payload = decodeJwtPayload(token)
  // 以 token 中的实时角色为准，校正可能陈旧的本地缓存
  const merged: AuthUser = {
    ...u,
    id: u.id || payload?.userId || '',
    username: u.username || payload?.username || '',
    role: payload?.role || u.role,
  }
  return merged.role ? merged : null
}

export function logout(): void {
  Taro.removeStorageSync('token')
  Taro.removeStorageSync('userInfo')
}

/**
 * 是否可查看某板块（首页分组用）：
 *  - 文化、孝亲：全部可见（含游客）
 *  - 发展经济：全部可见（具体单元在单元级再门控）
 */
export function canViewBlock(u: AuthUser | null, block: BlockKey): boolean {
  void u
  void block
  return true
}

/**
 * 是否可查看某单元：
 *  - 通讯录、附近宗亲：仅认证宗亲及以上（2级）
 *  - 其余全部单元：含游客在内均可查看
 */
export function canViewUnit(u: AuthUser | null, unit: UnitKey | string): boolean {
  if ((RESTRICTED_VIEW_UNITS as string[]).includes(unit)) {
    return permissionLevel(u) >= 2
  }
  return true
}

/**
 * 是否可编辑某单元（添加/编辑/删除入口）：
 *  - 文化传承 9 单元：仅管理人员、主管理人员（3级）
 *  - 孝亲睦族 8 单元：认证宗亲及以上（2级）
 *  - 企业家圈 / 供需信息 / 产品展示：认证宗亲及以上（2级，本人发布数据本人可管）
 *  - 通讯录 / 附近宗亲：编辑入口仅管理人员及以上（3级）；
 *      认证宗亲对个人及直系2代信息的维护由 canManageMember 判定
 */
export function canEditUnit(u: AuthUser | null, unit: UnitKey | string): boolean {
  const lv = permissionLevel(u)
  if ((CULTURAL_UNITS as string[]).includes(unit)) return lv >= 3
  if ((HARMONY_UNITS as string[]).includes(unit)) return lv >= 2
  if ((ECONOMIC_EDIT_UNITS as string[]).includes(unit)) return lv >= 2
  if ((RESTRICTED_VIEW_UNITS as string[]).includes(unit)) return lv >= 3
  return lv >= 3
}

/** 兼容旧调用：按板块粗粒度判断（尽量取最宽松的单元规则） */
export function canEditBlock(u: AuthUser | null, block: BlockKey): boolean {
  const lv = permissionLevel(u)
  if (lv >= 3) return true
  if (block === 'harmony' || block === 'economic') return lv >= 2
  return false
}

/** 是否可打印族谱：认证宗亲及以上 */
export function canPrint(u: AuthUser | null): boolean {
  return permissionLevel(u) >= 2
}

/** 是否展示成员详细信息（未认证仅姓名，认证及以上显示联系方式等） */
export function memberDetailVisible(u: AuthUser | null): boolean {
  return permissionLevel(u) >= 2
}

/**
 * 是否可操作某条数据：
 *  - 管理人员及以上：可操作全部
 *  - 认证宗亲：仅能操作本人发布的数据（ownerId 与当前用户 id 一致）
 */
export function canOperateItem(
  u: AuthUser | null,
  ownerId?: string | null,
): boolean {
  if (permissionLevel(u) >= 3) return true
  if (!u || !ownerId) return false
  return u.id === ownerId
}
