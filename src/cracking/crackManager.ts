import { NS, Server } from '@ns';
import { requestGetAllServers } from '/utils/managerAPI';

export async function main(ns: NS): Promise<void> {
    const servers = await requestGetAllServers(ns);
    if (!servers) {
        ns.tprintf(
            'ERROR: getAllServers request failed from %s. Killing script.',
            ns.getScriptName(),
        );
        ns.printf('ERROR: getAllServers request failed. Killing script.');
        ns.exit();
    }

    const cache = {
        hackingLevel: ns.getHackingLevel(),
        cracks: getListOfCracks(ns)
    };
    //Main loop
    while (true) {

        const hackingLevel = ns.getHackingLevel();
        const cracks = getListOfCracks(ns);
        if ((hackingLevel === cache.hackingLevel) && (cracks === cache.cracks)) {
            await ns.asleep(60000);
            continue;
        }

        //Check for servers that are crackable and not yet cracked
        const crackable_servers = [];
        const cracked_servers = [];
        for (const server of servers) {
            if (server.hasAdminRights) {
                cracked_servers.push(server);
                continue;
            }
            if (
                (server.requiredHackingSkill ??
                    Number.POSITIVE_INFINITY > ns.getHackingLevel()) ||
                (server.numOpenPortsRequired ??
                    Number.POSITIVE_INFINITY > cracks.length)
            )
                continue;

            crackable_servers.push(server);
        }
        //TODO: Determine when every hackable server has been hacked
        //TODO: Backdoor cracked servers when appropriate

        for (const server of crackable_servers) {
            crackAndNukeServer(ns, cracks, server);
        }

        await ns.asleep(1000);
    }
}

async function crackAndNukeServer(
    ns: NS,
    cracks: string[],
    server: Server,
): Promise<boolean> {
    const [target, portNum] = [server.hostname, server.numOpenPortsRequired];
    if (!portNum) {
        ns.tprint('ERROR: Tried to crack server with undefined numPorts.');
        ns.print('ERROR: Tried to crack server with undefined numPorts.');
        ns.printf('%s', JSON.stringify(server));
        return false;
    }
    for (let i = 0; i < portNum; i++) {
        const crack = cracks.pop();
        switch (crack) {
            case 'FTPCrack.exe':
                ns.ftpcrack(target);
                break;
            case 'HTTPWorm.exe':
                ns.httpworm(target);
                break;
            case 'BruteSSH.exe':
                ns.brutessh(target);
                break;
            case 'relaySMTP.exe':
                ns.relaysmtp(target);
                break;
            case 'SQLInject.exe':
                ns.sqlinject(target);
                break;
            default:
                ns.tprint(
                    'ERROR : Failure in crackManager, crackAndNukeServer()',
                );
                ns.print(
                    'ERROR : Failure in crackManager, crackAndNukeServer()',
                );
                ns.printf('%s', JSON.stringify(server));
                return false;
        }
    }
    ns.nuke(target);
    if (ns.hasRootAccess(target)) return true;
    else {
        ns.tprint('ERROR : Failure in crackManager, crackAndNukeServer()');
        ns.print('ERROR : Failure in crackManager, crackAndNukeServer()');
        ns.printf('%s', JSON.stringify(server));
        return false;
    }
}

/**
 * Checks files on 'home' to create a list of currently available cracks
 * @returns Array containing strings of the available cracks
 */
function getListOfCracks(ns: NS) {
    const cracksFull = [
        'FTPCrack.exe',
        'HTTPWorm.exe',
        'BruteSSH.exe',
        'relaySMTP.exe',
        'SQLInject.exe',
    ];
    const cracks = ns.ls('home').filter((filename) => {
        return cracksFull.includes(filename);
    });
    return cracks;
}
