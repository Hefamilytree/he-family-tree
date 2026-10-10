import { useState } from 'react';
import Taro from '@tarojs/taro';
import { View, Text } from '@tarojs/components';
import { Button } from '@/components/ui/button';
import { Network } from '@/network';
import { MessageCircle, ShieldCheck } from 'lucide-react-taro';

export default function LoginPage() {
  const [wxLoading, setWxLoading] = useState(false);

  const isMiniApp = [Taro.ENV_TYPE.WEAPP, Taro.ENV_TYPE.TT].includes(Taro.getEnv() as any);

  /** 登录成功后落地登录态（缓存 token 与用户信息） */
  const applyLogin = (data: any) => {
    Taro.setStorageSync('token', data.token);
    Taro.setStorageSync('userInfo', data.user);
    Taro.showToast({ title: '登录成功', icon: 'success' });
    setTimeout(() => Taro.navigateBack(), 1000);
  };

  /**
   * 微信一键登录（需求3）：
   *  - 仅使用 Taro.login() 拿到 code，由后端 code2Session 换取微信真实 openid。
   *  - 同一 AppID 下，同一微信在手机/PC 打开均为同一 openid，即同一账号，数据互通。
   *  - 任何失败都给出友好提示，绝不使用前端本地临时 openid 降级（避免多账号）。
   */
  const onWxLogin = async () => {
    if (wxLoading) return;
    setWxLoading(true);
    try {
      const loginRes: any = await Taro.login();
      const code = loginRes?.code;
      if (!code) {
        Taro.showModal({
          title: '登录提示',
          content: '未能获取微信登录凭证，请确认已在微信中打开小程序后重试。',
          showCancel: false,
        });
        return;
      }

      const res = await Network.request({
        url: '/api/auth/wx-login',
        method: 'POST',
        data: { loginCode: code, nickname: '微信宗亲' },
      });
      console.log('WeChat login response:', res.data);

      if (res.data && res.data.code === 200 && res.data.data?.token) {
        applyLogin(res.data.data);
        return;
      }

      // code2Session 失败 / 未配置凭证：友好提示，不自动降级
      Taro.showModal({
        title: '登录未成功',
        content: res.data?.msg || '微信服务暂时不可用，请稍后重试；若多次失败，请联系家族管理员。',
        showCancel: false,
      });
    } catch (error) {
      console.error('WeChat login error:', error);
      Taro.showModal({
        title: '网络异常',
        content: '当前网络不稳定，请检查网络后重新登录。',
        showCancel: false,
      });
    } finally {
      setWxLoading(false);
    }
  };

  return (
    <View className="min-h-screen bg-amber-50 px-6 py-10">
      {/* 标题区域 */}
      <View className="text-center mt-12 mb-16">
        <Text className="block text-4xl font-bold text-red-900" style={{ fontFamily: 'STKaiti, KaiTi, serif' }}>
          何氏族谱
        </Text>
        <Text className="block text-sm text-stone-500 mt-3">传承家族文化 · 记录血脉亲情</Text>
      </View>

      {/* 微信一键登录：手机 / PC 微信均使用真实 openid，账号互通 */}
      <View className="mt-8">
        {isMiniApp ? (
          <Button
            className="w-full bg-emerald-600 text-white rounded-full py-4"
            onClick={onWxLogin}
            disabled={wxLoading}
          >
            <MessageCircle size={20} color="#ffffff" className="mr-2" />
            <Text className="text-base text-white">{wxLoading ? '登录中...' : '微信一键登录'}</Text>
          </Button>
        ) : (
          <Button
            className="w-full bg-emerald-600 text-white rounded-full py-4"
            onClick={() =>
              Taro.showModal({
                title: '请在微信中打开',
                content: '微信一键登录需在手机微信或 PC 微信的小程序中使用，登录后数据自动互通。',
                showCancel: false,
              })
            }
          >
            <MessageCircle size={20} color="#ffffff" className="mr-2" />
            <Text className="text-base">微信一键登录</Text>
          </Button>
        )}

        <View className="mt-6 flex items-start gap-2 bg-white rounded-xl p-4">
          <ShieldCheck size={18} color="#6B5B4F" className="mt-1 flex-shrink-0" />
          <Text className="block text-xs leading-5 text-stone-500 flex-1">
            登录即代表您已阅读并同意《隐私政策》。系统使用您的微信身份作为唯一账号，手机与电脑登录数据互通；手机号可在登录后自愿绑定，用于族人联络与账号找回。
          </Text>
        </View>
      </View>
    </View>
  );
}
