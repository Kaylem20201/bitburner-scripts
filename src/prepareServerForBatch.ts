import { NS } from "@ns";
import * as util from "util";

const GROW_SCRIPT = 'batch-scripts/growTarget.js';
const WEAKEN_SCRIPT = 'batch-scripts/weakenTarget.js';
const SCRIPT_GAP = 5000 // millisecond gap to put between scripts

interface PreparationInfo {
    ramUsed : number,
    fullyWeakened? : boolean,
    fullyGrown? : boolean,
    waitTime : number
}

/**
 * Prepares a server for batch operations by making sure
 * it is fully weakened and grown.
 */
export async function main(ns: NS): Promise<void> {

    if (ns.args.length < 0 || typeof ns.args[0] !== 'string') {
        ns.print('ERROR: Invalid target parameter');
        ns.tprint("ERROR: Invalid target parameter on process " + ns.getRunningScript())
        ns.exit();
    }
    
    let hostname = 'home'
    let hostnameArgIndex = ns.args.indexOf('-h');
    if (hostnameArgIndex !== -1) {
        //Hostname flag
        const rawArgument = ns.args[hostnameArgIndex+1];
        if (typeof rawArgument !== 'string') { throw new Error('Invalid hostname argument'); }
        hostname = rawArgument;
    }
    
    const target = ns.args[0];
    let ramAvailable = getRamBudget(ns);
    let weakenPhase = true;

    while (!isPrepared(ns,target)) {
        let prepInfo : PreparationInfo;
        let waitTime : number;
        if (weakenPhase) {
            prepInfo = weakenToLimit(ns, ramAvailable, target);
            waitTime = prepInfo.waitTime;
            weakenPhase = !(ns.getServerSecurityLevel(target) === ns.getServerMinSecurityLevel(target));
        }
        else {
            waitTime = await growAndWeakenCombo(ns, ramAvailable, target, hostname)
        }

        await ns.sleep(waitTime);
    }

    ns.toast("Server " + target + "fully grown and weakened, ready for batch", "success",5000);
    ns.print("Server " + target + "fully grown and weakened, ready for batch");
    ns.exit();

}

/**
 * 
 * @param ns Netscript
 * @param ramAvailable Ram available for scripts to use
 * @param target 
 * @param hostname 
 * @returns Full execution time in milliseconds
 */
async function growAndWeakenCombo(ns: NS, ramAvailable : number, target : string, hostname : string = 'home') : Promise<number> {

    const growStartTime = 0;
    const growFinishTime = ns.getGrowTime(target);
    const weakenFinishTime = growFinishTime + SCRIPT_GAP;
    const weakenStartTime = weakenFinishTime - ns.getWeakenTime(target);

    const rawTimes = [
        { time : growStartTime, type : 'grow' },
        { time : weakenStartTime, type : 'weaken' }
    ];

    //Adjust start times to start at zero
    let adjustedTimes: { time: number, type: string }[] = [];
    const timeAdjustment = Math.min(...rawTimes.map( (ele) => ele.time));
    for (const rawTime of rawTimes) {
        adjustedTimes.push({ time: Math.ceil(rawTime.time - timeAdjustment), type: rawTime.type });
    }

    const growScriptCost = ns.getScriptRam(GROW_SCRIPT);
    const growPrepAnalysis = util.growAnalyzePrep(ns, target, hostname);
    const growThreadsNeeded = growPrepAnalysis.threadsNeeded;
    const growThreadsAvailable = util.getThreadsAvailable(ramAvailable, growScriptCost);
    const growThreads = Math.min(growThreadsNeeded, growThreadsAvailable);
    const growSecurityIncrease = growPrepAnalysis.securityIncrease;

    const ramAvailableAfterGrowth = (ramAvailable - (growScriptCost * growThreads));
    const weakenScriptCost = ns.getScriptRam(WEAKEN_SCRIPT);
    const weakenThreadsNeeded = Math.max(1,Math.ceil(growSecurityIncrease/.05));
    const weakenThreadsAvailable = util.getThreadsAvailable(ramAvailableAfterGrowth, weakenScriptCost);
    const weakenThreads = Math.min(weakenThreadsAvailable, weakenThreadsNeeded);

    if (weakenThreads === 0) adjustedTimes = adjustedTimes.filter( (timeObj) => timeObj.type !== 'weaken');
    if (growThreads === 0) adjustedTimes = adjustedTimes.filter( (timeObj) => timeObj.type !== 'grow');
    
    for (let i = 0; i < adjustedTimes.length; i++) {
        if (adjustedTimes[i].type === 'weaken') { ns.exec(WEAKEN_SCRIPT, hostname, weakenThreads, target); }
        if (adjustedTimes[i].type === 'grow') { ns.exec(GROW_SCRIPT, hostname, growThreads, target); }
        if (i < adjustedTimes.length - 1) await ns.sleep(adjustedTimes[i + 1].time - adjustedTimes[i].time);
    }

    return Math.max(growFinishTime, weakenFinishTime);

}

