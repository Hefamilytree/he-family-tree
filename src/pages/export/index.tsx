import { useState } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Printer, TreePine, Users } from 'lucide-react-taro';
import { Network } from '@/network';

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
  const [exportMode, setExportMode] = useState<'full' | 'branch'>('full');
  const [selectedBranch, setSelectedBranch] = useState<string>('');

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

  // 获取分支列表（第一代成员作为分支根）
  const branches = members.filter(m => m.generation === 1);

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

  const exportMembers = exportMode === 'full'
    ? members
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
    Taro.navigateTo({
      url: `/pages/export-preview/index?mode=${exportMode}&branch=${selectedBranch}`
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
            </View>
          </View>

          {/* 分支选择 */}
          {exportMode === 'branch' && branches.length > 0 && (
            <View className="mb-4">
              <Text className="block text-sm mb-2" style={{ color: '#6B5B4F' }}>选择分支</Text>
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
                    <Text className="text-sm">{branch.name}</Text>
                  </View>
                ))}
              </ScrollView>
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
