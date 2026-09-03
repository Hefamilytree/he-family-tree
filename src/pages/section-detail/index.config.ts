export default typeof definePageConfig === 'function'
  ? definePageConfig({ navigationBarTitleText: '板块详情', navigationBarBackgroundColor: '#FAF8F5' })
  : { navigationBarTitleText: '板块详情', navigationBarBackgroundColor: '#FAF8F5' }
