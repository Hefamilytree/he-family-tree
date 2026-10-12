import { useState } from 'react';
import { View, Text, Picker } from '@tarojs/components';
import { Calendar } from 'lucide-react-taro';
import { Lunar, LunarYear } from 'lunar-javascript';

interface Props {
  value: string;             // 存储值：YYYY-MM-DD 或 YYYY-MM-DD HH:mm 或 ''
  placeholder?: string;
  onValueChange: (v: string) => void;
}

const YEARS: number[] = [];
const CUR_Y = new Date().getFullYear();
for (let y = 1900; y <= CUR_Y + 10; y++) YEARS.push(y);
const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);

function pad(n: number) { return n < 10 ? `0${n}` : `${n}`; }
function daysInMonth(y: number, m: number) {
  return new Date(y, m, 0).getDate();
}
const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

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
    return MONTHS.map((m) => ({ value: m, label: `${CN_M[m]}月` }));
  }
}

/** 某农历年某月（可为负=闰月）的天数 */
function lunarDaysOf(year: number, month: number): number {
  try {
    // 探测天数：从 30 向下找合法日
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

/** 根据存储值解析出公历（年/月/日/时/分） */
function parseValue(v: string) {
  const hm = v.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})[T ](\d{1,2}):(\d{1,2})/);
  const d = v.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  const y = d ? +d[1] : CUR_Y;
  const mo = d ? +d[2] : 1;
  const da = d ? +d[3] : 1;
  const h = hm ? +hm[4] : 0;
  const mi = hm ? +hm[5] : 0;
  return { y, mo, da, h, mi };
}

/** 根据存储值（公历）得到其农历 年月 值表述（用于农历模式列初始定位） */
function lunarOffsetFromValue(v: string): { lYear: number; lMonth: { value: number; label: string }; cloneNumber: number } {
  const { y, mo, da } = parseValue(v || '');
  let lYear = y;
  let lMonth = 1;
  let cloneNumber = 1;
  try {
    const lunar = Lunar.fromDate(new Date(y, mo - 1, da));
    lYear = lunar.getYear();
    const monthVal = lunar.getMonth(); // 负为闰月
    lMonth = monthVal;
    // 找到该农历年月份列表中的索引
  } catch { /* fallback */ }
  void cloneNumber;
  return { lYear, lMonth: { value: lMonth, label: '' }, cloneNumber: 1 };
}

function formatCN(v: string): string {
  if (!v) return '';
  const p = parseValue(v);
  const hm = v.match(/[T ](\d{1,2}):(\d{1,2})/);
  const time = hm ? ` ${+hm[1]}时${pad(+hm[2])}分` : '';
  return `${p.y}年${p.mo}月${p.da}日${time}`;
}

