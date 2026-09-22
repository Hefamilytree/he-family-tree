import { Injectable } from '@nestjs/common';
import { join } from 'path';
import { existsSync } from 'fs';
import * as PDFDocument from 'pdfkit';
import { getSupabaseClient } from '../storage/database/supabase-client';
import { toLunar, currentGanZhiYear, drawVertical, drawSidebar, toChineseNum } from './pdf.helpers';

interface RawMember {
  id: string;
  name: string;
  gender: string;
  generation: number;
  generation_title?: string | null;
  birth_date?: string | null;
  death_date?: string | null;
  parent_id?: string | null;
  bio?: string | null;
  burial_place?: string | null;
  is_alive?: string;
  spouses?: any[];
}

interface CulturalItem {
  category: string;
  title: string;
  content: string | null;
  sort_order?: number;
}

const PAGE_W = 980;
const PAGE_H = 1380;
// 页边距：左装订线 95，右(1cm+110侧栏) 148，上下 76
const M_TOP = 80;
const M_BOTTOM = 76;
const M_LEFT = 100;
const RIGHT_X = PAGE_W - 150; // 竖排首列 x
const BOTTOM_Y = PAGE_H - M_BOTTOM;
const PAPER = '#fff8e7';
const INK = '#1a1a1a';
const BROWN = '#9a7b4f';

/** 右侧栏内竖排绘制页码 */

@Injectable()
export class PdfService {
  private get supabase() {
    return getSupabaseClient();
  }

  private fontPath(): string {
    const candidates = [
      join(process.cwd(), 'assets/fonts/LXGWWenKaiLite-Regular.ttf'),
      join(process.cwd(), 'server/assets/fonts/LXGWWenKaiLite-Regular.ttf'),
      join(__dirname, '../assets/fonts/LXGWWenKaiLite-Regular.ttf'),
      join(__dirname, '../../assets/fonts/LXGWWenKaiLite-Regular.ttf'),
    ];
    const found = candidates.find((p) => existsSync(p));
    if (!found) console.warn('[pdf] 楷体字体未找到，将使用内置字体', candidates[0]);
    return found || candidates[0];
  }

  /** 按与前端一致的规则过滤成员 */
  private filterMembers(
    all: RawMember[],
    opts: { mode: string; branchId: string; toAncestor: boolean; startGen?: number; endGen?: number }
  ): RawMember[] {
    if (opts.mode !== 'branch' || !opts.branchId) return all;
    const root = all.find((m) => m.id === opts.branchId);
    const picked: RawMember[] = [];
    if (root) {
      const queue = [root.id];
      while (queue.length) {
        const cur = queue.shift()!;
        const m = all.find((x) => x.id === cur);
        if (m) {
          picked.push(m);
          all.filter((x) => x.parent_id === cur).forEach((c) => queue.push(c.id));
        }
      }
      if (opts.toAncestor) {
        let p: RawMember | undefined = root;
        let guard = 0;
        while (p && p.parent_id && guard++ < 300) {
          const pa = all.find((x) => x.id === p!.parent_id);
          if (!pa) break;
          picked.push(pa);
          p = pa;
        }
      }
    }
    let result = picked;
    if (typeof opts.startGen === 'number') {
      result = result.filter((m) => (m.generation || 1) >= opts.startGen!);
    }
    if (typeof opts.endGen === 'number') {
      result = result.filter((m) => (m.generation || 0) <= opts.endGen!);
    }
    return Array.from(new Map(result.map((m) => [m.id, m])).values());
  }

