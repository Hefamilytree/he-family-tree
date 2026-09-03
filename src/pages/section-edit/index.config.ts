export default typeof definePageConfig === 'function'
  ? definePageConfig({ navigationBarTitleText: '编辑内容', navigationBarBackgroundColor: '#FAF8F5' })
  : { navigationBarTitleText: '编辑内容', navigationBarBackgroundColor: '#FAF8F5' }
