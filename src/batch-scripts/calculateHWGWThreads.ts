import { NS } from '@ns';
import { Server } from '@ns';
import { HWGWThreads } from './interfaces';
import {
    BATCH_CALCULATIONS_PORT,
    WEAKEN_THREADS_PER_HACK_THREAD,
} from 'constantDefinitions';
import { WEAKEN_THREADS_PER_GROW_THREAD } from 'constantDefinitions';

export async function main(ns: NS): Promise<void> {
    const args = ns.args;
    const requestorPID = args[0];

    interface ReturnObject {
        requestorPID: number;
        fufilled: boolean;
        HWGWThreads: undefined | HWGWThreads;
    }

    if (typeof requestorPID !== 'number') return;
    const serverRaw = args[1];
    if (typeof serverRaw !== 'string') return;
    const hackPercent = args[2];
    if (typeof hackPercent !== 'number') return;
    const cores = args[3];
    if (typeof cores === 'boolean' || typeof cores === 'string') return;

    const returnObject: ReturnObject = {
        requestorPID,
        fufilled: false,
        HWGWThreads: undefined,
    };

    const server: Server = JSON.parse(serverRaw);

    const threads = calculateHWGWThreads(ns, server, hackPercent, cores);

    if (threads !== undefined) {
        returnObject.fufilled = true;
        returnObject.HWGWThreads = threads;
    }

    while (!ns.tryWritePort(BATCH_CALCULATIONS_PORT, returnObject))
        ns.sleep(200);
}

function calculateHWGWThreads(
    ns: NS,
    nsServer: Server,
    hackPercent: number = 1.0,
    cores: number = 1,
): HWGWThreads | undefined {
    const player = ns.getPlayer();
    const maxMoney = nsServer.moneyMax;
    if (maxMoney === undefined) return undefined;

    const hackThreads = Math.ceil(
        hackPercent / ns.formulas.hacking.hackPercent(nsServer, player),
    );
    const weakenToCounterHackThreads = Math.ceil(
        WEAKEN_THREADS_PER_HACK_THREAD * hackThreads,
    );

    const moneyPerHackThread =
        ns.formulas.hacking.hackPercent(nsServer, player) * maxMoney;
    const moneyDrained = moneyPerHackThread * hackThreads;
    const uncappedServer: Server = JSON.parse(JSON.stringify(nsServer));
    uncappedServer.moneyMax = Infinity;
    const growThreads = Math.ceil(
        ns.formulas.hacking.growThreads(
            uncappedServer,
            player,
            maxMoney + moneyDrained,
            cores,
        ),
    );
    const weakenToCounterGrowThreads = Math.ceil(
        WEAKEN_THREADS_PER_GROW_THREAD * growThreads,
    );

    return {
        hackThreads,
        weakenCounteringHackThreads: weakenToCounterHackThreads,
        growThreads,
        weakenCounteringGrowThreads: weakenToCounterGrowThreads,
    };
}
