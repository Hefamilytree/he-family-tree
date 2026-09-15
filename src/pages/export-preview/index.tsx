import React, { useState, useEffect } from 'react';
import Taro, { useRouter, useShareAppMessage } from '@tarojs/taro';
import { View, Text } from '@tarojs/components';
import { ChevronLeft, Share2, FileText, Check } from 'lucide-react-taro';
import { Network } from '@/network';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toLunarBirth } from '@/utils/lunar';
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
  username?: string;
  gender: 'male' | 'female';
  is_alive: 'yes' | 'no';
  birth_date?: string;
  death_date?: string;
  generation?: number;
  generation_title?: string;
  father_id?: string;
  mother_id?: string;
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
        Network.request({ url: '/api/families' }),
        Network.request({ url: '/api/members' }),
        Network.request({ url: '/api/cultural-heritage' }),
      ]);
      console.log('[export-preview] families:', famRes.data);
      console.log('[export-preview] members:', memRes.data);
      const famList = famRes.data?.data || [];
      const allMembers: Member[] = memRes.data?.data || [];
      const allSections: Section[] = secRes.data?.data || [];

      const fam = famList[0] || null;
      setFamily(fam);

      let filtered = [...allMembers];
      if (exportMode === 'branch' && branchId) {
        if (includeAncestor) {
          const ancestorIds = new Set<string>();
          let cur = allMembers.find((m) => m.id === branchId);
          let guard = 0;
          while (cur && cur.father_id && guard < 50) {
            ancestorIds.add(cur.father_id);
            cur = allMembers.find((m) => m.id === cur!.father_id);
            guard += 1;
          }
          const down = new Set<string>([branchId]);
          let changed = true;
          while (changed) {
            changed = false;
            allMembers.forEach((m) => {
              if ((m.father_id && down.has(m.father_id)) || (m.mother_id && down.has(m.mother_id))) {
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
              if ((m.father_id && reachable.has(m.father_id)) || (m.mother_id && reachable.has(m.mother_id))) {
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

  // 生成竖排列
  const vText = (label: string, value: string) => (
    <Text className="v-col">
      <Text className="v-col-label">{label}</Text>
      {value}
    </Text>
  );

  // ===== 导出 PDF：调用后端生成，手机端可打开/转发 =====
  const handleExportPdf = async () => {
    setExporting(true);
    Taro.showLoading({ title: '正在生成PDF...', mask: true });
    try {
      const query = buildQuery();
      if (isMiniApp) {
        // 小程序：后端生成 PDF → 下载临时文件 → 打开（可转发给微信好友/保存）
        const fileRes: any = await Network.downloadFile({
          url: `/api/pdf/genealogy?${query}`,
        });
        console.log('[export-preview] downloadFile:', fileRes.statusCode, fileRes.tempFilePath);
        if (fileRes.statusCode === 200 && fileRes.tempFilePath) {
          Taro.hideLoading();
          await Taro.openDocument({
            filePath: fileRes.tempFilePath,
            fileType: 'pdf',
            showMenu: true,
            fail: () => {
              Taro.showToast({ title: '已生成，可从右上角转发', icon: 'none' });
            },
          });
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
            <Text className="text-xs ml-1">{exporting ? '生成中' : '导出PDF'}</Text>
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
        {/* ===== 封面 ===== */}
        <Sheet>
          <View className="cover-border flex items-center justify-center" style={{ minHeight: '900rpx' }}>
            <View className="items-center">
              {family.hall_name ? (
                <Text className="block text-base tracking-widest mb-8" style={{ color: '#5a4a3a', fontFamily: 'STKaiti, KaiTi, serif' }}>
                  {family.hall_name}
                </Text>
              ) : null}
              <Text className="v-title text-center" style={{ fontSize: '88rpx', height: '520rpx' }}>
                {family.family_name}族谱
              </Text>
              <Text className="cover-seal block text-sm mt-10 px-4 py-2">
                {yearText}年重修
              </Text>
            </View>
          </View>
        </Sheet>

        {/* ===== 目录 ===== */}
        <Sheet sidebar={sidebarText}>
          <Text className="v-title block mb-4" style={{ fontSize: '40rpx' }}>目录</Text>
          <View className="v-columns">
            <Text className="v-col" style={{ color: '#8b2500' }}>卷首</Text>
            <Text className="v-col">一、家族源流</Text>
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

        {/* ===== 卷首：源流 / 家训 ===== */}
        <Sheet sidebar={sidebarText}>
          <Text className="v-title block mb-4" style={{ fontSize: '38rpx' }}>卷首</Text>
          <View className="v-columns">
            {vText('家族源流', family.description || '（待补录）')}
            {family.motto ? vText('家训', family.motto) : null}
            {frontSections.filter((s) => s.category === 'family_motto' || s.category === 'merit').map((s) => (
              vText(s.title, s.content)
            ))}
          </View>
        </Sheet>

        {/* ===== 字辈谱 ===== */}
        <Sheet sidebar={sidebarText}>
          <Text className="v-title block mb-4" style={{ fontSize: '38rpx' }}>字辈谱</Text>
          <View className="v-columns">
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
            <Text className="v-title block mb-4" style={{ fontSize: '40rpx' }}>{`第${gen}世`}</Text>
            <View className="v-columns">
              {generations[gen].map((m) => {
                const birth = m.birth_date ? toLunarBirth(m.birth_date) : '生失考';
                const death = m.is_alive === 'yes'
                  ? '健在'
                  : m.death_date ? toLunarBirth(m.death_date) : '卒失考';
                const title = m.generation_title || '';
                return (
                  <View key={m.id} className="v-entry">
                    <Text className="v-col" style={{ fontWeight: '700', color: '#2b1d14' }}>
                      {title ? `${title} · ` : ''}{m.name}{m.gender === 'female' ? '（女）' : ''}
                    </Text>
                    {vText('生卒', `${birth} 至 ${death}`)}
                    {m.is_alive === 'no' && m.burial_place ? vText('葬地', m.burial_place) : null}
                    {(m.spouses && m.spouses.length > 0) ? m.spouses.map((sp, si) => (
                      <Text key={sp.id || si} className="v-col">
                        <Text className="v-col-label">配</Text>
                        {sp.name}{sp.status === 'deceased' ? '（故）' : sp.status === 'divorced' ? '（离异）' : ''}
                        {sp.birth_date ? ` ${toLunarBirth(sp.birth_date)}` : ''}
                        {sp.status === 'deceased' && sp.death_date ? ` 至 ${toLunarBirth(sp.death_date)}` : ''}
                        {sp.status === 'deceased' && sp.burial_place ? ` 葬${sp.burial_place}` : ''}
                      </Text>
                    )) : m.spouse_name ? vText('配', m.spouse_name) : null}
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
