export const existsSync = () => false;
export const readFileSync = () => "";
export const isIP = () => 0;
export const isIPv4 = () => false;
export const isIPv6 = () => false;
export const statSync = () => ({ size: 0, mtimeMs: 0 });
export const createReadStream = () => ({ on: () => undefined });
export const promises = { stat: async () => ({ size: 0, mtimeMs: 0 }) };
export default { existsSync, readFileSync, isIP, isIPv4, isIPv6, statSync, createReadStream, promises };
