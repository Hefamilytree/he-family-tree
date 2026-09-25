import { useMemo } from 'react'
import { View, Text, Picker } from '@tarojs/components'
import {
  regionData,
  codeToText,
} from 'element-china-area-data'
import { Input } from '@/components/ui/input'

export interface AddressValue {
  province?: string
  city?: string
  district?: string
  street?: string
  /** 完整文本：省 市 区 街道/小区 */
  text?: string
}

interface Props {
  value?: AddressValue
  onChange: (v: AddressValue) => void
  streetPlaceholder?: string
}

/**
 * 现居住地选择：省 / 市 / 区 三级联动 + 街道（小区名称）输入。
 * 选择省市区后填写小区/街道，按「区 + 街道」归组。
 */
export default function AddressPicker({ value, onChange, streetPlaceholder }: Props) {
  const provinces: any[] = regionData as any

  // 计算当前各级索引
  const provinceIndex = useMemo(
    () => Math.max(0, provinces.findIndex(p => codeToText[p.value] === value?.province)),
    [provinces, value?.province],
  )
  const province = provinces[provinceIndex]
  const cities: any[] = province?.children || []
  const cityIndex = Math.max(0, cities.findIndex(c => codeToText[c.value] === value?.city))
  const city = cities[cityIndex]
  const districts: any[] = city?.children || []
  const districtIndex = Math.max(0, districts.findIndex(d => codeToText[d.value] === value?.district))

  const pickerValue = [provinceIndex, cityIndex, districtIndex]

  const handleChange = (e: any) => {
    const [pi, ci, di] = e.detail.value
    const p = provinces[pi]
    const c = p?.children?.[ci]
    const d = c?.children?.[di]
    if (!p || !c || !d) return
    const pName = codeToText[p.value]
    const cName = codeToText[c.value]
    const dName = codeToText[d.value]
    onChange({
      province: pName,
      city: cName,
      district: dName,
      street: value?.street || '',
      text: [pName, cName, dName, value?.street].filter(Boolean).join(' '),
    })
  }

  const handleStreet = (s: string) => {
    onChange({
      ...value,
      street: s,
      text: [value?.province, value?.city, value?.district, s].filter(Boolean).join(' '),
    })
  }

  return (
    <View className="w-full">
      <Picker
        mode="multiSelector"
        range={[provinces, cities, districts]}
        rangeKey="label"
        value={pickerValue}
        onChange={handleChange}
      >
        <View className="bg-white rounded-lg px-3 py-3 border" style={{ borderColor: '#E8E0D6' }}>
          <Text className="text-sm" style={{ color: value?.province ? '#333' : '#999' }}>
            {value?.province
              ? `${value.province} ${value.city || ''} ${value.district || ''}`
              : '请选择 省 / 市 / 区'}
          </Text>
        </View>
      </Picker>
      <View className="mt-2 bg-white rounded-lg px-3 py-2 border" style={{ borderColor: '#E8E0D6' }}>
        <Input
          className="w-full bg-transparent"
          placeholder={streetPlaceholder || '街道 / 小区名称（选填）'}
          value={value?.street || ''}
          onInput={e => handleStreet(e.detail.value)}
        />
      </View>
    </View>
  )
}
