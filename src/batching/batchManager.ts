import { NS, Player, Server } from '@ns';
import {
    BATCHING_PERCENT,
    GROW_SCRIPT,
    HACK_SCRIPT,
    HACK_SECURITY_INCREASE,
    PREPARING_PERCENT,
    SCRIPT_GAP,
    WEAKEN_SCRIPT,
    WEAKEN_SECURITY_REDUCTION,
    WEAKEN_THREADS_PER_GROW_THREAD,
} from '/constantDefinitions';
import { requestGetAllServers } from '/utils/managerAPI';

type HackableServer = Server & {
    minDifficulty: number;
    hackDifficulty: number;
    moneyMax: number;
    moneyAvailable: number;
};
function isHackableServer(server: Server, player: Player): server is HackableServer {
    if (server.hostname === 'home') return false;
    if (server.purchasedByPlayer === true) return false;
    if (!server.hackDifficulty || server.hackDifficulty > 100) return false;
    if (server.requiredHackingSkill > player.skills.hacking) return false;
    return true;
}

let servers: Server[];

export async function main(ns: NS): Promise<void> {
    ns.tail();
    servers = await getAllServers(ns);
    ns.tprint('DEBUG servers set');
    await ns.asleep(500);
    await batchLoop(ns);
}

function isPrepared(server: Server): boolean {
    return (
        server.moneyAvailable == server.moneyMax &&
        server.minDifficulty == server.hackDifficulty
    );
}

async function prepareLoop(ns: NS): Promise<void> {
    ns.tprint('DEBUG in prepareLoop');
    await ns.asleep(500);
    while (true) {
        const home = servers.find((server) => server.hostname === 'home');
        if (!home) {
            ns.tprint('ERROR: home not found in server list');
            ns.exit();
        }

        const availablePreparingRam = home.maxRam * PREPARING_PERCENT;
        if (availablePreparingRam > home.maxRam - home.ramUsed) {
            ns.tprintf(
                'ERROR: Could not allocate ram in %s.',
                ns.getScriptName(),
            );
            ns.printf(
                'ERROR: Could not allocate ram in %s.',
                ns.getScriptName(),
            );
            ns.printf('%s', JSON.stringify(home));
            ns.printf(
                'availablePreparingRam: %s',
                availablePreparingRam.toString(),
            );
            ns.exit();
        }

        const crackedServers = servers.filter(
            (server) => server.hasAdminRights,
        );
        ns.printf('crackedServers: %j', crackedServers);
        const hackableServers: HackableServer[] = crackedServers.filter(
            (server) => isHackableServer(server),
        ) as HackableServer[];
        ns.printf('hackableServers: %j', hackableServers);
        const unpreparedServers = hackableServers.filter(
            (server) => !isPrepared(server),
        );

        let remainingRam = availablePreparingRam;
        let runningScriptPIDs = [];
        ns.printf('Need to prepare these servers: %j', unpreparedServers);
        if (unpreparedServers.length > 0) {
            ns.printf('Need to prepare these servers: %j', unpreparedServers);
        }
        for (const server of unpreparedServers) {
            //Weaken to minimum first
            if (server.minDifficulty !== server.hackDifficulty) {
                const res = weakenAsPossible(ns, server, remainingRam);
                if (!res) break;
                runningScriptPIDs.push(res.pid);
                remainingRam = res.remainingRam;
                continue;
            }
            //Then grow/weaken in batches
            const res = await prepareAsPossible(
                ns,
                server,
                remainingRam,
                home.cpuCores,
            );
            if (!res) break;
            runningScriptPIDs.push(...res.pids);
            remainingRam = res.remainingRam;
        }

        //Wait until all scripts are finished
        while (runningScriptPIDs.length > 0) {
            await ns.asleep(5000);
            runningScriptPIDs = runningScriptPIDs.filter((pid) =>
                ns.isRunning(pid),
            );
        }

        await ns.asleep(1000);
    }
}

