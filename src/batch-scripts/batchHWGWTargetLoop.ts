import { NS } from "@ns";
import { Debug } from 'util';
import { HWGWTimings } from "batch-scripts/interfaces";
import { HWGWThreads } from "batch-scripts/interfaces";
import { SCRIPT_GAP } from "/constantDefinitions";

let debug : Debug;

/**
 * Looping script that runs batch operations on a target indefinitely.
 * Flags:
 *  -M : Batch for maximum money on the target server.
 *  -d : Activate debugging mode
 *  -l : Save logs (only works in debug mode)
 */
export async function main(ns: NS): Promise<void> {

    const target = ns.args[0];
    if (typeof target !== "string") throw new Error('Invalid "target" argument.');
    const hostname = ns.getHostname();

    //Debug mode.
    if (ns.args.includes('-d')) {
        debug = new Debug(ns);
        if (ns.args.includes('-l')) debug.logging = true;
        debug.activate();
    }

    const threads = threadsNeededForMaxMoney(ns, target, hostname);
    const timings = getBatchTimings(ns, target, hostname);
    debug.print(
        "Threads to use each loop :",
        threads,
        "\nTimings to use each loop :",
        timings
    );
    while (true) {
        const pid = ns.exec(
            'batch-scripts/batchTarget.js',
            hostname,
            1,
            target,
            JSON.stringify(threads),
            JSON.stringify(timings),
            hostname,
            (debug.active) ? '-debug' : ''
        );
        debug.print("Executing script :" + pid);
        //Wait so the second set of batch ops start finishing after all of the first
        const lastTime = timings.finishTimes.at(-1)?.time;
        const firstTime = timings.finishTimes.at(0)?.time;
        debug.print('firstTime :' + firstTime);
        debug.print('lastTime :' + lastTime);
        if ((lastTime === undefined) || (firstTime === undefined)) { throw new Error('Error with timings calculation'); }
        const timeDifference = lastTime - firstTime;
        debug.print('timeDifference :' + timeDifference);
        await ns.sleep(timeDifference + SCRIPT_GAP);
    }

}

/**
 * Calculates the times for a single set of batch operations
 * @param ns 
 * @param target Target server
 * @param hostname Server the batch will be hosted from
 * @returns HWGWTimings object
 */
function getBatchTimings(ns: NS, target: string, hostname: string = 'home'): HWGWTimings {

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

    const rawStartTimes = [
        { time: hackStartTime, type: 'hack' },
        { time: weaken1StartTime, type: 'weaken1' },
        { time: growStartTime, type: 'grow' },
        { time: weaken2StartTime, type: 'weaken2' }
    ];
    const finishTimes = [
        { time: hackFinishTime, type: 'hack' },
        { time: weaken1FinishTime, type: 'weaken1' },
        { time: growFinishTime, type: 'grow' },
        { time: weaken2FinishTime, type: 'weaken2' }
    ];
    //Sort by the earliest times
    rawStartTimes.sort((objA, objB) => { return (objA.time - objB.time) });
    finishTimes.sort((objA, objB) => { return (objA.time - objB.time) });
    //Adjust start times to start at zero
    const adjustedStartTimes: { time: number, type: string }[] = [];
    const timeAdjustment = Math.min(weaken1StartTime, weaken2StartTime, growStartTime, hackStartTime);
    for (const rawTime of rawStartTimes) {
        adjustedStartTimes.push({ time: Math.ceil(rawTime.time - timeAdjustment), type: rawTime.type });
    }

    return {
        startTimes: adjustedStartTimes,
        finishTimes: finishTimes
    };

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
    const weaken1Threads = Math.max(1, Math.ceil(hackSecurityIncrease / 0.05));
    let cores: number;
    if (hostname !== undefined) cores = ns.getServer(hostname).cpuCores;
    else cores = ns.getServer('home').cpuCores;
    const growThreads = Math.ceil(ns.growthAnalyze(target, 2, cores));
    const growSecurityIncrease = ns.growthAnalyzeSecurity(growThreads, undefined, cores);
    const weaken2Threads = Math.max(1, Math.ceil(growSecurityIncrease / 0.05));

    return {
        hackThreads,
        weaken1Threads,
        growThreads,
        weaken2Threads
    };

}
