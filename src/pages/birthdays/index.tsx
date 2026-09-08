import { useState, useEffect } from 'react'
import { View, Text, ScrollView } from '@tarojs/components'
import { Network } from '@/network'
import { Card, CardContent } from '@/components/ui/card'
import { Cake, Heart } from 'lucide-react-taro'

interface MemberItem {
  id: string
  name: string
  gender: string
  birth_date: string
  generation: number
  is_alive: string
  spouse_name: string
}

const GENDER_MAP: Record<string, string> = { male: '男', female: '女' }

export default function Birthdays() {
  const [members, setMembers] = useState<MemberItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)

  const loadMembers = async () => {
    try {
      setLoading(true)
      const res = await Network.request({ url: '/api/members' })
      console.log('birthdays res.data:', JSON.stringify(res.data))
      const data = (res.data as any)?.data ?? (res.data as any)?.list ?? []
      const arr = Array.isArray(data) ? data : Array.isArray((data as any)?.list) ? (data as any).list : []
      setMembers(arr)
    } catch (e) {
      console.error('加载成员失败', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadMembers() }, [])

  const extractMonth = (d: string): number | null => {
    if (!d) return null
    // 兼容纯数字年、农历、多样格式：提取 月-日 或 x月x日
    const m = String(d).match(/(\d{1,2})\s*月\s*(\d{1,2})\s*日|(\d{1,2})[-\/](\d{1,2})/)
    if (m) return parseInt(m[1] || m[3], 10)
    return null
  }

  const extractDay = (d: string): { month: number; day: number } | null => {
    if (!d) return null
    const m = String(d).match(/(\d{1,2})\s*月\s*(\d{1,2})\s*日|(\d{1,2})[-\/](\d{1,2})/)
    if (m) return { month: parseInt(m[1] || m[3], 10), day: parseInt(m[2] || m[4], 10) }
    return null
  }

  const today = new Date()
  const todayMonth = today.getMonth() + 1
  const todayDay = today.getDate()

  const isToday = (d: string) => {
    const r = extractDay(d)
    return r ? r.month === todayMonth && r.day === todayDay : false
  }

  const currentMonthMembers = members
    .filter((m) => extractMonth(m.birth_date) === selectedMonth)
    .sort((a, b) => (extractDay(a.birth_date)?.day || 0) - (extractDay(b.birth_date)?.day || 0))

  const months = Array.from({ length: 12 }, (_, i) => i + 1)

  return (
    <View className="min-h-full bg-[#FAF8F5] pb-16">
      {/* 头部 */}
      <View className="px-4 pt-5 pb-3">
        <View className="flex flex-row items-center justify-between mb-2" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View className="flex flex-row items-center gap-2" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '8px' }}>
            <Cake size={22} color="#8B2500" />
            <Text className="text-lg font-semibold color-[#333]">宗亲生日提醒</Text>
          </View>
        </View>
        <Text className="block text-sm color-[#8B5E3C]">汇聚本人生日与宗亲生日，适时送上祝福</Text>
      </View>

      {/* 本月生日统计 */}
      <View className="px-4 mb-2">
        <Card className="bg-gradient-to-r from-[#8B2500] to-[#C0392B] border-0 rounded-2xl">
          <CardContent className="p-4" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '10px' }}>
              <Heart size={22} color="#FFE9B3" />
              <View>
                <Text className="block text-white text-base font-semibold">{selectedMonth}月共有 {currentMonthMembers.length} 位宗亲生日</Text>
                <Text className="block text-white text-xs mt-1">
                  {currentMonthMembers.filter((m) => m.is_alive === 'yes').length} 位在世 · 今日生日 {currentMonthMembers.filter((m) => isToday(m.birth_date)).length} 位
                </Text>
              </View>
            </View>
          </CardContent>
        </Card>
      </View>

      {/* 月份选择 */}
      <ScrollView scrollX className="px-4 py-2" style={{ width: '100%', whiteSpace: 'nowrap' }}>
        <View style={{ display: 'flex', flexDirection: 'row', gap: '8px' }}>
          {months.map((m) => (
            <View
              key={m}
              onClick={() => setSelectedMonth(m)}
              className={`px-3 py-2 rounded-full ${selectedMonth === m ? 'bg-[#8B2500]' : 'bg-white border border-[#E8E0D6]'}`}
            >
              <Text className={`text-sm ${selectedMonth === m ? 'text-white' : 'text-[#6B5B4F]'}`}>{m}月</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* 生日列表 */}
      <View className="px-4 mt-2">
        {loading ? (
          <Card><CardContent className="p-4"><Text className="block text-center text-[#6B5B4F]">加载中...</Text></CardContent></Card>
        ) : currentMonthMembers.length === 0 ? (
          <Card><CardContent className="p-8">
            <Text className="block text-center text-[#6B5B4F]">本月暂无宗亲生日</Text>
          </CardContent></Card>
        ) : (
          currentMonthMembers.map((member) => {
            const inToday = isToday(member.birth_date)
            const r = extractDay(member.birth_date)
            return (
              <Card key={member.id} className={`mb-2 rounded-xl ${inToday ? 'border border-[#8B2500]' : ''}`}>
                <CardContent className="p-3" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View>
                    <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '8px' }}>
                      <Text className="text-base font-medium color-[#333]">{member.name}</Text>
                      {inToday && (
                        <View className="bg-[#8B2500] rounded-full px-2 py-1">
                          <Text className="text-white text-xs">今日生日</Text>
                        </View>
                      )}
                    </View>
                    <Text className="block text-xs mt-1">
                      第 {member.generation} 世 · {GENDER_MAP[member.gender]} · {member.is_alive === 'yes' ? '在世' : '已故'}
                    </Text>
                  </View>
                  <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '6px' }}>
                    <Cake size={14} color="#C0392B" />
                    <Text className="text-sm text-[#8B2500]">{r ? `${r.month}月${r.day}日` : member.birth_date}</Text>
                  </View>
                </CardContent>
              </Card>
            )
          })
        )}
      </View>
    </View>
  )
}