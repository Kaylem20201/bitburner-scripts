export interface LockRequest {
    lockOrUnlock: string,
    requestorPID: number,
    filename: string,
    lockType: string,
    fufilled?: boolean,
    denyReason?: string
}

export interface Lock {
    requestorPID: number,
    lockType: string,
    filename: string
}
