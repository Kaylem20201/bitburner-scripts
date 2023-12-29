import { NS } from "@ns";

/**
 * Grow a target server once
 * @param ns Namespace
 * @param target Server to be grow
 */
export async function main(ns: NS, target : string): Promise<void> {
  await ns.grow(target);
}
