export async function main(ns: NS): Promise<void> {

    if (!ns.hasRootAccess(server)) {
        const cracks = getListOfCracks();
        const portsNeeded = ns.getServerNumPortsRequired(server);
        if (cracks.length < portsNeeded) {
            continue;
        }
        //Nuke the server
        const res = await crackAndNukeServer(ns, cracks, server, portsNeeded);
        if (!res) ns.exit();
        ns.print("Access granted on ", server);
    }

}
