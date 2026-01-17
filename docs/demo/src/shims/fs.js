export const existsSync = () => false;
export const readFileSync = () => "";
export const statSync = () => ({ size: 0, mtimeMs: 0 });
export const createReadStream = () => ({
  on: () => undefined
});
export const promises = {
  stat: async () => ({ size: 0, mtimeMs: 0 })
};
export default {
  existsSync,
  readFileSync,
  statSync,
  createReadStream,
  promises
};
