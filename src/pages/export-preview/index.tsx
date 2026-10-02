import React, { useState, useEffect } from 'react';
import Taro, { useRouter, useShareAppMessage } from '@tarojs/taro';
import { View, Text } from '@tarojs/components';
import { ChevronLeft, Share2, FileText, Check } from 'lucide-react-taro';
import { Network } from '@/network';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toLunarBirth, toChineseNum } from '@/utils/lunar';
import './index.css';

interface Family {
  id: string;
  family_name: string;
  hall_name?: string;
  motto?: string;
  description?: string;
}

interface Spouse {
  id: string;
  name: string;
  birth_date?: string;
  death_date?: string;
  status?: string;
  bio?: string;
  burial_place?: string;
}

interface Member {
  id: string;
  name: string;
  courtesy_name?: string;
  username?: string;
  gender: 'male' | 'female';
  is_alive: 'yes' | 'no';
  birth_date?: string;
  death_date?: string;
  generation?: number;
  generation_title?: string;
  parent_id?: string;
  spouse_name?: string;
  birth_place?: string;
  bio?: string;
  burial_place?: string;
  spouses?: Spouse[];
}

interface Section {
  category: string;
  title: string;
  content: string;
  event_date?: string;
  location?: string;
}

const isMiniApp = ['WEAPP', 'TT'].includes(Taro.getEnv() as any);

/** 古籍标点转换：小括号（）→方头括号 ︻︼；《》书名号→﹏ */
const toBox = (s?: string | null) =>
  s ? String(s).replace(/[（(]/g, '︻').replace(/[）)]/g, '︼').replace(/《/g, '﹏').replace(/》/g, '﹏') : '';