function weakenAsPossible(
    ns: NS,
    server: HackableServer,
    availableRam: number,
): { pid: number; remainingRam: number } | undefined {
    const weakenCost = ns.getScriptRam(WEAKEN_SCRIPT);
    const diff = server.hackDifficulty - server.minDifficulty;
    const neededWeakenThreads = Math.ceil(diff / WEAKEN_SECURITY_REDUCTION);
    const neededWeakenRam = neededWeakenThreads * weakenCost;
    const weakenThreads =
        neededWeakenRam < availableRam
            ? neededWeakenThreads
            : Math.floor(availableRam / weakenCost);
    if (weakenThreads === 0) return;
    const pid = ns.run(WEAKEN_SCRIPT, weakenThreads, server.hostname);
    return {
        pid,
        remainingRam: availableRam - weakenThreads * weakenCost,
    };
}

async function prepareAsPossible(
    ns: NS,
    server: HackableServer,
    availableRam: number,
    cores: number,
): Promise<{ pids: number[]; remainingRam: number } | undefined> {
    const prepareThreadCost =
        WEAKEN_THREADS_PER_GROW_THREAD * ns.getScriptRam(WEAKEN_SCRIPT) +
        ns.getScriptRam(GROW_SCRIPT);
    const diff = server.moneyMax / server.moneyAvailable;
    const neededGrowThreads = Math.ceil(
        ns.growthAnalyze(server.hostname, diff, cores),
    );
    const neededWeakenThreads = Math.ceil(
        neededGrowThreads * WEAKEN_THREADS_PER_GROW_THREAD,
    );
    const neededRam =
        neededGrowThreads * ns.getScriptRam(GROW_SCRIPT) +
        neededWeakenThreads * ns.getScriptRam(WEAKEN_SCRIPT);
    const prepareThreads =
        neededRam < availableRam
            ? neededRam
            : Math.floor(availableRam / prepareThreadCost);
    if (prepareThreads === 0) return;
    const pids = await prepare(ns, server, prepareThreads);
    return {
        pids,
        remainingRam: availableRam - prepareThreads * prepareThreadCost,
    };
}

type ScriptTiming = {
    scriptPath: string;
    time: number;
    threads: number;
};
function timingSort(a: ScriptTiming, b: ScriptTiming): number {
    return a.time - b.time;
}
async function prepare(
    ns: NS,
    target: HackableServer,
    growThreads: number,
): Promise<number[]> {
    const weakenThreads = Math.ceil(
        growThreads * WEAKEN_THREADS_PER_GROW_THREAD,
    );
    const [growFinishTime, weakenFinishTime] = [0, 0 + SCRIPT_GAP];
    let [growStartTime, weakenStartTime] = [
        growFinishTime - ns.getGrowTime(target.hostname),
        weakenFinishTime - ns.getWeakenTime(target.hostname),
    ];
    const min = Math.min(growStartTime, weakenStartTime);
    growStartTime -= min;
    weakenStartTime -= min;
    if (
        growStartTime < 0 ||
        weakenStartTime < 0 ||
        (growStartTime !== 0 && weakenStartTime !== 0)
    ) {
        ns.tprintf('ERROR: Incorrect math in prepare()');
        ns.tprintf(
            'ERROR: GrowStart: %d, GrowFinish: %d, WeakenStart: %d, WeakenFinish:%d',
            growStartTime,
            growFinishTime,
            weakenStartTime,
            weakenFinishTime,
        );
        ns.exit();
    }

    const weakenTiming: ScriptTiming = {
        scriptPath: WEAKEN_SCRIPT,
        time: weakenStartTime,
        threads: weakenThreads,
    };
    const growTiming: ScriptTiming = {
        scriptPath: GROW_SCRIPT,
        time: growStartTime,
        threads: growThreads,
    };
    const timings = [weakenTiming, growTiming];
    timings.sort(timingSort);

    const pids = [];
    const timing_iter = timings.values();
    let iter_result;
    while (!iter_result?.done) {
        iter_result = timing_iter.next();
        const timing: ScriptTiming = iter_result.value;
        await ns.asleep(timing.time);
        pids.push(ns.run(timing.scriptPath, timing.threads, target.hostname));
        if (iter_result.done) {
            break;
        }
        await ns.asleep(SCRIPT_GAP);
    }

    return pids;
}

