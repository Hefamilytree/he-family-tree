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

/** 竖排绘制右侧栏文字（逐字直立、字距大） */
export function drawSidebar(doc: any, text: string, hallName?: string) {
  const x = 912; // 110px 侧栏中线 (842 + 55)
  let y = 60;
  doc.fontSize(22).fillColor('#3a2410');
  const full = hallName ? `${text} ${hallName}` : text;
  Array.from(full).forEach((ch) => {
    if (ch === ' ') {
      y += 20;
      return;
    }
    doc.text(ch, x, y, { lineBreak: false });
    y += 60;
  });
}
