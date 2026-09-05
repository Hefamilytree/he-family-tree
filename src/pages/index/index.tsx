import { useState } from 'react';
import { View, Text } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import {
  ScrollText, Award, Heart, MapPin, BookOpen, CircleUser,
  Calendar, Flame, Crown, Star, HeartHandshake, GraduationCap, HandHeart,
  Phone, Users, Briefcase, MessageSquare, ShoppingBag
} from 'lucide-react-taro';
import { Card, CardContent } from '@/components/ui/card';
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

// 三大单元板块配置
const UNIT_SECTIONS = [
  {
    id: 'cultural',
    title: '文化传承',
    color: '#8B2500',
    bgColor: '#FFF5F0',
    items: [
      { key: 'family_motto', name: '家风家训', icon: ScrollText },
      { key: 'honor', name: '家族字辈', icon: Award },
      { key: 'merit', name: '家史', icon: Heart },
      { key: 'migration', name: '迁徙轨迹', icon: MapPin },
      { key: 'family_history', name: '家族事记', icon: BookOpen },
      { key: 'person_history', name: '前言', icon: CircleUser },
    ]
  },
  {
    id: 'harmony',
    title: '孝亲睦族',
    color: '#2E7D32',
    bgColor: '#F0FFF4',
    items: [
      { key: 'activity', name: '活动组织', icon: Calendar },
      { key: 'ancestor_worship', name: '祭祖', icon: Flame },
      { key: 'coming_of_age', name: '成人礼', icon: Crown },
      { key: 'talent', name: '立贤', icon: Star },
      { key: 'elderly_care', name: '敬老', icon: HeartHandshake },
      { key: 'education', name: '助学', icon: GraduationCap },
      { key: 'relief', name: '纾困', icon: HandHeart },
    ]
  },
  {
    id: 'economic',
    title: '发展经济',
    color: '#1565C0',
    bgColor: '#F0F7FF',
    items: [
      { key: 'contact', name: '字辈', icon: Phone },
      { key: 'relative', name: '附近宗亲', icon: Users },
      { key: 'entrepreneur', name: '企业家圈', icon: Briefcase },
      { key: 'supply_demand', name: '供需信息', icon: MessageSquare },
      { key: 'product', name: '产品展示', icon: ShoppingBag },
    ]
  }
];

export default function Index() {
  const [family, setFamily] = useState<FamilyInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const loadFamily = async () => {
    setLoading(true);
    try {
      const res = await Network.request({ url: '/api/family' });
      console.log('家族数据:', res.data);
      const list = res.data?.data || [];
      setFamily(list.length > 0 ? list[0] : null);
    } catch (e) {
      console.error('加载家族失败:', e);
    } finally {
      setLoading(false);
    }
  };

  useDidShow(() => { loadFamily(); });

  const handleSectionClick = (sectionId: string, itemKey: string, itemName: string) => {
    Taro.navigateTo({
      url: `/pages/section-detail/index?section=${sectionId}&category=${itemKey}&title=${encodeURIComponent(itemName)}`
    });
  };

  return (
    <View className="min-h-full bg-[#FAF8F5] pb-20">
      {/* 家族概览 */}
      <View className="px-4 pt-6 pb-4">
        {loading ? (
          <Card className="overflow-hidden">
            <CardContent className="p-6">
              <Skeleton className="h-8 w-48 mb-3" />
              <Skeleton className="h-5 w-32 mb-4" />
              <Skeleton className="h-4 w-full" />
            </CardContent>
          </Card>
        ) : family ? (
          <Card className="overflow-hidden border-2" style={{ borderColor: '#8B2500' }}>
            <CardContent className="p-6">
              <View className="flex items-center justify-between mb-3">
                <Text className="text-2xl font-bold" style={{ color: '#8B2500' }}>
                  {family.family_name}
                </Text>
                <Text className="text-sm px-3 py-1 rounded-full" style={{ backgroundColor: '#8B2500', color: '#FFFDF7' }}>
                  {family.surname}氏
                </Text>
              </View>
              {family.hall_name && (
                <Text className="block text-base mb-2" style={{ color: '#6B5B4F' }}>
                  堂号：{family.hall_name}
                </Text>
              )}
              {family.motto && (
                <View className="mt-3 p-3 rounded-lg" style={{ backgroundColor: '#FFF5F0' }}>
                  <Text className="block text-sm font-medium mb-1" style={{ color: '#8B2500' }}>家训</Text>
                  <Text className="block text-base font-bold" style={{ color: '#8B2500' }}>{family.motto}</Text>
                </View>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-6 text-center">
              <Text className="block text-gray-500">暂无家族信息，请先在&quot;我的&quot;页面初始化数据</Text>
            </CardContent>
          </Card>
        )}
      </View>

      {/* 三大单元 */}
      <View className="px-4">
        {UNIT_SECTIONS.map((section) => (
          <View key={section.id} className="mb-6">
            <View className="flex items-center mb-3 px-1">
              <View className="w-1 h-5 rounded-full mr-2" style={{ backgroundColor: section.color }} />
              <Text className="text-lg font-bold" style={{ color: section.color }}>{section.title}</Text>
            </View>
            <View className="grid grid-cols-3 gap-3">
              {section.items.map((item) => {
                const Icon = item.icon;
                return (
                  <View
                    key={item.key}
                    className="rounded-xl p-4 flex flex-col items-center justify-center"
                    style={{ backgroundColor: section.bgColor }}
                    onClick={() => handleSectionClick(section.id, item.key, item.name)}
                  >
                    <Icon size={28} color={section.color} className="mb-2" />
                    <Text className="text-sm text-center font-medium" style={{ color: section.color }}>{item.name}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}
