import { NS } from "@ns";
import { LockRequest } from "locks/interfaces";
import { Lock } from "locks/interfaces";
import { LOCK_REQUEST_PORT } from "constantDefinitions";
import { LOCK_RETURN_PORT } from "constantDefinitions";

let currentRequests: LockRequest[] = [];
let readLocks: Map<string, Lock[]> = new Map<string, Lock[]>;
let writeLocks: Map<string, Lock> = new Map<string, Lock>;

export async function main(ns: NS): Promise<void> {
    while (true) {
        while (ns.peek(LOCK_REQUEST_PORT) !== "NULL PORT DATA") {
            const nextLockRequest: LockRequest = ns.readPort(LOCK_REQUEST_PORT);
            //new requests should always have an undefined value for 'fufilled'
            nextLockRequest.fufilled = undefined;
            currentRequests.push(nextLockRequest);
        }

        await handleRequests(ns);

        if (ns.peek(LOCK_REQUEST_PORT) !== "NULL PORT DATA") await ns.nextPortWrite(1);
    }
}

async function handleRequests(ns: NS) {
    for (let request of currentRequests) {
        const filename = request.filename;
        if (request.lockOrUnlock === 'unlock') {
            await unlock(ns, request);
            continue;
        }
        if (request.lockOrUnlock !== 'lock') {
            //invalid request
            request.denyReason = "lockOrUnlock field invalid, should be 'lock' or 'unlock'";
            request.fufilled = false;
        }
        if (writeLocks.has(filename)) {
            //Write lock already taken
            //Try again later
            continue;
        }
        if (request.lockType === "write") {
            if (readLocks.has(filename)) {
                //Read lock already taken
                //try again later
                continue;
            }
            //Can fufill write lock request
            await grantWriteLock(ns, request);
            continue;
        }
        if (request.lockType === "read") {
            //Can fufill read lock request
            await grantReadLock(ns, request);
        }
        //invalid request
        request.fufilled = false;
    }
    //Remove fufilled/denied entries
    currentRequests = currentRequests.filter((request) => {
        if (request.fufilled === undefined) return true;
        return false;
    });
}

async function grantWriteLock(ns: NS, request: LockRequest) {
    const reqFilename = request.filename;
    const newLock: Lock = {
        requestorPID: request.requestorPID,
        filename: reqFilename,
        lockType: 'write'
    }
    writeLocks.set(reqFilename, newLock);
    const port = LOCK_RETURN_PORT;
    request.fufilled = true;
    while (!ns.tryWritePort(port, request)) {
        ns.tprint("Lock Return port full, check logs");
        ns.sleep(10000);
    };
    return;
}


async function grantReadLock(ns: NS, request: LockRequest) {
    const reqFilename = request.filename;
    const newLock: Lock = {
        requestorPID: request.requestorPID,
        filename: reqFilename,
        lockType: 'write'
    }
    const fileLockArray = readLocks.get(reqFilename);
    if (fileLockArray !== undefined) {
        //filename already has read requests
        fileLockArray.push(newLock);
    }
    else {
        //only read request for file
        let lockArray: Lock[] = [newLock];
        readLocks.set(reqFilename, lockArray);
    }
    const port = LOCK_RETURN_PORT;
    request.fufilled = true;
    while (!ns.tryWritePort(port, request)) {
        ns.tprint("Lock Return port full, check logs");
        ns.sleep(10000);
    };
    return;
}

async function unlock(ns: NS, request: LockRequest) {

    const filename = request.filename;
    const requestor = request.requestorPID;
    const lockType = request.lockType;

    if (lockType !== 'read' && lockType !== 'write') {
        request.denyReason = "LockType field invalid, should be 'write' or 'read'";
        request.fufilled = false;
        return;
    }

    if (lockType === 'write') {
        const lock = writeLocks.get(filename);
        if (lock === undefined) {
            request.denyReason = "No write locks for filename";
            request.fufilled = false;
            return;
        }
        if (lock.requestorPID !== requestor) {
            request.denyReason = "Requestor doesn't have lock";
            request.fufilled = false;
            return;
        }
        writeLocks.delete(filename);
    }

    if (lockType === 'read') {
        const fileLocks = readLocks.get(filename);
        if (fileLocks === undefined) {
            request.denyReason = "File has no locks";
            request.fufilled = false;
            return;
        }
        const lockIndex = fileLocks.findIndex((readLock) => {
            if (readLock.requestorPID === requestor) return true;
            return false;
        });
        if (lockIndex === undefined) {
            request.denyReason = "Requestor doesn't have lock";
            request.fufilled = false;
            return;
        }
        fileLocks.splice(lockIndex, 1);
        if (fileLocks.length === 0) readLocks.delete(filename);
    }

    const port = LOCK_RETURN_PORT;
    request.fufilled = true;
    while (!ns.tryWritePort(port, request)) {
        ns.tprint("Lock Return port full, check logs");
        ns.sleep(10000);
    };
    return;

}
