import { NS } from "@ns";
import { Lock } from "locks/interfaces";
import { LockRequest } from "locks/interfaces";
import { LOCK_REQUEST_PORT } from "constantDefinitions";
import { LOCK_RETURN_PORT } from "constantDefinitions";

export async function getReadLock(ns: NS, pid: number, filename: string): Promise<Lock | undefined> {
    const newLockRequest: LockRequest = {
        requestorPID: pid,
        filename: filename,
        lockOrUnlock: 'lock',
        lockType: 'read'
    }
    while (!ns.tryWritePort(LOCK_REQUEST_PORT, newLockRequest)) { await ns.sleep(200); }
    while (true) {
        const portData: LockRequest | string = ns.peek(LOCK_RETURN_PORT);

        //Check if its our request
        if (portData === "NULL PORT DATA" || typeof (portData) === 'string') {
            await ns.sleep(200);
            continue;
        }
        if (portData.filename !== filename
            || portData.requestorPID !== pid
            || portData.lockType !== 'read') {
            await ns.sleep(200);
            continue;
        }

        ns.readPort(LOCK_RETURN_PORT);

        if (portData.fufilled === false) {
            ns.tprint(portData.denyReason);
            ns.print(portData.denyReason);
            return undefined;
        }

        const newLock: Lock = {
            requestorPID: pid,
            filename: filename,
            lockType: 'read'
        };
        return newLock;

    }
}

export async function getWriteLock(ns: NS, pid: number, filename: string): Promise<Lock | undefined> {

    const newLockRequest: LockRequest = {
        requestorPID: pid,
        filename: filename,
        lockOrUnlock: 'lock',
        lockType: 'write'
    }
    while (!ns.tryWritePort(LOCK_REQUEST_PORT, newLockRequest)) { await ns.sleep(200); }
    while (true) {
        const portData: LockRequest | string = ns.peek(LOCK_RETURN_PORT);

        //Check if its our request
        if (portData === "NULL PORT DATA" || typeof (portData) === 'string') {
            await ns.sleep(200);
            continue;
        }
        if (portData.filename !== filename
            || portData.requestorPID !== pid
            || portData.lockType !== 'read') {
            await ns.sleep(200);
            continue;
        }

        ns.readPort(LOCK_RETURN_PORT);

        if (portData.fufilled === false) {
            ns.tprint(portData.denyReason);
            ns.print(portData.denyReason);
            return undefined;
        }

        const newLock: Lock = {
            requestorPID: pid,
            filename: filename,
            lockType: 'write'
        };
        return newLock;

    }

}

export async function unlock(ns: NS, lock: Lock): Promise<boolean> {
    const filename = lock.filename;
    const pid = lock.requestorPID;
    const lockType = lock.lockType;
    const newUnlockRequest: LockRequest = {
        lockOrUnlock: 'unlock',
        requestorPID: pid,
        filename: filename,
        lockType: lockType
    };
    while (!ns.tryWritePort(LOCK_REQUEST_PORT, newUnlockRequest)) { await ns.sleep(200); }
    while (true) {
        const portData: LockRequest | string = ns.peek(LOCK_RETURN_PORT);

        //Check if its our request
        if (portData === "NULL PORT DATA" || typeof (portData) === 'string') {
            await ns.sleep(200);
            continue;
        }
        if (portData.filename !== filename
            || portData.requestorPID !== pid
            || portData.lockType !== lockType) {
            await ns.sleep(200);
            continue;
        }

        ns.readPort(LOCK_RETURN_PORT);

        if (portData.fufilled === false) {
            ns.tprint(portData.denyReason);
            ns.print(portData.denyReason);
            return false;
        }

        return true;

    }
}
