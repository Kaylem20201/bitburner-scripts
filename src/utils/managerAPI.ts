import { NS, Server } from '@ns';
import { PORTS } from '/constantDefinitions';

export enum RequestType {
    'getServer',
    'getAllServers',
}

export type APIRequest = {
    request: RequestType;
    requesterPID: number;
    args?: [string | number];
};
export function isAPIRequest(o: unknown): o is APIRequest {
    if (typeof o !== 'object' || o === null) return false;
    return 'request' in o && 'requesterPID' in o;
}

export type APIResponse = {
    request: RequestType;
    requesterPID: number;
    error?: string;
    data?: object;
};
export function isAPIResponse(o: unknown): o is APIResponse {
    if (typeof o !== 'object' || o === null) return false;
    return 'error' in o || 'data' in o;
}

export async function requestGetServer(
    ns: NS,
    target: string,
): Promise<Server | undefined> {
    const request: APIRequest = {
        request: RequestType.getServer,
        requesterPID: ns.pid,
        args: [target],
    };
    const response = await sendRequest(ns, request);
    if (response.error) {
        await errorOnResponse(ns, response);
        return;
    }
    return response.data as Server;
}

//TODO: Rework API to make sure response/requests are consistent
export async function requestGetAllServers(
    ns: NS,
): Promise<Server[] | undefined> {
    const request: APIRequest = {
        request: RequestType.getAllServers,
        requesterPID: ns.pid,
    };
    const response = await sendRequest(ns, request);
    if (response.error) {
        await errorOnResponse(ns, response);
        return;
    }
    const servers: Server[] = response.data as Server[];
    return response.data as Server[];
}

async function sendRequest(ns: NS, request: APIRequest): Promise<APIResponse> {
    ns.printf('Sending request for %s...', request.request);
    let res = ns.tryWritePort(PORTS.MANAGER_API_REQUEST_PORT, JSON.stringify(request));
    while (!res) {
        ns.tprint('WARN: Manager requests port appears full.');
        ns.print('WARN: Manager requests port appears full.');
        await ns.asleep(500);
        res = ns.tryWritePort(PORTS.MANAGER_API_REQUEST_PORT, JSON.stringify(request));
    }
    ns.printf('Request sent.');
    let response: APIResponse | undefined = undefined;
    while (response === undefined) {
        response = await checkPortResponse(ns, request);
        await ns.asleep(500);
    }
    return response;
}

async function checkPortResponse(ns: NS, request: APIRequest): Promise<APIResponse | undefined> {
    const data: string | unknown = ns.peek(PORTS.MANAGER_API_RESPONSE_PORT);
    if (typeof data !== 'string') {
        ns.tprintf('ERROR Malformed data on port %d', PORTS.MANAGER_API_RESPONSE_PORT);
        ns.exit();
    }
    if (data === 'NULL PORT DATA') { return undefined; }
    const response: APIResponse | unknown = JSON.parse(data);
    if (!isAPIResponse(response) || response.requesterPID !== request.requesterPID || response.request !== request.request) {
        ns.printf("DEBUG response did not match");
        ns.printf("DEBUG %s", JSON.stringify(response));
        return undefined;
    }
    return response;
}

async function errorOnResponse(ns: NS, response: APIResponse): Promise<void> {
    const errorFString = "ERROR: Received 'error' on %s request for %d";
    const errorFArgs = [response.request, response.requesterPID];
    ns.tprintf(errorFString, errorFArgs);
    ns.tprintf('ERROR: %s', response.error);
    ns.printf(errorFString, errorFArgs);
    ns.printf('ERROR: %s', response.error);
}
