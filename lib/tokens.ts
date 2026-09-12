import { randomBytes } from "node:crypto";

export function generateToken() {
  return randomBytes(16).toString("hex");
}
