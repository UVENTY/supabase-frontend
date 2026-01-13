export const groupBy = (array, key) => array.reduce((acc, item) => {
  const group = item[key]
  acc[group] = (acc[group] || []).concat(item)
  return acc
}, {})
