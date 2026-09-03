export default typeof definePageConfig === 'function'
  ? definePageConfig({ navigationBarTitleText: '家族信息' })
  : { navigationBarTitleText: '家族信息' }
