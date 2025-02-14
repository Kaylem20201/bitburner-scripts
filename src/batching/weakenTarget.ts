import { NS } from '@ns';

/**
 * Weakens a target server once
 * @param ns Namespace
 * @param {string} ns.args[0] Target hostname to weaken
 */
export async function main(ns: NS): Promise<void> {
    const target = ns.args[0];
    if (typeof target !== 'string')
        throw new Error('Invalid "target" argument.');
    await ns.weaken(target);
}
