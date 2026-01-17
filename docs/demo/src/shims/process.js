import process from "process";

if (!process.cwd) {
  process.cwd = () => "/";
}

export const cwd = () => process.cwd();
export default process;
export { process };
