let crawlLock: Promise<void> = Promise.resolve();
let isRunning = false;

export function isLocked(): boolean {
    return isRunning;
}

export async function acquireLock(fn: () => Promise<void>): Promise<void> {
    if (isRunning) {
        throw new Error("Crawler zaten çalişiyor");
    }

    crawlLock = crawlLock.then(async () => {
        isRunning = true;
        try {
            await fn();
        } finally {
            isRunning = false;
        }
    });

    await crawlLock;
}