function isPrepared(ns: NS, target : string) : boolean {

    if (ns.getServerMaxMoney(target) !== ns.getServerMoneyAvailable(target)) return false;
    if (ns.getServerMinSecurityLevel(target) !== ns.getServerSecurityLevel(target)) return false;
    return true;

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
    ns.print('Ram Budget: ', homeRamBudget);
    return homeRamBudget;

}

/**
 * Spawns weaken scripts on target server. Will either
 * spawn as many threads as it can with the ram given, 
 * or however many is needed to reduce server to minimum security level,
 * whichever is less.
 * 
 * @param ns: Netscript namespace
 * @param ramAvailable: Max ram used for weakening
 * @returns PreparationInfo object
 */
function weakenToLimit(ns: NS, ramAvailable: number, target : string): PreparationInfo {

    const minSecurityLevel = ns.getServerMinSecurityLevel(target);
    const weakenRamCost = ns.getScriptRam(WEAKEN_SCRIPT, 'home');

    //Make sure server fully weakened
    const weakened = ns.getServerSecurityLevel(target) === minSecurityLevel;

    if (weakened) {
        //Server already full weakened
        return { ramUsed: 0, fullyWeakened: true, waitTime: 0 };
    }

    const weakenThreadsAvailable = util.getThreadsAvailable(ramAvailable, weakenRamCost);
    //Weaken operation reduces level by .05
    const weakenThreadsNeeded = Math.ceil((ns.getServerSecurityLevel(target) - minSecurityLevel) / .05);
    if (weakenThreadsNeeded < weakenThreadsAvailable) {
        const ramUsed = weakenRamCost * weakenThreadsNeeded;
        const pid = ns.exec(WEAKEN_SCRIPT, 'home', weakenThreadsNeeded, target);
        if (pid === 0) { ns.print("ERROR: Could not spawn scripts."); return { ramUsed: 0, fullyWeakened: false, waitTime: 0 }; }
        return { ramUsed, fullyWeakened: true, waitTime: ns.getWeakenTime(target) };
    }
    const ramUsed = weakenRamCost * weakenThreadsAvailable;
    const pid = ns.exec(WEAKEN_SCRIPT, 'home', weakenThreadsNeeded, target);
    if (pid === 0) { ns.print("ERROR: Could not spawn scripts."); return { ramUsed: 0, fullyWeakened: false, waitTime: 0 }; }
    return { ramUsed, fullyWeakened: false, waitTime: ns.getWeakenTime(target) };

}

/**
 * Spawns grow scripts on target server. Will either
 * spawn as many threads as it can with the ram given, 
 * or however many is needed to grow server to maximum money,
 * whichever is less.
 * 
 * @param ns: Netscript namespace
 * @param ramAvailable: Max ram used for weakening
 * @returns PreparationInfo object
 */
function growToLimit(ns: NS, ramAvailable: number, target: string): PreparationInfo {

    const growScriptCost = ns.getScriptRam(GROW_SCRIPT, 'home');

    if (ns.getServerMoneyAvailable(target) === ns.getServerMaxMoney(target)) {
        //Server already fully grown
        return { ramUsed: 0, fullyGrown: true, waitTime: 0 };
    }

    const hostServer = ns.getHostname();
    const homeCores = ns.getServer(hostServer).cpuCores;
    const maxGrowthFactor = ns.getServerMaxMoney(target) / ns.getServerMoneyAvailable(target);
    const growthThreadsWanted = Math.ceil(ns.growthAnalyze(target, maxGrowthFactor, homeCores));
    const growthThreadsAvailable = util.getThreadsAvailable(ramAvailable, growScriptCost);

    const threadsToUse = Math.min(growthThreadsAvailable, growthThreadsWanted)
    const pid = ns.exec(GROW_SCRIPT, 'home', threadsToUse, target);

    if (pid === 0) { ns.print("ERROR: Could not spawn scripts."); return { ramUsed: 0, fullyGrown: false, waitTime : 0 }; }

    const ramUsed = growScriptCost * threadsToUse;
    return { ramUsed: ramUsed, fullyGrown: growthThreadsWanted === threadsToUse, waitTime : ns.getGrowTime(target)};

}

/*function maxGrowthWithinRam(ns : NS, ramAvailable : number, target : string, hostname : string = 'home') {

    const growScriptCost = ns.getScriptRam(GROW_SCRIPT, 'home');
    const cores = ns.getServer(hostname).cpuCores;
    const maxGrowthFactor = ns.getServerMaxMoney(target) / ns.getServerMoneyAvailable(target);
    const growthThreadsWanted = Math.ceil(ns.growthAnalyze(target, maxGrowthFactor, cores));
    const growthThreadsAvailable = util.getThreadsAvailable(ramAvailable, growScriptCost);

    const threadsToUse = Math.min(growthThreadsAvailable, growthThreadsWanted);

    return ns.growthAnalyzeSecurity


}*/