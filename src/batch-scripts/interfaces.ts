export interface HWGWThreads {
    hackThreads: number,
    weaken1Threads: number,
    growThreads: number,
    weaken2Threads: number
}

export interface HWGWTimings {
    startTimes : {time : number, type : string}[],
    finishTimes : {time : number, type : string}[]
}