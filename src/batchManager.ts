import { NS } from "@ns";
import * as util from "./util";

export async function main(ns: NS): Promise<void> {

    const allServers : string[] = util.getAllServers(ns);

    while (true) {
        const targets = allServers.filter((serverName) => ns.hasRootAccess(serverName));
        mainLoop(ns, targets);
        await ns.sleep(1000);
    }

}

function mainLoop(ns: NS, targets: string[]): void {

    const ramBudget = getRamBudget(ns);
    let ramAvailable = ramBudget;

    for (const target of targets) {

        //Weaken server
        const weakenObject = weakenToLimit(ns, ramAvailable, target);
        ramAvailable = ramAvailable-weakenObject.ramUsed;
        if (!weakenObject.fullyWeakened) continue;

        //Grow server
        const growObject = growToLimit(ns, ramAvailable, target);
        ramAvailable = ramAvailable-growObject.ramUsed;
        if (!growObject.fullyGrown) continue;

        //Weaken server again
        const weakenObject2 = weakenToLimit(ns, ramAvailable, target);
        ramAvailable = ramAvailable-weakenObject2.ramUsed;
        if (!weakenObject2.fullyWeakened) continue;

        //Server fully grown and weakened, ready for batch

        
    }

}

interface BatchAnalysis {
    ramNeeded: number //Ram needed for one set of batch ops
    revenue: number //mone made from one set of batch ops
    timeNeeded: number //Time (in ms) needed to complet a set of batch ops
}

/**
 * Analyzes batch HWGW operations on a target server
 * 
 * @returns BatchAnalysis object
 */
function analyzeBatchRam(ns: NS, target : string) : number {

    const WEAKEN_SCRIPT = 'batch-scripts/weakenTarget.js';
    const GROW_SCRIPT = 'batch-scripts/growTarget.js';
    const HACK_SCRIPT = 'batch-scripts/hackTarget.js';

    const hackRamCost = ns.getScriptRam(HACK_SCRIPT);
    const hackSecurityIncrease = ns.hackAnalyzeSecurity(1, target);
    const moneyRemoved = ns.hackAnalyze(target);

    const weaken1ThreadsNeeded = Math.ceil(hackSecurityIncrease / 0.05);
    const homeCores = ns.getServer('home').cpuCores;
    const growThreadsNeeded = ns.growthAnalyze(
        target,
        ns.getServerMaxMoney(target) / (ns.getServerMaxMoney(target)- moneyRemoved),
        homeCores
    );
    const growSecurityIncrease = ns.growthAnalyzeSecurity(
        growThreadsNeeded,
        target,
        homeCores
    );
    const weaken2ThreadsNeeded = Math.ceil(growSecurityIncrease / 0.05);


    const weakenRamCost = ns.getScriptRam(WEAKEN_SCRIPT);
    const growRamCost = ns.getScriptRam(GROW_SCRIPT);

    const totalRamNeeded = (weaken1ThreadsNeeded*weakenRamCost)
         + (weaken2ThreadsNeeded*weakenRamCost) 
         + (growThreadsNeeded*growRamCost) 
         + hackRamCost;

    const revenue = ns.hackAnalyze(target);

    const weakenTime = ns.getWeakenTime(target);
    const growTime = ns.getGrowTime(target);
    const hackTime = ns.getHackTime(target);

    //TODO: this is wrong, come back to this after writing batch operation
    const maxTimeInMS = Math.max(weakenTime, growTime, hackTime);

    return totalRamNeeded;

}

/**
 * Spawns weaken scripts on target server. Will either
 * spawn as many threads as it can with the ram given, 
 * or however many is needed to reduce server to minimum security level,
 * whichever is less.
 * 
 * @param ns: Netscript namespace
 * @param ramAvailable: Max ram used for weakening
 * @returns Returns and object with ramUsed and fullyWeakened(boolean)
 */
function weakenToLimit(ns: NS, ramAvailable: number, target : string): { ramUsed: number, fullyWeakened: boolean } {

    const WEAKEN_SCRIPT = 'batch-scripts/weakenTarget.js';
    const minSecurityLevel = ns.getServerMinSecurityLevel(target);
    const weakenRamCost = ns.getScriptRam(WEAKEN_SCRIPT, 'home');

    //Make sure server fully weakened
    const weakened = ns.getServerSecurityLevel(target) === minSecurityLevel;
    if (!weakened) {
        const weakenThreadsAvailable = util.getThreadsAvailable(ramAvailable, weakenRamCost);
        //Weaken operation reduces level by .05
        const weakenThreadsNeeded = Math.ceil((ns.getServerSecurityLevel(target) - minSecurityLevel) / .05);
        if (weakenThreadsNeeded < weakenThreadsAvailable) {
            const ramUsed = weakenRamCost * weakenThreadsNeeded;
            const pid = ns.exec(WEAKEN_SCRIPT, 'home', weakenThreadsNeeded);
            if (pid === 0) { ns.print("ERROR: Could not spawn scripts."); return { ramUsed: 0, fullyWeakened: false };}
            return {ramUsed, fullyWeakened : true};
        }
        const ramUsed = weakenRamCost * weakenThreadsAvailable;
        const pid = ns.exec(WEAKEN_SCRIPT, 'home', weakenThreadsNeeded);
        if (pid === 0) { ns.print("ERROR: Could not spawn scripts."); return { ramUsed: 0, fullyWeakened: false };}
        return {ramUsed, fullyWeakened : false};
    }
    
    //Server already full weakened
    return { ramUsed : 0, fullyWeakened : true};
}

/**
 * Spawns grow scripts on target server. Will either
 * spawn as many threads as it can with the ram given, 
 * or however many is needed to grow server to maximum money,
 * whichever is less.
 * 
 * @param ns: Netscript namespace
 * @param ramAvailable: Max ram used for weakening
 * @returns Returns and object with ramUsed and fullyGrown(boolean)
 */
function growToLimit(ns: NS, ramAvailable: number, target : string): { ramUsed: number, fullyGrown: boolean } {

    const GROW_SCRIPT = 'batch-scripts/growTarget.js';
    const growScriptCost = ns.getScriptRam(GROW_SCRIPT, 'home');

    if (ns.getServerMoneyAvailable(target) === ns.getServerMaxMoney(target)) {
        //Server already fully grown
        return { ramUsed:0, fullyGrown:true };
    }

    const hostServer = ns.getHostname();
    const homeCores = ns.getServer(hostServer).cpuCores;
    const maxGrowthFactor = ns.getServerMaxMoney(target)/ns.getServerMoneyAvailable(target);
    const growthThreadsWanted = ns.growthAnalyze(target, maxGrowthFactor, homeCores);
    const growthThreadsAvailable = util.getThreadsAvailable(ramAvailable, growScriptCost);

    const threadsToUse = Math.min(growthThreadsAvailable, growthThreadsWanted)
    const pid = ns.exec(GROW_SCRIPT, 'home',threadsToUse );

    if (pid === 0) { ns.print("ERROR: Could not spawn scripts."); return { ramUsed: 0, fullyGrown: false };}

    const ramUsed = growScriptCost * threadsToUse;
    return { ramUsed: ramUsed, fullyGrown : growthThreadsWanted === threadsToUse };


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