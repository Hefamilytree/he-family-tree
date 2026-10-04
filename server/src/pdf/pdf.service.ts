import { Injectable } from '@nestjs/common';
import { join } from 'path';
import { existsSync } from 'fs';
import * as PDFDocument from 'pdfkit';
import { getSupabaseClient } from '../storage/database/supabase-client';
import { bySeniority } from '@/common/seniority';
import { toLunar, currentGanZhiYear, drawVertical, drawSidebar, toChineseNum, toSquareBrackets } from './pdf.helpers';

interface RawMember {
  id: string;
  name: string;
  courtesy_name?: string | null;
  gender: string;
  generation: number;
  generation_title?: string | null;
  birth_date?: string | null;
  death_date?: string | null;
  parent_id?: string | null;
  bio?: string | null;
  burial_place?: string | null;
  is_alive?: string;
  created_at?: string | null;
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
    // 父辈亲兄弟：从「父亲辈」起逐代向上收集每一代同辈亲兄弟（含配偶），直到始祖辈；不含本人辈及其子女
    if (opts.mode === 'siblings' && opts.branchId) {
      const picked = new Set<string>();
      const base = all.find((m) => m.id === opts.branchId);
      if (base) {
        // 从父亲辈开始向上
        const first = base.parent_id
          ? all.find((m) => m.id === base.parent_id)
          : base;
        let p: RawMember | undefined = first || base;
        const seen = new Set<string>();
        let guard = 0;
        while (p && !seen.has(p.id) && guard++ < 500) {
          seen.add(p.id);
          const pid = (p.parent_id ?? null) as string | null;
          // 该代亲兄弟 = 与 p 同父的所有成员（含 p 自身）
          all
            .filter((m) => (m.hasOwnProperty('parent_id') ? m.parent_id : null) === pid)
            .forEach((m) => picked.add(m.id));
          if (!pid) break; // 已到始祖辈（根）
          p = all.find((x) => x.id === pid);
        }
      }
      return all.filter((m) => picked.has(m.id));
    }
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
    if (m.courtesy_name) parts.push(`字${m.courtesy_name}`);
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
      // 与 /api/family 前端当前家族一致：取最新创建的家族，避免打印出旧/演示家族（如张氏百忍堂）
      this.supabase.from('families').select('*').order('created_at', { ascending: false }).limit(1),
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
    }).sort(bySeniority);

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
      drawVertical(doc, toSquareBrackets(text), {
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

      // 中央主标题框（严格按 A4 模板等比换算到 980×1380）：
      // 模板双线框 x≈310–441(占宽 0.521–0.741)、y≈86–757(占高 0.102–0.900)
      const boxL = 511;
      const boxR = 726;
      const boxT = 141;
      const boxB = 1242;
      const boxCX = (boxL + boxR) / 2;

      // 主框内竖排：族譜大字（模板框中竖排 5 字），整体居中于框中央一列
      const titleText = `${family.family_name || shiName}族譜`;
      const tFs = 52;
      const stepT = tFs * 1.72;
      const totalH = Array.from(titleText).length * stepT;
      // 字左边使列中心 = 框中心
      const tX = boxCX - tFs / 2;
      const tTop = (boxT + boxB) / 2 - totalH / 2;
      doc.lineWidth(2).strokeColor('#111111');
      doc.rect(boxL, boxT, boxR - boxL, boxB - boxT).stroke();
      doc.rect(boxL + 10, boxT + 10, boxR - boxL - 20, boxB - boxT - 20).stroke();
      drawVertical(doc, titleText, { rightX: tX, leftX: boxL, topY: tTop, bottomY: boxB, fontSize: tFs, color: '#111111' });

      // 堂号列：模板右侧竖排小字列 x≈500–523 → 换算 x≈825–862，从 y≈287 起向下
      if (hall) drawVertical(doc, hall, { rightX: 858, leftX: 812, topY: 287, bottomY: 1000, fontSize: 32, color: '#111111' });

      // 左下重修纪年：模板无明显左列副文，仅保留纪年（底缘偏下）
      const dateText = `${ganzhi}年重修`;
      drawVertical(doc, dateText, { rightX: 170, leftX: 100, topY: 1187 - Array.from(dateText).length * 54, bottomY: 1187, fontSize: 30, color: '#111111' });

      // 主框左侧上下副文（竖排）：上「宗族源远」、下「世代绵延」
      const sideFs = 34;
      drawVertical(doc, '宗族源远', { rightX: 440, leftX: 380, topY: boxT + 30, bottomY: 640, fontSize: sideFs, color: '#111111' });
      drawVertical(doc, '世代绵延', { rightX: 440, leftX: 380, topY: 760, bottomY: boxB - 30, fontSize: sideFs, color: '#111111' });
    }

    // ===== 2. 前言（封面之后、目录之前） =====
    {
      const pre = byCat('preface').map((i) => i.content).filter(Boolean).join('\n')
        || family.description || family.origin || '';
      if (pre) verticalText(pre, `${shiName}宗族前言`, '前言');
    }

    // ===== 3. 目录 =====
    {
      newPaper(`${shiName}家族总目录`);
      pageTitle('目 录');
      // 目录与正文顺序保持一致：封面→前言→目录→家史→家风家训→字辈→事记→索引→宗亲树→世系→卷末→编写说明→后记；无内容板块自动跳过
      const hasSec: Record<string, boolean> = {
        preface: byCat('preface').some((i) => i.content) || !!family.description || !!family.origin,
        history: ['merit', 'migration'].some((c) => byCat(c).some((i) => i.content)) || !!family.origin || !!family.description,
        style: byCat('family_style').concat(byCat('family_motto')).some((i) => i.content),
        rule: [family.motto, ...byCat('family_instruction').map((i) => i.content), ...byCat('family_motto').map((i) => i.content)].some((v) => !!v),
        rank: byCat('honor').some((i) => i.content) || members.some((m) => m.generation_title),
        event: ['family_history', 'person_history', 'event'].some((c) => byCat(c).some((i) => i.content)),
        index: members.length > 0,
        tree: members.length > 0,
        shixi: members.length > 0,
        volEnd: byCat('editorial_note').some((i) => i.content) || byCat('afterword').some((i) => i.content),
        note: byCat('editorial_note').some((i) => i.content),
        afterword: byCat('afterword').some((i) => i.content),
      };
      const names: [string, string][] = [
        ['前言', 'preface'], ['一、家史', 'history'], ['二、家风', 'style'], ['三、家训', 'rule'],
        ['四、家族字辈', 'rank'], ['五、家族事记', 'event'], ['六、世代人名索引', 'index'],
        ['七、宗亲树', 'tree'], ['八、历代世系图', 'shixi'], ['九、卷末', 'volEnd'],
      ];
      const catalog = names.filter(([, k]) => hasSec[k]).map(([t]) => t);
      doc.fontSize(26).fillColor(INK);
      let y = M_TOP + 100;
      catalog.forEach((c) => {
        doc.text(c, M_LEFT + 40, y, { lineBreak: false, characterSpacing: 5 });
        y += 76;
      });
    }

    // ===== 4. 家史（原名“家族源流”，统一改名为“家史”并与小程序“家史”板块对应） =====
    {
      const srcParts: string[] = [];
      ['merit', 'migration'].forEach((cat) => {
        byCat(cat).forEach((i) => srcParts.push(i.content || ''));
      });
      if (family.origin) srcParts.push(family.origin);
      if (family.description) srcParts.push(family.description);
      const text = srcParts.filter(Boolean).join('\n\n');
      if (text) verticalText(text, `${shiName}家史`, '家史');
    }

    // ===== 5. 家风 / 家训（两栏并列；每栏“标题”置于栏右端（阅读起点）先于内容，且家训栏左侧留白收窄） =====
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
        // 栏边界：左栏(家风) 130..490；右栏(家训) 510..830（不重叠，家训左侧留白收窄）
        // 右栏(家训)：rightX=810 leftX=510
        const ruleRight = RIGHT_X - 60;        // 770
        // 家训栏左侧：原 M_LEFT+250(=350)，现收窄为 RIGHT_X-300(=530)，让家训文字向左填充减少左侧留白
        const ruleLeft = RIGHT_X - 300;        // 530
        // 左栏(家风)
        const styleRight = RIGHT_X - 370;      // 480
        const styleLeft = M_LEFT + 30;         // 130
        // 栏内各自“标题”列：置于栏右端(阅读起点)，先标题后内容
        doc.fontSize(22).fillColor('#3a2410');
        // 家训 标题：列 830..790（栏最右端顶部）
        drawVertical(doc, '家训', { rightX: RIGHT_X, leftX: RIGHT_X - 40, topY: colTop, bottomY: colTop + 140, fontSize: 22 });
        // 家训 内容：列 770..530
        drawVertical(doc, toSquareBrackets(right) || '', { rightX: ruleRight, leftX: ruleLeft, topY: colTop, bottomY: colBottom, fontSize: 19, onNewPage: onNew(`${shiName}家风家训祖训`) });
        // 家风 标题：列 490..450（左栏右端，先于其内容 480..130）
        drawVertical(doc, '家风', { rightX: styleRight + 40, leftX: styleRight, topY: colTop, bottomY: colTop + 140, fontSize: 22 });
        // 家风 内容：列 480..130
        drawVertical(doc, toSquareBrackets(left) || '', { rightX: styleRight, leftX: styleLeft, topY: colTop, bottomY: colBottom, fontSize: 19, onNewPage: onNew(`${shiName}家风家训祖训`) });
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

    // ===== 7. 世代人名索引 / 8. 宗亲树 / 9. 历代世系图（见下方：索引→宗亲树→世系） =====
    { /* 历代世系图已下沉到“世代人名索引”与“宗亲树”之后打印 */ }

    // ===== 8. 世代人名索引（三列；第N世黑色条目高度紧凑；人名与页码两端对齐，中间以……点线相连） =====
    {
      // 先模拟历代世系图分页，记录每个成员所在相对页（第1页起），与第7节排版规则一致
      const pageOf = new Map<string, number>();
      {
        let _y = M_TOP + 80;
        let _pg = 1;
        const _textX = M_LEFT + 92;
        const _maxW = RIGHT_X - _textX;
        doc.fontSize(20);
        members.forEach((m) => {
          const base = this.memberLine(m);
          const h = Math.max(56, doc.heightOfString(base, { width: _maxW }) + 24);
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
        // 三列布局
        const gap = 40;
        const colW = (RIGHT_X - M_LEFT - gap * 2) / 3;
        const drawGroup = (gen: number, names: string[], x: number, startY: number): number => {
          let y = startY;
          // 第N世 黑色条目（高度紧凑：原48 → 16）
          doc.lineWidth(2).strokeColor('#2b1a08');
          doc.rect(x, y, colW - 8, 16).fillAndStroke('rgba(154,123,79,0.2)', '#2b1a08');
          doc.fillColor('#fff').fontSize(15).text(`第${toChineseNum(gen)}世`, x, y + 1, { width: colW - 8, align: 'center', characterSpacing: 2 });
          y += 22;
          doc.fontSize(18);
          names.forEach((n) => {
            const m = members.find((mm) => mm.name === n && mm.generation === gen);
            const relPage = m ? pageOf.get(m.id) : undefined;
            const pageTxt = String(relPage ?? '—');
            doc.fillColor(INK);
            // 人名靠左
            doc.text(n, x + 2, y, { lineBreak: false, characterSpacing: 1 });
            const nameW = doc.widthOfString(n, { fontSize: 18, characterSpacing: 1 });
            const pageW = doc.widthOfString(pageTxt, { fontSize: 18 });
            const dotX = x + 4 + nameW + 4;
            const dotEnd = x + colW - 14 - pageW;
            // 中间 “……” 点线相连
            if (dotEnd > dotX) {
              const dots = '…'.repeat(Math.max(1, Math.round((dotEnd - dotX) / 18)));
              doc.text(dots, dotX, y, { lineBreak: false, fontSize: 16 });
            }
            // 页码靠右（两端对齐）
            doc.text(pageTxt, x + colW - 12 - pageW, y, { lineBreak: false });
            doc.moveTo(x + 4, y + 24).lineTo(x + colW - 12, y + 24).dash(2, 2).strokeColor('#b59565').stroke();
            doc.undash();
            y += 28;
          });
          return y + 12;
        };
        // 三列等分，纵向各自独立排布
        const baseY = M_TOP + 80;
        const ys = [baseY, baseY, baseY];
        groups.forEach((g, i) => {
          const ci = i % 3;
          const x = M_LEFT + ci * (colW + gap);
          ys[ci] = drawGroup(g, genMap.get(g)!, x, ys[ci]);
        });
      }
    }

    // ===== 8. 宗亲树（世代人物总览，置于人名索引之后、历代世系图之前） =====
    {
      if (members.length) {
        newPaper(`${shiName}宗亲树`);
        pageTitle('宗亲树');
        const childrenOf = new Map<string, RawMember[]>();
        members.forEach((m) => {
          if (!m.parent_id) return;
          if (!childrenOf.has(m.parent_id)) childrenOf.set(m.parent_id, []);
          childrenOf.get(m.parent_id)!.push(m);
        });
        const roots = members.filter((m) => !m.parent_id || !members.some((x) => x.id === m.parent_id));
        let y = M_TOP + 90;
        const maxW = RIGHT_X - M_LEFT;
        const lines: string[] = [];
        const renderNode = (m: RawMember, depth: number) => {
          lines.push(`${'　'.repeat(depth)}第${toChineseNum(m.generation)}世 ${m.name}${m.courtesy_name ? '，字' + m.courtesy_name : ''}`);
          (childrenOf.get(m.id) || []).forEach((k) => renderNode(k, depth + 1));
        };
        roots.forEach((r) => renderNode(r, 0));
        lines.forEach((ln) => {
          const h = Math.max(30, doc.heightOfString(ln, { width: maxW }) + 12);
          if (y + h > BOTTOM_Y) {
            newPaper(`${shiName}宗亲树`);
            pageTitle('宗亲树');
            y = M_TOP + 90;
          }
          doc.fontSize(20).fillColor(INK).text(ln, M_LEFT + 6, y, { width: maxW });
          y += h;
        });
      }
    }

    // ===== 9. 历代世系图（先完整成员信息并含简介，再另行逐行显示每位配偶完整信息；配偶单独一行并带“续”标识：健在/故/续/离异） =====
    {
      if (members.length) {
        newPaper(`${shiName}历代世系图`);
        pageTitle('历代世系图');
        let y = M_TOP + 80;
        const lineX = M_LEFT;
        const textX = M_LEFT + 92;
        const sepX = M_LEFT + 78;
        const maxW = RIGHT_X - textX;
        doc.fontSize(20);
        const spStatus = (s: any) => {
          const st = String(s.status || '').toLowerCase();
          if (['deceased', '故', '殁', '已故'].includes(st)) return '故';
          if (['divorced', '离异', '离'].includes(st)) return '离异';
          if (['alive', '健在', '在世'].includes(st)) return '健在';
          return '续';
        };
        members.forEach((m) => {
          const base = toSquareBrackets(this.memberLine(m));
          const bioPart = m.bio && m.bio.trim() ? `　简介：${toSquareBrackets(m.bio.trim())}` : '';
          const rows: string[] = [base + bioPart];
          (m.spouses && m.spouses.length ? m.spouses : []).forEach((sp) => {
            const parts = [`配偶${sp.name}`, `（${spStatus(sp)}）`];
            if (sp.birth_date) parts.push(`生於${toLunar(sp.birth_date)}`);
            if (sp.death_date && sp.status) parts.push(`卒於${toLunar(sp.death_date)}`);
            if (sp.burial_place && sp.burial_place !== '葬地不详') parts.push(`葬${sp.burial_place}`);
            if (sp.bio) parts.push(toSquareBrackets(sp.bio));
            rows.push(toSquareBrackets(parts.join('，') + '。'));
          });
          rows.forEach((row, ri) => {
            const h = Math.max(56, doc.heightOfString(row, { width: maxW }) + 24);
            if (y + h > BOTTOM_Y) {
              newPaper(`${shiName}历代世系图`);
              pageTitle('历代世系图');
              y = M_TOP + 80;
            }
            if (ri === 0) {
              doc.rect(lineX, y + 4, 76, 38).fill(INK);
              doc.fillColor('#fff').fontSize(19).text(`第${toChineseNum(m.generation)}世`, lineX, y + 11, { width: 76, align: 'center' });
              doc.fillColor(INK).fontSize(20);
            } else {
              doc.fillColor(BROWN).fontSize(20).text('配偶', sepX - 60, y, { lineBreak: false });
              doc.fillColor(INK).fontSize(20);
            }
            doc.text(row, textX, y, { width: maxW });
            doc.fillColor(INK);
            doc.moveTo(lineX, y + h - 4).lineTo(RIGHT_X, y + h - 4).lineWidth(1).strokeColor(INK).stroke();
            y += h;
          });
        });
      }
    }

    // ===== 10. 卷末（大标题）；编写说明/后记 采用左右两栏排版、内容不重叠；目录仅显示“卷末” =====
    {
      const ps = byCat('afterword').map((i) => i.content).filter(Boolean).join('\n');
      const note = byCat('editorial_note').map((i) => i.content).filter(Boolean).join('\n');
      if (note || ps) {
        newPaper(`${shiName}卷末`);
        pageTitle('卷 末');
        const midX = Math.round((RIGHT_X - 40 + M_LEFT + 30) / 2);
        // 左栏：编写说明
        if (note) {
          drawVertical(doc, toSquareBrackets(`编写说明\n${note}`), { rightX: midX, leftX: M_LEFT + 30, topY: M_TOP + 100, bottomY: BOTTOM_Y, fontSize: 19 });
        }
        // 右栏：后记（与编写说明左右并列，互不重叠）
        if (ps) {
          drawVertical(doc, toSquareBrackets(`后　记\n${ps}`), { rightX: RIGHT_X - 40, leftX: midX + 70, topY: M_TOP + 100, bottomY: BOTTOM_Y, fontSize: 19 });
        }
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
