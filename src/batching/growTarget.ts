import { NS } from '@ns';

/**
 * Grow a target server once
 * @param ns Namespace
 * @param {string} ns.args[0] Target hostname to grow
 */
export async function main(ns: NS): Promise<void> {
    const target = ns.args[0];
    if (typeof target !== 'string')
        throw new Error('Invalid "target" argument.');
    await ns.grow(target);
}
