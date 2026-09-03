import { useState, useCallback } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import { Plus, Pencil, Trash2, User as UserIcon, Search } from 'lucide-react-taro';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Network } from '@/network';

interface Member {
  id: string;
  family_id: string;
  name: string;
  gender: string;
  birth_date: string | null;
  death_date: string | null;
  parent_id: string | null;
  parent_name?: string;
  spouse_name: string | null;
  generation: number;
  bio: string | null;
  is_alive: string;
  birth_place: string | null;
  created_at: string;
}

const MembersPage = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [allMembers, setAllMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [deletingMember, setDeletingMember] = useState<Member | null>(null);

  // 表单状态
  const [formName, setFormName] = useState('');
  const [formGender, setFormGender] = useState('male');
  const [formBirthDate, setFormBirthDate] = useState('');
  const [formDeathDate, setFormDeathDate] = useState('');
  const [formParentId, setFormParentId] = useState('');
  const [formSpouseName, setFormSpouseName] = useState('');
  const [formGeneration, setFormGeneration] = useState('1');
  const [formBio, setFormBio] = useState('');
  const [formIsAlive, setFormIsAlive] = useState('yes');
  const [formBirthPlace, setFormBirthPlace] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchMembers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await Network.request({ url: '/api/members' });
      console.log('members:', res.data);
      const data = res.data?.data;
      if (data && Array.isArray(data)) {
        setMembers(data);
        setAllMembers(data);
      }
    } catch (err) {
      console.error('Failed to fetch members:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useDidShow(() => {
    fetchMembers();
  });

  const handleSearch = (text: string) => {
    setSearchText(text);
    if (!text.trim()) {
      setMembers(allMembers);
    } else {
      const filtered = allMembers.filter(
        (m) => m.name.includes(text) || (m.spouse_name && m.spouse_name.includes(text))
      );
      setMembers(filtered);
    }
  };

  const resetForm = () => {
    setFormName('');
    setFormGender('male');
    setFormBirthDate('');
    setFormDeathDate('');
    setFormParentId('');
    setFormSpouseName('');
    setFormGeneration('1');
    setFormBio('');
    setFormIsAlive('yes');
    setFormBirthPlace('');
    setEditingMember(null);
  };

  const openAddDialog = () => {
    resetForm();
    setShowDialog(true);
  };

  const openEditDialog = (member: Member) => {
    setEditingMember(member);
    setFormName(member.name);
    setFormGender(member.gender);
    setFormBirthDate(member.birth_date || '');
    setFormDeathDate(member.death_date || '');
    setFormParentId(member.parent_id || '');
    setFormSpouseName(member.spouse_name || '');
    setFormGeneration(String(member.generation));
    setFormBio(member.bio || '');
    setFormIsAlive(member.is_alive);
    setFormBirthPlace(member.birth_place || '');
    setShowDialog(true);
  };

  const handleSubmit = async () => {
    if (!formName.trim()) {
      Taro.showToast({ title: '请输入姓名', icon: 'none' });
      return;
    }
    try {
      setSubmitting(true);
      const payload = {
        name: formName.trim(),
        gender: formGender,
        birth_date: formBirthDate || null,
        death_date: formDeathDate || null,
        parent_id: formParentId || null,
        spouse_name: formSpouseName || null,
        generation: parseInt(formGeneration) || 1,
        bio: formBio || null,
        is_alive: formIsAlive,
        birth_place: formBirthPlace || null,
      };

      if (editingMember) {
        const res = await Network.request({
          url: `/api/members/${editingMember.id}`,
          method: 'PUT',
          data: payload,
        });
        console.log('update:', res.data);
        Taro.showToast({ title: '修改成功', icon: 'success' });
      } else {
        const res = await Network.request({
          url: '/api/members',
          method: 'POST',
          data: payload,
        });
        console.log('create:', res.data);
        Taro.showToast({ title: '添加成功', icon: 'success' });
      }
      setShowDialog(false);
      resetForm();
      fetchMembers();
    } catch (err) {
      console.error('Submit failed:', err);
      Taro.showToast({ title: '操作失败', icon: 'none' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingMember) return;
    try {
      const res = await Network.request({
        url: `/api/members/${deletingMember.id}`,
        method: 'DELETE',
      });
      console.log('delete:', res.data);
      Taro.showToast({ title: '已删除', icon: 'success' });
      setDeletingMember(null);
      fetchMembers();
    } catch (err) {
      console.error('Delete failed:', err);
      Taro.showToast({ title: '删除失败', icon: 'none' });
    }
  };

  const confirmDelete = (member: Member) => {
    setDeletingMember(member);
  };

  return (
    <ScrollView scrollY className="h-full bg-stone-50">
      <View className="px-4 py-4 pb-24">
        {/* 搜索栏 */}
        <View className="flex items-center gap-2 mb-4">
          <View className="flex-1 bg-amber-50 rounded-xl px-3 py-2 border border-stone-200">
            <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '8px' }}>
              <Search size={16} color="#6B5B4F" />
              <Input
                className="flex-1 bg-transparent text-sm"
                placeholder="搜索成员姓名..."
                value={searchText}
                onInput={(e) => handleSearch(e.detail.value)}
              />
            </View>
          </View>
          <Button
            size="sm"
            className="bg-red-900"
            onClick={openAddDialog}
          >
            <Plus size={16} color="#FFFDF7" />
            <Text className="text-xs ml-1">添加</Text>
          </Button>
        </View>

        {/* 成员列表 */}
        {loading ? (
          <View className="flex flex-col gap-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="bg-amber-50 border-stone-200">
                <CardContent className="p-4">
                  <Skeleton className="h-5 w-32 mb-2" />
                  <Skeleton className="h-4 w-48" />
                </CardContent>
              </Card>
            ))}
          </View>
        ) : members.length > 0 ? (
          <View className="flex flex-col gap-3">
            {members.map((member) => (
              <Card key={member.id} className="bg-amber-50 border-stone-200">
                <CardContent className="p-4">
                  <View className="flex items-center justify-between">
                    <View className="flex items-center gap-3 flex-1">
                      <View
                        className={`w-12 h-12 rounded-full flex items-center justify-center border-2 ${
                          member.gender === 'male'
                            ? 'border-red-900'
                            : 'border-yellow-700'
                        }`}
                      >
                        <UserIcon
                          size={20}
                          color={member.gender === 'male' ? '#8B2500' : '#B8860B'}
                        />
                      </View>
                      <View className="flex-1">
                        <Text className="block text-base font-semibold text-stone-800">
                          {member.name}
                        </Text>
                        <Text className="block text-sm text-stone-500">
                          第{member.generation}世 · {member.gender === 'male' ? '男' : '女'} · {member.is_alive === 'yes' ? '在世' : '已故'}
                        </Text>
                        {member.parent_name && (
                          <Text className="block text-xs text-stone-400">
                            父: {member.parent_name}
                          </Text>
                        )}
                        {member.spouse_name && (
                          <Text className="block text-xs text-stone-400">
                            配偶: {member.spouse_name}
                          </Text>
                        )}
                      </View>
                    </View>
                    <View className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openEditDialog(member)}
                      >
                        <Pencil size={16} color="#6B5B4F" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => confirmDelete(member)}
                      >
                        <Trash2 size={16} color="#A0522D" />
                      </Button>
                    </View>
                  </View>
                </CardContent>
              </Card>
            ))}
          </View>
        ) : (
          <Card className="bg-amber-50 border-stone-200">
            <CardContent className="p-8 flex flex-col items-center">
              <UserIcon size={48} color="#D4C5B9" />
              <Text className="block text-base text-stone-500 mt-3 text-center">
                {searchText ? '未找到匹配的成员' : '暂无成员'}
              </Text>
              {!searchText && (
                <Button className="mt-4 bg-red-900" onClick={openAddDialog}>
                  <Plus size={16} color="#FFFDF7" />
                  <Text className="text-sm ml-1">添加第一位成员</Text>
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </View>

      {/* 添加/编辑弹窗 */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-h-screen overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingMember ? '编辑成员' : '添加成员'}
            </DialogTitle>
          </DialogHeader>
          <ScrollView scrollY className="max-h-96">
            <View className="flex flex-col gap-4 py-2">
              <View>
                <Text className="block text-sm text-stone-600 mb-1">姓名 *</Text>
                <View className="bg-stone-50 rounded-xl px-3 py-2 border border-stone-200">
                  <Input
                    className="w-full bg-transparent"
                    placeholder="请输入姓名"
                    value={formName}
                    onInput={(e) => setFormName(e.detail.value)}
                  />
                </View>
              </View>

              <View>
                <Text className="block text-sm text-stone-600 mb-1">性别</Text>
                <Select value={formGender} onValueChange={setFormGender}>
                  <SelectTrigger className="bg-stone-50 border-stone-200">
                    <SelectValue placeholder="选择性别" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">男</SelectItem>
                    <SelectItem value="female">女</SelectItem>
                  </SelectContent>
                </Select>
              </View>

              <View>
                <Text className="block text-sm text-stone-600 mb-1">世代</Text>
                <View className="bg-stone-50 rounded-xl px-3 py-2 border border-stone-200">
                  <Input
                    className="w-full bg-transparent"
                    placeholder="第几世"
                    value={formGeneration}
                    onInput={(e) => setFormGeneration(e.detail.value)}
                  />
                </View>
              </View>

              <View>
                <Text className="block text-sm text-stone-600 mb-1">在世状态</Text>
                <Select value={formIsAlive} onValueChange={setFormIsAlive}>
                  <SelectTrigger className="bg-stone-50 border-stone-200">
                    <SelectValue placeholder="选择状态" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">在世</SelectItem>
                    <SelectItem value="no">已故</SelectItem>
                  </SelectContent>
                </Select>
              </View>

              <View>
                <Text className="block text-sm text-stone-600 mb-1">出生日期</Text>
                <View className="bg-stone-50 rounded-xl px-3 py-2 border border-stone-200">
                  <Input
                    className="w-full bg-transparent"
                    placeholder="如: 1950-01-01 或 农历庚寅年"
                    value={formBirthDate}
                    onInput={(e) => setFormBirthDate(e.detail.value)}
                  />
                </View>
              </View>

              {formIsAlive === 'no' && (
                <View>
                  <Text className="block text-sm text-stone-600 mb-1">去世日期</Text>
                  <View className="bg-stone-50 rounded-xl px-3 py-2 border border-stone-200">
                    <Input
                      className="w-full bg-transparent"
                      placeholder="如: 2020-06-15"
                      value={formDeathDate}
                      onInput={(e) => setFormDeathDate(e.detail.value)}
                    />
                  </View>
                </View>
              )}

              <View>
                <Text className="block text-sm text-stone-600 mb-1">父亲（关联上一代）</Text>
                <Select value={formParentId} onValueChange={setFormParentId}>
                  <SelectTrigger className="bg-stone-50 border-stone-200">
                    <SelectValue placeholder="选择父亲（可选）" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">无</SelectItem>
                    {allMembers
                      .filter((m) => !editingMember || m.id !== editingMember.id)
                      .map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.name}（第{m.generation}世）
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </View>

              <View>
                <Text className="block text-sm text-stone-600 mb-1">配偶姓名</Text>
                <View className="bg-stone-50 rounded-xl px-3 py-2 border border-stone-200">
                  <Input
                    className="w-full bg-transparent"
                    placeholder="请输入配偶姓名"
                    value={formSpouseName}
                    onInput={(e) => setFormSpouseName(e.detail.value)}
                  />
                </View>
              </View>

              <View>
                <Text className="block text-sm text-stone-600 mb-1">出生地</Text>
                <View className="bg-stone-50 rounded-xl px-3 py-2 border border-stone-200">
                  <Input
                    className="w-full bg-transparent"
                    placeholder="请输入出生地"
                    value={formBirthPlace}
                    onInput={(e) => setFormBirthPlace(e.detail.value)}
                  />
                </View>
              </View>

              <View>
                <Text className="block text-sm text-stone-600 mb-1">简介/事迹</Text>
                <View className="bg-stone-50 rounded-xl p-3 border border-stone-200">
                  <Textarea
                    style={{ width: '100%', minHeight: '80px', backgroundColor: 'transparent' }}
                    placeholder="记录成员的生平事迹..."
                    value={formBio}
                    onInput={(e) => setFormBio(e.detail.value)}
                    maxlength={500}
                  />
                </View>
              </View>
            </View>
          </ScrollView>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              取消
            </Button>
            <Button className="bg-red-900" onClick={handleSubmit} disabled={submitting}>
              {submitting ? '提交中...' : editingMember ? '保存修改' : '确认添加'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认弹窗 */}
      <Dialog open={!!deletingMember} onOpenChange={(open) => !open && setDeletingMember(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
          </DialogHeader>
          <View className="py-4">
            <Text className="block text-base text-stone-600">
              确定要删除成员&ldquo;{deletingMember?.name}&rdquo;吗？此操作不可撤销。
            </Text>
            <Text className="block text-sm text-stone-400 mt-2">
              删除后，该成员的子代成员的父级关联将被清除。
            </Text>
          </View>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingMember(null)}>
              取消
            </Button>
            <Button className="bg-red-800" onClick={handleDelete}>
              确认删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ScrollView>
  );
};

export default MembersPage;
