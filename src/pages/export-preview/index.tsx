import { useState } from 'react';
import { View, Text } from '@tarojs/components';
import Taro, { useRouter, useDidShow, useShareAppMessage } from '@tarojs/taro';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toLunarBirth } from '@/utils/lunar';
import { Share2 } from 'lucide-react-taro';
import { Network } from '@/network';

interface FamilyInfo {
  id: string;
  surname: string;
  family_name: string;
  hall_name: string | null;
  motto: string | null;
  description: string | null;
}

interface SpouseInfo {
  id?: string;
  name: string;
  status?: string;
  birth_date?: string | null;
  death_date?: string | null;
  bio?: string | null;
  burial_place?: string | null;
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
  burial_place: string | null;
  spouses?: SpouseInfo[];
}

interface CulturalItem {
  id: string;
  category: string;
  title: string;
  content: string | null;
  sort_order?: number;
}

// 族谱卷首文化内容顺序：前言、家史、家风家训、家族字辈、家族事记
const FRONT_CULTURAL_ORDER = [
  { key: 'person_history', label: '前言' },
  { key: 'merit', label: '家史' },
  { key: 'family_motto', label: '家风家训' },
  { key: 'honor', label: '家族字辈' },
  { key: 'family_history', label: '家族事记' },
];

// 族谱卷末文化内容顺序：后记、编写说明
const BACK_CULTURAL_ORDER = [
  { key: 'afterword', label: '后记' },
  { key: 'editorial_note', label: '编写说明' },
];

const KAI_FONT = 'STKaiti, KaiTi, serif';