async function batchLoop(ns: NS) {
    ns.tprint('DEBUG in batchLoop');
    await ns.asleep(500);
    while (true) {
        const hackableServers = servers.filter((server) =>
            isHackableServer(server),
        ) as HackableServer[];

        const home = servers.find((server) => server.hostname === 'home');
        if (!home) {
            ns.tprint('ERROR: home not found in server list');
            ns.exit();
        }

        const availableBatchingRamGB = home.maxRam * BATCHING_PERCENT;
        if (availableBatchingRamGB > home.maxRam - home.ramUsed) {
            ns.tprintf(
                'ERROR: Could not allocate ram in %s.',
                ns.getScriptName(),
            );
            ns.printf(
                'ERROR: Could not allocate ram in %s.',
                ns.getScriptName(),
            );
            ns.printf('%s', JSON.stringify(home));
            ns.printf(
                'availableBatchingRam: %s',
                availableBatchingRamGB.toString(),
            );
            ns.exit();
        }

        const crackedServers = servers.filter(
            (server) => server.hasAdminRights,
        );
        ns.printf('crackedServers: %j', crackedServers);
        const hackableServers: HackableServer[] = crackedServers.filter(
            (server) => isHackableServer(server),
        ) as HackableServer[];
        ns.printf('hackableServers: %j', hackableServers);
        const unpreparedServers = hackableServers.filter(
            (server) => !isPrepared(server),
        );

        const preparedServers = hackableServers.filter(
            (server) => isPrepared(server)
        );
        const unpreparedServers = hackableServers.filter(
            (server) => !isPrepared(server)
        );

        ns.printf('preparedServers: %j', preparedServers);
        ns.printf('unpreparedServers: %j', unpreparedServers);

        //TODO: Cache these
        const analyzedServers = (
            await Promise.all(
                preparedServers.map((target) => {
                    return findMostEfficentBatch(
                        ns,
                        target,
                        home,
                        availableBatchingRamGB,
                    );
                }),
            )
        ).filter((config) => config !== undefined) as BatchConfig[];
        analyzedServers.sort((a, b) => a.efficency - b.efficency);

        let remainingRamGB = availableBatchingRamGB;
        const pidPromises: Promise<number[]>[] = [];
        for (const config of analyzedServers) {
            if (config.ramCost > remainingRamGB) {
                break;
            }
            const pidPromise = batch(ns, config);
            pidPromises.push(pidPromise);
            remainingRamGB -= config.ramCost;
        }
        let runningScriptPIDs = (await Promise.all(pidPromises)).flat();

        //Wait until all scripts are finished
        while (runningScriptPIDs.length > 0) {
            await ns.asleep(5000);
            runningScriptPIDs = runningScriptPIDs.filter((pid) =>
                ns.isRunning(pid),
            );
        }
        await ns.asleep(500);
    }
}

//Iterates over batch possibilites on a single server
//Returns most efficent batch config available
//Undefined if no batch possible
async function findMostEfficentBatch(
    ns: NS,
    target: HackableServer,
    home: Server,
    availableRam: number,
): Promise<BatchConfig | undefined> {
    const analyzeResults: BatchConfig[] = [];
    const hackThreadsToTakeAll = Math.ceil(
        100.0 / ns.formulas.hacking.hackPercent(target, ns.getPlayer()),
    );
    for (
        let hackThreads = 1;
        hackThreads < hackThreadsToTakeAll;
        hackThreads++
    ) {
        const analyzeResult = await analyzeBatch(
            ns,
            target,
            hackThreads,
            home.cpuCores,
        );
        if (analyzeResult.ramCost > availableRam) {
            ns.printf(
                'Too high ram cost at %d hackThreads. ramCost: %d, availableRam: %d',
                hackThreads,
                analyzeResult.ramCost,
                availableRam,
            );
            break;
        }
        analyzeResults.push(analyzeResult);
    }

    ns.printf('analyzeResults: %j', analyzeResults);
    if (analyzeResults.length === 0) return undefined;
    let minConfig = analyzeResults[0];
    ns.printf('Minconfig: %j', minConfig);
    for (const config of analyzeResults) {
        if (config.efficency < minConfig.efficency) minConfig = config;
    }
    return minConfig;
}

