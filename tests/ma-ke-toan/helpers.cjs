const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
function load(files, globals = {}) {
  const ctx = vm.createContext({console, ...globals});
  for (const file of files) vm.runInContext(fs.readFileSync(path.join(__dirname, '../../UocLuongDatHang', file), 'utf8'), ctx, {filename:file});
  return ctx;
}
module.exports = {load};
