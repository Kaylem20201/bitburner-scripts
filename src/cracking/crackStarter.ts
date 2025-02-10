import { NS, Server } from '@ns';
import { TargetServer } from 'cracking/interfaces';
import { TargetServerTable } from 'cracking/interfaces';
import { TARGET_SERVER_LIST as TARGET_SERVER_LIST } from '/constantDefinitions';
import { getWriteLock, unlock } from '/locks/locks';
import { SpawnOptions } from '@ns';

export async function main(ns: NS): Promise<void> {
    await createTargetServerFile(ns);

    let options: SpawnOptions = {
        preventDuplicates: true,
        spawnDelay: 100,
    };
    ns.spawn('cracking/crackManager.js', options);
}

async function createTargetServerFile(ns: NS) {
    const hostnames: string[] = getAllHostnames(ns);
    ns.print(hostnames);

    const serverTable: TargetServerTable = { servers: [] };
    for (let hostname of hostnames) {
        if (hostname === 'home') continue;
        let nsServerInfo = ns.getServer(hostname);
        if (nsServerInfo.purchasedByPlayer) continue;
        let newServerEntry = generateTargetServerEntry(ns, nsServerInfo);
        serverTable.servers.push(newServerEntry);
    }

    const pid = ns.pid;
    const lock = await getWriteLock(ns, pid, TARGET_SERVER_LIST);
    if (lock === undefined) ns.exit();
    ns.write(TARGET_SERVER_LIST, JSON.stringify(serverTable), 'w');
    const unlockSuccess = await unlock(ns, lock);
    if (unlockSuccess === undefined) ns.exit();
}

/**
 * returns a list of all server names
 * @param {NS} ns - ns namespace
 */
function getAllHostnames(ns: NS) {
    const servers = ['home'];
    servers.push(...ns.scan('home'));
    ns.print(servers);
    for (let i = 1; i < servers.length; i++) {
        const newServers = ns.scan(servers[i]);
        for (let j = 0; j < newServers.length; j++) {
            if (!servers.includes(newServers[j])) {
                servers.push(newServers[j]);
            }
        }
    }
    return servers;
}

function generateTargetServerEntry(ns: NS, nsServer: Server): TargetServer {
    const hostname = nsServer.hostname;
    const isCracked = nsServer.hasAdminRights;
    const isBackdoored = nsServer.backdoorInstalled;
    const isPreparedForBatch = checkIfPrepared(ns, nsServer);
    let reqPorts = nsServer.numOpenPortsRequired;
    if (reqPorts === undefined) reqPorts = 5;
    let reqHackingLevel = nsServer.requiredHackingSkill;
    if (reqHackingLevel === undefined) reqHackingLevel = 1;
    let maxMoney = nsServer.moneyMax;
    if (maxMoney === undefined) maxMoney = 0;

    let newServerEntry: TargetServer = {
        hostname,
        isCracked,
        isBackdoored,
        isPreparedForBatch,
        reqPorts,
        reqHackingLevel,
        maxMoney,
    };
    return newServerEntry;
}

function checkIfPrepared(ns: NS, nsServer: Server) {
    const maxMoney = nsServer.moneyMax;
    if (maxMoney === undefined) return false;
    const currentMoney = nsServer.moneyAvailable;
    if (currentMoney === undefined) return false;
    const minSecurity = nsServer.minDifficulty;
    if (minSecurity === undefined) return false;
    const currentSecurity = nsServer.hackDifficulty;
    if (currentSecurity === undefined) return false;
    if (currentMoney < maxMoney) return false;
    if (currentSecurity > minSecurity) return false;
    return true;
}
