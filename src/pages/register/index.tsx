import { useState } from 'react';
import Taro, { useLoad } from '@tarojs/taro';
import { View, Text } from '@tarojs/components';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Network } from '@/network';

export default function RegisterPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [loading, setLoading] = useState(false);

  useLoad(() => {
    console.log('RegisterPage loaded');
  });

  const handleRegister = async () => {
    if (!username || !password || !confirmPassword) {
      Taro.showToast({ title: '请填写完整信息', icon: 'none' });
      return;
    }

    if (password !== confirmPassword) {
      Taro.showToast({ title: '两次密码不一致', icon: 'none' });
      return;
    }

    if (password.length < 6) {
      Taro.showToast({ title: '密码至少 6 位', icon: 'none' });
      return;
    }

    setLoading(true);
    try {
      const res = await Network.request({
        url: '/api/auth/register',
        method: 'POST',
        data: { username, password, nickname: nickname || username },
      });

      console.log('Register response:', res.data);

      if (res.data.code === 200) {
        // 保存 token 和用户信息
        Taro.setStorageSync('token', res.data.data.token);
        Taro.setStorageSync('userInfo', res.data.data.user);

        Taro.showToast({ title: '注册成功', icon: 'success' });

        setTimeout(() => {
          Taro.navigateBack();
        }, 1500);
      } else {
        Taro.showToast({ title: res.data.msg || '注册失败', icon: 'none' });
      }
    } catch (error) {
      console.error('Register error:', error);
      Taro.showToast({ title: '网络错误', icon: 'none' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="min-h-screen bg-amber-50 px-4 py-8">
      {/* 标题区域 */}
      <View className="text-center mb-8">
        <Text className="block text-3xl font-bold text-stone-800 font-serif">
          何氏族谱
        </Text>
        <Text className="block text-sm text-stone-500 mt-2">
          创建账号开始使用
        </Text>
      </View>

      {/* 注册表单 */}
      <Card className="bg-white border-stone-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl text-stone-800">用户注册</CardTitle>
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
            <Text className="block text-sm text-stone-600 mb-2">昵称（可选）</Text>
            <Input
              placeholder="请输入昵称"
              value={nickname}
              onInput={(e) => setNickname(e.detail.value)}
            />
          </View>

          <View>
            <Text className="block text-sm text-stone-600 mb-2">密码</Text>
            <Input
              placeholder="请输入密码（至少 6 位）"
              value={password}
              onInput={(e) => setPassword(e.detail.value)}
              password
            />
          </View>

          <View>
            <Text className="block text-sm text-stone-600 mb-2">确认密码</Text>
            <Input
              placeholder="请再次输入密码"
              value={confirmPassword}
              onInput={(e) => setConfirmPassword(e.detail.value)}
              password
            />
          </View>

          <Button
            className="w-full bg-amber-700 hover:bg-amber-800 text-white"
            onClick={handleRegister}
            disabled={loading}
          >
            <Text>{loading ? '注册中...' : '注册'}</Text>
          </Button>

          <View className="text-center pt-4">
            <Text className="text-sm text-stone-500">已有账号？</Text>
            <Text
              className="text-sm text-amber-700 ml-2 underline"
              onClick={() => Taro.navigateBack()}
            >
              返回登录
            </Text>
          </View>
        </CardContent>
      </Card>
    </View>
  );
}
