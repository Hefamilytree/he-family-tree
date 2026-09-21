import { useState, useEffect } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import { Users, Plus, Pencil, Trash2, Printer, Search, X, UserPlus } from 'lucide-react-taro';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toLunarBirth } from '@/utils/lunar';
import { Network } from '@/network';

interface Spouse {
  id?: string;
  name: string;
  status: string; // alive 健在 / deceased 已故 / divorced 离异
  birthDate?: string;
  deathDate?: string;
  bio?: string;
  burialPlace?: string;
}

/** 兼容后端配偶字段（snake_case）与表单字段（camelCase） */
function normalizeSpouse(raw: any): Spouse {
  return {
    id: raw.id,
    name: raw.name,
    status: raw.status || 'alive',
    birthDate: raw.birthDate ?? raw.birth_date ?? '',
    deathDate: raw.deathDate ?? raw.death_date ?? '',
    bio: raw.bio ?? '',
    burialPlace: raw.burialPlace ?? raw.burial_place ?? '',
  };
}

interface Member {
  id: string;
  name: string;
  gender: string;
  generation: number;
  generation_title: string | null;
  is_alive: string;
  birth_date: string | null;
  death_date: string | null;
  parent_id: string | null;
  parent_name: string | null;
  spouse_name: string | null;
  bio: string | null;
  birth_place: string | null;
  burial_place: string | null;
  spouses?: Spouse[];
}

interface GenerationOption {
  title: string;
}

