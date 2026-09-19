import { Lunar } from 'lunar-javascript'

/**
 * 将公历完整日期(YYYY-MM-DD/YYYY/M/D)转换为农历字符串。
 * 仅年份(如 1950)时原样返回；空值返回空串。
 */
export function toLunarBirth(dateStr?: string | null): string {
  if (!dateStr) return ''
  const d = String(dateStr).trim()
  const m = d.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/)
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
    return `${year}年${month}月${dayCn}`
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