export default typeof definePageConfig === 'function'
  ? definePageConfig({ navigationBarTitleText: '导出族谱', navigationBarBackgroundColor: '#FAF8F5' })
  : { navigationBarTitleText: '导出族谱', navigationBarBackgroundColor: '#FAF8F5' }
