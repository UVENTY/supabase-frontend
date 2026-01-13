export const isEqualStr = (a, b, caseSensitive) => {
  const [str1, str2] = [a, b].map(val => {
    val = String(val)
    return caseSensitive ? val : val.toLowerCase()
  })
  return str1 === str2
}