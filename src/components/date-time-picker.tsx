import { useState } from 'react';
import { View, Text, Picker, Input } from '@tarojs/components';
import { Calendar } from 'lucide-react-taro';
import { Lunar, LunarYear } from 'lunar-javascript';

interface Props {
  value: string;             // 存储值：YYYY-MM-DD 或 YYYY-MM-DD HH:mm 或 ''
  placeholder?: string;
  onValueChange: (v: string) => void;
}

const CUR_Y = new Date().getFullYear();
const MAX_Y = CUR_Y + 10;    // 可选上限：当前时间往后 10 年
const MIN_Y = 1;             // 公元 1 年起（下限不再限制历史年份）
const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);

function pad(n: number) { return n < 10 ? `0${n}` : `${n}`; }
function daysInMonth(y: number, m: number) {
  return new Date(y, m, 0).getDate();
}

const CN_M = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二'];

/** 某农历年的月份列表（含闰月），月份可为负（闰月），label 形如「三月」「闰三月」 */
function lunarMonthsOf(year: number): { value: number; label: string }[] {
  try {
    const ly = LunarYear.fromYear(year);
    const leap = ly?.getLeapMonth?.() || 0;
    const list: { value: number; label: string }[] = [];
    for (let m = 1; m <= 12; m++) {
      list.push({ value: m, label: `${CN_M[m]}月` });
      if (m === leap) list.push({ value: -m, label: `闰${CN_M[m]}月` });
    }
    return list;
  } catch {
    // 超出农历库可靠年份范围（早于约 1900 年）时，退化为普通十二个月，保证不崩溃
    return MONTHS.map((m) => ({ value: m, label: `${CN_M[m]}月` }));
  }
}

/** 某农历年某月（可为负=闰月）的天数 */
function lunarDaysOf(year: number, month: number): number {
  try {
    for (let d = 30; d >= 28; d--) {
      try {
        Lunar.fromYmd(year, month, d);
        return d;
      } catch { /* 继续 */ }
    }
    return 29;
  } catch {
    return 29;
  }
}

/** 把任意输入年份收敛到合法正整数（下限 1，上限当前+10） */
function clampYear(raw: string): number {
  const n = parseInt(raw.replace(/[^\d]/g, ''), 10);
  if (!n || Number.isNaN(n)) return MIN_Y;
  return Math.min(MAX_Y, Math.max(MIN_Y, n));
}

