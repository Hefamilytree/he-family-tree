import { useState } from 'react';
import { View, Text } from '@tarojs/components';
import Taro, { useLoad, useDidShow } from '@tarojs/taro';
import { User, Heart, MapPin, LogIn, LogOut, Shield, UserPlus, Trash2 } from 'lucide-react-taro';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Network } from '@/network';

const ProfilePage = () => {
  const [userInfo, setUserInfo] = useState<any>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // 完善宗亲信息（关联宗亲树人员）
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [linking, setLinking] = useState(false);
  const [linkKeyword, setLinkKeyword] = useState('');
  const [linkPhone, setLinkPhone] = useState('');
  const [linkResidence, setLinkResidence] = useState('');
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [linkGenerationTitle, setLinkGenerationTitle] = useState('');
  const [allMembers, setAllMembers] = useState<any[]>([]);
  const [memberOptions, setMemberOptions] = useState<any[]>([]);
  const [memberOptionsLoaded, setMemberOptionsLoaded] = useState(false);

  useLoad(() => {
    console.log('ProfilePage loaded');
  });

  useDidShow(() => {
    // 每次显示页面时检查登录状态
    const token = Taro.getStorageSync('token');
    const user = Taro.getStorageSync('userInfo');
    if (token && user) {
      setUserInfo(user);
      setIsLoggedIn(true);
    } else {
      setUserInfo(null);
      setIsLoggedIn(false);
    }
  });

  const handleLogin = () => {
    Taro.navigateTo({ url: '/pages/login/index' });
  };

  const handleLogout = () => {
    Taro.showModal({
      title: '提示',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          Taro.removeStorageSync('token');
          Taro.removeStorageSync('userInfo');
          setUserInfo(null);
          setIsLoggedIn(false);
          Taro.showToast({ title: '已退出登录', icon: 'success' });
        }
      },
    });
  };

  const handleAbout = () => {
    Taro.showModal({
      title: '关于族谱修缮',
      content: '家族族谱修缮工具 v1.0\n\n帮助您记录家族血脉、传承家族文化。\n\n功能说明：\n- 族谱世系图展示\n- 家族成员管理\n- 家族信息编辑\n- 成员关系维护',
      showCancel: false,
      confirmText: '知道了',
    });
  };

  const handleOpenLink = () => {
    if (!isLoggedIn) {
      Taro.showToast({ title: '请先登录', icon: 'none' });
      return;
    }
    setLinkKeyword('');
    setLinkPhone(userInfo?.phone || '');
    setLinkResidence(userInfo?.residence || '');
    setSelectedMember(null);
    setLinkGenerationTitle('');
    setAllMembers([]);
    setMemberOptions([]);
    setMemberOptionsLoaded(false);
    setShowLinkDialog(true);
  };

  const handleSearchMembers = async (keyword: string) => {
    setLinkKeyword(keyword);
    setMemberOptionsLoaded(true);
    try {
      const token = Taro.getStorageSync('token');
      let list = allMembers;
      if (!list || list.length === 0) {
        const res = await Network.request({
          url: '/api/members',
          method: 'GET',
          header: token ? { Authorization: `Bearer ${token}` } : {},
        });
        console.log('关联宗亲-成员列表:', res.data);
        list = (res.data?.data || []) as any[];
        setAllMembers(list);
      }
      const kw = keyword.trim();
      setMemberOptions(
        kw ? list.filter((m: any) => (m.name || '').includes(kw)) : list
      );
    } catch (error) {
      console.error('获取成员列表失败:', error);
      setMemberOptions([]);
    }
  };

  const handleLinkMember = async () => {
    if (!userInfo?.id || !selectedMember?.id) return;
    if (!linkGenerationTitle.trim()) {
      Taro.showToast({ title: '请选择字辈', icon: 'none' });
      return;
    }
    const phone = linkPhone.trim();
    if (!phone) {
      Taro.showToast({ title: '请填写手机号码', icon: 'none' });
      return;
    }
    if (!/^1\d{10}$/.test(phone)) {
      Taro.showToast({ title: '手机号码格式不正确', icon: 'none' });
      return;
    }
    const residence = linkResidence.trim();
    if (!residence) {
      Taro.showToast({ title: '请填写现居住地', icon: 'none' });
      return;
    }
    setLinking(true);
    try {
      const token = Taro.getStorageSync('token');
      const res = await Network.request({
        url: '/api/auth/link-member',
        method: 'POST',
        data: {
          userId: userInfo.id,
          memberId: selectedMember.id,
          name: selectedMember.name,
          phone,
          residence,
          generationTitle: linkGenerationTitle.trim(),
        },
        header: token ? { Authorization: `Bearer ${token}` } : {},
      });
      console.log('关联宗亲响应:', res.data);
      if (res.data?.code === 200) {
        const updated = {
          ...userInfo,
          member_id: selectedMember.id,
          member_name: selectedMember.name,
          phone,
          residence,
          generation_title: res.data?.data?.generation_title || linkGenerationTitle.trim(),
        };
        setUserInfo(updated);
        Taro.setStorageSync('userInfo', updated);
        setShowLinkDialog(false);
        Taro.showToast({ title: '认证成功', icon: 'success' });
      } else {
        Taro.showToast({ title: res.data?.msg || '关联失败', icon: 'none' });
      }
    } catch (error) {
      console.error('关联宗亲失败:', error);
      Taro.showToast({ title: '网络错误，关联失败', icon: 'none' });
    } finally {
      setLinking(false);
    }
  };

  const handleClearData = () => {
    if (!isLoggedIn || userInfo?.role !== 'admin') {
      Taro.showToast({ title: '仅主管理员可操作', icon: 'none' });
      return;
    }
    Taro.showModal({
      title: '清除全部数据',
      content: '将删除所有家族信息、成员、配偶、家规、活动及产业等全部数据，且不可恢复。确定继续吗？',
      confirmColor: '#c53030',
      success: async (modalRes) => {
        if (!modalRes.confirm) return;
        try {
          const token = Taro.getStorageSync('token');
          const apiRes = await Network.request({
            url: '/api/auth/clear-data',
            method: 'POST',
            header: { Authorization: `Bearer ${token}` },
          });
          console.log('清除数据响应:', apiRes.data);
          if (apiRes.data?.code === 200) {
            Taro.showToast({ title: '已清除全部数据', icon: 'success' });
          } else {
            Taro.showToast({ title: apiRes.data?.msg || '清除失败', icon: 'none' });
          }
        } catch (error) {
          console.error('清除数据失败:', error);
          Taro.showToast({ title: '网络错误，清除失败', icon: 'none' });
        }
      },
    });
  };

  const handleRootSeeking = () => {
    Taro.showModal({
      title: '寻根问祖',
      content: '即将跳转到「中华家谱」小程序，探索更多家族文化资源。',
      confirmText: '前往',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          Taro.navigateToMiniProgram({
            appId: 'wx1234567890abcdef',
            path: 'pages/index/index',
            extraData: {
              from: 'he-family-tree',
            },
            envVersion: 'release',
            success: () => {
              console.log('跳转成功');
            },
            fail: (err) => {
              console.error('跳转失败:', err);
              Taro.showToast({
                title: '跳转失败，请检查小程序 AppID',
                icon: 'none',
              });
            },
          });
        }
      },
    });
  };

  const handleSetAdmin = () => {
    if (!isLoggedIn) {
      Taro.showToast({ title: '请先登录', icon: 'none' });
      return;
    }

    Taro.showModal({
      title: '设置管理员',
      content: '确定要将当前用户设置为管理员吗？管理员可以编辑所有家族信息。',
      success: async (modalRes) => {
        if (modalRes.confirm) {
          try {
            const token = Taro.getStorageSync('token');
            const apiRes = await Network.request({
              url: '/api/auth/set-admin',
              method: 'POST',
              data: { userId: userInfo.id },
              header: {
                Authorization: `Bearer ${token}`,
              },
            });

            if (apiRes.data.code === 200) {
              // 更新本地用户信息
              const updatedUser = { ...userInfo, role: 'admin' };
              Taro.setStorageSync('userInfo', updatedUser);
              setUserInfo(updatedUser);
              Taro.showToast({ title: '已设置为管理员', icon: 'success' });
            } else {
              Taro.showToast({ title: apiRes.data.msg || '设置失败', icon: 'none' });
            }
          } catch (error) {
            console.error('Set admin error:', error);
            Taro.showToast({ title: '网络错误', icon: 'none' });
          }
        }
      },
    });
  };

  return (
    <View className="min-h-screen bg-amber-50">
      {/* 用户信息区域 */}
      <View className="bg-gradient-to-b from-amber-700 to-amber-800 px-4 py-8">
        {isLoggedIn ? (
          <View className="flex items-center gap-4">
            <View className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center">
              <User size={32} color="#8B2500" />
            </View>
            <View className="flex-1">
              <Text className="block text-xl font-bold text-white">
                {userInfo?.nickname || userInfo?.username}
              </Text>
              <View className="flex items-center gap-2 mt-1">
                <Text className="text-sm text-amber-100">
                  {userInfo?.username}
                </Text>
                {userInfo?.role === 'admin' && (
                  <View className="px-2 py-1 bg-amber-500 rounded-full">
                    <Text className="text-xs text-white">管理员</Text>
                  </View>
                )}
              </View>
            </View>
            <Button
              variant="outline"
              size="sm"
              className="bg-transparent border-white text-white"
              onClick={handleLogout}
            >
              <LogOut size={16} color="#FFF" />
              <Text className="ml-1 text-sm">退出</Text>
            </Button>
          </View>
        ) : (
          <View className="text-center">
            <View className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-3">
              <User size={32} color="#8B2500" />
            </View>
            <Text className="block text-lg text-amber-100 mb-4">
              未登录
            </Text>
            <Button
              className="bg-white text-amber-700"
              onClick={handleLogin}
            >
              <LogIn size={16} color="#8B2500" />
              <Text className="ml-2">登录 / 注册</Text>
            </Button>
          </View>
        )}
      </View>

      {/* 功能菜单 */}
      <View className="px-4 py-6 space-y-4">
        {/* 管理员功能：清除全部数据 */}
        {isLoggedIn && userInfo?.role === 'admin' && (
          <Card
            className="bg-red-100 border-red-300 active:opacity-80"
            onClick={handleClearData}
          >
            <CardContent className="p-4 flex items-center gap-3">
              <View className="w-10 h-10 rounded-full bg-red-700 flex items-center justify-center">
                <Trash2 size={20} color="#FFFDF7" />
              </View>
              <View className="flex-1">
                <Text className="block text-base font-semibold text-red-900">
                  清除全部数据
                </Text>
                <Text className="block text-sm text-red-500">
                  清除所有家族信息、成员、配偶及板块数据（仅主管理员）
                </Text>
              </View>
            </CardContent>
          </Card>
        )}

        {/* 管理员功能 */}
        {isLoggedIn && (
          <Card
            className="bg-amber-100 border-amber-300 active:opacity-80"
            onClick={handleSetAdmin}
          >
            <CardContent className="p-4 flex items-center gap-3">
              <View className="w-10 h-10 rounded-full bg-amber-600 flex items-center justify-center">
                <Shield size={20} color="#FFFDF7" />
              </View>
              <View className="flex-1">
                <Text className="block text-base font-semibold text-stone-800">
                  管理员设置
                </Text>
                <Text className="block text-sm text-stone-500">
                  {userInfo?.role === 'admin' ? '当前已是管理员' : '点击设置为管理员'}
                </Text>
              </View>
            </CardContent>
          </Card>
        )}

        <Card
          className="bg-amber-50 border-stone-200 active:opacity-80"
          onClick={handleRootSeeking}
        >
          <CardContent className="p-4 flex items-center gap-3">
            <View className="w-10 h-10 rounded-full bg-amber-700 flex items-center justify-center">
              <MapPin size={20} color="#FFFDF7" />
            </View>
            <View className="flex-1">
              <Text className="block text-base font-semibold text-stone-800">
                寻根问祖
              </Text>
              <Text className="block text-sm text-stone-500">
                链接更多家谱资源，探索家族起源
              </Text>
            </View>
          </CardContent>
        </Card>

        <Card
          className="bg-red-900 border-red-800 text-white active:opacity-80"
          onClick={handleOpenLink}
        >
          <CardContent className="p-4 flex items-center gap-3">
            <View className="w-10 h-10 rounded-full bg-white bg-opacity-20 flex items-center justify-center">
              <UserPlus size={20} color="#FFD9C8" />
            </View>
            <View className="flex-1">
              <Text className="block text-base font-semibold text-white">
                完善宗亲信息
              </Text>
              <Text className="block text-sm text-red-100">
                {userInfo?.member_name
                  ? `已关联：${userInfo.member_name}（点击重新关联）`
                  : '登录后关联宗亲树人员，完善您的族谱身份'}
              </Text>
            </View>
          </CardContent>
        </Card>

        <Card
          className="bg-amber-50 border-stone-200 active:opacity-80"
          onClick={handleAbout}
        >
          <CardContent className="p-4 flex items-center gap-3">
            <View className="w-10 h-10 rounded-full bg-stone-600 flex items-center justify-center">
              <Heart size={20} color="#FFFDF7" />
            </View>
            <View className="flex-1">
              <Text className="block text-base font-semibold text-stone-800">
                关于应用
              </Text>
              <Text className="block text-sm text-stone-500">
                了解族谱修缮工具
              </Text>
            </View>
          </CardContent>
        </Card>
      </View>

      {/* 底部说明 */}
      <View className="px-4 py-8 text-center">
        <Text className="block text-xs text-stone-400">
          何氏族谱修缮工具 v1.0
        </Text>
        <Text className="block text-xs text-stone-400 mt-1">
          传承家族文化 · 记录血脉亲情
        </Text>
      </View>

      {/* 完善宗亲信息 / 关联宗亲弹窗 */}
      <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              <Text className="block text-lg font-bold text-stone-800">完善宗亲信息</Text>
            </DialogTitle>
          </DialogHeader>

          <View className="space-y-3 mt-2">
            <Text className="block text-sm text-stone-500">
              {selectedMember
                ? '已选择您在宗亲树中的身份，请补全字辈、手机号码和现居住地，完成宗亲认证后将自动加入通讯录与附近宗亲。'
                : '第一步：搜索姓名关键字，在宗亲树中选择您本人。'}
            </Text>

            {!selectedMember ? (
              <>
                <View>
                  <Label><Text className="block text-sm text-stone-600 mb-1">您的姓名 / 关键字</Text></Label>
                  <Input
                    className="bg-stone-50"
                    placeholder="输入姓名或关键字搜索"
                    value={linkKeyword}
                    onInput={(e) => handleSearchMembers(e.detail.value)}
                  />
                </View>
                <View className="max-h-80 overflow-y-auto space-y-2">
                  {memberOptionsLoaded && memberOptions.length === 0 ? (
                    <Text className="block text-sm text-stone-400 text-center py-4">
                      未找到匹配的宗亲，请检查姓名或联系管理员录入。
                    </Text>
                  ) : (
                    memberOptions.map((m: any) => (
                      <View
                        key={m.id}
                        className="flex items-center justify-between px-3 py-2 rounded-lg border border-stone-200 bg-white"
                      >
                        <View>
                          <Text className="block text-sm font-semibold text-stone-800">
                            {m.name || m.username || '未署名'}
                          </Text>
                          <Text className="block text-xs text-stone-500 mt-1">
                            {m.generation_title || (m.generation ? `第${m.generation}世` : '')}
                            {m.birth_date || m.death_date ? ` · ${m.birth_date || ''}${m.birth_date && m.death_date ? '-' : ''}${m.death_date || ''}` : ''}
                          </Text>
                        </View>
                        <Button
                          size="sm"
                          className="bg-amber-700 text-white"
                          onClick={() => { setSelectedMember(m); if (m.generation_title) setLinkGenerationTitle(m.generation_title); }}
                        >
                          <Text>选择</Text>
                        </Button>
                      </View>
                    ))
                  )}
                </View>
              </>
            ) : (
              <>
                <View className="px-3 py-2 rounded-lg border border-amber-300 bg-amber-50 flex items-center justify-between">
                  <View>
                    <Text className="block text-sm font-semibold text-stone-800">
                      {selectedMember.name || selectedMember.username || '未署名'}
                    </Text>
                    <Text className="block text-xs text-stone-500 mt-1">
                      {selectedMember.generation_title || (selectedMember.generation ? `第${selectedMember.generation}世` : '')}
                    </Text>
                  </View>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => { setSelectedMember(null); setLinkGenerationTitle(''); }}
                  >
                    <Text>重选</Text>
                  </Button>
                </View>

                <View>
                  <Label><Text className="block text-sm text-stone-600 mb-1">字辈（必填）</Text></Label>
                  <Input
                    className="bg-stone-50"
                    placeholder="请输入您的字辈，如：景"
                    value={linkGenerationTitle}
                    onInput={(e) => setLinkGenerationTitle(e.detail.value)}
                  />
                </View>

                <View>
                  <Label><Text className="block text-sm text-stone-600 mb-1">手机号码（必填）</Text></Label>
                  <Input
                    className="bg-stone-50"
                    type="number"
                    placeholder="请输入手机号码"
                    value={linkPhone}
                    onInput={(e) => setLinkPhone(e.detail.value)}
                  />
                </View>

                <View>
                  <Label><Text className="block text-sm text-stone-600 mb-1">现居住地（必填）</Text></Label>
                  <Input
                    className="bg-stone-50"
                    placeholder="如：广东省深圳市·南山区"
                    value={linkResidence}
                    onInput={(e) => setLinkResidence(e.detail.value)}
                  />
                </View>
              </>
            )}
          </View>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowLinkDialog(false)}>
              <Text>关闭</Text>
            </Button>
            {selectedMember && (
              <Button
                className="bg-red-800 text-white"
                disabled={linking}
                onClick={() => handleLinkMember()}
              >
                <Text>{linking ? '提交中...' : '完成宗亲认证'}</Text>
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </View>
  );
};

export default ProfilePage;