export default function DateTimePicker({ value, placeholder = '请选择日期', onValueChange }: Props) {
  const p = parseValue(value || '');
  const [mode, setMode] = useState<'solar' | 'lunar'>('solar');

  // 公历列
  const [sIdx, setSIdx] = useState<number[]>([
    Math.max(0, YEARS.indexOf(p.y)),
    Math.max(0, p.mo - 1),
    Math.max(0, p.da - 1),
    p.h,
    Math.max(0, MINUTES.indexOf(Math.floor(p.mi / 5) * 5)),
  ]);

  // 农历：初始定位到值对应的农历年
  const initialL = lunarOffsetFromValue(value || '');
  const [lIdx, setLIdx] = useState<number[]>([
    Math.max(0, YEARS.indexOf(initialL.lYear)),
    Math.max(0, Math.abs(initialL.lMonth.value) - 1),
    0,
    p.h,
    Math.max(0, MINUTES.indexOf(Math.floor(p.mi / 5) * 5)),
  ]);

  const sRange = [YEARS, MONTHS, Array.from({ length: 31 }, (_, i) => i + 1), HOURS, MINUTES];

  const buildSolar = (cur: number[]) => {
    const y = YEARS[cur[0]] ?? CUR_Y;
    const mo = MONTHS[cur[1]] ?? 1;
    const dim = daysInMonth(y, mo);
    const da = Math.min(DAYS[cur[2]] ?? 31, dim);
    const h = HOURS[cur[3]] ?? 0;
    const mi = MINUTES[cur[4]] ?? 0;
    return `${y}-${pad(mo)}-${pad(da)} ${pad(h)}:${pad(mi)}`;
  };

  const buildLunar = (cur: number[]) => {
    const y = YEARS[cur[0]] ?? CUR_Y;
    const months = lunarMonthsOf(y);
    const mVal = months[Math.min(cur[1], months.length - 1)]?.value ?? 1;
    const dim = lunarDaysOf(y, mVal);
    const da = Math.min(DAYS[cur[2]] ?? 31, dim);
    const h = HOURS[cur[3]] ?? 0;
    const mi = MINUTES[cur[4]] ?? 0;
    try {
      const solar = Lunar.fromYmd(y, mVal, da).getSolar();
      return `${solar.getYear()}-${pad(solar.getMonth())}-${pad(solar.getDay())} ${pad(h)}:${pad(mi)}`;
    } catch {
      return `${y}-01-01 ${pad(h)}:${pad(mi)}`;
    }
  };

  const onSolarCol = (e: any) => {
    const cur = [...sIdx];
    const col = Number(e.detail.column);
    const row = Number(e.detail.value);
    cur[col] = row;
    if (col === 1) {
      const y = YEARS[cur[0]] ?? CUR_Y;
      const mo = MONTHS[cur[1]] ?? 1;
      const dim = daysInMonth(y, mo);
      if (cur[2] > dim - 1) cur[2] = dim - 1;
    }
    setSIdx(cur);
  };
  const onSolarChange = (e: any) => {
    const cur = (e.detail.value || []).map(Number);
    setSIdx(cur);
    onValueChange(buildSolar(cur));
  };

  const onLunarCol = (e: any) => {
    const cur = [...lIdx];
    const col = Number(e.detail.column);
    const row = Number(e.detail.value);
    cur[col] = row;
    if (col === 0) {
      // 年改变：重置月、日
      cur[1] = 0;
      cur[2] = 0;
    } else if (col === 1) {
      const y = YEARS[cur[0]] ?? CUR_Y;
      const mVal = lunarMonthsOf(y)[Math.min(cur[1], lunarMonthsOf(y).length - 1)]?.value ?? 1;
      const dim = lunarDaysOf(y, mVal);
      if (cur[2] > dim - 1) cur[2] = dim - 1;
    }
    setLIdx(cur);
  };
  const onLunarChange = (e: any) => {
    const cur = (e.detail.value || []).map(Number);
    setLIdx(cur);
    onValueChange(buildLunar(cur));
  };

  const lY = YEARS[lIdx[0]] ?? CUR_Y;
  const lRange: any[] = [YEARS, lunarMonthsOf(lY).map((x) => x.label)];
  if (lIdx[0] < lIdx[0] + 0) { void 0; }
  const mValSel = lunarMonthsOf(lY)[Math.min(lIdx[1] || 0, lunarMonthsOf(lY).length - 1)]?.value ?? 1;
  lRange.push(Array.from({ length: lunarDaysOf(lY, mValSel) }, (_, i) => i + 1));
  lRange.push(HOURS, MINUTES);

  return (
    <View>
      {/* 公农历切换 */}
      <View className="flex items-center gap-1 mb-1">
        <View
          className="px-2 py-1 rounded-full border"
          style={{ borderColor: mode === 'solar' ? '#8B2500' : '#E8E0D8', backgroundColor: mode === 'solar' ? '#8B2500' : '#FFFDF7' }}
          onClick={() => setMode('solar')}
        >
          <Text className="text-xs" style={{ color: mode === 'solar' ? '#FFFDF7' : '#6B5B4F' }}>公历</Text>
        </View>
        <View
          className="px-2 py-1 rounded-full border"
          style={{ borderColor: mode === 'lunar' ? '#8B2500' : '#E8E0D8', backgroundColor: mode === 'lunar' ? '#8B2500' : '#FFFDF7' }}
          onClick={() => setMode('lunar')}
        >
          <Text className="text-xs" style={{ color: mode === 'lunar' ? '#FFFDF7' : '#6B5B4F' }}>农历</Text>
        </View>
      </View>

      {mode === 'solar' ? (
        <Picker
          mode="multiSelector"
          range={sRange}
          value={sIdx}
          onChange={onSolarChange}
          onColumnChange={onSolarCol}
        >
          <View className="bg-[#FFFDF7] rounded-lg p-2 border flex items-center" style={{ borderColor: '#E8E0D8', minHeight: 48 }}>
            <Calendar size={16} color="#8B2500" style={{ marginRight: 8 }} />
            <Text className="block text-sm" style={{ color: formatCN(value) ? '#3A322A' : '#B0A795' }}>
              {formatCN(value) || placeholder}
            </Text>
          </View>
        </Picker>
      ) : (
        <Picker
          mode="multiSelector"
          range={lRange}
          value={[lIdx[0], Math.min(lIdx[1], lRange[1].length - 1), lIdx[2], lIdx[3], lIdx[4]]}
          onChange={onLunarChange}
          onColumnChange={onLunarCol}
        >
          <View className="bg-[#FFFDF7] rounded-lg p-2 border flex items-center" style={{ borderColor: '#E8E0D8', minHeight: 48 }}>
            <Calendar size={16} color="#8B2500" style={{ marginRight: 8 }} />
            <Text className="block text-sm" style={{ color: formatCN(value) ? '#3A322A' : '#B0A795' }}>
              {formatCN(value) || placeholder}
            </Text>
          </View>
        </Picker>
      )}
    </View>
  );
}