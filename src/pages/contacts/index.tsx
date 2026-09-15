import React, { useState, useEffect, useCallback } from 'react';
import Taro, { useRouter } from '@tarojs/taro';
import { View, Text } from '@tarojs/components';
import { Phone, MapPin, TreePine, Users, ShieldCheck } from 'lucide-react-taro';
import { Network } from '@/network';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface KinItem {
  userId: string;
  memberId: string;
  name: string;
  generation?: number;
  generationTitle?: string;
  phone?: string;
  residence?: string;
  bio?: string;
}

const ContactsPage: React.FC = () => {
  const router = useRouter();
  const mode = (router.params.mode === 'nearby' ? 'nearby' : 'directory');
  const isNearby = mode === 'nearby';
  const title = isNearby ? '附近宗亲' : '通讯录';

  const [items, setItems] = useState<KinItem[]>([]);
  const [groups, setGroups] = useState<{ label: string; list: KinItem[] }[]>([]);
  const [loading, setLoading] = useState(true);
  const [verified, setVerified] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await Network.request({
        url: `/api/contacts/${isNearby ? 'nearby' : 'directory'}`,
      });
      console.log('[contacts]', res.data);
      const list: KinItem[] = res.data?.data?.list || [];
      const verifiedFlag = res.data?.data?.verified !== false;
      setVerified(verifiedFlag);
      setItems(list);

      if (isNearby) {
        const map = new Map<string, KinItem[]>();
        list.forEach((k) => {
          const region = (k.residence || '其他地区').split(/[·\s]/)[0];
          if (!map.has(region)) map.set(region, []);
          map.get(region)!.push(k);
        });
        setGroups(Array.from(map.entries()).map(([label, l]) => ({ label, list: l })));
      }
    } catch (e) {
      console.error('加载宗亲数据失败', e);
    } finally {
      setLoading(false);
    }
  }, [isNearby]);

  useEffect(() => {
    Taro.setNavigationBarTitle({ title });
    load();
  }, [load, title]);

  const handleCall = (phone?: string) => {
    if (!phone) {
      Taro.showToast({ title: '暂无联系电话', icon: 'none' });
      return;
    }
    Taro.makePhoneCall({ phoneNumber: phone });
  };

  const goProfile = () => {
    Taro.switchTab({ url: '/pages/profile/index' });
  };

  const renderCard = (k: KinItem) => (
    <Card key={k.userId} className="overflow-hidden">
      <CardContent className="p-4">
        <View className="flex items-start justify-between">
          <View className="flex-1">
            <View className="flex items-center gap-2">
              <Text className="block text-base font-bold text-stone-800">{k.name}</Text>
              {k.generationTitle ? (
                <View className="px-2 py-1 rounded bg-red-800 bg-opacity-10">
                  <Text className="text-xs text-red-800">{k.generationTitle}字辈</Text>
                </View>
              ) : null}
              {k.generation ? (
                <Text className="block text-xs text-stone-400">第{k.generation}世</Text>
              ) : null}
            </View>
            {k.residence ? (
              <View className="flex items-center gap-1 mt-2">
                <MapPin size={13} color="#8B2500" />
                <Text className="block text-sm text-stone-600">{k.residence}</Text>
              </View>
            ) : null}
            {k.phone ? (
              <View className="flex items-center gap-1 mt-1">
                <Phone size={13} color="#8B2500" />
                <Text className="block text-sm text-stone-600">{k.phone}</Text>
              </View>
            ) : null}
            {k.bio ? (
              <Text className="block text-xs text-stone-400 mt-2 line-clamp-2">{k.bio}</Text>
            ) : null}
          </View>
          <Button
            size="sm"
            variant="outline"
            className="ml-2"
            onClick={() => handleCall(k.phone)}
          >
            <Text>拨打</Text>
          </Button>
        </View>
      </CardContent>
    </Card>
  );

  return (
    <View className="min-h-full pb-16" style={{ backgroundColor: '#FAF8F5' }}>
      {/* 说明栏 */}
      <View className="px-4 pt-4 pb-2 flex items-center gap-2">
        {isNearby ? <Users size={18} color="#8B2500" /> : <TreePine size={18} color="#8B2500" />}
        <Text className="text-lg font-bold" style={{ color: '#8B2500' }}>{title}</Text>
      </View>
      <View className="px-4 pb-3">
        <Text className="block text-xs text-stone-500">
          {isNearby
            ? '按现居住地自动归组，已完成宗亲认证的族人会自动出现在附近。'
            : '自动汇总已完成宗亲认证（字辈 + 手机号 + 现居住地）的族人联系方式。'}
        </Text>
      </View>

      {!verified && !loading ? (
        <View className="px-4">
          <Card className="border-amber-300 bg-amber-50">
            <CardContent className="p-5 text-center">
              <View className="flex justify-center mb-3">
                <ShieldCheck size={40} color="#B45309" />
              </View>
              <Text className="block text-base font-semibold text-stone-800 mb-1">
                完成宗亲认证后自动关联
              </Text>
              <Text className="block text-sm text-stone-500 mb-4">
                微信登录后填写字辈、手机号码和现居住地，即可自动加入通讯录与附近宗亲。
              </Text>
              <Button className="bg-red-800 text-white" onClick={goProfile}>
                <Text>前往认证</Text>
              </Button>
            </CardContent>
          </Card>
        </View>
      ) : null}

      <View className="px-4">
        {loading ? (
          <View className="space-y-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
          </View>
        ) : items.length === 0 ? (
          verified ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Text className="block text-stone-400 text-sm">
                  暂无已认证宗亲，族人完成认证后将自动出现在这里。
                </Text>
              </CardContent>
            </Card>
          ) : null
        ) : isNearby ? (
          groups.map((g) => (
            <View key={g.label} className="mb-5">
              <View className="flex items-center gap-2 mb-2 mt-1">
                <MapPin size={15} color="#8B2500" />
                <Text className="block text-sm font-semibold text-stone-700">
                  {g.label}
                  <Text className="text-stone-400">（{g.list.length}位）</Text>
                </Text>
              </View>
              <View className="space-y-3">{g.list.map(renderCard)}</View>
            </View>
          ))
        ) : (
          <View className="space-y-3">{items.map(renderCard)}</View>
        )}
      </View>
    </View>
  );
};

export default ContactsPage;
