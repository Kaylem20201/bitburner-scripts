import { NS } from "@ns";

/**
 * Weakens a target server once
 * @param ns Namespace
 * @param target Server to be weakened
 */
export async function main(ns: NS, target : string): Promise<void> {
  await ns.weaken(target);
}