type BatchThreads = {
    hackThreads: number;
    weakenAfterHackThreads: number;
    growThreads: number;
    weakenAfterGrowThreads: number;
};
type BatchTiming = {
    sortedTimings: ScriptTiming[];
    totalTime: number;
};
type BatchConfig = BatchThreads &
    BatchTiming & {
        target: HackableServer;
        ramCost: number;
        efficency: number;
    };
async function analyzeBatch(
    ns: NS,
    target: HackableServer,
    hackThreads: number,
    cores: number,
): Promise<BatchConfig> {
    let server: HackableServer = { ...target };
    const player = ns.getPlayer();

    const hackPercent =
        ns.formulas.hacking.hackPercent(server, player) * hackThreads;
    const moneyTaken = Math.min(
        server.moneyAvailable,
        hackPercent * server.moneyAvailable,
    );
    const hackChance = ns.formulas.hacking.hackChance(server, player);
    const hackTime = ns.formulas.hacking.hackTime(server, player);
    server.moneyAvailable = Math.max(0.0, server.moneyAvailable - moneyTaken);
    server.hackDifficulty =
        server.hackDifficulty + hackThreads * HACK_SECURITY_INCREASE;

    const neededWeakenAfterHack = server.hackDifficulty - server.minDifficulty;
    let weakenAfterHackThreads = Math.ceil(
        (server.hackDifficulty - server.minDifficulty) / 0.05,
    );
    while (
        ns.weakenAnalyze(weakenAfterHackThreads, cores) <= neededWeakenAfterHack
    ) {
        weakenAfterHackThreads += 1;
    }
    while (
        ns.weakenAnalyze(weakenAfterHackThreads - 1, cores) >
        neededWeakenAfterHack
    ) {
        weakenAfterHackThreads -= 1;
    }
    const weakenAfterHackTime = ns.formulas.hacking.weakenTime(server, player);
    server.hackDifficulty = server.minDifficulty;

    const growThreads = ns.formulas.hacking.growThreads(
        server,
        player,
        server.moneyMax,
        cores,
    );
    const growTime = ns.formulas.hacking.growTime(server, player);
    server.hackDifficulty =
        server.hackDifficulty +
        ns.growthAnalyzeSecurity(growThreads, server.hostname, cores);
    server.moneyAvailable = server.moneyMax;

    const neededWeakenAfterGrow = server.hackDifficulty - server.minDifficulty;
    let weakenAfterGrowThreads = Math.ceil(
        (server.hackDifficulty - server.minDifficulty) / 0.05,
    );
    while (
        ns.weakenAnalyze(weakenAfterGrowThreads, cores) <= neededWeakenAfterGrow
    ) {
        weakenAfterGrowThreads += 1;
    }
    while (
        ns.weakenAnalyze(weakenAfterGrowThreads - 1, cores) >
        neededWeakenAfterGrow
    ) {
        weakenAfterGrowThreads -= 1;
    }
    const weakenAfterGrowTime = ns.formulas.hacking.weakenTime(server, player);

    const ramCost =
        hackThreads * ns.getScriptRam(HACK_SCRIPT) +
        weakenAfterHackThreads * ns.getScriptRam(WEAKEN_SCRIPT) +
        growThreads * ns.getScriptRam(GROW_SCRIPT) +
        weakenAfterGrowThreads * ns.getScriptRam(WEAKEN_SCRIPT);
    const batchThreads: BatchThreads = {
        hackThreads,
        weakenAfterHackThreads,
        growThreads,
        weakenAfterGrowThreads,
    };

    ns.printf('batchThreads: %j', batchThreads);
    const { startTimes, totalTime } = calculateUnsortedBatchTimings(
        hackTime,
        weakenAfterHackTime,
        growTime,
        weakenAfterGrowTime,
    );
    const sortedTimings: ScriptTiming[] = [
        {
            scriptPath: HACK_SCRIPT,
            time: startTimes.hackStartTime,
            threads: hackThreads,
        },
        {
            scriptPath: WEAKEN_SCRIPT,
            time: startTimes.weakenAfterHackStartTime,
            threads: weakenAfterHackThreads,
        },
        {
            scriptPath: GROW_SCRIPT,
            time: startTimes.growStartTime,
            threads: growThreads,
        },
        {
            scriptPath: WEAKEN_SCRIPT,
            time: startTimes.weakenAfterGrowStartTime,
            threads: weakenAfterGrowThreads,
        },
    ].sort(timingSort);
    const batchTimings: BatchTiming = {
        sortedTimings,
        totalTime,
    };

    //NOTE: efficency = (money * chance) / ram / time
    const efficency = (moneyTaken * hackChance) / ramCost / totalTime;

    return {
        ...batchThreads,
        ...batchTimings,
        target,
        ramCost,
        efficency,
    };
}

