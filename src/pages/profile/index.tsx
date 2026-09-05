import { useState } from 'react';
import { View, Text } from '@tarojs/components';
import Taro, { useLoad, useDidShow } from '@tarojs/taro';
import { User, Info, Heart, MapPin, LogIn, LogOut, Shield } from 'lucide-react-taro';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Network } from '@/network';

const ProfilePage = () => {
  const [userInfo, setUserInfo] = useState<any>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

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

  const handleClearData = () => {
    if (!isLoggedIn) {
      Taro.showToast({ title: '请先登录', icon: 'none' });
      return;
    }
    Taro.showModal({
      title: '提示',
      content: '此功能需要联系管理员进行数据清理。',
      showCancel: false,
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
          className="bg-amber-50 border-stone-200 active:opacity-80"
          onClick={handleClearData}
        >
          <CardContent className="p-4 flex items-center gap-3">
            <View className="w-10 h-10 rounded-full bg-stone-600 flex items-center justify-center">
              <Info size={20} color="#FFFDF7" />
            </View>
            <View className="flex-1">
              <Text className="block text-base font-semibold text-stone-800">
                数据管理
              </Text>
              <Text className="block text-sm text-stone-500">
                联系管理员进行数据清理
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
    </View>
  );
};

export default ProfilePage;
