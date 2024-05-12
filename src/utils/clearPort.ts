import { NS } from "@ns";

export async function main(ns: NS) {
    let port = ns.args[0];
    if (typeof port !== 'number') {
        ns.tprint("Invalid args");
        ns.exit();
    }
    let portHandle = ns.getPortHandle(port);
    portHandle.clear();
}