export default function ExportPreview() {
  const router = useRouter();
  const mode = router.params.mode || 'full';
  const branchId = router.params.branch || '';

  const [family, setFamily] = useState<FamilyInfo | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [culturalItems, setCulturalItems] = useState<CulturalItem[]>([]);
  const isMiniApp = [Taro.ENV_TYPE.WEAPP, Taro.ENV_TYPE.TT].includes(Taro.getEnv() as any);

  // 微信右上角分享 / 好友分享
  useShareAppMessage(() => ({
    title: `${family?.family_name || '何氏'}族谱`,
    path: `/pages/index/index`,
  }));

  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [familyRes, membersRes, culturalRes] = await Promise.all([
        Network.request({ url: '/api/family' }),
        Network.request({ url: '/api/members' }),
        Network.request({ url: '/api/cultural' }),
      ]);
      const familyPayload = familyRes.data?.data;
      setFamily(Array.isArray(familyPayload) ? (familyPayload.length > 0 ? familyPayload[0] : null) : (familyPayload || null));

      let memberList = membersRes.data?.data || [];
      // 如果是分支模式，只获取该分支的成员
      if (mode === 'branch' && branchId) {
        const allMembers = memberList;
        const branchMembers: Member[] = [];
        const queue = [branchId];
        while (queue.length > 0) {
          const currentId = queue.shift()!;
          const member = allMembers.find(m => m.id === currentId);
          if (member) {
            branchMembers.push(member);
            const children = allMembers.filter(m => m.parent_id === currentId);
            children.forEach(child => queue.push(child.id));
          }
        }
        memberList = branchMembers;
      }
      setMembers(memberList);

      const culturalList: CulturalItem[] = culturalRes.data?.data || [];
      console.log('文化传承数据:', culturalList);
      setCulturalItems(culturalList);
    } catch (e) {
      console.error('加载数据失败:', e);
    } finally {
      setLoading(false);
    }
  };

  useDidShow(() => { loadData(); });

  // 按指定顺序分组文化内容
  const groupCultural = (order: { key: string; label: string }[]) => {
    return order
      .map(section => ({
        ...section,
        items: culturalItems
          .filter(item => item.category === section.key)
          .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)),
      }))
      .filter(section => section.items.length > 0);
  };

  const frontSections = groupCultural(FRONT_CULTURAL_ORDER);
  const backSections = groupCultural(BACK_CULTURAL_ORDER);

  // 渲染文化板块（楷体毛笔字）
  const renderCulturalSections = (sections: { key: string; label: string; items: CulturalItem[] }[]) => {
    return sections.map(section => (
      <View key={section.key} className="mb-6">
        <View className="flex items-center mb-3">
          <View className="px-4 py-1 rounded" style={{ backgroundColor: '#8B2500' }}>
            <Text className="text-base font-bold" style={{ color: '#FFFDF7', fontFamily: KAI_FONT }}>
              {section.label}
            </Text>
          </View>
          <View className="flex-1 h-px ml-3" style={{ backgroundColor: '#8B2500' }} />
        </View>
        <View className="space-y-3">
          {section.items.map(item => (
            <View key={item.id} className="p-4 rounded-lg" style={{ backgroundColor: '#FFFDF7', border: '1px solid #E8E0D8' }}>
              <Text className="block text-lg font-bold mb-2" style={{ color: '#333', fontFamily: KAI_FONT }}>
                {item.title}
              </Text>
              {item.content && (
                <Text className="block text-sm leading-relaxed" style={{ color: '#6B5B4F', fontFamily: KAI_FONT, whiteSpace: 'pre-wrap' }}>
                  {item.content}
                </Text>
              )}
            </View>
          ))}
        </View>
      </View>
    ));
  };

  // 按世代分组
  const generations: Record<number, Member[]> = {};
  members.forEach(m => {
    if (!generations[m.generation]) generations[m.generation] = [];
    generations[m.generation].push(m);
  });
  const sortedGens = Object.keys(generations).map(Number).sort((a, b) => a - b);

  const handleShare = () => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    if (isMiniApp) {
      Taro.showToast({ title: '点击右上角「···」即可转发给微信好友', icon: 'none' });
      return;
    }
    const nav = (navigator as any);
    if (nav && typeof nav.share === 'function') {
      nav.share({ title: `${family?.family_name || '何氏'}族谱`, text: '誠邀您查阅族谱世系', url })
        .catch(() => Taro.showToast({ title: '分享未完成', icon: 'none' }));
    } else {
      Taro.showToast({ title: '请截图保存后分享', icon: 'none' });
    }
  };

  const bodyCount = Object.values(generations).reduce((n, arr) => n + (arr ? arr.length : 0), 0);

  if (loading) {
    return (
      <View className="min-h-full bg-[#FAF8F5] p-4">
        <Skeleton className="h-32 w-full mb-4" />
        <Skeleton className="h-20 w-full" />
      </View>
    );
  }

  return (
    <View className="min-h-full bg-[#FAF8F5] pb-20">
      {/* 操作栏 */}
      <View className="px-4 pt-4 pb-3 flex items-center justify-between">
        <Text className="text-lg font-bold" style={{ color: '#8B2500' }}>
          打印预览
        </Text>
        <View className="flex gap-2">
          <Button size="sm" variant="outline" onClick={handleShare}>
            <Share2 size={14} color="#8B2500" />
            <Text className="text-xs ml-1">分享</Text>
          </Button>
        </View>
      </View>

      {/* 封面页 */}
      <View className="px-4 mb-4">
        <View
          style={{
            backgroundColor: '#FBF6EE',
            border: '3px double #8B2500',
            padding: '40px 16px', minHeight: '560px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Text className="block text-center" style={{ color: '#8B2500', fontFamily: 'STKaiti, KaiTi, serif', fontSize: '26px', letterSpacing: '10px', marginBottom: '20px' }}>
            {family?.hall_name || ''}
          </Text>
          <View style={{ width: '64px', borderBottom: '2px solid #8B2500', marginBottom: '22px' }} />
          <Text className="block text-center font-bold" style={{ color: '#8B2500', fontFamily: 'STKaiti, KaiTi, serif', fontSize: '46px', letterSpacing: '14px' }}>
            {family?.family_name || '何氏'}族谱
          </Text>
          <View style={{ width: '64px', borderBottom: '2px solid #8B2500', marginTop: '26px', marginBottom: '24px' }} />
          <Text className="block text-center" style={{ color: '#6B5B4F', fontFamily: 'STKaiti, KaiTi, serif', fontSize: '17px', letterSpacing: '4px' }}>
            {`公元${new Date().getFullYear()}年重修`}
          </Text>
        </View>
      </View>

      {/* 索引表（目录）页 */}
      <View className="px-4 mb-4">
        <View style={{ backgroundColor: '#FFFDF7', border: '2px solid #8B2500', padding: '22px' }}>
          <Text className="block text-center text-xl font-bold mb-5" style={{ color: '#8B2500', fontFamily: 'STKaiti, KaiTi, serif' }}>
            目 录
          </Text>
          <Text className="block text-sm font-bold mb-2" style={{ color: '#8B2500', fontFamily: 'STKaiti, KaiTi, serif' }}>卷首</Text>
          {frontSections.map((s, i) => (
            <View key={`f${i}`} className="flex" style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 3 }}>
              <Text style={{ fontFamily: 'STKaiti, KaiTi, serif', fontSize: '14px' }}>{s.label}</Text>
            </View>
          ))}
          {frontSections.length === 0 && (
            <Text style={{ fontFamily: 'STKaiti, KaiTi, serif', fontSize: '13px', color: '#999' }}>（暂无前置内容）</Text>
          )}
          <Text className="block text-sm font-bold mt-4 mb-2" style={{ color: '#8B2500', fontFamily: 'STKaiti, KaiTi, serif' }}>世系</Text>
          <View className="flex" style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 3 }}>
            <Text style={{ fontFamily: 'STKaiti, KaiTi, serif', fontSize: '14px' }}>第 1-{sortedGens.length || 1} 世（录入 {bodyCount} 位在世系）</Text>
          </View>
          <Text className="block text-sm font-bold mt-4 mb-2" style={{ color: '#8B2500', fontFamily: 'STKaiti, KaiTi, serif' }}>卷末</Text>
          {backSections.map((s, i) => (
            <View key={`b${i}`} className="flex" style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 3 }}>
              <Text style={{ fontFamily: 'STKaiti, KaiTi, serif', fontSize: '14px' }}>{s.label}</Text>
            </View>
          ))}
          {backSections.length === 0 && (
            <Text style={{ fontFamily: 'STKaiti, KaiTi, serif', fontSize: '13px', color: '#999' }}>（暂无卷末内容）</Text>
          )}
        </View>
      </View>

      {/* 族谱内容 - 楷体毛笔字风格 */}
      <View className="px-4">
        {family && (
          <View className="export-content" style={{ backgroundColor: '#FFFDF7', border: '2px solid #8B2500', padding: '20px' }}>
            {/* 标题 */}
            <View className="text-center mb-6">
              <Text className="block text-3xl font-bold mb-2" style={{ color: '#8B2500', fontFamily: 'STKaiti, KaiTi, serif' }}>
                {family.family_name}族谱
              </Text>
              {family.hall_name && (
                <Text className="block text-lg" style={{ color: '#6B5B4F', fontFamily: 'STKaiti, KaiTi, serif' }}>
                  {family.hall_name}
                </Text>
              )}
              {family.motto && (
                <View className="mt-4 p-3 rounded" style={{ backgroundColor: '#FFF5F0', border: '1px solid #8B2500' }}>
                  <Text className="block text-sm mb-1" style={{ color: '#8B2500', fontFamily: 'STKaiti, KaiTi, serif' }}>家训</Text>
                  <Text className="block text-base font-bold" style={{ color: '#8B2500', fontFamily: 'STKaiti, KaiTi, serif' }}>
                    {family.motto}
                  </Text>
                </View>
              )}
            </View>

            {/* 卷首文化内容：前言、家史、家风家训、家族字辈、家族事记 */}
            {renderCulturalSections(frontSections)}

            {/* 世代内容 */}
            {sortedGens.map(gen => (
              <View key={gen} className="mb-6">
                <View className="flex items-center mb-3">
                  <View className="px-4 py-1 rounded" style={{ backgroundColor: '#8B2500' }}>
                    <Text className="text-base font-bold" style={{ color: '#FFFDF7', fontFamily: 'STKaiti, KaiTi, serif' }}>
                      第{gen}世
                    </Text>
                  </View>
                  <View className="flex-1 h-px ml-3" style={{ backgroundColor: '#8B2500' }} />
                </View>

                <View className="space-y-3">
                  {generations[gen].map(member => (
                    <View key={member.id} className="p-4 rounded-lg" style={{ backgroundColor: '#FFFDF7', border: '1px solid #E8E0D8' }}>
                      <View className="flex items-start justify-between mb-2">
                        <Text className="text-xl font-bold" style={{ color: '#333', fontFamily: 'STKaiti, KaiTi, serif' }}>
                          {member.name}
                          {member.is_alive === 'no' && (
                            <Text className="text-sm ml-2" style={{ color: '#999' }}>(故)</Text>
                          )}
                        </Text>
                        <Text className="text-sm px-3 py-1 rounded" style={{ backgroundColor: '#FFF5F0', color: '#8B2500', fontFamily: 'STKaiti, KaiTi, serif' }}>
                          {member.gender === 'male' ? '男' : '女'}
                        </Text>
                      </View>

                      <View className="space-y-1">
                        <Text className="block text-sm" style={{ color: '#6B5B4F', fontFamily: 'STKaiti, KaiTi, serif' }}>
                          生卒（农历）：{(member.birth_date ? toLunarBirth(member.birth_date) : '') || '未知'}
                          {member.death_date ? ` - ${toLunarBirth(member.death_date)}` : member.is_alive === 'yes' ? ' - 健在' : ' - 已故'}
                        </Text>
                        {(member.spouses && member.spouses.length > 0) ? (
                          member.spouses.map((sp, si) => (
                            <View key={sp.id || si}>
                              <Text className="block text-sm" style={{ color: '#6B5B4F', fontFamily: 'STKaiti, KaiTi, serif' }}>
                                配偶：{sp.name}{sp.status === 'deceased' ? '（故）' : sp.status === 'divorced' ? '（离异）' : ''}
                              </Text>
                              {(sp.birth_date || (sp.status === 'deceased' && sp.death_date)) && (
                                <Text className="block text-sm" style={{ color: '#999', fontFamily: 'STKaiti, KaiTi, serif' }}>
                                  　生卒（农历）：{(sp.birth_date ? toLunarBirth(sp.birth_date) : '') || '生失考'}{sp.status === 'deceased' ? ` - ${(sp.death_date ? toLunarBirth(sp.death_date) : '') || '卒失考'}` : ''}
                                </Text>
                              )}
                              {sp.status === 'deceased' && sp.burial_place && (
                                <Text className="block text-sm" style={{ color: '#999', fontFamily: 'STKaiti, KaiTi, serif' }}>
                                  　葬地：{sp.burial_place}
                                </Text>
                              )}
                              {sp.bio && (
                                <Text className="block text-sm" style={{ color: '#999', fontFamily: 'STKaiti, KaiTi, serif' }}>
                                  　简介：{sp.bio}
                                </Text>
                              )}
                            </View>
                          ))
                        ) : member.spouse_name ? (
                          <Text className="block text-sm" style={{ color: '#6B5B4F', fontFamily: 'STKaiti, KaiTi, serif' }}>
                            配偶：{member.spouse_name}
                          </Text>
                        ) : null}
                        {member.birth_place && (
                          <Text className="block text-sm" style={{ color: '#6B5B4F', fontFamily: 'STKaiti, KaiTi, serif' }}>
                            出生地：{member.birth_place}
                          </Text>
                        )}
                        {member.burial_place && member.is_alive === 'no' && (
                          <Text className="block text-sm" style={{ color: '#6B5B4F', fontFamily: 'STKaiti, KaiTi, serif' }}>
                            葬地：{member.burial_place}
                          </Text>
                        )}
                        {member.bio && (
                          <Text className="block text-sm mt-2" style={{ color: '#666', fontFamily: 'STKaiti, KaiTi, serif' }}>
                            简介：{member.bio}
                          </Text>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            ))}

            {/* 卷末文化内容：后记、编写说明 */}
            {renderCulturalSections(backSections)}

            {/* 页脚 */}
            <View className="text-center mt-8 pt-4" style={{ borderTop: '1px solid #E8E0D8' }}>
              <Text className="block text-xs" style={{ color: '#999', fontFamily: 'STKaiti, KaiTi, serif' }}>
                {family.family_name}族谱 · 共 {members.length} 位宗亲
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* 提示 */}
      <View className="px-4 mt-4">
        <Card>
          <CardContent className="p-4">
            <Text className="block text-sm" style={{ color: '#6B5B4F' }}>
              💡 提示：请使用手机截图功能保存族谱内容，或分享给家人朋友。
            </Text>
          </CardContent>
        </Card>
      </View>
    </View>
  );
}
