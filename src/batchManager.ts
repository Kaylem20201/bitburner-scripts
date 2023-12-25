import { NS } from "@ns";
import { getAllServers } from "./util";
import { getThreadsAvailable } from "./util";

export async function main(ns: NS): Promise<void> {

    const allServers = getAllServers(ns);

    while(true) {
        const targets = allServers.filter( (serverName) => ns.hasRootAccess(serverName));
        mainLoop(ns, targets);
        await ns.sleep(1000);
    }

}

function mainLoop(ns : NS, targets : string[]) : void {

    const ramBudget = getRamBudget(ns);
    
    for (const target of targets) {
        const minSecurityLevel = ns.getServerMinSecurityLevel(target);

        //Make sure server fully weakened
        const weakened = ns.getServerSecurityLevel(target) === minSecurityLevel;
        if (!weakened) {

        }

    }

}

function 

/**
 * Used to calculate ram available to the batch algorithm
 * @param ns 
 * @returns Amount of ram available for batch algorithm
 */
function getRamBudget(ns : NS) : number {

    //For now, use max 60% of home RAM
    const HOME_BUDGET= .6;
    const maxHomeRam = ns.getServerMaxRam('home');
    const availableHomeRam = maxHomeRam - ns.getServerUsedRam('home');
    const homeRamBudget = Math.max(maxHomeRam * HOME_BUDGET, availableHomeRam);

    const result = homeRamBudget;
    ns.print('Ram Budget: %d', homeRamBudget);
    return homeRamBudget;

}