export default function Members() {
  const [members, setMembers] = useState<Member[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<Member[]>([]);
  const [generationOptions, setGenerationOptions] = useState<GenerationOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [filterGen, setFilterGen] = useState<number | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);

  // 表单状态
  const [formName, setFormName] = useState('');
  const [formGender, setFormGender] = useState('male');
  const [formGenIndex, setFormGenIndex] = useState(0); // 字辈选项下标（0 起）
  const [formBirthDate, setFormBirthDate] = useState('');
  const [formDeathDate, setFormDeathDate] = useState('');
  const [formParentId, setFormParentId] = useState('');
  const [formSpouses, setFormSpouses] = useState<Spouse[]>([]);
  const [formBio, setFormBio] = useState('');
  const [formIsAlive, setFormIsAlive] = useState('yes');
  const [formBirthPlace, setFormBirthPlace] = useState('');
  const [formBurialPlace, setFormBurialPlace] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [res, honorRes] = await Promise.all([
        Network.request({ url: '/api/members' }),
        Network.request({ url: '/api/cultural/category/honor' }),
      ]);
      console.log('成员数据:', res.data);
      const list = (res.data?.data || []).map((m: Member) => ({
        ...m,
        spouses: (m.spouses || []).map(normalizeSpouse),
      }));
      setMembers(list);
      setFilteredMembers(list);
      // 家族字辈选项：从「家族字辈」板块内容提取；
      // 字辈排序从「如下：」之后开始（第一世从「如下：」后才计，前面的引导文字仅限打印引用，不属字辈）
      const honorList = honorRes.data?.data || [];
      const raws: string[] = [];
      honorList.forEach((item: any) => {
        let content = item.content ? String(item.content) : '';
        const idx = content.indexOf('如下：');
        if (idx >= 0) content = content.slice(idx + 3);
        else {
          const idx2 = content.indexOf('如下:');
          if (idx2 >= 0) content = content.slice(idx2 + 3);
        }
        raws.push(content);
      });
      const options: GenerationOption[] = [];
      raws.join(' ').split(/[\s,，、\/\n]+/).forEach((c: string) => {
        const t = c.trim();
        if (t && !options.find(o => o.title === t)) options.push({ title: t });
      });
      setGenerationOptions(options);
      return { list, options };
    } catch (e) {
      console.error('加载成员失败:', e);
      return { list: [] as Member[], options: [] as GenerationOption[] };
    } finally {
      setLoading(false);
    }
  };

  // 宗亲树页通过事件中心跳转：添加成员 / 编辑指定成员
  useEffect(() => {
    const handleAddFromTree = () => {
      resetForm();
      setShowAddForm(true);
    };
    const handleEditFromTree = async (memberId: string) => {
      const { list, options } = await loadData();
      const target = list.find(m => m.id === memberId);
      if (target) handleEdit(target, options);
    };
    Taro.eventCenter.on('addMemberFromTree', handleAddFromTree);
    Taro.eventCenter.on('editMemberFromTree', handleEditFromTree);
    return () => {
      Taro.eventCenter.off('addMemberFromTree', handleAddFromTree);
      Taro.eventCenter.off('editMemberFromTree', handleEditFromTree);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useDidShow(() => {
    loadData();
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
    setFormGenIndex(0);
    setFormBirthDate('');
    setFormDeathDate('');
    setFormParentId('');
    setFormSpouses([]);
    setFormBio('');
    setFormIsAlive('yes');
    setFormBirthPlace('');
    setFormBurialPlace('');
    setEditingMember(null);
  };

  const handleAdd = () => {
    resetForm();
    setShowAddForm(true);
  };

  const handleEdit = (member: Member, optionsArg?: GenerationOption[]) => {
    const options = optionsArg || generationOptions;
    setEditingMember(member);
    setFormName(member.name);
    setFormGender(member.gender);
    setFormBirthDate(member.birth_date || '');
    setFormDeathDate(member.death_date || '');
    setFormParentId(member.parent_id || '');
    setFormBio(member.bio || '');
    setFormIsAlive(member.is_alive);
    setFormBirthPlace(member.birth_place || '');
    setFormBurialPlace(member.burial_place && member.burial_place !== '葬地不详' ? member.burial_place : '');
    // 回填配偶：优先 spouses 表，兼容旧字段 spouse_name
    const spouseList = (member.spouses && member.spouses.length > 0)
      ? member.spouses.map(normalizeSpouse).map(s => ({
        ...s,
        burialPlace: s.burialPlace && s.burialPlace !== '葬地不详' ? s.burialPlace : '',
      }))
      : (member.spouse_name ? [{ name: member.spouse_name, status: 'alive', birthDate: '', deathDate: '', bio: '', burialPlace: '' }] : []);
    setFormSpouses(spouseList);
    // 字辈：优先匹配 generation_title，否则按世代数回推
    let idx = (member.generation || 1) - 1;
    if (options.length > 0) {
      if (member.generation_title) {
        const matched = options.findIndex(o => o.title === member.generation_title);
        if (matched >= 0) idx = matched;
      }
      idx = Math.max(0, Math.min(idx, options.length - 1));
    }
    setFormGenIndex(idx);
    setShowAddForm(true);
  };

  const handleAddSpouse = () => {
    setFormSpouses([...formSpouses, { name: '', status: 'alive', birthDate: '', deathDate: '', bio: '', burialPlace: '' }]);
  };

  const handleRemoveSpouse = (idx: number) => {
    setFormSpouses(formSpouses.filter((_, i) => i !== idx));
  };

  const handleUpdateSpouse = (idx: number, field: 'name' | 'status' | 'birthDate' | 'deathDate' | 'bio' | 'burialPlace', value: string) => {
    setFormSpouses(formSpouses.map((s, i) => i === idx ? { ...s, [field]: value } : s));
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      Taro.showToast({ title: '请输入姓名', icon: 'none' });
      return;
    }
    // 字辈选择结果：有字辈则取字辈，generation 为字辈序号+1；否则提示配置字辈
    const genTitle = generationOptions[formGenIndex]?.title || null;
    const genNumber = generationOptions.length > 0 ? formGenIndex + 1 : formGenIndex + 1;
    const validSpouses = formSpouses.filter(s => s.name.trim());

    try {
      const familyRes = await Network.request({ url: '/api/family' });
      const familyPayload = familyRes.data?.data;
      const familyId = Array.isArray(familyPayload) ? familyPayload[0]?.id : familyPayload?.id;
      if (!familyId) {
        Taro.showToast({ title: '请先创建家族', icon: 'none' });
        return;
      }

      const data: any = {
        name: formName,
        gender: formGender,
        generation: genNumber,
        generation_title: genTitle,
        is_alive: formIsAlive,
        birth_date: formBirthDate || null,
        death_date: formIsAlive === 'no' ? (formDeathDate || null) : null,
        parent_id: formParentId || null,
        spouse_name: validSpouses.length > 0 ? validSpouses[0].name.trim() : null,
        bio: formBio || null,
        birth_place: formBirthPlace || null,
        burial_place: formIsAlive === 'no' ? (formBurialPlace || null) : null,
      };

      let savedId = '';
      if (editingMember) {
        const updateRes = await Network.request({ url: `/api/members/${editingMember.id}`, method: 'PUT', data });
        console.log('更新成员响应:', updateRes.data);
        savedId = editingMember.id;
        Taro.showToast({ title: '更新成功', icon: 'success' });
      } else {
        const createRes = await Network.request({ url: '/api/members', method: 'POST', data });
        console.log('新增成员响应:', createRes.data);
        savedId = createRes.data?.data?.id || '';
        Taro.showToast({ title: '添加成功', icon: 'success' });
      }

      // 同步多配偶数据到 spouses 表
      if (savedId) {
        // 先同步配偶：简单策略——以表单为准，删除原有全部后重建
        const existing = editingMember?.spouses || [];
        for (const s of existing) {
          if (s.id) {
            await Network.request({ url: `/api/spouses?id=${s.id}`, method: 'DELETE' }).catch(() => null);
          }
        }
        for (const s of validSpouses) {
          await Network.request({
            url: '/api/spouses',
            method: 'POST',
            data: {
              memberId: savedId,
              name: s.name.trim(),
              status: s.status,
              birthDate: s.status === 'deceased' || s.birthDate ? (s.birthDate || null) : null,
              deathDate: s.status === 'deceased' ? (s.deathDate || null) : null,
              bio: s.bio?.trim() || null,
              burialPlace: s.status === 'deceased' ? (s.burialPlace?.trim() || null) : null,
            },
          }).catch((err) => console.error('保存配偶失败:', err));
        }
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

  const spouseStatusLabel = (status: string) => {
    if (status === 'deceased') return '故';
    if (status === 'divorced') return '离异';
    return '';
  };

  // 父代候选（不包含自身及后代，简单排除自身）
  const parentCandidates = members.filter(m => m.id !== editingMember?.id);

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

        {/* 字辈筛选 */}
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
                <Text className="text-xs">{genTitleOfGen(gen)}</Text>
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

              {/* 字辈选择（下拉框，链接家族字辈） */}
              <View className="mb-3">
                <Text className="block text-sm mb-1" style={{ color: '#6B5B4F' }}>字辈（家族字辈）</Text>
                {generationOptions.length > 0 ? (
                  <Select value={String(formGenIndex)} onValueChange={(v) => setFormGenIndex(Number(v))}>
                    <SelectTrigger className="w-full bg-[#FFFDF7] border rounded-lg" style={{ borderColor: '#E8E0D8' }}>
                      <SelectValue placeholder="请选择字辈" />
                    </SelectTrigger>
                    <SelectContent>
                      {generationOptions.map((opt, idx) => (
                        <SelectItem key={opt.title} value={String(idx)}>
                          {idx + 1}世 · {opt.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <View className="bg-[#FFF5F0] rounded-lg p-2 border" style={{ borderColor: '#E8C8B8' }}>
                    <Text className="block text-xs" style={{ color: '#8B2500' }}>
                      尚未配置家族字辈，请到「族谱首页 → 文化传承 → 家族字辈」添加字辈内容（按辈分顺序，用空格或顿号分隔）。
                    </Text>
                  </View>
                )}
              </View>

              {/* 父辈选择（下拉框） */}
              <View className="mb-3">
                <Text className="block text-sm mb-1" style={{ color: '#6B5B4F' }}>父辈（挂靠宗亲）</Text>
                <Select value={formParentId || '__root__'} onValueChange={(v) => setFormParentId(v === '__root__' ? '' : v)}>
                  <SelectTrigger className="w-full bg-[#FFFDF7] border rounded-lg" style={{ borderColor: '#E8E0D8' }}>
                    <SelectValue placeholder="请选择父辈" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__root__">始祖（无父）</SelectItem>
                    {parentCandidates.map(m => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name}{m.generation_title ? `（${m.generation_title}）` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </View>

              <View className="flex gap-3 mb-3">
                <View className="flex-1">
                  <Text className="block text-sm mb-1" style={{ color: '#6B5B4F' }}>出生日期</Text>
                  <View className="bg-[#FFFDF7] rounded-lg p-2 border" style={{ borderColor: '#E8E0D8' }}>
                    <Input className="w-full bg-transparent" placeholder="如：1950" value={formBirthDate} onInput={(e) => setFormBirthDate(e.detail.value)} />
                  </View>
                </View>
                {formIsAlive === 'no' && (
                  <View className="flex-1">
                    <Text className="block text-sm mb-1" style={{ color: '#6B5B4F' }}>逝世日期</Text>
                    <View className="bg-[#FFFDF7] rounded-lg p-2 border" style={{ borderColor: '#E8E0D8' }}>
                      <Input className="w-full bg-transparent" placeholder="如：2020" value={formDeathDate} onInput={(e) => setFormDeathDate(e.detail.value)} />
                    </View>
                  </View>
                )}
              </View>

              <View className="mb-3">
                <Text className="block text-sm mb-1" style={{ color: '#6B5B4F' }}>出生地</Text>
                <View className="bg-[#FFFDF7] rounded-lg p-2 border" style={{ borderColor: '#E8E0D8' }}>
                  <Input className="w-full bg-transparent" placeholder="请输入出生地" value={formBirthPlace} onInput={(e) => setFormBirthPlace(e.detail.value)} />
                </View>
              </View>

              {formIsAlive === 'no' && (
                <View className="mb-3">
                  <Text className="block text-sm mb-1" style={{ color: '#6B5B4F' }}>葬地（留空则记为「葬地不详」）</Text>
                  <View className="bg-[#FFFDF7] rounded-lg p-2 border" style={{ borderColor: '#E8E0D8' }}>
                    <Input className="w-full bg-transparent" placeholder="请输入葬地" value={formBurialPlace} onInput={(e) => setFormBurialPlace(e.detail.value)} />
                  </View>
                </View>
              )}

              <View className="mb-4">
                <Text className="block text-sm mb-1" style={{ color: '#6B5B4F' }}>简介</Text>
                <View className="bg-[#FFFDF7] rounded-lg p-2 border" style={{ borderColor: '#E8E0D8' }}>
                  <Textarea className="w-full bg-transparent" style={{ minHeight: 64 }} placeholder="请输入简介（生平、事迹等）" value={formBio} onInput={(e) => setFormBio(e.detail.value)} />
                </View>
              </View>

              {/* 多配偶 */}
              <View className="mb-3">
                <View className="flex items-center justify-between mb-1">
                  <Text className="block text-sm" style={{ color: '#6B5B4F' }}>配偶（可添加多位）</Text>
                  <Button size="sm" variant="outline" onClick={handleAddSpouse}>
                    <UserPlus size={14} color="#8B2500" />
                    <Text className="text-xs ml-1">添加配偶</Text>
                  </Button>
                </View>
                {formSpouses.length === 0 && (
                  <Text className="block text-xs text-stone-400 py-2">尚未添加配偶</Text>
                )}
                {formSpouses.map((spouse, idx) => (
                  <View key={idx} className="mb-2 p-2 rounded-lg" style={{ backgroundColor: '#FBF6EE', border: '1px solid #E8E0D8' }}>
                    <View className="flex items-center gap-2">
                      <View className="flex-1 bg-[#FFFDF7] rounded-lg p-2 border" style={{ borderColor: '#E8E0D8' }}>
                        <Input
                          className="w-full bg-transparent"
                          placeholder="配偶姓名"
                          value={spouse.name}
                          onInput={(e) => handleUpdateSpouse(idx, 'name', e.detail.value)}
                        />
                      </View>
                      <View className="flex gap-1">
                        {[
                          { value: 'alive', label: '健在', color: '#2E7D32' },
                          { value: 'deceased', label: '故', color: '#C62828' },
                          { value: 'divorced', label: '离异', color: '#6B5B4F' },
                        ].map(opt => (
                          <View
                            key={opt.value}
                            className="px-2 py-2 rounded-lg"
                            style={{ backgroundColor: spouse.status === opt.value ? opt.color : '#FFFDF7', border: '1px solid #E8E0D8' }}
                            onClick={() => handleUpdateSpouse(idx, 'status', opt.value)}
                          >
                            <Text className="text-xs" style={{ color: spouse.status === opt.value ? '#FFFDF7' : opt.color }}>{opt.label}</Text>
                          </View>
                        ))}
                      </View>
                      <View className="p-2 rounded-lg" style={{ backgroundColor: '#FFEBEE' }} onClick={() => handleRemoveSpouse(idx)}>
                        <X size={14} color="#C62828" />
                      </View>
                    </View>
                    <View className="flex gap-2 mt-2">
                      <View className="flex-1">
                        <Text className="block text-xs mb-1" style={{ color: '#6B5B4F' }}>出生日期</Text>
                        <View className="bg-[#FFFDF7] rounded-lg p-2 border" style={{ borderColor: '#E8E0D8' }}>
                          <Input className="w-full bg-transparent" placeholder="如：1952" value={spouse.birthDate || ''} onInput={(e) => handleUpdateSpouse(idx, 'birthDate', e.detail.value)} />
                        </View>
                      </View>
                      {spouse.status === 'deceased' && (
                        <View className="flex-1">
                          <Text className="block text-xs mb-1" style={{ color: '#6B5B4F' }}>逝世日期</Text>
                          <View className="bg-[#FFFDF7] rounded-lg p-2 border" style={{ borderColor: '#E8E0D8' }}>
                            <Input className="w-full bg-transparent" placeholder="如：2018" value={spouse.deathDate || ''} onInput={(e) => handleUpdateSpouse(idx, 'deathDate', e.detail.value)} />
                          </View>
                        </View>
                      )}
                    </View>
                    {spouse.status === 'deceased' && (
                      <View className="mt-2">
                        <Text className="block text-xs mb-1" style={{ color: '#6B5B4F' }}>葬地（留空记为「葬地不详」）</Text>
                        <View className="bg-[#FFFDF7] rounded-lg p-2 border" style={{ borderColor: '#E8E0D8' }}>
                          <Input className="w-full bg-transparent" placeholder="请输入葬地" value={spouse.burialPlace || ''} onInput={(e) => handleUpdateSpouse(idx, 'burialPlace', e.detail.value)} />
                        </View>
                      </View>
                    )}
                    <View className="mt-2">
                      <Text className="block text-xs mb-1" style={{ color: '#6B5B4F' }}>简介</Text>
                      <View className="bg-[#FFFDF7] rounded-lg p-2 border" style={{ borderColor: '#E8E0D8' }}>
                        <Textarea className="w-full bg-transparent" style={{ minHeight: 48 }} placeholder="请输入简介（生平、事迹等）" value={spouse.bio || ''} onInput={(e) => handleUpdateSpouse(idx, 'bio', e.detail.value)} />
                      </View>
                    </View>
                  </View>
                ))}
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
                        <View className="flex items-center gap-2 mb-1 flex-wrap">
                          <Text className="text-base font-bold" style={{ color: '#333' }}>{member.name}</Text>
                          <Text className="text-xs px-2 py-1 rounded" style={{ backgroundColor: member.gender === 'male' ? '#E3F2FD' : '#FCE4EC', color: member.gender === 'male' ? '#1565C0' : '#C62828' }}>
                            {member.gender === 'male' ? '男' : '女'}
                          </Text>
                          <Text className="text-xs px-2 py-1 rounded" style={{ backgroundColor: '#FFF5F0', color: '#8B2500' }}>
                            {member.generation_title ? `${member.generation_title}字辈` : `第${member.generation}世`}
                          </Text>
                        </View>
                        <Text className="block text-xs" style={{ color: '#999' }}>
                          {toLunarBirth(member.birth_date) || '未知'}
                          {member.death_date ? ` - ${toLunarBirth(member.death_date)}` : member.is_alive === 'yes' ? ' - 健在' : ' - 已故'}
                        </Text>
                        {member.burial_place && member.is_alive === 'no' && (
                          <Text className="block text-xs mt-1" style={{ color: '#6B5B4F' }}>
                            葬地：{member.burial_place}
                          </Text>
                        )}
                        {renderSpouseText(member)}
                        {member.parent_name && (
                          <Text className="block text-xs" style={{ color: '#6B5B4F' }}>
                            父：{member.parent_name}
                          </Text>
                        )}
                        {member.birth_place && (
                          <Text className="block text-xs" style={{ color: '#6B5B4F' }}>
                            出生地：{member.birth_place}
                          </Text>
                        )}
                        {member.bio && (
                          <Text className="block text-xs mt-1" style={{ color: '#999' }}>
                            {member.bio}
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

  function renderSpouseText(member: Member) {
    const list = member.spouses && member.spouses.length > 0
      ? member.spouses
      : (member.spouse_name ? [{ name: member.spouse_name, status: 'alive' } as Spouse] : []);
    if (list.length === 0) return null;
    return (
      <View className="mt-1">
        {list.map((s, i) => (
          <View key={s.id || i} className="mb-1 pl-2 border-l-2" style={{ borderColor: '#E8DDD2' }}>
            <Text className="block text-xs" style={{ color: '#6B5B4F' }}>
              配偶：{s.name}{spouseStatusLabel(s.status) ? `（${spouseStatusLabel(s.status)}）` : ''}
            </Text>
            {(s.birthDate || (s.status === 'deceased' && s.deathDate)) && (
              <Text className="block text-xs" style={{ color: '#999' }}>
                {s.birthDate || '生失考'}{s.status === 'deceased' ? ` — ${s.deathDate || '卒失考'}` : ''}
              </Text>
            )}
            {s.status === 'deceased' && s.burialPlace && (
              <Text className="block text-xs" style={{ color: '#999' }}>葬地：{s.burialPlace}</Text>
            )}
            {s.bio && <Text className="block text-xs" style={{ color: '#999' }}>{s.bio}</Text>}
          </View>
        ))}
      </View>
    );
  }

  function genTitleOfGen(gen: number) {
    const member = members.find(m => m.generation === gen);
    if (member?.generation_title) return `${member.generation_title}字辈`;
    return `第${gen}世`;
  }
}
