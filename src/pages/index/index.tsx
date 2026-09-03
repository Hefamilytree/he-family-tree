import { useState, useCallback } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import { TreePine, Users, Plus, ChevronRight } from 'lucide-react-taro';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Network } from '@/network';
import './index.css';

interface FamilyInfo {
  id: string;
  surname: string;
  family_name: string;
  hall_name: string | null;
  motto: string | null;
  description: string | null;
}

interface MemberNode {
  id: string;
  name: string;
  gender: string;
  generation: number;
  is_alive: string;
  birth_date: string | null;
  death_date: string | null;
  spouse_name: string | null;
  parent_id: string | null;
  children?: MemberNode[];
}

interface TreeNodeProps {
  node: MemberNode;
  onMemberTap: (member: MemberNode) => void;
}

const TreeNode = ({ node, onMemberTap }: TreeNodeProps) => {
  return (
    <View className="flex flex-col items-center">
      <View
        className="flex flex-col items-center mb-2"
        onClick={() => onMemberTap(node)}
      >
        <View
          className={`w-16 h-16 rounded-full flex items-center justify-center border-2 ${
            node.gender === 'male'
              ? 'border-red-900 bg-amber-50'
              : 'border-yellow-700 bg-amber-50'
          }`}
        >
          <Text
            className={`text-lg font-serif font-bold ${
              node.gender === 'male' ? 'text-red-900' : 'text-yellow-700'
            }`}
          >
            {node.name.charAt(0)}
          </Text>
        </View>
        <Text className="block text-sm font-semibold text-stone-800 mt-1 text-center">
          {node.name}
        </Text>
        <Text className="block text-xs text-stone-500 text-center">
          第{node.generation}世
        </Text>
        {node.spouse_name && (
          <Text className="block text-xs text-stone-400 text-center">
            配 {node.spouse_name}
          </Text>
        )}
      </View>
      {node.children && node.children.length > 0 && (
        <View className="flex flex-row justify-center gap-2">
          {node.children.map((child) => (
            <View key={child.id} className="flex flex-col items-center">
              <View className="w-px h-4 bg-stone-300" />
              <TreeNode node={child} onMemberTap={onMemberTap} />
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

const IndexPage = () => {
  const [family, setFamily] = useState<FamilyInfo | null>(null);
  const [treeData, setTreeData] = useState<MemberNode[]>([]);
  const [memberCount, setMemberCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [familyRes, treeRes, countRes] = await Promise.all([
        Network.request({ url: '/api/family' }),
        Network.request({ url: '/api/members/tree' }),
        Network.request({ url: '/api/members/count' }),
      ]);
      console.log('family:', familyRes.data);
      console.log('tree:', treeRes.data);
      console.log('count:', countRes.data);

      const familyData = familyRes.data?.data;
      if (familyData) {
        setFamily(familyData);
      }

      const tree = treeRes.data?.data;
      if (tree && Array.isArray(tree)) {
        setTreeData(tree);
      }

      const count = countRes.data?.data;
      if (count !== undefined) {
        setMemberCount(count);
      }
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useDidShow(() => {
    fetchData();
  });

  const handleMemberTap = (member: MemberNode) => {
    Taro.showModal({
      title: member.name,
      content: `第${member.generation}世\n${member.gender === 'male' ? '男' : '女'}\n${member.is_alive === 'yes' ? '在世' : '已故'}${member.birth_date ? '\n出生: ' + member.birth_date : ''}${member.spouse_name ? '\n配偶: ' + member.spouse_name : ''}`,
      showCancel: true,
      cancelText: '关闭',
      confirmText: '查看后代',
    });
  };

  const handleAddMember = () => {
    Taro.navigateTo({ url: '/pages/members/index?action=add' });
  };

  return (
    <ScrollView scrollY className="h-full bg-stone-50">
      <View className="px-4 py-4 pb-24">
        {/* 家族概览卡片 */}
        {loading ? (
          <Card className="bg-amber-50 border-stone-200 mb-4">
            <CardContent className="p-5">
              <Skeleton className="h-6 w-40 mb-3" />
              <Skeleton className="h-4 w-60 mb-2" />
              <Skeleton className="h-4 w-32" />
            </CardContent>
          </Card>
        ) : family ? (
          <Card className="bg-amber-50 border-stone-200 mb-4">
            <CardContent className="p-5">
              <View className="flex items-center gap-2 mb-2">
                <Text className="text-2xl font-serif font-bold text-stone-800">
                  {family.surname}氏家族
                </Text>
              </View>
              {family.hall_name && (
                <Text className="block text-base text-yellow-700 font-serif mb-1">
                  {family.hall_name}
                </Text>
              )}
              <Text className="block text-sm text-stone-500 mb-3">
                {family.family_name}
              </Text>
              <View className="flex items-center gap-4">
                <View className="flex items-center gap-1">
                  <Users size={16} color="#6B5B4F" />
                  <Text className="text-sm text-stone-600">
                    {memberCount} 位成员
                  </Text>
                </View>
              </View>
              {family.motto && (
                <View className="mt-3 pt-3 border-t border-stone-200">
                  <Text className="block text-sm text-stone-500 italic">
                    &ldquo;{family.motto}&rdquo;
                  </Text>
                </View>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-amber-50 border-stone-200 mb-4">
            <CardContent className="p-5 flex flex-col items-center">
              <TreePine size={48} color="#D4C5B9" />
              <Text className="block text-base text-stone-500 mt-3 text-center">
                尚未创建家族信息
              </Text>
              <Text className="block text-sm text-stone-400 mt-1 text-center">
                请先前往&ldquo;家族&rdquo;页面创建家族
              </Text>
            </CardContent>
          </Card>
        )}

        {/* 族谱树 */}
        <View className="flex items-center justify-between mb-3">
          <Text className="text-lg font-serif font-semibold text-stone-800">
            族谱世系图
          </Text>
          <Button
            size="sm"
            variant="outline"
            className="border-red-900 text-red-900"
            onClick={handleAddMember}
          >
            <Plus size={14} color="#8B2500" />
            <Text className="text-xs ml-1">添加成员</Text>
          </Button>
        </View>

        {loading ? (
          <Card className="bg-amber-50 border-stone-200">
            <CardContent className="p-5">
              <Skeleton className="h-32 w-full" />
            </CardContent>
          </Card>
        ) : treeData.length > 0 ? (
          <Card className="bg-amber-50 border-stone-200">
            <CardContent className="p-4">
              <ScrollView scrollX className="w-full">
                <View className="flex flex-row gap-4 min-w-max py-2">
                  {treeData.map((root) => (
                    <TreeNode
                      key={root.id}
                      node={root}
                      onMemberTap={handleMemberTap}
                    />
                  ))}
                </View>
              </ScrollView>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-amber-50 border-stone-200">
            <CardContent className="p-8 flex flex-col items-center">
              <TreePine size={48} color="#D4C5B9" />
              <Text className="block text-base text-stone-500 mt-3 text-center">
                族谱暂无成员
              </Text>
              <Text className="block text-sm text-stone-400 mt-1 text-center">
                点击&ldquo;添加成员&rdquo;开始修缮族谱
              </Text>
              <Button
                className="mt-4 bg-red-900"
                onClick={handleAddMember}
              >
                <Plus size={16} color="#FFFDF7" />
                <Text className="text-sm ml-1">添加第一位成员</Text>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* 快捷操作 */}
        <View className="mt-4">
          <Text className="text-lg font-serif font-semibold text-stone-800 mb-3">
            快捷操作
          </Text>
          <View className="flex flex-col gap-3">
            <Card
              className="bg-amber-50 border-stone-200 active:opacity-80"
              onClick={() => Taro.switchTab({ url: '/pages/members/index' })}
            >
              <CardContent className="p-4 flex items-center justify-between">
                <View className="flex items-center gap-3">
                  <View className="w-10 h-10 rounded-full bg-red-900 flex items-center justify-center">
                    <Users size={20} color="#FFFDF7" />
                  </View>
                  <View>
                    <Text className="block text-base font-semibold text-stone-800">
                      成员管理
                    </Text>
                    <Text className="block text-sm text-stone-500">
                      查看和管理家族成员
                    </Text>
                  </View>
                </View>
                <ChevronRight size={18} color="#6B5B4F" />
              </CardContent>
            </Card>
            <Card
              className="bg-amber-50 border-stone-200 active:opacity-80"
              onClick={() => Taro.switchTab({ url: '/pages/family/index' })}
            >
              <CardContent className="p-4 flex items-center justify-between">
                <View className="flex items-center gap-3">
                  <View className="w-10 h-10 rounded-full bg-yellow-700 flex items-center justify-center">
                    <TreePine size={20} color="#FFFDF7" />
                  </View>
                  <View>
                    <Text className="block text-base font-semibold text-stone-800">
                      家族信息
                    </Text>
                    <Text className="block text-sm text-stone-500">
                      编辑家族基本信息
                    </Text>
                  </View>
                </View>
                <ChevronRight size={18} color="#6B5B4F" />
              </CardContent>
            </Card>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

export default IndexPage;
