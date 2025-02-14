import { NS, Server } from '@ns';
import {
    BATCH_MANAGER,
    CRACK_MANAGER,
    MANAGER_SERVER,
    PORTS,
} from './constantDefinitions';
import {
    APIRequest,
    APIResponse,
    isAPIRequest,
    RequestType,
} from './utils/managerAPI';

export async function main(ns: NS): Promise<void> {
    ns.tprintf('INFO Main manager started.');
    ns.clearPort(PORTS.MANAGER_API_REQUEST_PORT);
    ns.clearPort(PORTS.MANAGER_API_RESPONSE_PORT);
    while (true) {
        //Maintain management scripts
        // startCracker(ns);
        startBatcher(ns);

        //Respond to info requests
        const requests = await getRequests(ns);
        const promises: Promise<void>[] = requests.map((request) =>
            handleRequest(ns, request),
        );
        await Promise.all(promises);

        await ns.asleep(1000);
    }
}

async function startCracker(ns: NS): Promise<void> {
    if (!ns.scriptRunning(CRACK_MANAGER, MANAGER_SERVER)) {
        ns.tprintf('INFO Starting cracker...');
        const pid = ns.run(CRACK_MANAGER);
        if (pid === 0) {
            ns.tprintf('ERROR Could not start cracker.');
        }
        ns.tprintf('INFO Cracker running at pid %d', pid);
    }
}

async function startBatcher(ns: NS): Promise<void> {
    if (!ns.scriptRunning(BATCH_MANAGER, MANAGER_SERVER)) {
        ns.tprintf('INFO Starting batcher...');
        const pid = ns.run(BATCH_MANAGER);
        if (pid === 0) {
            ns.tprintf('ERROR Could not start batcher.');
        }
        ns.tprintf('INFO Batcher running at pid %d', pid);
    }
}

async function getRequests(ns: NS): Promise<APIRequest[]> {
    const portNum = PORTS.MANAGER_API_REQUEST_PORT;
    const requests: APIRequest[] = [];
    let data = ns.readPort(portNum);
    while (data !== 'NULL PORT DATA') {
        let req: APIRequest | unknown = JSON.parse(data);
        if (!isAPIRequest(req)) {
            ns.tprintf(
                'ERROR malformed request in manager api: %s',
                JSON.stringify(req),
            );
            ns.printf(
                'ERROR malformed request in manager api: %s',
                JSON.stringify(req),
            );
            await ns.asleep(500);
            continue;
        }
        requests.push(req);
        data = ns.readPort(portNum);
        await ns.asleep(500);
    }
    return requests;
}

async function handleRequest(ns: NS, request: APIRequest): Promise<void> {
    ns.printf('INFO Handling request: %s', JSON.stringify(request));
    const requestType = request.request;
    let result;
    switch (requestType) {
        case RequestType.getServer:
            result = await getServer(ns, request);
            break;
        case RequestType.getAllServers:
            result = await getAllServers(ns);
            break;
        default:
            ns.tprintf("We shouldn't be here");
            await ns.asleep(1000);
            ns.exit();
    }
    const response: APIResponse = {
        requesterPID: request.requesterPID,
        request: request.request,
        data: result,
    };
    await sendResponse(ns, response);
}

async function sendResponse(ns: NS, response: APIResponse): Promise<void> {
    while (true) {
        const res = ns.tryWritePort(
            PORTS.MANAGER_API_RESPONSE_PORT,
            JSON.stringify(response),
        );
        if (res) {
            break;
        }
        ns.tprint('WARN: Manager response port appears full.');
        ns.print('WARN: Manager response port appears full.');
        await ns.asleep(500);
    }
    ns.printf('Response sent.');
}

async function getServer(
    ns: NS,
    request: APIRequest,
): Promise<Server | undefined> {
    if (!request.args || typeof request.args[0] !== 'string') {
        ns.tprintf(
            'ERROR Invalid getServer request from %d',
            request.requesterPID,
        );
        ns.printf(
            'ERROR Invalid getServer request from %d',
            request.requesterPID,
        );
        ns.printf('%s', JSON.stringify(request));
        return;
    }

    return ns.getServer(request.args[0]);
}

async function getAllServers(ns: NS): Promise<Server[]> {
    let untraversedHostnames: Set<string> = new Set(['home']);
    const traversedHostnames: Set<string> = new Set();
    while (untraversedHostnames.size > 0) {
        let foundHostnames: Set<string> = new Set();
        for (const hostname of untraversedHostnames) {
            ns.scan().forEach((newHostname) => {
                if (!traversedHostnames.has(newHostname))
                    foundHostnames.add(newHostname);
            });
            traversedHostnames.add(hostname);
        }
        untraversedHostnames = foundHostnames;
        await ns.asleep(500);
    }
    const servers: Server[] = [];
    for (const hostname of traversedHostnames) {
        const res = ns.getServer(hostname);
        servers.push(res);
    }
    return servers;
}