function calculateUnsortedBatchTimings(
    hackTime: number,
    weakenAfterHackTime: number,
    growTime: number,
    weakenAfterGrowTime: number,
): {
    startTimes: {
        hackStartTime: number;
        weakenAfterHackStartTime: number;
        growStartTime: number;
        weakenAfterGrowStartTime: number;
    };
    totalTime: number;
} {
    let [hackFinish, weaken1Finish, growFinish, weaken2Finish] = [
        0,
        SCRIPT_GAP,
        SCRIPT_GAP * 2,
        SCRIPT_GAP * 3,
    ];

    const [hackRawStart, weaken1RawStart, growRawStart, weaken2RawStart] = [
        hackFinish - hackTime,
        weaken1Finish - weakenAfterHackTime,
        growFinish - growTime,
        weaken2Finish - weakenAfterGrowTime,
    ];
    const rawStartTimings = [
        hackRawStart,
        weaken1RawStart,
        growRawStart,
        weaken2RawStart,
    ];
    const min = Math.min(...rawStartTimings);
    const [
        hackStartTime,
        weakenAfterHackStartTime,
        growStartTime,
        weakenAfterGrowStartTime,
    ] = rawStartTimings.map((rawTime) => rawTime - min);
    [hackFinish, weaken1Finish, growFinish, weaken2Finish] = [
        hackRawStart + hackTime,
        weaken1RawStart + weakenAfterHackTime,
        growRawStart + growTime,
        weaken2RawStart + weakenAfterGrowTime,
    ];
    const totalTime = Math.max(
        hackFinish,
        weaken1Finish,
        growFinish,
        weaken2Finish,
    );
    return {
        startTimes: {
            hackStartTime,
            weakenAfterHackStartTime,
            growStartTime,
            weakenAfterGrowStartTime,
        },
        totalTime,
    };
}

async function batch(ns: NS, config: BatchConfig): Promise<number[]> {
    const pids = [];
    for (const timing of config.sortedTimings) {
        await ns.asleep(timing.time);
        const pid = ns.run(
            timing.scriptPath,
            timing.threads,
            config.target.hostname,
        );
        if (pid === 0) {
            ns.tprintf(
                'Could not start %s from %s',
                timing.scriptPath,
                ns.getScriptName(),
            );
            ns.printf(
                'Could not start %s from %s',
                timing.scriptPath,
                ns.getScriptName(),
            );
            ns.printf('%s', JSON.stringify(timing));
        }
        pids.push(pid);
    }
    return pids;
}

async function getAllServers(ns: NS): Promise<Server[]> {
    const servers = await requestGetAllServers(ns);
    ns.tprintf('Back in getAllServers');
    await ns.asleep(500);
    if (!servers) {
        ns.tprintf(
            'ERROR: Request getAllServers for %s failed. Killing script...',
            ns.getScriptName(),
        );
        ns.printf(
            'ERROR: Request getAllServers for %s failed. Killing script...',
            ns.getScriptName(),
        );
        ns.exit();
    }
    return servers;
}
