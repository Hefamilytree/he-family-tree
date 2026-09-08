export default typeof definePageConfig === 'function'
  ? definePageConfig({ navigationBarTitleText: '宗亲生日提醒' })
  : { navigationBarTitleText: '宗亲生日提醒' }