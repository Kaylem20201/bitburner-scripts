import { NS } from "@ns";

/**
 * 
 * 
 */
export async function main(ns: NS, target : string): Promise<void> {
    
    const WEAKEN_SCRIPT = 'batch-scripts/weakenTarget.js';
    const GROW_SCRIPT = 'batch-scripts/growTarget.js';
    const HACK_SCRIPT = 'batch-scripts/hackTarget.js';
    const SCRIPT_GAP = 5000 // millisecond gap to put between scripts

    const hostname = ns.getHostname();

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

    const weakenTime = ns.getWeakenTime(target);
    const growTime = ns.getGrowTime(target);
    const hackTime = ns.getHackTime(target);

    //Scripts should finish in this order:
    //hack > weaken1 > grow > weaken2
    
    let hackStartTime = 0;
    let hackFinishTime = hackStartTime + hackTime;
    let weaken1FinishTime = hackFinishTime + SCRIPT_GAP;
    let weaken1StartTime = weaken1FinishTime - weakenTime;
    let growFinishTime = weaken1FinishTime + SCRIPT_GAP;
    let growStartTime = growFinishTime - growTime;
    let weaken2FinishTime = growFinishTime + SCRIPT_GAP;
    let weaken2StartTime = weaken2FinishTime - weakenTime;

    const rawTimes = [
        {time : hackStartTime, type: 'hack'},
        {time : weaken1StartTime, type: 'weaken1'},
        {time : growStartTime, type: 'grow'},
        {time : weaken2StartTime, type: 'weaken2'}
    ];
    //Sort by the earliest start times
    rawTimes.sort( (objA, objB) => {return (objA.time - objB.time)});
    //Adjust start times to start at zero
    const adjustedTimes: {time : number, type: string}[] = [];
    const timeAdjustment = Math.min(weaken1StartTime, weaken2StartTime, growStartTime, hackStartTime);
    for (const rawTime of rawTimes) {
        adjustedTimes.push({time: rawTime.time-timeAdjustment, type: rawTime.type});
    }
    
    while(true) {
        for(let i = 0; i < adjustedTimes.length; i++) {
            if (adjustedTimes[i].type === 'weaken1') ns.exec(WEAKEN_SCRIPT, hostname, weaken1ThreadsNeeded);
            if (adjustedTimes[i].type === 'weaken2') ns.exec(WEAKEN_SCRIPT, hostname, weaken2ThreadsNeeded);
            if (adjustedTimes[i].type === 'hack') ns.exec(HACK_SCRIPT, hostname, 1);
            if (adjustedTimes[i].type === 'grow') ns.exec(GROW_SCRIPT, hostname, growThreadsNeeded);
            if (i < adjustedTimes.length-1) await ns.sleep(adjustedTimes[i+1].time-adjustedTimes[i].time);
        }

        await ns.sleep(SCRIPT_GAP);
    }

}
