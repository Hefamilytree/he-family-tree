import { useState, useCallback } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import { Save, TreePine } from 'lucide-react-taro';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Network } from '@/network';

interface FamilyInfo {
  id: string;
  surname: string;
  family_name: string;
  hall_name: string | null;
  motto: string | null;
  description: string | null;
  origin: string | null;
}

const FamilyPage = () => {
  const [family, setFamily] = useState<FamilyInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [formSurname, setFormSurname] = useState('');
  const [formFamilyName, setFormFamilyName] = useState('');
  const [formHallName, setFormHallName] = useState('');
  const [formMotto, setFormMotto] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formOrigin, setFormOrigin] = useState('');

  const fetchFamily = useCallback(async () => {
    try {
      setLoading(true);
      const res = await Network.request({ url: '/api/family' });
      console.log('family:', res.data);
      const data = res.data?.data;
      if (data) {
        setFamily(data);
        setFormSurname(data.surname || '');
        setFormFamilyName(data.family_name || '');
        setFormHallName(data.hall_name || '');
        setFormMotto(data.motto || '');
        setFormDescription(data.description || '');
        setFormOrigin(data.origin || '');
      }
    } catch (err) {
      console.error('Failed to fetch family:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useDidShow(() => {
    fetchFamily();
  });

  const handleSave = async () => {
    if (!formSurname.trim() || !formFamilyName.trim()) {
      Taro.showToast({ title: '请填写姓氏和家族名称', icon: 'none' });
      return;
    }
    try {
      setSaving(true);
      const payload = {
        surname: formSurname.trim(),
        family_name: formFamilyName.trim(),
        hall_name: formHallName.trim() || null,
        motto: formMotto.trim() || null,
        description: formDescription.trim() || null,
        origin: formOrigin.trim() || null,
      };

      let res;
      if (family?.id) {
        res = await Network.request({
          url: `/api/family/${family.id}`,
          method: 'PUT',
          data: payload,
        });
      } else {
        res = await Network.request({
          url: '/api/family',
          method: 'POST',
          data: payload,
        });
      }
      console.log('save:', res.data);
      Taro.showToast({ title: '保存成功', icon: 'success' });
      fetchFamily();
    } catch (err) {
      console.error('Save failed:', err);
      Taro.showToast({ title: '保存失败', icon: 'none' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView scrollY className="h-full bg-stone-50">
      <View className="px-4 py-4 pb-24">
        {/* 标题 */}
        <View className="flex items-center gap-2 mb-4">
          <TreePine size={24} color="#8B2500" />
          <Text className="text-2xl font-serif font-bold text-stone-800">
            家族信息
          </Text>
        </View>

        {loading ? (
          <Card className="bg-amber-50 border-stone-200">
            <CardContent className="p-5">
              <Skeleton className="h-5 w-40 mb-3" />
              <Skeleton className="h-10 w-full mb-3" />
              <Skeleton className="h-10 w-full mb-3" />
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-amber-50 border-stone-200">
            <CardContent className="p-5">
              <View className="flex flex-col gap-4">
                <View>
                  <Text className="block text-sm font-semibold text-stone-700 mb-1">
                    姓氏 *
                  </Text>
                  <View className="bg-stone-50 rounded-xl px-3 py-2 border border-stone-200">
                    <Input
                      className="w-full bg-transparent"
                      placeholder="如: 张、李、王"
                      value={formSurname}
                      onInput={(e) => setFormSurname(e.detail.value)}
                    />
                  </View>
                </View>

                <View>
                  <Text className="block text-sm font-semibold text-stone-700 mb-1">
                    家族名称 *
                  </Text>
                  <View className="bg-stone-50 rounded-xl px-3 py-2 border border-stone-200">
                    <Input
                      className="w-full bg-transparent"
                      placeholder="如: 张氏家族、陇西李氏"
                      value={formFamilyName}
                      onInput={(e) => setFormFamilyName(e.detail.value)}
                    />
                  </View>
                </View>

                <View>
                  <Text className="block text-sm font-semibold text-stone-700 mb-1">
                    堂号
                  </Text>
                  <View className="bg-stone-50 rounded-xl px-3 py-2 border border-stone-200">
                    <Input
                      className="w-full bg-transparent"
                      placeholder="如: 三槐堂、百忍堂"
                      value={formHallName}
                      onInput={(e) => setFormHallName(e.detail.value)}
                    />
                  </View>
                </View>

                <Separator className="bg-stone-200" />

                <View>
                  <Text className="block text-sm font-semibold text-stone-700 mb-1">
                    家训/族规
                  </Text>
                  <View className="bg-stone-50 rounded-xl p-3 border border-stone-200">
                    <Textarea
                      style={{ width: '100%', minHeight: '80px', backgroundColor: 'transparent' }}
                      placeholder="记录家族的家训或族规..."
                      value={formMotto}
                      onInput={(e) => setFormMotto(e.detail.value)}
                      maxlength={500}
                    />
                  </View>
                </View>

                <View>
                  <Text className="block text-sm font-semibold text-stone-700 mb-1">
                    家族起源/迁徙
                  </Text>
                  <View className="bg-stone-50 rounded-xl p-3 border border-stone-200">
                    <Textarea
                      style={{ width: '100%', minHeight: '80px', backgroundColor: 'transparent' }}
                      placeholder="记录家族的起源、迁徙历史..."
                      value={formOrigin}
                      onInput={(e) => setFormOrigin(e.detail.value)}
                      maxlength={500}
                    />
                  </View>
                </View>

                <View>
                  <Text className="block text-sm font-semibold text-stone-700 mb-1">
                    家族简介
                  </Text>
                  <View className="bg-stone-50 rounded-xl p-3 border border-stone-200">
                    <Textarea
                      style={{ width: '100%', minHeight: '100px', backgroundColor: 'transparent' }}
                      placeholder="记录家族的详细介绍..."
                      value={formDescription}
                      onInput={(e) => setFormDescription(e.detail.value)}
                      maxlength={1000}
                    />
                  </View>
                </View>

                <Button
                  className="w-full bg-red-900 mt-2"
                  onClick={handleSave}
                  disabled={saving}
                >
                  <Save size={16} color="#FFFDF7" />
                  <Text className="text-sm ml-2">
                    {saving ? '保存中...' : family ? '更新信息' : '创建家族'}
                  </Text>
                </Button>
              </View>
            </CardContent>
          </Card>
        )}
      </View>
    </ScrollView>
  );
};

export default FamilyPage;
