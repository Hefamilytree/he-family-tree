import { useState } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Printer, TreePine, Users } from 'lucide-react-taro';
import { Network } from '@/network';
import { getAuthUser, canPrint } from '@/utils/permission';

interface FamilyInfo {
  id: string;
  surname: string;
  family_name: string;
  hall_name: string | null;
  motto: string | null;
}

interface Member {
  id: string;
  name: string;
  gender: string;
  generation: number;
  is_alive: string;
  birth_date: string | null;
  death_date: string | null;
  parent_id: string | null;
  spouse_name: string | null;
  bio: string | null;
  birth_place: string | null;
}

export default function Export() {
  const [family, setFamily] = useState<FamilyInfo | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [exportMode, setExportMode] = useState<'full' | 'branch' | 'siblings'>('full');
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [includeAncestor, setIncludeAncestor] = useState(false);
  const [startGen, setStartGen] = useState('');
  const [endGen, setEndGen] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [familyRes, membersRes] = await Promise.all([
        Network.request({ url: '/api/family' }),
        Network.request({ url: '/api/members' }),
      ]);
      console.log('导出数据:', familyRes.data, membersRes.data);
      const familyPayload = familyRes.data?.data;
      setFamily(Array.isArray(familyPayload) ? (familyPayload.length > 0 ? familyPayload[0] : null) : (familyPayload || null));
      setMembers(membersRes.data?.data || []);
    } catch (e) {
      console.error('加载数据失败:', e);
    } finally {
      setLoading(false);
    }
  };

  useDidShow(() => { loadData(); });

  // 分支列表：全部成员（世代升序，实现"由下往上选"，可任选一代/任意成员作为分支根）
  const branches = [...members].sort(
    (a, b) => (a.generation || 1) - (b.generation || 1) || (a.name || '').localeCompare(b.name || '', 'zh')
  );

  // 获取指定分支的所有后代
  const getBranchMembers = (rootId: string): Member[] => {
    const result: Member[] = [];
    const queue = [rootId];
    while (queue.length > 0) {
      const currentId = queue.shift()!;
      const member = members.find(m => m.id === currentId);
      if (member) {
        result.push(member);
        const children = members.filter(m => m.parent_id === currentId);
        children.forEach(child => queue.push(child.id));
      }
    }
    return result;
  };

  // 父辈所有亲兄弟：以所选宗亲为基准，取其父亲的全部子女（含本人与所有亲兄弟），
  // 并向上带上父亲本人，使打印脉络完整；数据全部关联成员表。
  // 若开启“向上导出至始祖”，则从父辈起逐代向上收集每一代同辈亲兄弟（含配偶）直至始祖，不含本人辈及子女。
  const getFatherSiblings = (baseId: string, up: boolean): Member[] => {
    if (!baseId) return [];
    const membersAll = members;
    const base = membersAll.find((m) => m.id === baseId);
    if (!base) return [];
    const fatherId = base.parent_id;
    let father: Member | undefined;
    let anchorId = fatherId;
    if (fatherId) {
      father = membersAll.find((m) => m.id === fatherId);
    } else {
      // 所选人本身即父辈：以本人为锚，取与其同父者
      father = base;
      anchorId = base.id;
    }
    if (up) {
      // 从父辈起逐代向上，每代收集同辈亲兄弟，直至始祖
      const picked = new Set<string>();
      let p: Member | undefined = father || base;
      const seen = new Set<string>();
      let guard = 0;
      while (p && !seen.has(p.id) && guard++ < 500) {
        seen.add(p.id);
        const pid = p.parent_id || null;
        membersAll
          .filter((m) => (m.parent_id || null) === pid)
          .forEach((m) => picked.add(m.id));
        if (!pid) break;
        p = membersAll.find((m) => m.id === pid);
      }
      return membersAll.filter((m) => picked.has(m.id));
    }
    const siblings = anchorId
      ? membersAll.filter((m) => m.parent_id === anchorId)
      : [base];
    return father ? [father, ...siblings] : siblings;
  };

  const exportMembers = exportMode === 'full'
    ? members
    : exportMode === 'siblings'
      ? getFatherSiblings(selectedBranch, includeAncestor)
      : selectedBranch
        ? getBranchMembers(selectedBranch)
        : [];

  // 按世代分组
  const generations: Record<number, Member[]> = {};
  exportMembers.forEach(m => {
    if (!generations[m.generation]) generations[m.generation] = [];
    generations[m.generation].push(m);
  });
  const sortedGens = Object.keys(generations).map(Number).sort((a, b) => a - b);

  const handlePreview = () => {
    if (!canPrint(getAuthUser())) {
      Taro.showToast({ title: '需认证宗亲身份后方可打印族谱', icon: 'none' });
      return;
    }
    Taro.navigateTo({
      url: `/pages/export-preview/index?mode=${exportMode}&branch=${selectedBranch || ''}&toAncestor=${includeAncestor ? '1' : '0'}&startGen=${startGen}&endGen=${endGen}`
    });
  };

  if (loading) {
    return (
      <View className="min-h-full bg-[#FAF8F5] p-4">
        <Skeleton className="h-20 w-full mb-4" />
        <Skeleton className="h-32 w-full" />
      </View>
    );
  }

  return (
    <View className="min-h-full bg-[#FAF8F5] p-4 pb-20">
      <Card className="mb-4">
        <CardContent className="p-4">
          <Text className="block text-xl font-bold mb-4" style={{ color: '#8B2500' }}>
            导出族谱
          </Text>

          {/* 导出模式选择 */}
          <View className="mb-4">
            <Text className="block text-sm mb-2" style={{ color: '#6B5B4F' }}>导出范围</Text>
            <View className="flex gap-3">
              <View
                className="flex-1 p-4 rounded-xl border-2 flex flex-col items-center"
                style={{ borderColor: exportMode === 'full' ? '#8B2500' : '#E8E0D8', backgroundColor: exportMode === 'full' ? '#FFF5F0' : '#FFFDF7' }}
                onClick={() => setExportMode('full')}
              >
                <TreePine size={32} color={exportMode === 'full' ? '#8B2500' : '#999'} className="mb-2" />
                <Text className="text-sm font-bold" style={{ color: exportMode === 'full' ? '#8B2500' : '#6B5B4F' }}>全宗族谱</Text>
                <Text className="text-xs mt-1" style={{ color: '#999' }}>导出所有成员</Text>
              </View>
              <View
                className="flex-1 p-4 rounded-xl border-2 flex flex-col items-center"
                style={{ borderColor: exportMode === 'branch' ? '#8B2500' : '#E8E0D8', backgroundColor: exportMode === 'branch' ? '#FFF5F0' : '#FFFDF7' }}
                onClick={() => setExportMode('branch')}
              >
                <Users size={32} color={exportMode === 'branch' ? '#8B2500' : '#999'} className="mb-2" />
                <Text className="text-sm font-bold" style={{ color: exportMode === 'branch' ? '#8B2500' : '#6B5B4F' }}>分支族谱</Text>
                <Text className="text-xs mt-1" style={{ color: '#999' }}>导出指定分支</Text>
              </View>
              <View
                className="flex-1 p-4 rounded-xl border-2 flex flex-col items-center"
                style={{ borderColor: exportMode === 'siblings' ? '#8B2500' : '#E8E0D8', backgroundColor: exportMode === 'siblings' ? '#FFF5F0' : '#FFFDF7' }}
                onClick={() => setExportMode('siblings')}
              >
                <Users size={32} color={exportMode === 'siblings' ? '#8B2500' : '#999'} className="mb-2" />
                <Text className="text-sm font-bold" style={{ color: exportMode === 'siblings' ? '#8B2500' : '#6B5B4F' }}>父辈亲兄弟</Text>
                <Text className="text-xs mt-1" style={{ color: '#999' }}>打印父辈及亲兄弟</Text>
              </View>
            </View>
          </View>

          {/* 基准宗亲选择（分支族谱 / 父辈亲兄弟共用） */}
          {(exportMode === 'branch' || exportMode === 'siblings') && branches.length > 0 && (
            <View className="mb-4">
              <Text className="block text-sm mb-2" style={{ color: '#6B5B4F' }}>
                {exportMode === 'siblings' ? '选择宗亲（以此人的父辈亲兄弟为准）' : '选择分支'}
              </Text>
              <ScrollView scrollX className="flex gap-2 pb-2">
                {branches.map(branch => (
                  <View
                    key={branch.id}
                    className="px-4 py-2 rounded-full whitespace-nowrap border-2"
                    style={{
                      borderColor: selectedBranch === branch.id ? '#8B2500' : '#E8E0D8',
                      backgroundColor: selectedBranch === branch.id ? '#8B2500' : '#FFFDF7',
                      color: selectedBranch === branch.id ? '#FFFDF7' : '#6B5B4F'
                    }}
                    onClick={() => setSelectedBranch(branch.id)}
                  >
                    <Text className="text-sm">第{branch.generation}世 · {branch.name}</Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

          {/* 分支导出/父辈亲兄弟：向上至始祖开关（分支族谱、父辈亲兄弟共用） */}
          {(exportMode === 'branch' || exportMode === 'siblings') && (
            <View className="flex items-center justify-between mb-3">
              <Text className="block text-sm" style={{ color: '#6B5B4F' }}>向上导出至始祖</Text>
              <View
                className="px-3 py-2 rounded-full border-2"
                style={{ borderColor: includeAncestor ? '#8B2500' : '#E8E0D8', backgroundColor: includeAncestor ? '#8B2500' : '#FFFDF7' }}
                onClick={() => setIncludeAncestor(!includeAncestor)}
              >
                <Text className="text-xs" style={{ color: includeAncestor ? '#FFFDF7' : '#6B5B4F' }}>{includeAncestor ? '已开启' : '关闭'}</Text>
              </View>
            </View>
          )}

          {/* 世数范围（分支族谱 / 父辈亲兄弟共用，选择范围保持一致） */}
          {(exportMode === 'branch' || exportMode === 'siblings') && (
            <View className="mb-4">
              <Text className="block text-sm mb-2" style={{ color: '#6B5B4F' }}>限制世数（留空为不加限制）</Text>
              <View className="flex items-center gap-3">
                <View className="flex-1"><Input type="number" placeholder="起始世(如1)" value={startGen} onInput={e => setStartGen(e.detail.value)} /></View>
                <View className="flex-1"><Input type="number" placeholder="结束世(如5)" value={endGen} onInput={e => setEndGen(e.detail.value)} /></View>
              </View>
              <Text className="block text-xs mt-2" style={{ color: '#B0A090' }}>
                {exportMode === 'siblings'
                  ? '父辈亲兄弟：从所选宗亲的父辈起逐代向上收录到始祖的每一代亲兄弟，只收录人物及其配偶，不收录子女。'
                  : '提示：在下方任选一位宗亲作为分支（由下往上选择导出）；勾选“向上导出至始祖”会包含该分支向上到始祖一脉。'}
              </Text>
            </View>
          )}

          {/* 预览信息 */}
          <View className="p-3 rounded-lg mb-4" style={{ backgroundColor: '#FFF5F0' }}>
            <Text className="block text-sm" style={{ color: '#8B2500' }}>
              导出预览：{exportMembers.length} 位宗亲 · {sortedGens.length} 个世代
            </Text>
          </View>

          <Button
            className="w-full"
            style={{ backgroundColor: '#8B2500', color: '#FFFDF7' }}
            onClick={handlePreview}
            disabled={exportMode === 'branch' && !selectedBranch}
          >
            <Printer size={16} color="#FFFDF7" />
            <Text className="ml-2">生成打印预览</Text>
          </Button>
          <Text className="block text-xs mt-2 text-center" style={{ color: canPrint(getAuthUser()) ? '#B0A090' : '#C0392B' }}>
            {canPrint(getAuthUser()) ? '认证宗亲及以上可打印族谱' : '需认证宗亲身份后方可打印族谱'}
          </Text>
        </CardContent>
      </Card>

      {/* 族谱预览 */}
      {family && (
        <Card className="border-2" style={{ borderColor: '#8B2500' }}>
          <CardContent className="p-4">
            <View className="text-center mb-4">
              <Text className="block text-2xl font-bold" style={{ color: '#8B2500' }}>
                {family.family_name}族谱
              </Text>
              {family.hall_name && (
                <Text className="block text-sm mt-1" style={{ color: '#6B5B4F' }}>
                  {family.hall_name}
                </Text>
              )}
            </View>

            {sortedGens.map(gen => (
              <View key={gen} className="mb-4">
                <View className="flex items-center mb-2">
                  <View className="px-3 py-1 rounded" style={{ backgroundColor: '#8B2500' }}>
                    <Text className="text-sm font-bold" style={{ color: '#FFFDF7' }}>第{gen}世</Text>
                  </View>
                  <View className="flex-1 h-px ml-2" style={{ backgroundColor: '#E8E0D8' }} />
                </View>
                <View className="space-y-2">
                  {generations[gen].map(member => (
                    <View key={member.id} className="p-3 rounded-lg" style={{ backgroundColor: '#FFFDF7', border: '1px solid #E8E0D8' }}>
                      <View className="flex items-center justify-between">
                        <Text className="text-base font-bold" style={{ color: '#333' }}>
                          {member.name}
                          {member.is_alive === 'no' && (
                            <Text className="text-xs ml-1" style={{ color: '#999' }}>(故)</Text>
                          )}
                        </Text>
                        {member.spouse_name && (
                          <Text className="text-xs" style={{ color: '#8B2500' }}>
                            配 {member.spouse_name}
                          </Text>
                        )}
                      </View>
                      <Text className="block text-xs mt-1" style={{ color: '#999' }}>
                        {member.birth_date || '未知'}
                        {member.death_date ? ` - ${member.death_date}` : member.is_alive === 'yes' ? ' - 健在' : ''}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </CardContent>
        </Card>
      )}
    </View>
  );
}
