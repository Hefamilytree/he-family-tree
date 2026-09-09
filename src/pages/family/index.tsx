import { useState } from 'react';
import { View, Text } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import { TreePine } from 'lucide-react-taro';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Network } from '@/network';

interface FamilyInfo {
  id: string;
  surname: string;
  family_name: string;
  hall_name: string | null;
}

interface Member {
  id: string;
  name: string;
  gender: string;
  generation: number;
  is_alive: string;
  birth_date: string | null;
  death_date: string | null;
  spouse_name: string | null;
  parent_id: string | null;
  bio: string | null;
}

export default function FamilyTree() {
  const [family, setFamily] = useState<FamilyInfo | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [familyRes, membersRes] = await Promise.all([
        Network.request({ url: '/api/family' }),
        Network.request({ url: '/api/members' }),
      ]);
      console.log('宗亲树数据:', familyRes.data, membersRes.data);
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

  // 按世代分组
  const generations: Record<number, Member[]> = {};
  members.forEach(m => {
    if (!generations[m.generation]) generations[m.generation] = [];
    generations[m.generation].push(m);
  });
  const sortedGens = Object.keys(generations).map(Number).sort((a, b) => a - b);

  const handleAddMember = () => {
    Taro.navigateTo({ url: '/pages/members/index?mode=add' });
  };

  return (
    <View className="min-h-full bg-[#FAF8F5] pb-20">
      {/* 家族信息 */}
      <View className="px-4 pt-6 pb-4">
        {loading ? (
          <Skeleton className="h-20 w-full" />
        ) : family ? (
          <Card className="overflow-hidden border-2" style={{ borderColor: '#8B2500' }}>
            <CardContent className="p-5">
              <View className="flex items-center justify-between mb-2">
                <Text className="text-xl font-bold" style={{ color: '#8B2500' }}>
                  {family.family_name}
                </Text>
                <Button size="sm" onClick={handleAddMember}>
                  <Text className="text-xs">添加成员</Text>
                </Button>
              </View>
              {family.hall_name && (
                <Text className="block text-sm" style={{ color: '#6B5B4F' }}>
                  堂号：{family.hall_name}
                </Text>
              )}
              <Text className="block text-sm mt-1" style={{ color: '#999' }}>
                共 {members.length} 位宗亲 · {sortedGens.length} 个世代
              </Text>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-6 text-center">
              <Text className="block text-gray-500">暂无家族信息</Text>
            </CardContent>
          </Card>
        )}
      </View>

      {/* 宗亲树 - 按世代展示 */}
      <View className="px-4">
        {loading ? (
          <View className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
          </View>
        ) : sortedGens.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <TreePine size={48} color="#CCC" className="mx-auto mb-3" />
              <Text className="block text-gray-400 text-base">暂无宗亲数据</Text>
              <Text className="block text-gray-400 text-sm mt-1">请先添加家族成员</Text>
            </CardContent>
          </Card>
        ) : (
          sortedGens.map(gen => (
            <View key={gen} className="mb-4">
              <View className="flex items-center mb-2 px-1">
                <View className="px-3 py-1 rounded" style={{ backgroundColor: '#8B2500' }}>
                  <Text className="text-sm font-bold" style={{ color: '#FFFDF7' }}>第{gen}世</Text>
                </View>
                <View className="flex-1 h-px ml-2" style={{ backgroundColor: '#E8E0D8' }} />
              </View>
              <View className="space-y-2">
                {generations[gen].map(member => (
                  <Card key={member.id} className="overflow-hidden">
                    <CardContent className="p-3">
                      <View className="flex items-center justify-between">
                        <View className="flex items-center gap-2">
                          <View className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: member.gender === 'male' ? '#E3F2FD' : '#FCE4EC' }}>
                            <Text className="text-sm font-bold" style={{ color: member.gender === 'male' ? '#1565C0' : '#C62828' }}>
                              {member.name.charAt(0)}
                            </Text>
                          </View>
                          <View>
                            <Text className="block text-base font-bold" style={{ color: '#333' }}>
                              {member.name}
                              {member.is_alive === 'no' && (
                                <Text className="text-xs ml-1" style={{ color: '#999' }}>(故)</Text>
                              )}
                            </Text>
                            <Text className="block text-xs" style={{ color: '#999' }}>
                              {member.birth_date || '未知'}
                              {member.death_date ? ` - ${member.death_date}` : member.is_alive === 'yes' ? ' - 健在' : ''}
                            </Text>
                          </View>
                        </View>
                        {member.spouse_name && (
                          <Text className="text-xs px-2 py-1 rounded" style={{ backgroundColor: '#FFF5F0', color: '#8B2500' }}>
                            配 {member.spouse_name}
                          </Text>
                        )}
                      </View>
                    </CardContent>
                  </Card>
                ))}
              </View>
            </View>
          ))
        )}
      </View>
    </View>
  );
}