/** 根据存储值解析出（年/月/日/时/分） */
function parseValue(v: string) {
  const hm = v.match(/^(\d{1,4})[-/.](\d{1,2})[-/.](\d{1,2})[T ](\d{1,2}):(\d{1,2})/);
  const d = v.match(/^(\d{1,4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  const y = d ? +d[1] : CUR_Y;
  const mo = d ? +d[2] : 1;
  const da = d ? +d[3] : 1;
  const h = hm ? +hm[4] : 0;
  const mi = hm ? +hm[5] : 0;
  return { y, mo, da, h, mi };
}

/** 根据存储值（公历）得到其农历年月，用于农历模式初始定位 */
function lunarOffsetFromValue(v: string): { lYear: number; lMonth: number } {
  const { y, mo, da } = parseValue(v || '');
  let lYear = y;
  let lMonth = 1;
  try {
    const lunar = Lunar.fromDate(new Date(y, mo - 1, da));
    lYear = lunar.getYear();
    lMonth = lunar.getMonth(); // 负为闰月
  } catch { /* fallback */ }
  return { lYear, lMonth };
}

function formatCN(v: string): string {
  if (!v) return '';
  const p = parseValue(v);
  const hm = v.match(/[T ](\d{1,2}):(\d{1,2})/);
  const time = hm ? ` ${+hm[1]}时${pad(+hm[2])}分` : '';
  return `${p.y}年${p.mo}月${p.da}日${time}`;
}

export default function DateTimePicker({ value, placeholder = '请选择日期', onValueChange }: Props) {
  const parsed = parseValue(value || '');
  const [mode, setMode] = useState<'solar' | 'lunar'>('solar');

  // —— 公历 ——（年份手动输入；月/日/时/分滚动选择）
  const [sYearText, setSYearText] = useState(String(parsed.y));
  const [sIdx, setSIdx] = useState<number[]>([
    Math.max(0, parsed.mo - 1),
    Math.max(0, parsed.da - 1),
    parsed.h,
    Math.max(0, MINUTES.indexOf(Math.floor(parsed.mi / 5) * 5)),
  ]);

  // —— 农历 ——
  const initialL = lunarOffsetFromValue(value || '');
  const [lYearText, setLYearText] = useState(String(initialL.lYear));
  const lMonthsAll = lunarMonthsOf(clampYear(lYearText));
  const initLMonthIdx = Math.max(0, lMonthsAll.findIndex((x) => x.value === initialL.lMonth));
  const [lIdx, setLIdx] = useState<number[]>([
    initLMonthIdx < 0 ? 0 : initLMonthIdx,
    0,
    parsed.h,
    Math.max(0, MINUTES.indexOf(Math.floor(parsed.mi / 5) * 5)),
  ]);

  // 公历构建
  const buildSolar = (yearText: string, cur: number[]) => {
    const y = clampYear(yearText);
    const mo = MONTHS[cur[0]] ?? 1;
    const dim = daysInMonth(y, mo);
    const da = Math.min((cur[1] ?? 0) + 1, dim);
    const h = HOURS[cur[2]] ?? 0;
    const mi = MINUTES[cur[3]] ?? 0;
    return `${y}-${pad(mo)}-${pad(da)} ${pad(h)}:${pad(mi)}`;
  };

  // 农历构建（输出仍存公历）
  const buildLunar = (yearText: string, cur: number[]) => {
    const y = clampYear(yearText);
    const months = lunarMonthsOf(y);
    const mVal = months[Math.min(cur[0], months.length - 1)]?.value ?? 1;
    const dim = lunarDaysOf(y, mVal);
    const da = Math.min((cur[1] ?? 0) + 1, dim);
    const h = HOURS[cur[2]] ?? 0;
    const mi = MINUTES[cur[3]] ?? 0;
    try {
      const solar = Lunar.fromYmd(y, mVal, da).getSolar();
      return `${solar.getYear()}-${pad(solar.getMonth())}-${pad(solar.getDay())} ${pad(h)}:${pad(mi)}`;
    } catch {
      // 超早农历年份无法精确换算时，回退为当年 1 月 1 日，避免崩溃
      return `${y}-01-01 ${pad(h)}:${pad(mi)}`;
    }
  };

  // 公历：年份手动输入
  const onSolarYearInput = (raw: string) => {
    const text = raw.replace(/[^\d]/g, '').slice(0, 4);
    setSYearText(text);
    const y = clampYear(text);
    const mo = MONTHS[sIdx[0]] ?? 1;
    const dim = daysInMonth(y, mo);
    const next = [...sIdx];
    if (next[1] > dim - 1) next[1] = dim - 1;
    setSIdx(next);
    if (text) onValueChange(buildSolar(text, next));
  };

  // 公历：月/日/时/分列变动
  const onSolarCol = (e: any) => {
    const cur = [...sIdx];
    const col = Number(e.detail.column);
    const row = Number(e.detail.value);
    cur[col] = row;
    if (col === 0) {
      const y = clampYear(sYearText);
      const mo = MONTHS[cur[0]] ?? 1;
      const dim = daysInMonth(y, mo);
      if (cur[1] > dim - 1) cur[1] = dim - 1;
    }
    setSIdx(cur);
  };
  const onSolarChange = (e: any) => {
    const cur = (e.detail.value || []).map(Number);
    setSIdx(cur);
    onValueChange(buildSolar(sYearText, cur));
  };

  // 农历：年份手动输入
  const onLunarYearInput = (raw: string) => {
    const text = raw.replace(/[^\d]/g, '').slice(0, 4);
    setLYearText(text);
    // 年变后月份/天数列表变化，重置月、日到第一个
    const next = [0, 0, lIdx[2], lIdx[3]];
    setLIdx(next);
    if (text) onValueChange(buildLunar(text, next));
  };

  // 农历：月/日/时/分列变动
  const onLunarCol = (e: any) => {
    const cur = [...lIdx];
    const col = Number(e.detail.column);
    const row = Number(e.detail.value);
    cur[col] = row;
    if (col === 0) {
      const y = clampYear(lYearText);
      const mVal = lunarMonthsOf(y)[Math.min(cur[0], lunarMonthsOf(y).length - 1)]?.value ?? 1;
      const dim = lunarDaysOf(y, mVal);
      if (cur[1] > dim - 1) cur[1] = dim - 1;
    }
    setLIdx(cur);
  };
  const onLunarChange = (e: any) => {
    const cur = (e.detail.value || []).map(Number);
    setLIdx(cur);
    onValueChange(buildLunar(lYearText, cur));
  };

  // 各模式的列数据（月/日/时/分）
  const sYear = clampYear(sYearText);
  const sMonthVal = MONTHS[sIdx[0]] ?? 1;
  const sDays = Array.from({ length: daysInMonth(sYear, sMonthVal) }, (_, i) => i + 1);
  const sRange = [MONTHS, sDays, HOURS, MINUTES];

  const lYear = clampYear(lYearText);
  const lMonths = lunarMonthsOf(lYear);
  const lMonthVal = lMonths[Math.min(lIdx[0], lMonths.length - 1)]?.value ?? 1;
  const lDays = Array.from({ length: lunarDaysOf(lYear, lMonthVal) }, (_, i) => i + 1);
  const lRange: any[] = [lMonths.map((x) => x.label), lDays, HOURS, MINUTES];

  const yearText = mode === 'solar' ? sYearText : lYearText;
  const onYearInput = mode === 'solar' ? onSolarYearInput : onLunarYearInput;

  return (
    <View>
      {/* 公农历切换 */}
      <View className="flex items-center gap-1 mb-1">
        <View
          className="px-2 py-1 rounded-full border"
          style={{ borderColor: mode === 'solar' ? '#8B2500' : '#E8E0D8', backgroundColor: mode === 'solar' ? '#8B2500' : '#FFFDF7' }}
          onClick={() => setMode('solar')}
        >
          <Text className="block text-xs" style={{ color: mode === 'solar' ? '#FFFDF7' : '#6B5B4F' }}>公历</Text>
        </View>
        <View
          className="px-2 py-1 rounded-full border"
          style={{ borderColor: mode === 'lunar' ? '#8B2500' : '#E8E0D8', backgroundColor: mode === 'lunar' ? '#8B2500' : '#FFFDF7' }}
          onClick={() => setMode('lunar')}
        >
          <Text className="block text-xs" style={{ color: mode === 'lunar' ? '#FFFDF7' : '#6B5B4F' }}>农历</Text>
        </View>
      </View>

      <View className="flex items-center" style={{ gap: 8 }}>
        {/* 年份：可手动输入任意历史年份，上限当前+10 */}
        <View
          className="bg-[#FFFDF7] rounded-lg border flex items-center justify-center px-2"
          style={{ borderColor: '#E8E0D8', minHeight: 48, width: 108, flexShrink: 0 }}
        >
          <Input
            type="number"
            className="text-center text-sm"
            style={{ width: 64, color: '#3A322A' }}
            value={yearText}
            maxlength={4}
            placeholder="年份"
            onInput={(e: any) => onYearInput(e.detail.value)}
          />
          <Text className="block text-sm" style={{ color: '#6B5B4F' }}>年</Text>
        </View>

        {/* 月/日/时/分：滚动选择 */}
        <Picker
          className="flex-1"
          mode="multiSelector"
          range={mode === 'solar' ? sRange : lRange}
          value={
            mode === 'solar'
              ? [sIdx[0], Math.min(sIdx[1], sDays.length - 1), sIdx[2], sIdx[3]]
              : [lIdx[0], Math.min(lIdx[1], lDays.length - 1), lIdx[2], lIdx[3]]
          }
          onChange={mode === 'solar' ? onSolarChange : onLunarChange}
          onColumnChange={mode === 'solar' ? onSolarCol : onLunarCol}
        >
          <View
            className="bg-[#FFFDF7] rounded-lg border flex items-center"
            style={{ borderColor: '#E8E0D8', minHeight: 48, padding: '0 8px' }}
          >
            <Calendar size={16} color="#8B2500" style={{ marginRight: 6 }} />
            <Text className="block text-sm" style={{ color: formatCN(value) ? '#3A322A' : '#B0A795' }}>
              {formatCN(value) || placeholder}
            </Text>
          </View>
        </Picker>
      </View>
    </View>
  );
}
