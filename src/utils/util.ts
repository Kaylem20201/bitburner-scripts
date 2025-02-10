import { NS } from '@ns';

const GROW_SCRIPT = 'batch-scripts/growTarget.js';
const WEAKEN_SCRIPT = 'batch-scripts/weakenTarget.js';

/**
 * Calculates the amount of threads available for a script,
 * given an amount of ram and the script cost
 *
 * @param availableRam Ram available for script to run on
 * @param scriptCost The ram cost of running the script on one thread
 * @returns Max number of threads the script can run on
 */
export function getThreadsAvailable(
    availableRam: number,
    scriptCost: number,
): number {
    return Math.floor(availableRam / scriptCost);
}

// /**
//  * Checks to see if the Formulas API is available
//  *
//  * @param Netscript namespace
//  * @returns True if Formulas is available, false otherwise
//  */
// export function isFormulasAvailable(ns: NS): boolean {
// 	const formulasAvailable: boolean = (ns.ls('home', 'Formulas.exe').length > 0);
// 	return formulasAvailable;
// }
