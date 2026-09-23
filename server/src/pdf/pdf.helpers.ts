import { Lunar } from 'lunar-javascript';

/** 公历日期(YYYY-MM-DD)转农历中文，仅年份则原样返回 */
export function toLunar(dateStr?: string | null): string {
  if (!dateStr) return '';
  const d = String(dateStr).trim();
  const m = d.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (!m) return d;
  try {
    const lunar = Lunar.fromDate(new Date(+m[1], +m[2] - 1, +m[3]));
    return `${lunar.getYearInChinese()}年${lunar.getMonthInChinese()}月${lunar.getDayInChinese()}`;
  } catch {
    return d;
  }
}

/** 当前公历年的干支纪年 */
export function currentGanZhiYear(): string {
  try {
    return Lunar.fromDate(new Date()).getYearInGanZhi();
  } catch {
    return '';
  }
}

/** 中文方头括号（古籍）转换：将输入的英文/中文小括号转为醒目的方头括号 */
export function toSquareBrackets(text: string): string {
  if (!text) return text;
  return String(text)
    .replace(/[（(]/g, '【')
    .replace(/[）)]/g, '】');
}

export interface VerticalOptions {
  /** 最右列的 x 坐标 */
  rightX: number;
  /** 内容区最左 x 边界 */
  leftX: number;
  /** 顶部起始 y */
  topY: number;
  /** 底部 y 边界 */
  bottomY: number;
  fontSize?: number;
  /** 列间距（竖排即每列水平间隔） */
  colGap?: number;
  color?: string;
  /** 跨页回调：新页已添加，可在此绘制纸张边框/侧栏 */
  onNewPage?: () => void;
}

/**
 * 竖排绘制（中文古籍从右至左、从上至下）。
 * 自动处理换行('\n'换列)、换列与跨页。返回结束时的坐标与是否画完。
 */
export function drawVertical(
  doc: any,
  text: string,
  opts: VerticalOptions
): { x: number; y: number; finished: boolean } {
  const fontSize = opts.fontSize ?? 20;
  const colGap = opts.colGap ?? fontSize + 14;
  const step = fontSize * 1.75;
  doc.fontSize(fontSize).fillColor(opts.color || '#1a1a1a');

  let x = opts.rightX;
  let y = opts.topY;
  const chars = Array.from(text || '');

  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    if (ch === '\n') {
      x -= colGap;
      y = opts.topY;
      if (x < opts.leftX) {
        doc.addPage({ size: [980, 1380], margin: 0 });
        opts.onNewPage?.();
        x = opts.rightX;
      }
      continue;
    }
    if (y + step > opts.bottomY) {
      x -= colGap;
      y = opts.topY;
      if (x < opts.leftX) {
        doc.addPage({ size: [980, 1380], margin: 0 });
        opts.onNewPage?.();
        x = opts.rightX;
      }
    }
    doc.text(ch, x, y, { lineBreak: false, characterSpacing: 0 });
    y += step;
  }
  return { x, y, finished: true };
}

/** 竖排绘制右侧栏文字（逐字直立、字距大，含页码与堂号）
 *  模板格式：`家族名xxx 第N页 堂号`，逐字竖排居中于侧栏中线 */
function toChineseNumber(n: number): string {
  const digits = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
  const units = ['', '十', '百', '千'];
  if (n <= 0) return digits[n] || String(n);
  const s = String(n);
  let out = '';
  const len = s.length;
  for (let i = 0; i < len; i++) {
    const d = +s[i];
    const u = units[len - 1 - i];
    if (d === 0) {
      if (out && !out.endsWith('零') && i < len - 1) out += '零';
    } else {
      out += digits[d] + u;
    }
  }
  out = out.replace(/零+/g, '零').replace(/零$/g, '');
  if (out.startsWith('一十')) out = out.slice(1);
  return out;
}

/** 数字转中文（供世代序号等使用） */
export function toChineseNum(n: number): string {
  return toChineseNumber(n);
}

export function drawSidebar(doc: any, text: string, pageNo: number, hallName?: string) {
  const x = 925; // 110px 侧栏中线 (870 + 110/2)
  let y = 60;
  doc.fontSize(22).fillColor('#3a2410');
  const pageCn = toChineseNumber(pageNo);
  const full = hallName ? `${text} 第${pageCn}页 ${hallName}` : `${text} 第${pageCn}页`;
  const chars = Array.from(full);
  // 自适应步距：文字较长时收紧间距，保证整条侧栏不溢出页面底部（修复侧边栏末尾被截断）
  const step = Math.min(58, Math.floor((1100 - 60) / Math.max(1, chars.length)));
  chars.forEach((ch) => {
    if (ch === ' ') {
      y += step * 0.7;
      return;
    }
    doc.text(ch, x, y, { lineBreak: false, characterSpacing: 0 });
    y += step;
  });
}
