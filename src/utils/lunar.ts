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