  private memberLine(m: RawMember): string {
    const parts: string[] = [m.name];
    const genTxt = m.generation_title
      ? `第${toChineseNum(m.generation)}世·${m.generation_title}`
      : `第${toChineseNum(m.generation)}世`;
    parts.push(genTxt);
    if (m.birth_date) parts.push(`生於${toLunar(m.birth_date)}`);
    if (!m.birth_date) parts.push('生失考');
    if (m.is_alive === 'no' || m.death_date) {
      parts.push(m.death_date ? `卒於${toLunar(m.death_date)}` : '卒失考');
    }
    if (m.burial_place && m.burial_place !== '葬地不详') parts.push(`葬${m.burial_place}`);
    const spouses = (m.spouses || []).filter((s) => s && s.name);
    if (spouses.length) {
      spouses.forEach((s) => {
        let sp = `配${s.name}`;
        if (s.status === 'deceased' || s.death_date) {
          if (s.birth_date) sp += `，生於${toLunar(s.birth_date)}`;
          if (s.death_date) sp += `，卒於${toLunar(s.death_date)}`;
        }
        parts.push(sp);
      });
    }
    if (m.bio) parts.push(m.bio);
    return parts.join('，') + '。';
  }

  async generate(query: {
    mode?: string;
    branch?: string;
    toAncestor?: string;
    startGen?: string;
    endGen?: string;
  }): Promise<PDFKit.PDFDocument> {
    // ---------- 数据 ----------
    const [famRes, memRes, culRes, spoRes] = await Promise.all([
      this.supabase.from('families').select('*').order('created_at', { ascending: true }),
      this.supabase.from('members').select('*').order('generation', { ascending: true }),
      this.supabase.from('cultural_heritage').select('*').order('sort_order', { ascending: true }),
      this.supabase.from('spouses').select('*'),
    ]);

    const family = (famRes.data?.[0] || { surname: '何', family_name: '何氏', hall_name: '' }) as any;
    const allMembers: RawMember[] = memRes.data || [];
    const spouses: any[] = spoRes.data || [];
    const spouseMap = new Map<string, any[]>();
    spouses.forEach((s) => {
      const arr = spouseMap.get(s.member_id) || [];
      arr.push(s);
      spouseMap.set(s.member_id, arr);
    });
    allMembers.forEach((m) => (m.spouses = spouseMap.get(m.id) || []));

    const startGen = query.startGen ? parseInt(query.startGen, 10) : undefined;
    const endGen = query.endGen ? parseInt(query.endGen, 10) : undefined;
    const members = this.filterMembers(allMembers, {
      mode: query.mode || 'full',
      branchId: query.branch || '',
      toAncestor: (query.toAncestor ?? '1') !== '0',
      startGen: Number.isNaN(startGen as number) ? undefined : startGen,
      endGen: Number.isNaN(endGen as number) ? undefined : endGen,
    }).sort((a, b) => a.generation - b.generation);

    const cultural: CulturalItem[] = culRes.data || [];
    const byCat = (cat: string) => cultural.filter((c) => c.category === cat);
    const surname = family.surname || '何';
    const shiName = `${surname}氏`;
    const hall = family.hall_name || '';
    const ganzhi = currentGanZhiYear();

    // ---------- 文档 ----------
    const PdfCtor: any = (PDFDocument as any).default || PDFDocument;
    const doc = new PdfCtor({ size: [PAGE_W, PAGE_H], margin: 0, autoFirstPage: false });
    doc.registerFont('kai', this.fontPath());
    doc.font('kai');

    let pageNo = 0;

    const newPaper = (sidebarText: string) => {
      pageNo += 1;
      doc.addPage({ size: [PAGE_W, PAGE_H], margin: 0 });
      doc.rect(0, 0, PAGE_W, PAGE_H).fill(PAPER);
      doc.rect(0, 0, PAGE_W, PAGE_H).lineWidth(2).strokeColor(INK).stroke();
      doc.lineWidth(2).moveTo(PAGE_W - 110, 0).lineTo(PAGE_W - 110, PAGE_H).strokeColor(INK).stroke();
      drawSidebar(doc, sidebarText, pageNo, hall);
    };

    // 封面为第 1 页（无侧栏、无页码），使其后目录成为第二页
    pageNo = 1;

    const pageTitle = (text: string) => {
      doc.fontSize(34).fillColor(INK).text(text, M_LEFT, M_TOP - 20, {
        width: RIGHT_X - M_LEFT, align: 'center', characterSpacing: 10,
      });
      doc.moveTo(M_LEFT, M_TOP + 34).lineTo(RIGHT_X, M_TOP + 34).lineWidth(2).strokeColor(BROWN).stroke();
    };

    const verticalText = (text: string, sidebar: string, title?: string) => {
      newPaper(sidebar);
      if (title) pageTitle(title);
      drawVertical(doc, text, {
        rightX: RIGHT_X,
        leftX: M_LEFT,
        topY: title ? M_TOP + 70 : M_TOP + 10,
        bottomY: BOTTOM_Y,
        fontSize: 20,
        onNewPage: () => {
          pageNo += 1;
          doc.rect(0, 0, PAGE_W, PAGE_H).fill(PAPER);
          doc.rect(0, 0, PAGE_W, PAGE_H).lineWidth(2).strokeColor(INK).stroke();
          doc.lineWidth(2).moveTo(PAGE_W - 110, 0).lineTo(PAGE_W - 110, PAGE_H).strokeColor(INK).stroke();
          drawSidebar(doc, sidebar, pageNo, hall);
        },
      });
    };

    // ===== 1. 封面（9.21 新模板：竖版 980×1380 单页；中央主框 + 框左侧上下副文 + 左下纪年 + 框右侧堂号） =====
    {
      doc.addPage({ size: [PAGE_W, PAGE_H], margin: 0 });
      doc.rect(0, 0, PAGE_W, PAGE_H).fill(PAPER);
      doc.rect(0, 0, PAGE_W, PAGE_H).lineWidth(2).strokeColor(INK).stroke();

      // 中央主标题框 cover-title-box：right:26% top:10% width:22% height:80%
      // 水平 left=509.6 right=725.2；垂直 top=138 bottom=1242；中心 x≈617
      const boxL = 510;
      const boxR = 725;
      const boxT = 138;
      const boxB = 1242;
      const boxCX = (boxL + boxR) / 2;

      // 主框内竖排：家族名(title-name 小) + 族譜(title-word 大)，整体居中于框中央一列
      const titleText = `${family.family_name || shiName}族譜`;
      const tFs = boxR - boxL < 230 ? 60 : 66;
      const stepT = tFs * 1.75;
      const totalH = Array.from(titleText).length * stepT;
      // 字左边使列中心 = 框中心
      const tX = boxCX - tFs / 2;
      const tTop = (boxT + boxB) / 2 - totalH / 2;
      doc.lineWidth(2).strokeColor('#111111');
      doc.rect(boxL, boxT, boxR - boxL, boxB - boxT).stroke();
      doc.rect(boxL + 10, boxT + 10, boxR - boxL - 20, boxB - boxT - 20).stroke();
      drawVertical(doc, titleText, { rightX: tX, leftX: boxL, topY: tTop, bottomY: boxB, fontSize: tFs, color: '#111111' });

      // 右侧堂号 cover-hall：right:12% top:20% → 字左边≈862-42=820，顶部 y=276
      if (hall) drawVertical(doc, hall, { rightX: 820, leftX: 745, topY: 276, bottomY: 700, fontSize: 42, color: '#111111' });

      // 框左侧上部副文 cover-sub-1 宗族源远：left:34% top:32% → x=333, y=442
      drawVertical(doc, '宗族源远', { rightX: 333, leftX: 280, topY: 442, bottomY: 660, fontSize: 28, color: '#111111' });

      // 框左侧下部副文 cover-sub-2 世代绵延：left:34% top:62% → x=333, y=856
      drawVertical(doc, '世代绵延', { rightX: 333, leftX: 280, topY: 856, bottomY: 1080, fontSize: 28, color: '#111111' });

      // 左下重修纪年 cover-date：left:16% bottom:14% → 字左边 x=157，向上排，底缘 y=1187
      const dateText = `${ganzhi}年重修`;
      drawVertical(doc, dateText, { rightX: 157, leftX: 80, topY: 1187 - Array.from(dateText).length * 56, bottomY: 1187, fontSize: 32, color: '#111111' });
    }

    // ===== 2. 目录 =====
    {
      newPaper(`${shiName}家族总目录`);
      pageTitle('目 录');
      const catalog = ['一、家族源流', '二、家风', '三、家训', '四、家族字辈排行', '五、家族事记', '六、世代人名索引', '七、历代世系总图', '八、卷末编写说明与后记'];
      doc.fontSize(26).fillColor(INK);
      let y = M_TOP + 100;
      catalog.forEach((c) => {
        doc.text(c, M_LEFT + 40, y, { lineBreak: false, characterSpacing: 5 });
        y += 76;
      });
    }

    // ===== 3. 家族源流（连接主程序家族源流，无需重复设置） =====
    {
      const srcParts: string[] = [];
      if (family.origin) srcParts.push(family.origin);
      if (family.description) srcParts.push(family.description);
      ['merit', 'migration'].forEach((cat) => {
        byCat(cat).forEach((i) => srcParts.push(i.content || ''));
      });
      const text = srcParts.filter(Boolean).join('\n\n');
      if (text) verticalText(text, `${shiName}家族源流`, '家族源流');
    }

    // ===== 4. 家风 / 家训（两个独立单元，各自连接小程序板块） =====
    {
      const familyStyle = byCat('family_style').concat(byCat('family_motto')).map((i) => i.content).filter(Boolean).join('\n');
      const familyRule = [family.motto, ...byCat('family_instruction').map((i) => i.content).filter(Boolean)]
        .filter(Boolean).join('\n') || byCat('family_motto').map((i) => i.content).filter(Boolean).join('\n');
      const left = familyStyle; // 家风
      const right = familyRule; // 家训
      if (left || right) {
        newPaper(`${shiName}家风家训祖训`);
        pageTitle('家风家训祖训');
        const colTop = M_TOP + 80;
        const colBottom = BOTTOM_Y;
        const onNew = (sb: string) => () => {
          pageNo += 1;
          doc.rect(0, 0, PAGE_W, PAGE_H).fill(PAPER);
          doc.rect(0, 0, PAGE_W, PAGE_H).lineWidth(2).strokeColor(INK).stroke();
          doc.lineWidth(2).moveTo(PAGE_W - 110, 0).lineTo(PAGE_W - 110, PAGE_H).stroke();
          drawSidebar(doc, sb, pageNo, hall);
        };
        // 右栏（家训），左栏（家风）
        drawVertical(doc, right || '', { rightX: RIGHT_X - 60, leftX: M_LEFT + 250, topY: colTop, bottomY: colBottom, fontSize: 19, onNewPage: onNew(`${shiName}家风家训祖训`) });
        drawVertical(doc, left || '', { rightX: RIGHT_X - 330, leftX: M_LEFT + 30, topY: colTop, bottomY: colBottom, fontSize: 19, onNewPage: onNew(`${shiName}家风家训祖训`) });
        // 栏目标签（竖排）
        doc.fontSize(22).fillColor('#3a2410');
        drawVertical(doc, '家训', { rightX: RIGHT_X, leftX: RIGHT_X - 40, topY: colTop, bottomY: colTop + 140, fontSize: 22 });
        drawVertical(doc, '家风', { rightX: M_LEFT + 240, leftX: M_LEFT + 200, topY: colTop, bottomY: colTop + 140, fontSize: 22 });
      }
    }

    // ===== 5. 家族字辈排行 =====
    {
      const titleSet = new Map<number, Set<string>>();
      members.forEach((m) => {
        if (m.generation_title) {
          if (!titleSet.has(m.generation)) titleSet.set(m.generation, new Set());
          titleSet.get(m.generation)!.add(m.generation_title);
        }
      });
      const rankLines: string[] = [];
      Array.from(titleSet.keys()).sort((a, b) => a - b).forEach((g) => {
        rankLines.push(`第${toChineseNum(g)}世：${Array.from(titleSet.get(g)!).join('、')}`);
      });
      const culturalRank = byCat('honor').map((i) => i.content).filter(Boolean).join('\n\n');
      const rankBody = rankLines.join('\n');
      // 打印显示全部内容：优先完整引用「家族字辈」honor 板块（含“如下：”引导与全部辈字），
      // 该板块为空时才回退到按成员 generation_title 推导的字辈行。
      const text = culturalRank
        ? (rankBody ? `${culturalRank}\n\n--- 另可参考成员世系字辈 ---\n\n${rankBody}` : culturalRank)
        : (rankBody ? `何氏族谱字辈如下：\n${rankBody}` : '');
      if (text) verticalText(text, `${shiName}家族字辈排行`, '家族字辈排行');
    }

    // ===== 6. 家族大事记略 =====
    {
      const ev = byCat('family_history').concat(byCat('person_history')).concat(byCat('event'));
      const text = ev.map((i) => `${i.title}：${i.content || ''}`).join('\n\n');
      if (text) verticalText(text, `${shiName}家族事记`, '家族事记');
    }

    // ===== 7. 世代人名索引（两列，按世分组；人名后标注其所在“历代世系表”的相对页，使用阿拉伯数字） =====
    {
      // 先模拟历代世系表分页：记录每个成员所在世系表相对页（第1页起），与第8节排版规则一致
      const pageOf = new Map<string, number>();
      {
        let _y = M_TOP + 80;
        let _pg = 1;
        const _lineX = M_LEFT;
        const _textX = M_LEFT + 92;
        const _maxW = RIGHT_X - _textX;
        doc.fontSize(20);
        members.forEach((m) => {
          const line = this.memberLine(m);
          const h = Math.max(56, doc.heightOfString(line, { width: _maxW }) + 24);
          if (_y + h > BOTTOM_Y) {
            _pg += 1;
            _y = M_TOP + 80;
          }
          pageOf.set(m.id, _pg);
          _y += h;
        });
      }
      const genMap = new Map<number, string[]>();
      members.forEach((m) => {
        if (!genMap.has(m.generation)) genMap.set(m.generation, []);
        genMap.get(m.generation)!.push(m.name);
      });
      if (genMap.size) {
        newPaper(`${shiName}世代人名索引`);
        pageTitle('世代人名索引');
        const groups = Array.from(genMap.keys()).sort((a, b) => a - b);
        const colW = (RIGHT_X - M_LEFT) / 2;
        const drawGroup = (gen: number, names: string[], x: number, startY: number): number => {
          let y = startY;
          doc.lineWidth(2).strokeColor('#2b1a08');
          doc.rect(x, y, colW - 24, 48).fillAndStroke('rgba(154,123,79,0.12)', '#2b1a08');
          doc.fillColor(INK).fontSize(22).text(`第${toChineseNum(gen)}世`, x, y + 9, { width: colW - 24, align: 'center', characterSpacing: 4 });
          y += 48;
          doc.fontSize(19);
          names.forEach((n) => {
            const m = members.find((mm) => mm.name === n && mm.generation === gen);
            const relPage = m ? pageOf.get(m.id) : undefined;
            // 人名 + 阿拉伯数字相对页（如 “何氏族谱 3”）；页号指向该成员在“历代世系表”中的位置
            doc.text(`${n}，${relPage ?? '—'}`, x + 12, y, { lineBreak: false, characterSpacing: 2 });
            doc.moveTo(x + 10, y + 30).lineTo(x + colW - 34, y + 30).dash(2, 2).strokeColor('#b59565').stroke();
            doc.undash();
            y += 34;
          });
          return y + 16;
        };
        // 简单两列平衡：按组数量对半
        const half = Math.ceil(groups.length / 2);
        let yL = M_TOP + 80;
        let yR = M_TOP + 80;
        groups.forEach((g, idx) => {
          const isLeft = idx < half;
          const x = isLeft ? M_LEFT : M_LEFT + colW;
          if (isLeft) yL = drawGroup(g, genMap.get(g)!, x, yL);
          else yR = drawGroup(g, genMap.get(g)!, x, yR);
        });
      }
    }

    // ===== 8. 历代世系表（横排，黑底世数标签） =====
    {
      if (members.length) {
        newPaper(`${shiName}历代世系表`);
        pageTitle('历代世系图');
        let y = M_TOP + 80;
        const lineX = M_LEFT;
        const textX = M_LEFT + 92;
        const maxW = RIGHT_X - textX;
        doc.fontSize(20);
        members.forEach((m) => {
          const line = this.memberLine(m);
          const h = Math.max(56, doc.heightOfString(line, { width: maxW }) + 24);
          if (y + h > BOTTOM_Y) {
            newPaper(`${shiName}历代世系表`);
            pageTitle('历代世系图');
            y = M_TOP + 80;
          }
          // 黑底世数标签
          doc.rect(lineX, y + 4, 76, 38).fill(INK);
          doc.fillColor('#fff').fontSize(19).text(`第${toChineseNum(m.generation)}世`, lineX, y + 11, { width: 76, align: 'center' });
          doc.fillColor(INK).fontSize(20);
          doc.text(line, textX, y, { width: maxW });
          doc.moveTo(lineX, y + h - 4).lineTo(RIGHT_X, y + h - 4).lineWidth(1).strokeColor(INK).stroke();
          y += h;
        });
      }
    }

    // ===== 9. 卷末后记（后记 / 编写说明 两栏） =====
    {
      const ps = byCat('afterword').map((i) => i.content).filter(Boolean).join('\n');
      const note = byCat('editorial_note').map((i) => i.content).filter(Boolean).join('\n');
      if (ps || note) {
        newPaper(`${shiName}卷末编录后记`);
        pageTitle('卷末');
        const colTop = M_TOP + 80;
        const onNew = (sb: string) => () => {
          pageNo += 1;
          doc.rect(0, 0, PAGE_W, PAGE_H).fill(PAPER);
          doc.rect(0, 0, PAGE_W, PAGE_H).lineWidth(2).strokeColor(INK).stroke();
          doc.lineWidth(2).moveTo(PAGE_W - 110, 0).lineTo(PAGE_W - 110, PAGE_H).stroke();
          drawSidebar(doc, sb, pageNo, hall);
        };
        drawVertical(doc, note, { rightX: RIGHT_X - 60, leftX: M_LEFT + 250, topY: colTop, bottomY: BOTTOM_Y, fontSize: 19, onNewPage: onNew(`${shiName}卷末编录后记`) });
        drawVertical(doc, ps, { rightX: RIGHT_X - 330, leftX: M_LEFT + 30, topY: colTop, bottomY: BOTTOM_Y, fontSize: 19, onNewPage: onNew(`${shiName}卷末编录后记`) });
        doc.fontSize(22).fillColor('#3a2410');
        drawVertical(doc, '编写说明', { rightX: RIGHT_X, leftX: RIGHT_X - 40, topY: colTop, bottomY: colTop + 200, fontSize: 22 });
        drawVertical(doc, '后记', { rightX: M_LEFT + 240, leftX: M_LEFT + 200, topY: colTop, bottomY: colTop + 140, fontSize: 22 });
      }
    }

    // 若无任何内容页，至少保留封面
    if (doc.bufferedPageRange().count === 0) {
      doc.addPage({ size: [PAGE_W, PAGE_H], margin: 0 });
      doc.rect(0, 0, PAGE_W, PAGE_H).fill(PAPER);
    }
    doc.end();
    return doc;
  }
}
