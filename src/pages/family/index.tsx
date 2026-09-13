import { useState } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import { TreePine } from 'lucide-react-taro';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Network } from '@/network';
import { toLunarBirth } from '@/utils/lunar';
import './index.css';

interface FamilyInfo {
  id: string;
  surname: string;
  family_name: string;
  hall_name: string | null;
}

interface SpouseInfo {
  id: string;
  name: string;
  status: string; // alive / deceased / divorced
  birth_date?: string | null;
  death_date?: string | null;
  bio?: string | null;
  burial_place?: string | null;
}

interface TreeNode {
  id: string;
  name: string;
  gender: string;
  generation: number;
  generation_title: string | null;
  is_alive: string;
  birth_date: string | null;
  death_date: string | null;
  spouse_name: string | null;
  bio?: string | null;
  burial_place?: string | null;
  spouses: SpouseInfo[];
  children: TreeNode[];
}

export default function FamilyTree() {
  const [family, setFamily] = useState<FamilyInfo | null>(null);
  const [roots, setRoots] = useState<TreeNode[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [familyRes, treeRes] = await Promise.all([
        Network.request({ url: '/api/family' }),
        Network.request({ url: '/api/members/tree' }),
      ]);
      console.log('宗亲树数据:', familyRes.data, treeRes.data);
      const familyPayload = familyRes.data?.data;
      setFamily(Array.isArray(familyPayload) ? (familyPayload.length > 0 ? familyPayload[0] : null) : (familyPayload || null));
      setRoots(treeRes.data?.data || []);
    } catch (e) {
      console.error('加载数据失败:', e);
    } finally {
      setLoading(false);
    }
  };

  useDidShow(() => { loadData(); });

  const handleAddMember = () => {
    Taro.eventCenter.trigger('addMemberFromTree');
    Taro.switchTab({ url: '/pages/members/index' });
  };

  const handleEditMember = (node: TreeNode) => {
    Taro.eventCenter.trigger('editMemberFromTree', node.id);
    Taro.switchTab({ url: '/pages/members/index' });
  };

  const countNodes = (nodes: TreeNode[]): number => {
    return nodes.reduce((sum, n) => sum + 1 + countNodes(n.children), 0);
  };

  const spouseStatusLabel = (status: string) => {
    if (status === 'deceased') return '故';
    if (status === 'divorced') return '离';
    return '';
  };

  // 渲染单个成员节点（含配偶）
  const renderNode = (node: TreeNode) => {
    const spouseList: SpouseInfo[] = (node.spouses && node.spouses.length > 0)
      ? node.spouses
      : (node.spouse_name ? [{ id: 'legacy', name: node.spouse_name, status: 'alive' }] : []);

    return (
      <View className="tree-node" key={node.id}>
        <View className="tree-node-content">
          {/* 成员本人卡片（点击可直接编辑） */}
          <View
            className="tree-person-card"
            onClick={() => handleEditMember(node)}
            style={{
              backgroundColor: node.gender === 'male' ? '#E3F2FD' : '#FCE4EC',
              border: `1px solid ${node.gender === 'male' ? '#90CAF9' : '#F48FB1'}`,
            }}
          >
            <Text
              className="block text-sm font-bold text-center"
              style={{ color: node.gender === 'male' ? '#1565C0' : '#C62828', fontFamily: 'STKaiti, KaiTi, serif' }}
            >
              {node.name}
              {node.is_alive === 'no' && <Text style={{ color: '#999' }}>（故）</Text>}
            </Text>
            {node.generation_title && (
              <Text className="block text-xs text-center mt-1" style={{ color: '#8B2500' }}>
                {node.generation_title}字辈
              </Text>
            )}
            <Text className="block text-xs text-center mt-1" style={{ color: '#555' }}>
              {(node.birth_date ? toLunarBirth(node.birth_date) : '') || '生失考'}
              {node.death_date ? `—${toLunarBirth(node.death_date)}` : node.is_alive === 'no' ? '—卒失考' : ''}
            </Text>
            {node.is_alive === 'no' && (node.burial_place || true) && (
              <Text className="block text-xs text-center mt-1" style={{ color: '#999' }}>
                葬：{node.burial_place || '不详'}
              </Text>
            )}
            {node.bio ? (
              <Text className="block text-xs text-center mt-1" style={{ color: '#999' }}>
                {node.bio.length > 24 ? node.bio.slice(0, 24) + '…' : node.bio}
              </Text>
            ) : null}
            <Text className="block text-xs text-center mt-1" style={{ color: '#B0A090' }}>
              点击编辑
            </Text>
          </View>
          {/* 配偶卡片（可多位） */}
          {spouseList.map((sp, idx) => (
            <View key={sp.id || idx} className="flex items-center">
              <View className="tree-spouse-link" />
              <View className="tree-spouse-card" style={{ backgroundColor: '#FFF5F0', border: '1px solid #E8C8B8' }}>
                <Text className="block text-sm text-center" style={{ color: '#8B2500', fontFamily: 'STKaiti, KaiTi, serif' }}>
                  {sp.name}
                  {spouseStatusLabel(sp.status) ? `（${spouseStatusLabel(sp.status)}）` : ''}
                </Text>
                {(sp.birth_date || (sp.status === 'deceased' && sp.death_date)) && (
                  <Text className="block text-xs text-center" style={{ color: '#999' }}>
                    {(sp.birth_date ? toLunarBirth(sp.birth_date) : '') || '生失考'}{sp.status === 'deceased' ? `—${(sp.death_date ? toLunarBirth(sp.death_date) : '') || '卒失考'}` : ''}
                  </Text>
                )}
                {sp.status === 'deceased' && sp.burial_place && (
                  <Text className="block text-xs text-center" style={{ color: '#999' }}>葬：{sp.burial_place}</Text>
                )}
                {sp.bio && <Text className="block text-xs text-center" style={{ color: '#999' }}>{sp.bio}</Text>}
              </View>
            </View>
          ))}
        </View>
        {/* 子代 */}
        {node.children.length > 0 && (
          <View className="tree-children">
            {node.children.length > 1 && <View className="tree-vertical-line" />}
            <View className="tree-children-row">
              {node.children.map(child => (
                <View key={child.id} className="tree-child-branch">
                  <View className="tree-horizontal-line" />
                  <View className="tree-branch-stub" />
                  {renderNode(child)}
                </View>
              ))}
            </View>
          </View>
        )}
      </View>
    );
  };

  return (
    <View className="min-h-full bg-[#FAF8F5] pb-20">
      {/* 家族信息 */}
      <View className="px-4 pt-6 pb-4">
        {loading ? (
          <Skeleton className="h-20 w-full" />
        ) : family ? (
          <View className="overflow-hidden rounded-xl border-2 p-5" style={{ borderColor: '#8B2500', backgroundColor: '#FFFDF7' }}>
            <View className="flex items-center justify-between mb-2">
              <Text className="text-xl font-bold" style={{ color: '#8B2500', fontFamily: 'STKaiti, KaiTi, serif' }}>
                {family.family_name}宗亲树
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
              共 {countNodes(roots)} 位宗亲 · 垂丝世系图
            </Text>
          </View>
        ) : (
          <View className="rounded-xl p-6 text-center bg-white">
            <Text className="block text-gray-500">暂无家族信息</Text>
          </View>
        )}
      </View>

      {/* 垂丝图 */}
      <View className="px-4">
        {loading ? (
          <View className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
          </View>
        ) : roots.length === 0 ? (
          <View className="rounded-xl p-8 text-center bg-white">
            <TreePine size={48} color="#CCC" className="mx-auto mb-3" />
            <Text className="block text-gray-400 text-base">暂无宗亲数据</Text>
            <Text className="block text-gray-400 text-sm mt-1">请先添加家族成员</Text>
          </View>
        ) : (
          <ScrollView scrollX className="w-full" enhanced showScrollbar={false}>
            <View className="tree-canvas" style={{ backgroundColor: '#FFFDF7', border: '1px solid #E8E0D8', borderRadius: '12px', padding: '24px 20px', minWidth: '100%' }}>
              {roots.map(root => renderNode(root))}
            </View>
          </ScrollView>
        )}
      </View>
    </View>
  );
}
