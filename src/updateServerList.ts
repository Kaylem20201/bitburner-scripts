import { NS } from "@ns";
import { SERVER_LIST } from "./constantDefinitions";

// Flags:
// -t {hostname} : Only update the target server.
export async function main(ns: NS): Promise<void> {

    const targetArgIndex = ns.args.indexOf("-t");
    if (targetArgIndex != -1) {
        const targetHostname = ns.args[targetArgIndex + 1];
        updateTargetServer(targetHostname);
    }

}

/**
 * returns a list of all server names
 * @param {NS} ns - ns namespace
 */
function getAllServers(ns: NS) {
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
