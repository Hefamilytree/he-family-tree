import { useMemo } from 'react'
import { View, Text, Picker } from '@tarojs/components'
import {
  regionData,
  codeToText,
} from 'element-china-area-data'
import { Input } from '@/components/ui/input'
import { COUNTRIES } from '@/utils/countries'

export interface AddressValue {
  country?: string
  province?: string
  city?: string
  district?: string
  street?: string
  /** 完整文本：国家 省 市 区 街道/小区 */
  text?: string
}

interface Props {
  value?: AddressValue
  onChange: (v: AddressValue) => void
  streetPlaceholder?: string
}

/**
 * 现居住地选择：
 *  - 国家选择（默认中国）
 *  - 选择中国：展示 省 / 市 / 区 三级联动 + 街道（小区名称）输入
 *  - 选择国外：隐藏省市区，仅保留国家选择（街道输入可用于填写城市/住址）
 *  - 支持编辑回显：国内带出国家+省市区；国外仅带出国家
 */
export default function AddressPicker({ value, onChange, streetPlaceholder }: Props) {
  const provinces: any[] = regionData as any

  const country = value?.country || '中国'
  const isChina = country === '中国'

  const countryIndex = Math.max(0, COUNTRIES.indexOf(country))

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

  const buildText = (v: Partial<AddressValue>) =>
    [
      v.country === undefined ? country : v.country,
      ...(isChina ? [v.province, v.city, v.district] : []),
      v.street,
    ]
      .filter(Boolean)
      .join(' ')

  const handleCountry = (e: any) => {
    const idx = Number(e.detail.value)
    const cName = COUNTRIES[idx]
    if (!cName) return
    if (cName === '中国') {
      // 切回中国：保留已有省市区
      onChange({
        ...value,
        country: '中国',
        province: value?.province || '',
        city: value?.city || '',
        district: value?.district || '',
        text: buildText({ country: '中国' }),
      })
    } else {
      // 切到国外：清空省市区（不展示）
      onChange({
        ...value,
        country: cName,
        province: '',
        city: '',
        district: '',
        text: [cName, value?.street].filter(Boolean).join(' '),
      })
    }
  }

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
      country: '中国',
      province: pName,
      city: cName,
      district: dName,
      street: value?.street || '',
      text: ['中国', pName, cName, dName, value?.street].filter(Boolean).join(' '),
    })
  }

  const handleStreet = (s: string) => {
    onChange({
      ...value,
      country,
      street: s,
      text: [country, ...(isChina ? [value?.province, value?.city, value?.district] : []), s]
        .filter(Boolean)
        .join(' '),
    })
  }

  return (
    <View className="w-full">
      {/* 国家选择 */}
      <Picker
        mode="selector"
        range={COUNTRIES}
        value={countryIndex}
        onChange={handleCountry}
      >
        <View className="bg-white rounded-lg px-3 py-3 border" style={{ borderColor: '#E8E0D6' }}>
          <Text className="text-sm" style={{ color: '#333' }}>
            国家：{country}
          </Text>
        </View>
      </Picker>

      {/* 中国：省市区三级联动 */}
      {isChina && (
        <View className="mt-2">
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
        </View>
      )}

      {/* 街道 / 小区（国外时作为城市/住址填写） */}
      <View className="mt-2 bg-white rounded-lg px-3 py-2 border" style={{ borderColor: '#E8E0D6' }}>
        <Input
          className="w-full bg-transparent"
          placeholder={streetPlaceholder || (isChina ? '街道 / 小区名称（选填）' : '城市 / 详细住址（选填）')}
          value={value?.street || ''}
          onInput={e => handleStreet(e.detail.value)}
        />
      </View>
    </View>
  )
}
