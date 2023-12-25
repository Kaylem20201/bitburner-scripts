import { NS } from "@ns";
import { getAllServers } from "./util";
import { getThreadsAvailable } from "./util";

export async function main(ns: NS): Promise<void> {

    const allServers = getAllServers(ns);

    while (true) {
        const targets = allServers.filter((serverName) => ns.hasRootAccess(serverName));
        mainLoop(ns, targets);
        await ns.sleep(1000);
    }

}

function mainLoop(ns: NS, targets: string[]): void {

    const ramBudget = getRamBudget(ns);

    for (const target of targets) {


    }

}

/**
 * 
 * 
 * 
 * @param ns: Netscript namespace
 * @param ramAvailable: Max ram used for weakening
 * @returns ramUsed is the amount of ram used by the weaken scripts.
 * @returns fullWeaken indicates whether or not the scripts will fully weaken the server
 */
function weakenToLimit(ns: NS, ramAvailable: number, target : string): { ramUsed: number, fullWeaken: boolean } {

    const WEAKEN_SCRIPT = 'batch-scripts/weakenTarget.ts';
    const minSecurityLevel = ns.getServerMinSecurityLevel(target);
    const weakenRamCost = ns.getScriptRam(WEAKEN_SCRIPT, 'home');

    //Make sure server fully weakened
    const weakened = ns.getServerSecurityLevel(target) === minSecurityLevel;
    if (!weakened) {
        const weakenThreadsAvailable = getThreadsAvailable(ramAvailable, weakenRamCost);
        //Weaken operation reduces level by .05
        const weakenThreadsNeeded = Math.ceil((ns.getServerSecurityLevel(target) - minSecurityLevel) / .05);
        if (weakenThreadsNeeded < weakenThreadsAvailable) {
            const ramUsed = weakenRamCost * weakenThreadsNeeded;
            const pid = ns.exec(WEAKEN_SCRIPT, target, weakenThreadsNeeded);
            if (pid === 0) { ns.print("ERROR: Could not spawn scripts."); return { ramUsed: 0, fullWeaken: false };}
            return {ramUsed, fullWeaken : true};
        }
        const ramUsed = weakenRamCost * weakenThreadsAvailable;
        const pid = ns.exec(WEAKEN_SCRIPT, target, weakenThreadsNeeded);
        if (pid === 0) { ns.print("ERROR: Could not spawn scripts."); return { ramUsed: 0, fullWeaken: false };}
        return {ramUsed, fullWeaken : false};
    }
    
    //Server already full weakened
    return { ramUsed : 0, fullWeaken : true};
}

/**
 * Used to calculate ram available to the batch algorithm
 * @param ns 
 * @returns Amount of ram available for batch algorithm
 */
function getRamBudget(ns: NS): number {

    //For now, use max 60% of home RAM
    const HOME_BUDGET = .6;
    const maxHomeRam = ns.getServerMaxRam('home');
    const availableHomeRam = maxHomeRam - ns.getServerUsedRam('home');
    const homeRamBudget = Math.max(maxHomeRam * HOME_BUDGET, availableHomeRam);

    const result = homeRamBudget;
    ns.print('Ram Budget: %d', homeRamBudget);
    return homeRamBudget;

}