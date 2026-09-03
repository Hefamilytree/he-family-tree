import { View, Text, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { User, TreePine, Info, Heart } from 'lucide-react-taro';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

const ProfilePage = () => {
  const handleAbout = () => {
    Taro.showModal({
      title: '关于族谱修缮',
      content: '家族族谱修缮工具 v1.0\n\n帮助您记录家族血脉、传承家族文化。\n\n功能说明：\n- 族谱世系图展示\n- 家族成员管理\n- 家族信息编辑\n- 成员关系维护',
      showCancel: false,
      confirmText: '知道了',
    });
  };

  const handleClearData = () => {
    Taro.showModal({
      title: '提示',
      content: '此功能需要联系管理员进行数据清理。',
      showCancel: false,
    });
  };

  return (
    <ScrollView scrollY className="h-full bg-stone-50">
      <View className="px-4 py-4 pb-24">
        {/* 用户头像区域 */}
        <View className="flex flex-col items-center py-6">
          <View className="w-20 h-20 rounded-full bg-red-900 flex items-center justify-center mb-3">
            <User size={36} color="#FFFDF7" />
          </View>
          <Text className="block text-xl font-serif font-bold text-stone-800">
            族谱管理员
          </Text>
          <Text className="block text-sm text-stone-500 mt-1">
            守护家族血脉传承
          </Text>
        </View>

        <Separator className="bg-stone-200 mb-4" />

        {/* 功能菜单 */}
        <View className="flex flex-col gap-3">
          <Card
            className="bg-amber-50 border-stone-200 active:opacity-80"
            onClick={handleAbout}
          >
            <CardContent className="p-4 flex items-center gap-3">
              <View className="w-10 h-10 rounded-full bg-yellow-700 flex items-center justify-center">
                <Info size={20} color="#FFFDF7" />
              </View>
              <View className="flex-1">
                <Text className="block text-base font-semibold text-stone-800">
                  关于应用
                </Text>
                <Text className="block text-sm text-stone-500">
                  查看应用介绍和使用说明
                </Text>
              </View>
            </CardContent>
          </Card>

          <Card
            className="bg-amber-50 border-stone-200 active:opacity-80"
            onClick={handleClearData}
          >
            <CardContent className="p-4 flex items-center gap-3">
              <View className="w-10 h-10 rounded-full bg-stone-400 flex items-center justify-center">
                <TreePine size={20} color="#FFFDF7" />
              </View>
              <View className="flex-1">
                <Text className="block text-base font-semibold text-stone-800">
                  数据管理
                </Text>
                <Text className="block text-sm text-stone-500">
                  管理族谱数据
                </Text>
              </View>
            </CardContent>
          </Card>
        </View>

        {/* 底部信息 */}
        <View className="flex flex-col items-center mt-8 py-4">
          <View className="flex items-center gap-1 mb-2">
            <Heart size={14} color="#A0522D" />
            <Text className="text-sm text-stone-400">
              传承家族文化，延续血脉亲情
            </Text>
          </View>
          <Text className="text-xs text-stone-300">
            家族族谱修缮工具 v1.0
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

export default ProfilePage;
