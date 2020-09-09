module.exports = (num = 1, size = 2) => {
  let s = num + "";
  while (s.length < size) s = "0" + s;
  return s;
}