import { useState, useEffect } from 'react'
import { View, Text, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { Network } from '@/network'
import { Card, CardContent } from '@/components/ui/card'
import { Cake, Heart } from 'lucide-react-taro'

interface Person {
  id: string
  name: string
  courtesy_name?: string | null
  gender?: string | null
  birth_date?: string | null
  birth_time?: string | null
  generation?: number | null
  generation_title?: string | null
  is_alive?: string | null
  level?: number
  relation?: string
}

const extractMD = (d?: string | null): { month: number; day: number } | null => {
  if (!d) return null
  const m = String(d).match(/(\d{1,2})\s*月\s*(\d{1,2})\s*日|(\d{1,2})[-/](\d{1,2})/)
  if (m) return { month: parseInt(m[1] || m[3], 10), day: parseInt(m[2] || m[4], 10) }
  return null
}

export default function Birthdays() {
  const [self, setSelf] = useState<Person | null>(null)
  const [relatives, setRelatives] = useState<Person[]>([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        // 登录后自动关联当前已登录账号（携带本地登录凭证，无需重复操作）
        const token = Taro.getStorageSync('token')
        const res = await Network.request({
          url: '/api/birthdays/mine',
          header: token ? { Authorization: `Bearer ${token}` } : {}
        })
        console.log('birthdays mine res.data:', JSON.stringify(res.data))
        const body = (res.data as any) || {}
        if (body.code !== 200) {
          setMsg(body.msg || '加载失败')
          return
        }
        setSelf(body.data?.self || null)
        setRelatives(body.data?.relatives || [])
      } catch (e) {
        console.error('加载生日提醒失败', e)
        setMsg('网络错误，请稍后重试')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const today = new Date()
  const isToday = (p: Person) => {
    const r = extractMD(p.birth_date)
    return r ? r.month === today.getMonth() + 1 && r.day === today.getDate() : false
  }

  const renderPerson = (p: Person, isSelf = false) => {
    const todayHit = isToday(p)
    const r = extractMD(p.birth_date)
    return (
      <Card key={p.id} className={`mb-2 rounded-xl ${todayHit ? 'border' : ''}`} {...(todayHit ? { style: { borderColor: '#8B2500' } } : {})}>
        <CardContent className="p-3" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View>
            <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '8px' }}>
              <Text className="text-base font-medium color-[#333]">{p.name}</Text>
              {p.courtesy_name && <Text className="text-xs color-[#6B5B4F]">字：{p.courtesy_name}</Text>}
              {todayHit && (
                <View className="bg-[#8B2500] rounded-full px-2 py-1">
                  <Text className="text-white text-xs">今日生日</Text>
                </View>
              )}
            </View>
            <Text className="block text-xs mt-1 color-[#6B5B4F]">
              {isSelf ? '本人' : p.relation}
              {p.generation ? ` · 第${p.generation}世` : ''}
              {p.generation_title ? ` · ${p.generation_title}` : ''}
            </Text>
          </View>
          <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '6px' }}>
            <Cake size={14} color="#C0392B" />
            <Text className="text-sm color-[#8B2500]">{r ? `${r.month}月${r.day}日` : (p.birth_date || '日期不详')}</Text>
          </View>
        </CardContent>
      </Card>
    )
  }

  return (
    <View className="min-h-full bg-[#FAF8F5] pb-16">
      <View className="px-4 pt-5 pb-3">
        <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '8px' }}>
          <Cake size={22} color="#8B2500" />
          <Text className="text-lg font-semibold color-[#333]">宗亲生日提醒</Text>
        </View>
        <Text className="block text-sm color-[#8B5E3C] mt-1">仅提醒本人及四代直系健在亲属</Text>
      </View>

      <View className="px-4 mb-2">
        <Card className="bg-gradient-to-r from-[#8B2500] to-[#C0392B] border-0 rounded-2xl">
          <CardContent className="p-4" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '10px' }}>
            <Heart size={22} color="#FFE9B3" />
            <Text className="block text-white text-base font-semibold">
              本人 + {relatives.length} 位四代直系健在亲属
            </Text>
          </CardContent>
        </Card>
      </View>

      <ScrollView scrollY className="px-4" style={{ height: 'calc(100vh - 220px)' }}>
        {loading ? (
          <Card><CardContent className="p-4"><Text className="block text-center color-[#6B5B4F]">加载中...</Text></CardContent></Card>
        ) : msg ? (
          <Card><CardContent className="p-6">
            <Text className="block text-center color-[#6B5B4F]">{msg}</Text>
          </CardContent></Card>
        ) : (
          <>
            {self && <Text className="block text-sm color-[#8B5E3C] mb-1 mt-1">本人</Text>}
            {self && renderPerson(self, true)}
            <Text className="block text-sm color-[#8B5E3C] mb-1 mt-2">四代直系健在亲属</Text>
            {relatives.length === 0 && (
              <Card><CardContent className="p-6">
                <Text className="block text-center color-[#6B5B4F]">暂无四代直系健在亲属生日记录</Text>
              </CardContent></Card>
            )}
            {relatives.map(p => renderPerson(p))}
          </>
        )}
      </ScrollView>
    </View>
  )
}
