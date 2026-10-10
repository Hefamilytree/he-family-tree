import { useMemo, useState, useEffect, useRef } from 'react'
import { View, Text, Picker } from '@tarojs/components'
import { regionData } from 'element-china-area-data'
import { Input } from '@/components/ui/input'
import { COUNTRIES } from '@/utils/countries'

export interface AddressValue {
  country?: string
  province?: string
  city?: string
  district?: string
  street?: string
  provinceCode?: string
  cityCode?: string
  districtCode?: string
  /** 完整文本：国家 省 市 区 街道/小区 */
  text?: string
}

interface Props {
  value?: AddressValue
  onChange: (v: AddressValue) => void
  streetPlaceholder?: string
}

interface AreaNode {
  label: string
  value: string
  children?: AreaNode[]
}

/** 直筒子市（无下辖区县）兜底节点 */
const FALLBACK_DISTRICT: AreaNode = { label: '市辖区', value: '' }

/**
 * 现居住地选择：
 *  - 国家选择（默认中国）
 *  - 中国：省 / 市 / 区 三级联动（multiSelector + onColumnChange 逐列联动）
 *  - 兼容直筒子市（东莞、中山、儋州等无下辖区县）：区列补“市辖区”兜底
 *  - 绑定名称 + 行政区划 code
 */
export default function AddressPicker({ value, onChange, streetPlaceholder }: Props) {
  const provinces = (regionData as unknown as AreaNode[]) || []

  const country = value?.country || '中国'
  const isChina = country === '中国'

  const countryIndex = Math.max(0, COUNTRIES.indexOf(country))

  /** 找到某级节点在列表中的索引（按 code，其次按名称） */
  const findIndex = (list: AreaNode[], code?: string, name?: string) => {
    let i = list.findIndex(n => code && n.value === code)
    if (i < 0) i = list.findIndex(n => name && n.label === name)
    return i < 0 ? 0 : i
  }

  const citiesOf = (p?: AreaNode): AreaNode[] => p?.children || []
  /** 区县列表：空则补兜底节点，保证第三列不空白 */
  const districtsOf = (c?: AreaNode): AreaNode[] => {
    const list = c?.children
    return list && list.length ? list : [FALLBACK_DISTRICT]
  }

  // 初始索引（支持编辑回显）
  const initProv = provinces[findIndex(provinces, value?.provinceCode, value?.province)] || provinces[0]
  const initCityList = citiesOf(initProv)
  const initCity = initCityList[findIndex(initCityList, value?.cityCode, value?.city)] || initCityList[0]
  const initDistList = districtsOf(initCity)

  const [provIndex, setProvIndex] = useState(0)
  const [cityIndex, setCityIndex] = useState(0)
  const [distIndex, setDistIndex] = useState(0)
  const [cityList, setCityList] = useState<AreaNode[]>(initCityList)
  const [distList, setDistList] = useState<AreaNode[]>(initDistList)
  const initedRef = useRef(false)

  /** 根据当前索引构造并上报完整值（名称 + code） */
  const emit = (
    pIdx: number,
    cIdx: number,
    dIdx: number,
    cities: AreaNode[],
    districts: AreaNode[],
    street?: string,
  ) => {
    const p = provinces[pIdx]
    const c = cities[cIdx]
    const d = districts[dIdx]
    if (!p || !c || !d) return
    const pName = p.label
    const cName = c.label
    const dName = d.label
    const st = street !== undefined ? street : value?.street || ''
    onChange({
      country: '中国',
      province: pName,
      city: cName,
      district: dName,
      provinceCode: p.value,
      cityCode: c.value,
      districtCode: d.value,
      street: st,
      text: ['中国', pName, cName, dName, st].filter(Boolean).join(' '),
    })
  }

  // 首次进入中国：默认选中第一个省并联动初始化，自动带出可直接确认的省市区
  useEffect(() => {
    if (!isChina || initedRef.current) return
    initedRef.current = true
    const cities = citiesOf(provinces[0])
    const districts = districtsOf(cities[0])
    setCityList(cities)
    setDistList(districts)
    setProvIndex(0)
    setCityIndex(0)
    setDistIndex(0)
    if (!value?.province) emit(0, 0, 0, cities, districts)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isChina])

  /** 列变动逐列联动 */
  const handleColumnChange = (e: any) => {
    const { column, value: val } = e.detail
    const [pi, ci, di] = val as number[]
    console.log('[AddressPicker] column change ->', { column, pi, ci, di })

    if (column === 0) {
      // 修改省份：重载该省城市，区县重置为第一个城市的下属区县
      const p = provinces[pi]
      const cities = citiesOf(p)
      const districts = districtsOf(cities[0])
      console.log('[AddressPicker] 选中省份:', p?.label, p?.value)
      console.log('[AddressPicker] 刷新城市列表:', cities.map(c => c.label))
      setProvIndex(pi)
      setCityList(cities)
      setDistList(districts)
      setCityIndex(0)
      setDistIndex(0)
    } else if (column === 1) {
      // 修改城市：重载下属区县
      const p = provinces[pi]
      const c = citiesOf(p)[ci]
      const districts = districtsOf(c)
      console.log('[AddressPicker] 选中城市:', c?.label, c?.value)
      setCityIndex(ci)
      setDistList(districts)
      setDistIndex(0)
    } else if (column === 2) {
      // 区县变动无需联动
      setDistIndex(di)
    }
  }

  /** 最终确认 */
  const handleChange = (e: any) => {
    const [pi, ci, di] = e.detail.value
    const cities = citiesOf(provinces[pi])
    const districts = districtsOf(cities[ci])
    setProvIndex(pi)
    setCityList(cities)
    setDistList(districts)
    setCityIndex(ci)
    setDistIndex(di)
    emit(pi, ci, di, cities, districts)
  }

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
      onChange({
        ...value,
        country: '中国',
        text: buildText({ country: '中国' }),
      })
    } else {
      onChange({
        ...value,
        country: cName,
        province: '',
        city: '',
        district: '',
        provinceCode: '',
        cityCode: '',
        districtCode: '',
        text: [cName, value?.street].filter(Boolean).join(' '),
      })
    }
  }

  const handleStreet = (s: string) => {
    onChange({
      ...value,
      country,
      street: s,
      text: [
        country,
        ...(isChina ? [value?.province, value?.city, value?.district] : []),
        s,
      ]
        .filter(Boolean)
        .join(' '),
    })
  }

  const pickerValue = useMemo(() => [provIndex, cityIndex, distIndex], [provIndex, cityIndex, distIndex])
  const displayText = value?.province
    ? `${value.province} ${value.city || ''} ${value.district || ''}`
    : '请选择 省 / 市 / 区'

  return (
    <View className="w-full">
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

      {isChina && (
        <View className="mt-2">
          <Picker
            mode="multiSelector"
            range={[provinces, cityList, distList]}
            rangeKey="label"
            value={pickerValue}
            onChange={handleChange}
            onColumnChange={handleColumnChange}
          >
            <View className="bg-white rounded-lg px-3 py-3 border" style={{ borderColor: '#E8E0D6' }}>
              <Text className="block text-sm" style={{ color: value?.province ? '#333' : '#999' }}>
                {displayText}
              </Text>
            </View>
          </Picker>
        </View>
      )}

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
