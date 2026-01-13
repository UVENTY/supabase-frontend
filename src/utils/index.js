export function getFormData(data, formData = new FormData(), parentKey) {
  if (data && typeof data === 'object' && !(data instanceof Date) && !(data instanceof File) && !(data instanceof Blob)) {
    Object.keys(data).forEach(key => {
      getFormData(data[key], formData, parentKey ? `${parentKey}[${key}]` : key);
    });
  } else if (parentKey) {
    let value = data === null ? '' : data
    if (value instanceof Date) {
      value = value.toString()
    }
    formData.append(parentKey, value)
  }
  return formData
}

export const renameKeys = (keysMap, obj, skipOtherKeys) =>
  Object.keys(obj).reduce(
    (acc, key) => {
      if (skipOtherKeys && !keysMap[key]) return acc
      return {
        ...acc,
        ...{ [keysMap[key] || key]: obj[key] }
      }
    },
    {}
  )

export const pipe = (...fns) => x => fns.filter(f => typeof f === 'function').reduce((v, f) => typeof f === 'function' ? f(v) : v, x)

export const order = sorter => data => sorter ? data.sort((a, b) => {
  const type = typeof sorter
  switch (type) {
    case 'function':
      return sorter(a, b)
    case 'string':
      const isNumber = typeof a[sorter] === 'number' && typeof b[sorter] === 'number'
      return isNumber ? a - b : a[sorter]?.localeCompare(b[sorter])

    default:
      return 0
  }
}) : data

export const filter = cond => data => cond ? data.filter(item => {
  const type = typeof cond
  switch (type) {
    case 'function':
      return cond(item)
    case 'object':
      return Object.entries(cond).every(([key, value]) => item[key] === value)
    default:
      return true
  }
}) : data

export const group = grouper => data => grouper ? data.reduce((acc, item) => {
  const key = typeof grouper === 'function' ? grouper(item) : item[grouper]
  if (!acc[key]) {
    acc[key] = []
  }
  acc[key].push(item)
  return acc
}, {}) : data

export const isEqualSeats = (s1, s2) => {
  return ['row', 'seat', 'category'].reduce((acc, key) => acc && String(s1[key]) === String(s2[key]), true)
}

export const getSidesRatio = (el1, el2) => {
  if (!el1 || !el2) return []
  return [
    el2.offsetWidth / el1.offsetWidth,
    el2.offsetHeight / el1.offsetHeight
  ]
}

export const intersect = (a, b) => a.filter(value => b.includes(value))

export const uniq = arr => [...new Set(arr)]

export const diff = (a, b) => uniq([
  ...a.filter(value => !b.includes(value)),
  ...b.filter(value => !a.includes(value))
])

export const path = (path, obj) => path.reduce((acc, key) => acc ? acc[key] : undefined, obj)

export const indexBy = (key, obj) => obj.reduce((acc, item) => ({ ...acc, [item[key]]: item }), {})

export const isEmptyObject = val => typeof val === 'object' && Object.keys(val).length === 0

export const combineBy = (key, valuesMap) => Object.entries(valuesMap).reduce((acc, [name, value]) => {
  Array.isArray(value) ?
    value.forEach((item) => {
      acc[item[key]] = { ...acc[item[key]], [name]: (acc[name] || 0) + 1 }
    }) :
    Object.entries(acc).forEach(([k, v]) => acc[k] = { ...v, [name]: value })

  return acc
}, {})

export const filterSeats = arr => arr.filter(item => item.category && (item.row === '-1' || item.row === '0'))

export const getDiff = (obj1, obj2, comparator) => {
  const keys1 = Object.keys(obj1)
  const keys2 = Object.keys(obj2)
  const diffKeys = diff(keys1, keys2)
  const res = intersect(keys1, keys2).reduce((acc, key) => {
    if (comparator(obj1[key], obj2[key])) return acc
    return { ...acc, [key]: obj1[key] }
  }, {})
  return diffKeys.reduce((acc, key) => ({
    ...acc,
    [key]: obj1[key] || obj2[key]
  }), res)
}

export const groupBy = (array, key) => array.reduce((acc, item) => {
  const group = item[key]
  acc[group] = (acc[group] || []).concat(item)
  return acc
}, {})


export const omit = (obj, keys) => Object.keys(obj).reduce((acc, key) => {
  if (!keys.includes(key)) {
    acc[key] = obj[key]
  }
  return acc
}, {})

export function log(...args) {
  let el = document.getElementById('log')
  if (!el) {
    return
  }
  const text = args.map((arg) => JSON.stringify(arg)).join(' ')
  el.innerHTML = text + "<br>" + el.innerHTML
}

export function isTouchDevice() {
  return (('ontouchstart' in window) ||
    (navigator.maxTouchPoints > 0) ||
    (navigator.msMaxTouchPoints > 0));
}