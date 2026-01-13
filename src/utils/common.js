export const getFromLocalStorage = (key, defaultValue) => {
  let storageValue = localStorage.getItem(key, defaultValue)
  let value = defaultValue
  if (storageValue) {
    try {
      value = JSON.parse(storageValue)
    } catch (e) {
      value = storageValue
    }
  }
  return value
}

export const setLocalStorage = (key, value) => {
  const val = typeof value === 'string' ? value : JSON.stringify(value)
  localStorage.setItem(key, val)
}