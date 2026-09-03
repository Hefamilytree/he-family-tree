export default typeof definePageConfig === 'function'
  ? definePageConfig({ navigationBarTitleText: '成员管理' })
  : { navigationBarTitleText: '成员管理' }
