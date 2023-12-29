import { NS } from "@ns";

/**
 * Hack a target server once
 * @param ns Namespace
 * @param target Server to be hack
 */
export async function main(ns: NS, target : string): Promise<void> {
  await ns.hack(target);
}
