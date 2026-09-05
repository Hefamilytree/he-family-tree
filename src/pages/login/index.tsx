import { useState } from 'react';
import Taro, { useLoad } from '@tarojs/taro';
import { View, Text } from '@tarojs/components';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Network } from '@/network';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useLoad(() => {
    console.log('LoginPage loaded');
  });

  const handleLogin = async () => {
    if (!username || !password) {
      Taro.showToast({ title: '请输入用户名和密码', icon: 'none' });
      return;
    }

    setLoading(true);
    try {
      const res = await Network.request({
        url: '/api/auth/login',
        method: 'POST',
        data: { username, password },
      });

      console.log('Login response:', res.data);

      if (res.data.code === 200) {
        // 保存 token 和用户信息
        Taro.setStorageSync('token', res.data.data.token);
        Taro.setStorageSync('userInfo', res.data.data.user);

        Taro.showToast({ title: '登录成功', icon: 'success' });

        setTimeout(() => {
          Taro.navigateBack();
        }, 1500);
      } else {
        Taro.showToast({ title: res.data.msg || '登录失败', icon: 'none' });
      }
    } catch (error) {
      console.error('Login error:', error);
      Taro.showToast({ title: '网络错误', icon: 'none' });
    } finally {
      setLoading(false);
    }
  };

  const handleGoRegister = () => {
    Taro.navigateTo({ url: '/pages/register/index' });
  };

  return (
    <View className="min-h-screen bg-amber-50 px-4 py-8">
      {/* 标题区域 */}
      <View className="text-center mb-8">
        <Text className="block text-3xl font-bold text-stone-800 font-serif">
          何氏族谱
        </Text>
        <Text className="block text-sm text-stone-500 mt-2">
          登录以管理家族信息
        </Text>
      </View>

      {/* 登录表单 */}
      <Card className="bg-white border-stone-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl text-stone-800">用户登录</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <View>
            <Text className="block text-sm text-stone-600 mb-2">用户名</Text>
            <Input
              placeholder="请输入用户名"
              value={username}
              onInput={(e) => setUsername(e.detail.value)}
            />
          </View>

          <View>
            <Text className="block text-sm text-stone-600 mb-2">密码</Text>
            <Input
              placeholder="请输入密码"
              value={password}
              onInput={(e) => setPassword(e.detail.value)}
              password
            />
          </View>

          <Button
            className="w-full bg-amber-700 hover:bg-amber-800 text-white"
            onClick={handleLogin}
            disabled={loading}
          >
            <Text>{loading ? '登录中...' : '登录'}</Text>
          </Button>

          <View className="text-center pt-4">
            <Text className="text-sm text-stone-500">还没有账号？</Text>
            <Text
              className="text-sm text-amber-700 ml-2 underline"
              onClick={handleGoRegister}
            >
              立即注册
            </Text>
          </View>
        </CardContent>
      </Card>

      {/* 说明 */}
      <View className="mt-8 text-center">
        <Text className="block text-xs text-stone-400">
          管理员账号可编辑家族信息
        </Text>
        <Text className="block text-xs text-stone-400">
          普通成员只能查看族谱内容
        </Text>
      </View>
    </View>
  );
}