const ExportPreviewPage: React.FC = () => {
  const router = useRouter();
  const exportMode = router.params.mode || 'full';
  const branchId = router.params.branch || '';
  const includeAncestor = router.params.toAncestor === '1';
  const startGenRaw = router.params.startGen || '';
  const endGenRaw = router.params.endGen || '';
  const parsedStart = Number(startGenRaw);
  const parsedEnd = Number(endGenRaw);
  const startGen = startGenRaw !== '' && !Number.isNaN(parsedStart) ? parsedStart : undefined;
  const endGen = endGenRaw !== '' && !Number.isNaN(parsedEnd) ? parsedEnd : undefined;

  const [family, setFamily] = useState<Family | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  useShareAppMessage(() => ({
    title: `${family?.family_name || '何氏'}族谱`,
    path: `/pages/export-preview/index?mode=${exportMode}&branch=${branchId}&toAncestor=${includeAncestor ? 1 : 0}&startGen=${startGenRaw}&endGen=${endGenRaw}`,
  }));

  useEffect(() => {
    Taro.setNavigationBarTitle({ title: '族谱打印预览' });
    loadData();
  }, []);

  const buildQuery = () => {
    const q: string[] = [`mode=${exportMode}`];
    if (branchId) q.push(`branch=${branchId}`);
    if (includeAncestor) q.push('toAncestor=1');
    if (startGen !== undefined) q.push(`startGen=${startGen}`);
    if (endGen !== undefined) q.push(`endGen=${endGen}`);
    return q.join('&');
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [famRes, memRes, secRes] = await Promise.all([
        Network.request({ url: '/api/family' }),
        Network.request({ url: '/api/members' }),
        Network.request({ url: '/api/cultural' }),
      ]);
      console.log('[export-preview] family:', famRes.data);
      console.log('[export-preview] members:', memRes.data);
      // /api/family 返回单个家族对象（可能为 null）
      const famPayload = famRes.data?.data;
      const fam: Family | null = famPayload
        ? Array.isArray(famPayload)
          ? (famPayload[0] || null)
          : famPayload
        : null;
      const allMembers: Member[] = memRes.data?.data || [];
      const allSections: Section[] = secRes.data?.data || [];

      setFamily(fam);

      let filtered = [...allMembers];
      if (exportMode === 'siblings' && branchId) {
        // 父辈所有亲兄弟：取基准宗亲之父 + 其父全部子女（本人及亲兄弟）
        const base = allMembers.find((m) => m.id === branchId);
        if (base) {
          const anchorId = (base as any).parent_id || base.id;
          const siblings = allMembers.filter((m) => (m as any).parent_id === anchorId);
          const father = allMembers.find((m) => m.id === anchorId);
          const set = new Set<string>(siblings.map((m) => m.id));
          if (father) set.add(father.id);
          filtered = allMembers.filter((m) => set.has(m.id));
        }
      } else if (exportMode === 'branch' && branchId) {
        if (includeAncestor) {
          const ancestorIds = new Set<string>();
          let cur = allMembers.find((m) => m.id === branchId);
          let guard = 0;
          while (cur && (cur as any).parent_id && guard < 50) {
            ancestorIds.add((cur as any).parent_id);
            cur = allMembers.find((m) => m.id === (cur as any).parent_id);
            guard += 1;
          }
          const down = new Set<string>([branchId]);
          let changed = true;
          while (changed) {
            changed = false;
            allMembers.forEach((m) => {
              const pid = (m as any).parent_id;
              if (pid && down.has(pid)) {
                if (!down.has(m.id)) { down.add(m.id); changed = true; }
              }
            });
          }
          filtered = allMembers.filter((m) => ancestorIds.has(m.id) || down.has(m.id));
        } else {
          const root = allMembers.find((m) => m.id === branchId);
          const rootGen = root?.generation;
          const reachable = new Set<string>([branchId]);
          let changed = true;
          while (changed) {
            changed = false;
            allMembers.forEach((m) => {
              const pid = (m as any).parent_id;
              if (pid && reachable.has(pid)) {
                if (!reachable.has(m.id)) { reachable.add(m.id); changed = true; }
              }
            });
          }
          filtered = allMembers.filter((m) => reachable.has(m.id));
          if (rootGen !== undefined && startGen !== undefined) {
            filtered = filtered.filter((m) => (m.generation ?? rootGen) >= rootGen + (startGen - 1));
          }
        }
        if (endGen !== undefined) {
          const base = allMembers.find((m) => m.id === branchId)?.generation ?? 1;
          filtered = filtered.filter((m) => (m.generation ?? base) <= base + (endGen - 1));
        }
      } else if (startGen !== undefined || endGen !== undefined) {
        filtered = filtered.filter((m) => {
          if (m.generation === undefined || m.generation === null) return true;
          if (startGen !== undefined && m.generation < startGen) return false;
          if (endGen !== undefined && m.generation > endGen) return false;
          return true;
        });
      }

      filtered.sort((a, b) => (a.generation ?? 0) - (b.generation ?? 0));
      setMembers(filtered);
      setSections(allSections);
    } catch (e) {
      console.error('加载导出数据失败', e);
      Taro.showToast({ title: '加载失败，请重试', icon: 'none' });
    } finally {
      setLoading(false);
    }
  };

  // 按世代分组
  const generations: Record<number, Member[]> = {};
  members.forEach((m) => {
    const gen = m.generation || 1;
    if (!generations[gen]) generations[gen] = [];
    generations[gen].push(m);
  });
  const sortedGens = Object.keys(generations).map(Number).sort((a, b) => a - b);

  const frontSections = sections.filter((s) =>
    ['person_history', 'merit', 'family_motto', 'honor'].includes(s.category)
  );
  const backSections = sections.filter((s) =>
    ['family_history', 'afterword', 'editorial_note'].includes(s.category)
  );
  const eventSections = sections.filter((s) => s.category === 'family_history');

  const yearText = new Date().getFullYear();
  const bodyCount = members.length;

  // 生成竖排列（内容自动转换为方头括号）
  const vText = (label: string, value: string) => (
    <Text className="v-col">
      <Text className="v-col-label">{label}</Text>
      {toBox(value)}
    </Text>
  );

  // ===== 导出 PDF：调用后端生成，手机端可打开/转发 =====
  const handleExportPdf = async () => {
    setExporting(true);
    Taro.showLoading({ title: '正在生成PDF...', mask: true });
    try {
      const query = buildQuery();
      if (isMiniApp) {
        // 小程序：后端生成 PDF → 下载到可打开路径 → openDocument 打开（可查看/转发/打印）
        const pdfName = `he-family-${Date.now()}.pdf`;
        // 指定 .pdf 后缀的本地路径，确保 openDocument 能正确识别打开
        const savePath: string = `${Taro.env.USER_DATA_PATH}/${pdfName}`;
        const fileRes: any = await (Network.downloadFile as any)({
          url: `/api/pdf/genealogy?${query}`,
          filePath: savePath,
        });
        console.log('[export-preview] downloadFile:', fileRes.statusCode, fileRes.tempFilePath || savePath);
        const openedPath = fileRes.tempFilePath || savePath;
        if (fileRes.statusCode === 200 && openedPath) {
          Taro.hideLoading();
          try {
            await Taro.openDocument({
              filePath: openedPath,
              fileType: 'pdf',
              showMenu: true,
            });
            Taro.showToast({
              title: '已打开，可在文件内转发/打印',
              icon: 'none',
              duration: 2500,
            });
          } catch {
            Taro.showToast({ title: '无法打开PDF，请从右上角转发', icon: 'none' });
          }
        } else {
          Taro.hideLoading();
          Taro.showToast({ title: 'PDF生成失败，请重试', icon: 'none' });
        }
      } else {
        // H5：直接打开 PDF，手机浏览器可保存/系统分享
        Taro.hideLoading();
        window.open(`/api/pdf/genealogy?${query}`, '_blank');
      }
    } catch (e) {
      console.error('导出PDF失败', e);
      Taro.hideLoading();
      Taro.showToast({ title: '导出失败，请重试', icon: 'none' });
    } finally {
      setExporting(false);
    }
  };

  // ===== 分享链接 =====
  const handleCopyLink = async () => {
    const query = buildQuery();
    const url = `${window.location.origin}${window.location.pathname}#/pages/export-preview/index?${query}`;
    try {
      if (isMiniApp) {
        Taro.showShareMenu({ withShareTicket: true });
        Taro.showToast({ title: '请点右上角转发给微信好友', icon: 'none', duration: 2000 });
        return;
      }
      if (navigator.share) {
        await navigator.share({
          title: `${family?.family_name || '何氏'}族谱`,
          text: '点击查看何氏族谱（古籍版）',
          url,
        });
      } else {
        await navigator.clipboard.writeText(url);
        setLinkCopied(true);
        setTimeout(() => setLinkCopied(false), 2000);
        Taro.showToast({ title: '链接已复制', icon: 'success' });
      }
    } catch {
      /* 用户取消分享 */
    }
  };

  const Sheet: React.FC<{ children: React.ReactNode; sidebar?: string }> = ({ children, sidebar }) => (
    <View className="scroll-sheet mb-6 print-page">
      <View className="scroll-sheet-inner">
        {sidebar ? (
          <View className="scroll-sidebar">
            <Text className="scroll-sidebar-text">{sidebar}</Text>
          </View>
        ) : null}
        {children}
      </View>
    </View>
  );

  if (loading) {
    return (
      <View className="min-h-full bg-stone-100 p-4">
        <Skeleton className="h-96 w-full" />
      </View>
    );
  }

  if (!family) {
    return (
      <View className="min-h-full bg-stone-100 p-4 flex items-center justify-center">
        <Text className="block text-stone-500">暂无家族信息</Text>
      </View>
    );
  }

  const sidebarText = family.hall_name
    ? `${family.family_name}${family.hall_name}`
    : `${family.family_name}族谱`;

  return (
    <View className="min-h-full bg-stone-200 no-print-host">
      {/* 顶部操作栏 */}
      <View className="no-print sticky top-0 z-20 px-4 py-3 bg-stone-100 bg-opacity-95 flex items-center gap-2 border-b border-stone-300">
        <Button variant="outline" size="sm" className="shrink-0" onClick={() => Taro.navigateBack()}>
          <View className="flex items-center">
            <ChevronLeft size={16} color="#8B2500" />
            <Text className="text-xs ml-1">返回</Text>
          </View>
        </Button>
        <Text className="block flex-1 text-lg font-bold" style={{ color: '#8B2500', fontFamily: 'STKaiti, KaiTi, serif' }}>
          打印预览
        </Text>
        <Button
          size="sm"
          className="shrink-0 bg-red-800 text-white"
          disabled={exporting}
          onClick={handleExportPdf}
        >
          <View className="flex items-center">
            <FileText size={15} color="#FFFDF7" />
            <Text className="text-xs ml-1">{exporting ? '生成中' : '打印'}</Text>
          </View>
        </Button>
        <Button size="sm" variant="outline" className="shrink-0" onClick={handleCopyLink}>
          <View className="flex items-center">
            {linkCopied ? <Check size={15} color="#2E7D32" /> : <Share2 size={15} color="#8B2500" />}
            <Text className="text-xs ml-1">{linkCopied ? '已复制' : '分享'}</Text>
          </View>
        </Button>
      </View>

      <View className="px-3 py-4 max-w-xl mx-auto">
        {/* ===== 封面（9.21 新模板：竖版单页，中央主框 + 框左上下副文 + 左下纪年 + 框右堂号） ===== */}
        <Sheet>
          <View className="cover9 relative" style={{ height: '1180rpx' }}>
            {/* 中央主标题框：right26% top10% width22% height80% */}
            <View className="cover9-title-box">
              <Text className="cover9-title">{`${family.family_name}族譜`}</Text>
            </View>
            {/* 框右侧堂号 */}
            {family.hall_name ? <Text className="cover9-hall">{family.hall_name}</Text> : null}
            {/* 框左侧上部副文 */}
            <Text className="cover9-sub1">宗族源远</Text>
            {/* 框左侧下部副文 */}
            <Text className="cover9-sub2">世代绵延</Text>
            {/* 左下纪年 */}
            <Text className="cover9-date">{yearText}年重修</Text>
          </View>
        </Sheet>

        {/* ===== 前言（封面之后、目录之前） ===== */}
        <Sheet sidebar={sidebarText}>
          <Text className="v-title block mb-4" style={{ fontSize: '38rpx' }}>前言</Text>
          <View className="v-columns">
            {vText('前言', family.description || '（待补录）')}
          </View>
        </Sheet>

        {/* ===== 目录 ===== */}
        <Sheet sidebar={sidebarText}>
          <Text className="v-title block mb-4" style={{ fontSize: '40rpx' }}>目录</Text>
          <View className="v-columns">
            <Text className="v-col">前言</Text>
            <Text className="v-col" style={{ color: '#8b2500' }}>卷首</Text>
            <Text className="v-col">一、家史</Text>
            <Text className="v-col">二、家训家风</Text>
            <Text className="v-col">三、字辈谱</Text>
            <Text className="v-col">四、家族事记</Text>
            <Text className="v-col" style={{ color: '#8b2500' }}>世系</Text>
            <Text className="v-col">{`第 ${sortedGens[0] || 1} — ${sortedGens[sortedGens.length - 1] || 1} 世`}</Text>
            <Text className="v-col">{`录入 ${bodyCount} 位`}</Text>
            <Text className="v-col" style={{ color: '#8b2500' }}>卷末</Text>
            <Text className="v-col">五、后记</Text>
            <Text className="v-col">六、编写说明</Text>
          </View>
        </Sheet>

        {/* ===== 家史（原“家族源流”） ===== */}
        <Sheet sidebar={sidebarText}>
          <Text className="v-title block mb-4" style={{ fontSize: '38rpx' }}>家史</Text>
          <View className="v-columns">
            {(() => {
              const hist = frontSections.filter((s) => s.category === 'merit' || s.category === 'family_history');
              if (hist.length) return hist.map((s) => vText(s.title || '家史', s.content));
              return vText('家史', family.description || '（待补录）');
            })()}
          </View>
        </Sheet>

        {/* ===== 家训家风 ===== */}
        <Sheet sidebar={sidebarText}>
          <Text className="v-title block mb-4" style={{ fontSize: '38rpx' }}>家训家风</Text>
          <View className="v-columns">
            {frontSections.filter((s) => s.category === 'family_motto' || s.category === 'family_style').map((s) => (
              vText(s.title || '家风', s.content)
            ))}
            {family.motto ? vText('家训', family.motto) : null}
          </View>
        </Sheet>

        {/* ===== 字辈谱 ===== */}
        <Sheet sidebar={sidebarText}>
          <Text className="v-title block mb-4" style={{ fontSize: '38rpx' }}>字辈谱</Text>
          <View className="v-columns">
            <Text className="v-col-label" style={{ color: '#8b2500', fontWeight: '700' }}>{`${family.family_name}族谱字辈如下：`}</Text>
            {(() => {
              const titleSet = Array.from(new Set(members.map((m) => m.generation_title).filter(Boolean))) as string[];
              if (titleSet.length === 0) {
                return <Text className="v-col" style={{ color: '#999' }}>（各世字辈待录入）</Text>;
              }
              return titleSet.map((t) => (
                <Text key={t} className="v-col" style={{ color: '#8b2500', fontWeight: '700', fontSize: '30rpx' }}>{t}</Text>
              ));
            })()}
          </View>
        </Sheet>

        {/* ===== 家族事记 ===== */}
        <Sheet sidebar={sidebarText}>
          <Text className="v-title block mb-4" style={{ fontSize: '38rpx' }}>家族事记</Text>
          <View className="v-columns">
            {eventSections.length === 0 ? (
              <Text className="v-col" style={{ color: '#999' }}>（暂无事记）</Text>
            ) : (
              eventSections.slice(0, 12).map((s) => vText(s.event_date || '事记', `${s.title}${s.content ? ' ' + s.content : ''}`))
            )}
          </View>
        </Sheet>

        {/* ===== 世系正文（按世分页） ===== */}
        {sortedGens.map((gen) => (
          <Sheet key={gen} sidebar={sidebarText}>
            <Text className="v-title block mb-4" style={{ fontSize: '40rpx' }}>{`第${toChineseNum(gen)}世`}</Text>
            <View className="v-columns">
              {generations[gen].map((m) => {
                const birth = m.birth_date ? toLunarBirth(m.birth_date) : '生失考';
                const death = m.is_alive === 'yes'
                  ? '健在'
                  : m.death_date ? toLunarBirth(m.death_date) : '卒失考';
                const title = m.generation_title || '';
                const spLabel = (st?: string) => {
                  const s = String(st || '').toLowerCase();
                  if (['deceased', '故', '殁'].includes(s)) return '故';
                  if (['divorced', '离异', '离'].includes(s)) return '离异';
                  if (['alive', '健在'].includes(s) || !s) return '健在';
                  return '续';
                };
                return (
                  <View key={m.id} className="v-entry">
                    <Text className="v-col" style={{ fontWeight: '700', color: '#2b1d14' }}>
                      {title ? `${title} · ` : ''}{m.name}{m.courtesy_name ? ` 字${m.courtesy_name}` : ''}{m.gender === 'female' ? '（女）' : ''}
                    </Text>
                    {vText('生卒', `${birth} 至 ${death}`)}
                    {m.is_alive === 'no' && m.burial_place ? vText('葬地', m.burial_place) : null}
                    {(m.spouses && m.spouses.length > 0) ? m.spouses.map((sp, si) => (
                      <Text key={sp.id || si} className="v-col">
                        <Text className="v-col-label">配偶</Text>
                        {sp.name}（{spLabel(sp.status)}）{sp.birth_date ? ` ${toLunarBirth(sp.birth_date)}` : ''}{sp.status && ['deceased', '故'].includes(String(sp.status).toLowerCase()) && sp.death_date ? ` 至 ${toLunarBirth(sp.death_date)}` : ''}
                      </Text>
                    )) : m.spouse_name ? vText('配偶', `${m.spouse_name}（健在）`) : null}
                    {m.birth_place ? vText('出生地', m.birth_place) : null}
                    {m.bio ? vText('简介', m.bio) : null}
                  </View>
                );
              })}
            </View>
          </Sheet>
        ))}

        {/* ===== 卷末 ===== */}
        <Sheet sidebar={sidebarText}>
          <Text className="v-title block mb-4" style={{ fontSize: '38rpx' }}>卷末</Text>
          <View className="v-columns">
            {backSections.length === 0 ? (
              <Text className="v-col" style={{ color: '#999' }}>（暂无卷末内容）</Text>
            ) : (
              backSections.map((s) => vText(s.title, s.content))
            )}
            {vText('记事', `${family.family_name}族谱 共录 ${bodyCount} 位宗亲 ${yearText}年重修`)}
          </View>
        </Sheet>
      </View>
    </View>
  );
};

export default ExportPreviewPage;
