/**
 * 长幼有序排序：族谱成员表、宗亲树、世系图、打印输出统一使用。
 *
 * 规则：
 *  1. 先按「世代 generation」由小到大（祖先在上、晚辈在下）。
 *  2. 同一世代按「出生早迟」排序：出生年份小的为长（兄在前）。
 *  3. 出生年份缺失者，退到同辈末尾，再以录入先后（created_at）、姓名兜底。
 */

interface SeniorityLike {
  generation?: number | null;
  birth_date?: string | null;
  created_at?: string | null;
  name?: string | null;
}

/** 从 birth_date 中尽量解析出公历年（支持 1980 / 1980-05 / 1980年5月 等） */
export function birthYearOf(birthDate?: string | null): number | null {
  if (!birthDate) return null;
  const m = String(birthDate).match(/(\d{3,4})/);
  if (!m) return null;
  const y = parseInt(m[1], 10);
  // 过滤明显非年份的数字（如「生失考」无数字；纯 3 位也兼容古年）
  return Number.isFinite(y) ? y : null;
}

/** 长幼有序比较器（可直接用于 Array.sort） */
export function bySeniority(a: SeniorityLike, b: SeniorityLike): number {
  const ga = typeof a.generation === 'number' ? a.generation : Number.MAX_SAFE_INTEGER;
  const gb = typeof b.generation === 'number' ? b.generation : Number.MAX_SAFE_INTEGER;
  if (ga !== gb) return ga - gb;

  const ya = birthYearOf(a.birth_date);
  const yb = birthYearOf(b.birth_date);
  // 有年份者排在无年份者之前；都有则年份小（早出生）为长
  if (ya !== null && yb !== null && ya !== yb) return ya - yb;
  if (ya !== null && yb === null) return -1;
  if (ya === null && yb !== null) return 1;

  const ca = a.created_at ? Date.parse(a.created_at) : NaN;
  const cb = b.created_at ? Date.parse(b.created_at) : NaN;
  if (!Number.isNaN(ca) && !Number.isNaN(cb) && ca !== cb) return ca - cb;

  return (a.name || '').localeCompare(b.name || '', 'zh-Hans-CN');
}

/** 递归地对宗亲树每一层的 children 按长幼有序排序，返回排序后的新根数组 */
export function sortTreeBySeniority<T extends { children?: T[] }>(roots: T[]): T[] {
  const walk = (nodes: T[]): T[] =>
    nodes
      .map((n) => ({ ...n, children: n.children ? walk(n.children) : n.children }))
      .sort(bySeniority as (x: T, y: T) => number);
  return walk(roots);
}
