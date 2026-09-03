import { useState, useEffect } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro, { useDidShow, useRouter } from '@tarojs/taro';
import { Users, Plus, Pencil, Trash2, Printer, Search } from 'lucide-react-taro';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Network } from '@/network';

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

export default function Members() {
  const router = useRouter();
  const [members, setMembers] = useState<Member[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [filterGen, setFilterGen] = useState<number | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);

  // 表单状态
  const [formName, setFormName] = useState('');
  const [formGender, setFormGender] = useState('male');
  const [formGeneration, setFormGeneration] = useState(1);
  const [formBirthDate, setFormBirthDate] = useState('');
  const [formDeathDate, setFormDeathDate] = useState('');
  const [formParentId, setFormParentId] = useState('');
  const [formSpouseName, setFormSpouseName] = useState('');
  const [formBio, setFormBio] = useState('');
  const [formIsAlive, setFormIsAlive] = useState('yes');
  const [formBirthPlace, setFormBirthPlace] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await Network.request({ url: '/api/members' });
      console.log('成员数据:', res.data);
      const list = res.data?.data || [];
      setMembers(list);
      setFilteredMembers(list);
    } catch (e) {
      console.error('加载成员失败:', e);
    } finally {
      setLoading(false);
    }
  };

  useDidShow(() => {
    loadData();
    if (router.params.mode === 'add') {
      setShowAddForm(true);
    }
  });

  // 搜索和筛选
  useEffect(() => {
    let result = members;
    if (searchText) {
      result = result.filter(m => m.name.includes(searchText));
    }
    if (filterGen !== null) {
      result = result.filter(m => m.generation === filterGen);
    }
    setFilteredMembers(result);
  }, [searchText, filterGen, members]);

  const generations = [...new Set(members.map(m => m.generation))].sort((a, b) => a - b);

  const resetForm = () => {
    setFormName('');
    setFormGender('male');
    setFormGeneration(1);
    setFormBirthDate('');
    setFormDeathDate('');
    setFormParentId('');
    setFormSpouseName('');
    setFormBio('');
    setFormIsAlive('yes');
    setFormBirthPlace('');
    setEditingMember(null);
  };

  const handleAdd = () => {
    resetForm();
    setShowAddForm(true);
  };

  const handleEdit = (member: Member) => {
    setEditingMember(member);
    setFormName(member.name);
    setFormGender(member.gender);
    setFormGeneration(member.generation);
    setFormBirthDate(member.birth_date || '');
    setFormDeathDate(member.death_date || '');
    setFormParentId(member.parent_id || '');
    setFormSpouseName(member.spouse_name || '');
    setFormBio(member.bio || '');
    setFormIsAlive(member.is_alive);
    setFormBirthPlace(member.birth_place || '');
    setShowAddForm(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      Taro.showToast({ title: '请输入姓名', icon: 'none' });
      return;
    }
    try {
      const familyRes = await Network.request({ url: '/api/family' });
      const familyId = familyRes.data?.data?.[0]?.id;
      if (!familyId) {
        Taro.showToast({ title: '请先创建家族', icon: 'none' });
        return;
      }

      const data: any = {
        name: formName,
        gender: formGender,
        generation: formGeneration,
        is_alive: formIsAlive,
        birth_date: formBirthDate || null,
        death_date: formIsAlive === 'no' ? (formDeathDate || null) : null,
        parent_id: formParentId || null,
        spouse_name: formSpouseName || null,
        bio: formBio || null,
        birth_place: formBirthPlace || null,
      };

      if (editingMember) {
        await Network.request({ url: `/api/members/${editingMember.id}`, method: 'PUT', data });
        Taro.showToast({ title: '更新成功', icon: 'success' });
      } else {
        await Network.request({ url: '/api/members', method: 'POST', data });
        Taro.showToast({ title: '添加成功', icon: 'success' });
      }
      setShowAddForm(false);
      resetForm();
      loadData();
    } catch (e) {
      console.error('保存失败:', e);
      Taro.showToast({ title: '保存失败', icon: 'error' });
    }
  };

  const handleDelete = async (id: string) => {
    const result = await Taro.showModal({ title: '确认删除', content: '确定要删除这位成员吗？' });
    if (!result.confirm) return;
    try {
      await Network.request({ url: `/api/members/${id}`, method: 'DELETE' });
      Taro.showToast({ title: '删除成功', icon: 'success' });
      loadData();
    } catch (e) {
      Taro.showToast({ title: '删除失败', icon: 'error' });
    }
  };

  const handleExport = () => {
    Taro.navigateTo({ url: '/pages/export/index' });
  };

  return (
    <View className="min-h-full bg-[#FAF8F5] pb-20">
      {/* 搜索栏 */}
      <View className="px-4 pt-4 pb-2">
        <View className="flex items-center gap-2 mb-3">
          <View className="flex-1 bg-[#FFFDF7] rounded-lg px-3 py-2 border flex items-center" style={{ borderColor: '#E8E0D8' }}>
            <Search size={16} color="#999" />
            <Input
              className="flex-1 bg-transparent ml-2"
              placeholder="搜索成员姓名..."
              value={searchText}
              onInput={(e) => setSearchText(e.detail.value)}
            />
          </View>
          <Button size="sm" onClick={handleExport}>
            <Printer size={16} color="#8B2500" />
          </Button>
        </View>

        {/* 世代筛选 */}
        {generations.length > 0 && (
          <ScrollView scrollX className="flex gap-2 pb-2">
            <View
              className="px-3 py-1 rounded-full whitespace-nowrap"
              style={{ backgroundColor: filterGen === null ? '#8B2500' : '#FFFDF7', color: filterGen === null ? '#FFFDF7' : '#6B5B4F' }}
              onClick={() => setFilterGen(null)}
            >
              <Text className="text-xs">全部</Text>
            </View>
            {generations.map(gen => (
              <View
                key={gen}
                className="px-3 py-1 rounded-full whitespace-nowrap"
                style={{ backgroundColor: filterGen === gen ? '#8B2500' : '#FFFDF7', color: filterGen === gen ? '#FFFDF7' : '#6B5B4F' }}
                onClick={() => setFilterGen(gen)}
              >
                <Text className="text-xs">第{gen}世</Text>
              </View>
            ))}
          </ScrollView>
        )}
      </View>

      {/* 添加/编辑表单 */}
      {showAddForm && (
        <View className="px-4 mb-4">
          <Card className="border-2" style={{ borderColor: '#8B2500' }}>
            <CardContent className="p-4">
              <Text className="block text-lg font-bold mb-4" style={{ color: '#8B2500' }}>
                {editingMember ? '编辑成员' : '添加成员'}
              </Text>

              <View className="mb-3">
                <Text className="block text-sm mb-1" style={{ color: '#6B5B4F' }}>姓名 *</Text>
                <View className="bg-[#FFFDF7] rounded-lg p-2 border" style={{ borderColor: '#E8E0D8' }}>
                  <Input className="w-full bg-transparent" placeholder="请输入姓名" value={formName} onInput={(e) => setFormName(e.detail.value)} />
                </View>
              </View>

              <View className="flex gap-3 mb-3">
                <View className="flex-1">
                  <Text className="block text-sm mb-1" style={{ color: '#6B5B4F' }}>性别</Text>
                  <View className="flex gap-2">
                    <View className="flex-1 px-3 py-2 rounded-lg text-center" style={{ backgroundColor: formGender === 'male' ? '#E3F2FD' : '#FFFDF7', color: formGender === 'male' ? '#1565C0' : '#6B5B4F' }} onClick={() => setFormGender('male')}>
                      <Text className="text-sm">男</Text>
                    </View>
                    <View className="flex-1 px-3 py-2 rounded-lg text-center" style={{ backgroundColor: formGender === 'female' ? '#FCE4EC' : '#FFFDF7', color: formGender === 'female' ? '#C62828' : '#6B5B4F' }} onClick={() => setFormGender('female')}>
                      <Text className="text-sm">女</Text>
                    </View>
                  </View>
                </View>
                <View className="flex-1">
                  <Text className="block text-sm mb-1" style={{ color: '#6B5B4F' }}>世代</Text>
                  <View className="bg-[#FFFDF7] rounded-lg p-2 border" style={{ borderColor: '#E8E0D8' }}>
                    <Input className="w-full bg-transparent" type="number" placeholder="世代数" value={String(formGeneration)} onInput={(e) => setFormGeneration(Number(e.detail.value))} />
                  </View>
                </View>
              </View>

              <View className="flex gap-3 mb-3">
                <View className="flex-1">
                  <Text className="block text-sm mb-1" style={{ color: '#6B5B4F' }}>出生日期</Text>
                  <View className="bg-[#FFFDF7] rounded-lg p-2 border" style={{ borderColor: '#E8E0D8' }}>
                    <Input className="w-full bg-transparent" placeholder="如：1950" value={formBirthDate} onInput={(e) => setFormBirthDate(e.detail.value)} />
                  </View>
                </View>
                <View className="flex-1">
                  <Text className="block text-sm mb-1" style={{ color: '#6B5B4F' }}>状态</Text>
                  <View className="flex gap-2">
                    <View className="flex-1 px-3 py-2 rounded-lg text-center" style={{ backgroundColor: formIsAlive === 'yes' ? '#E8F5E9' : '#FFFDF7', color: formIsAlive === 'yes' ? '#2E7D32' : '#6B5B4F' }} onClick={() => setFormIsAlive('yes')}>
                      <Text className="text-sm">健在</Text>
                    </View>
                    <View className="flex-1 px-3 py-2 rounded-lg text-center" style={{ backgroundColor: formIsAlive === 'no' ? '#FFEBEE' : '#FFFDF7', color: formIsAlive === 'no' ? '#C62828' : '#6B5B4F' }} onClick={() => setFormIsAlive('no')}>
                      <Text className="text-sm">已故</Text>
                    </View>
                  </View>
                </View>
              </View>

              {formIsAlive === 'no' && (
                <View className="mb-3">
                  <Text className="block text-sm mb-1" style={{ color: '#6B5B4F' }}>逝世日期</Text>
                  <View className="bg-[#FFFDF7] rounded-lg p-2 border" style={{ borderColor: '#E8E0D8' }}>
                    <Input className="w-full bg-transparent" placeholder="如：2020" value={formDeathDate} onInput={(e) => setFormDeathDate(e.detail.value)} />
                  </View>
                </View>
              )}

              <View className="mb-3">
                <Text className="block text-sm mb-1" style={{ color: '#6B5B4F' }}>配偶姓名</Text>
                <View className="bg-[#FFFDF7] rounded-lg p-2 border" style={{ borderColor: '#E8E0D8' }}>
                  <Input className="w-full bg-transparent" placeholder="请输入配偶姓名" value={formSpouseName} onInput={(e) => setFormSpouseName(e.detail.value)} />
                </View>
              </View>

              <View className="mb-3">
                <Text className="block text-sm mb-1" style={{ color: '#6B5B4F' }}>出生地</Text>
                <View className="bg-[#FFFDF7] rounded-lg p-2 border" style={{ borderColor: '#E8E0D8' }}>
                  <Input className="w-full bg-transparent" placeholder="请输入出生地" value={formBirthPlace} onInput={(e) => setFormBirthPlace(e.detail.value)} />
                </View>
              </View>

              <View className="mb-4">
                <Text className="block text-sm mb-1" style={{ color: '#6B5B4F' }}>简介</Text>
                <View className="bg-[#FFFDF7] rounded-lg p-2 border" style={{ borderColor: '#E8E0D8' }}>
                  <Input className="w-full bg-transparent" placeholder="请输入简介" value={formBio} onInput={(e) => setFormBio(e.detail.value)} />
                </View>
              </View>

              <View className="flex gap-3">
                <Button className="flex-1" variant="outline" onClick={() => { setShowAddForm(false); resetForm(); }}>
                  <Text>取消</Text>
                </Button>
                <Button className="flex-1" style={{ backgroundColor: '#8B2500', color: '#FFFDF7' }} onClick={handleSave}>
                  <Text>{editingMember ? '更新' : '添加'}</Text>
                </Button>
              </View>
            </CardContent>
          </Card>
        </View>
      )}

      {/* 添加按钮 */}
      {!showAddForm && (
        <View className="px-4 mb-4">
          <Button className="w-full" style={{ backgroundColor: '#8B2500', color: '#FFFDF7' }} onClick={handleAdd}>
            <Plus size={16} color="#FFFDF7" />
            <Text className="ml-2">添加成员</Text>
          </Button>
        </View>
      )}

      {/* 成员列表 */}
      <View className="px-4">
        {loading ? (
          <View className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full" />)}
          </View>
        ) : filteredMembers.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Users size={48} color="#CCC" className="mx-auto mb-3" />
              <Text className="block text-gray-400 text-base">暂无成员数据</Text>
            </CardContent>
          </Card>
        ) : (
          <View className="space-y-3">
            {filteredMembers.map(member => (
              <Card key={member.id} className="overflow-hidden">
                <CardContent className="p-4">
                  <View className="flex items-start justify-between">
                    <View className="flex items-center gap-3 flex-1">
                      <View className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: member.gender === 'male' ? '#E3F2FD' : '#FCE4EC' }}>
                        <Text className="text-lg font-bold" style={{ color: member.gender === 'male' ? '#1565C0' : '#C62828' }}>
                          {member.name.charAt(0)}
                        </Text>
                      </View>
                      <View className="flex-1">
                        <View className="flex items-center gap-2 mb-1">
                          <Text className="text-base font-bold" style={{ color: '#333' }}>{member.name}</Text>
                          <Text className="text-xs px-2 py-1 rounded" style={{ backgroundColor: member.gender === 'male' ? '#E3F2FD' : '#FCE4EC', color: member.gender === 'male' ? '#1565C0' : '#C62828' }}>
                            {member.gender === 'male' ? '男' : '女'}
                          </Text>
                          <Text className="text-xs px-2 py-1 rounded" style={{ backgroundColor: '#FFF5F0', color: '#8B2500' }}>
                            第{member.generation}世
                          </Text>
                        </View>
                        <Text className="block text-xs" style={{ color: '#999' }}>
                          {member.birth_date || '未知'}
                          {member.death_date ? ` - ${member.death_date}` : member.is_alive === 'yes' ? ' - 健在' : ' - 已故'}
                        </Text>
                        {member.spouse_name && (
                          <Text className="block text-xs mt-1" style={{ color: '#6B5B4F' }}>
                            配偶：{member.spouse_name}
                          </Text>
                        )}
                        {member.birth_place && (
                          <Text className="block text-xs" style={{ color: '#6B5B4F' }}>
                            出生地：{member.birth_place}
                          </Text>
                        )}
                      </View>
                    </View>
                    <View className="flex gap-2">
                      <View onClick={() => handleEdit(member)} className="p-2 rounded-lg" style={{ backgroundColor: '#FFF5F0' }}>
                        <Pencil size={16} color="#8B2500" />
                      </View>
                      <View onClick={() => handleDelete(member.id)} className="p-2 rounded-lg" style={{ backgroundColor: '#FFEBEE' }}>
                        <Trash2 size={16} color="#C62828" />
                      </View>
                    </View>
                  </View>
                </CardContent>
              </Card>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}
