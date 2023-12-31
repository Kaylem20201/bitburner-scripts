import { NS } from "@ns";

const WEAKEN_SCRIPT = 'batch-scripts/weakenTarget.js';
const GROW_SCRIPT = 'batch-scripts/growTarget.js';
const HACK_SCRIPT = 'batch-scripts/hackTarget.js';
const SCRIPT_GAP = 5000 // millisecond gap to put between scripts

/**
 * Looping script that runs batch operations on a target indefinitely.
 * Flags:
 *  -M : Batch for maximum money on the target server.
 */
export async function main(ns: NS): Promise<void> {

    const target = ns.args[0];
    if (typeof target !== "string") throw new Error('Invalid "target" argument.');

    const hostname = ns.getHostname();

    if (ns.args.length > 0 && ns.args.includes('-M')) {
        ns.print('In here');
        const threads = threadsNeededForMaxMoney(ns, target, hostname);
        await mainLoop(ns, target, threads, hostname);
        throw new Error('Loop ended');
    }


    const hackRamCost = ns.getScriptRam(HACK_SCRIPT);
    const hackSecurityIncrease = ns.hackAnalyzeSecurity(1, target);
    const moneyRemoved = ns.hackAnalyze(target);

    const weaken1ThreadsNeeded = Math.max(1, Math.ceil(hackSecurityIncrease / 0.05));
    const homeCores = ns.getServer('home').cpuCores;
    const growThreadsNeeded = Math.max(1, Math.ceil(ns.growthAnalyze(
        target,
        ns.getServerMaxMoney(target) / (ns.getServerMaxMoney(target) - moneyRemoved),
        homeCores
    )));
    const growSecurityIncrease = ns.growthAnalyzeSecurity(
        growThreadsNeeded,
        target,
        homeCores
    );
    const weaken2ThreadsNeeded = Math.max(1, Math.ceil(growSecurityIncrease / 0.05));

    const threads : HWGWThreads = {
        hackThreads : 1,
        weaken1Threads : weaken1ThreadsNeeded,
        growThreads : growThreadsNeeded,
        weaken2Threads : weaken2ThreadsNeeded
    }

    mainLoop(ns, target, threads, hostname);
    ns.exit();


    async function mainLoop(ns : NS, target : string, threads : HWGWThreads, hostname : string) {
        while (true) {
            await runBatchOnServer(ns, target, threads, hostname);

            await ns.sleep(SCRIPT_GAP);
        }
    }

}

/**
 * Runs a single batch operation with the given threads/parameters
 * @param ns 
 * @param target Target server
 * @param threadsObject HWGWThreads object with threads defined for batch ops
 * @param hostname Optional param for server to host batch operations on
 * @returns Milliseconds it takes for operations to complete
 */
async function runBatchOnServer(ns: NS, target: string, threadsObject: HWGWThreads, hostname?: string): Promise<number> {

    if (hostname === undefined) hostname = 'home';

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
        { time: hackStartTime, type: 'hack' },
        { time: weaken1StartTime, type: 'weaken1' },
        { time: growStartTime, type: 'grow' },
        { time: weaken2StartTime, type: 'weaken2' }
    ];
    //Sort by the earliest start times
    rawTimes.sort((objA, objB) => { return (objA.time - objB.time) });
    //Adjust start times to start at zero
    const adjustedTimes: { time: number, type: string }[] = [];
    const timeAdjustment = Math.min(weaken1StartTime, weaken2StartTime, growStartTime, hackStartTime);
    for (const rawTime of rawTimes) {
        adjustedTimes.push({ time: Math.ceil(rawTime.time - timeAdjustment), type: rawTime.type });
    }

    ns.print('Times: ');
    for (const time of adjustedTimes) ns.print(time.time + ',' + time.type);
    ns.print('Threads: ');
    ns.print('Weaken1: ' + threadsObject.weaken1Threads);
    ns.print('Weaken2: ' + threadsObject.weaken2Threads);
    ns.print('Grow: ' + threadsObject.growThreads);
    ns.print('Hack: ' + threadsObject.hackThreads);

    for (let i = 0; i < adjustedTimes.length; i++) {
        if (adjustedTimes[i].type === 'weaken1') ns.exec(WEAKEN_SCRIPT, hostname, threadsObject.weaken1Threads, target);
        if (adjustedTimes[i].type === 'weaken2') ns.exec(WEAKEN_SCRIPT, hostname, threadsObject.weaken2Threads, target);
        if (adjustedTimes[i].type === 'hack') ns.exec(HACK_SCRIPT, hostname, threadsObject.hackThreads, target);
        if (adjustedTimes[i].type === 'grow') ns.exec(GROW_SCRIPT, hostname, threadsObject.growThreads, target);
        if (i < adjustedTimes.length - 1) await ns.sleep(adjustedTimes[i + 1].time - adjustedTimes[i].time);
    }

    return Math.max(hackFinishTime, weaken1FinishTime, weaken2FinishTime, growFinishTime) + timeAdjustment;

}

interface HWGWThreads {
    hackThreads: number,
    weaken1Threads: number,
    growThreads: number,
    weaken2Threads: number
}

/**
 * Returns the amount of threads needed to take the maximum amount of money from
 * a server in a single batch operation
 * @param ns netscript namespace
 * @param target Target hostname for batch operations
 * @param hostname Hostname that the batch operations are hosted from
 * @returns A HWGWThreads object with the number of threads needed for each op
 */
export function threadsNeededForMaxMoney(ns: NS, target: string, hostname?: string): HWGWThreads {

    const hackThreads = Math.ceil(ns.hackAnalyzeThreads(target, ns.getServerMaxMoney(target)));
    const hackSecurityIncrease = ns.hackAnalyzeSecurity(hackThreads, target);
    const weaken1Threads = Math.max(1,Math.ceil(hackSecurityIncrease / 0.05));
    let cores: number;
    if (hostname !== undefined) cores = ns.getServer(hostname).cpuCores;
    else cores = ns.getServer('home').cpuCores;
    const growThreads = Math.ceil(ns.growthAnalyze(target, 2, cores));
    const growSecurityIncrease = ns.growthAnalyzeSecurity(growThreads, target, cores);
    const weaken2Threads = Math.max(1,Math.ceil(growSecurityIncrease / 0.05));

    return {
        hackThreads,
        weaken1Threads,
        growThreads,
        weaken2Threads
    };

}
