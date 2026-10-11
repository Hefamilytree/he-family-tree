import { Lunar } from 'lunar-javascript'

/** 十二地支时辰 */
const ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']
const BIRTH_TIME_OPTIONS = [
  '子时(23-1点)', '丑时(1-3点)', '寅时(3-5点)', '卯时(5-7点)',
  '辰时(7-9点)', '巳时(9-11点)', '午时(11-13点)', '未时(13-15点)',
  '申时(15-17点)', '酉时(17-19点)', '戌时(19-21点)', '亥时(21-23点)',
]
export { BIRTH_TIME_OPTIONS }

/** 将 birth_time（0-23 小时数 / 时辰关键字 / HH:mm）归一为“X时” */
export function formatBirthTime(birthTime?: string | number | null): string {
  if (birthTime === null || birthTime === undefined || birthTime === '') return ''
  const raw = String(birthTime).trim()
  if (!raw) return ''
  // 已是中文时辰（含“子時/子时”等）
  const hit = ZHI.find(z => raw.includes(z))
  if (hit) return `${hit}时`
  // HH:mm 或纯小时
  const hm = raw.match(/^(\d{1,2})(?::(\d{1,2}))?$/)
  if (hm) {
    const h = +hm[1]
    if (h >= 0 && h <= 23) return `${ZHI[Math.floor(((h + 1) % 24) / 2)]}时`
  }
  return raw
}

/**
 * 出生日期统一格式：农历「年月日时辰」。
 * @param dateStr 公历日期 YYYY-MM-DD
 * @param birthTime 时辰（小时/关键字）
 */
export function formatBirthFull(
  dateStr?: string | null,
  birthTime?: string | number | null
): string {
  const base = toLunarBirth(dateStr)
  if (!base) return ''
  const t = formatBirthTime(birthTime)
  return t ? `${base}${t}` : base
}

/**
 * 将公历完整日期(YYYY-MM-DD/YYYY/M/D)转换为农历字符串。
 * 仅年份(如 1950)时原样返回；空值返回空串。
 */
export function toLunarBirth(dateStr?: string | null): string {
  if (!dateStr) return ''
  const d = String(dateStr).trim()
  // 兼容带时分（YYYY-MM-DD HH:mm）或带时分秒的日期，先从后往前切出 HH:mm
  const tMinute = d.match(/\d{1,2}[:：]\d{1,2}/)
  const tText = tMinute ? `${tMinute[0]}分` : ''
  const m = d.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/)
  if (!m) {
    // 非完整日期：可能是纯年份，原样返回
    return d
  }
  const y = +m[1]
  const mo = +m[2]
  const day = +m[3]
  try {
    const lunar = Lunar.fromDate(new Date(y, mo - 1, day))
    const year = lunar.getYearInChinese()
    const month = lunar.getMonthInChinese()
    const dayCn = lunar.getDayInChinese()
    return tText ? `${year}年${month}月${dayCn}${tText}` : `${year}年${month}月${dayCn}`
  } catch (e) {
    return d
  }
}

/** 组合一条生/卒的展示文本：公历 + 农历 */
export function formatLunarPeriod(
  label: string,
  solar?: string | null,
  lunar?: string | null
): string {
  if (!solar && !lunar) return ''
  const s = solar && solar.trim() ? solar.trim() : ''
  const l = lunar && lunar.trim() ? lunar.trim() : ''
  const shownLunar = l ? l : toLunarBirth(s)
  if (s && shownLunar && shownLunar !== s) {
    return `${label} ${s}（${shownLunar}）`
  }
  return `${label} ${s || shownLunar}`
}

const CN_NUMS = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九'] as const
const CN_UNITS = ['', '十', '百', '千'] as const

/** 将数字转换为中文数字（支持 0~9999 万以内） */
function toChineseNumber(n: number): string {
  if (!Number.isFinite(n) || n < 0) return String(n)
  if (n === 0) return '零'
  if (n <= 9999) {
    let s = ''
    const digits = String(n).split('').map(Number)
    let zeroPending = false
    for (let i = 0; i < digits.length; i++) {
      const d = digits[i]
      const unit = CN_UNITS[digits.length - 1 - i]
      if (d === 0) {
        zeroPending = s.length > 0 && i !== digits.length - 1
      } else {
        if (zeroPending) {
          s += '零'
          zeroPending = false
        }
        s += CN_NUMS[d] + unit
      }
    }
    // 「一十」开头的非个位十，简化为「十」
    if (s.startsWith('一十') && s.length === 2) s = '十'
    return s
  }
  // 万以上（简化，仅万级）
  const wan = Math.floor(n / 10000)
  const rest = n % 10000
  const wanPart = toChineseNumber(wan) + '万'
  const restPart = rest === 0 ? '' : (rest < 1000 ? '零' + toChineseNumber(rest) : toChineseNumber(rest))
  return wanPart + restPart
}

/** 导出中文数字转换（供页面将用户能连续世代、页码等显示为中文字样） */
export function toChineseNum(n: number): string {
  return toChineseNumber(n)
}