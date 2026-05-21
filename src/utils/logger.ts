import fs from "fs";
import path from "path";

const logFile = path.join(process.cwd(), "crawler.log");

// Eski logları temizle (istersen sil, append olur)
// fs.writeFileSync(logFile, "");

export const logger = {
    info: (message: string, ...args: any[]) => {
        const line = `[INFO] ${new Date().toISOString()} - ${message} ${args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' ')}`;
        console.log(line);
        fs.appendFileSync(logFile, line + '\n');
    },
    error: (message: string, ...args: any[]) => {
        const line = `[ERROR] ${new Date().toISOString()} - ${message} ${args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' ')}`;
        console.error(line);
        fs.appendFileSync(logFile, line + '\n');
    },
    warn: (message: string, ...args: any[]) => {
        const line = `[WARN] ${new Date().toISOString()} - ${message} ${args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' ')}`;
        console.warn(line);
        fs.appendFileSync(logFile, line + '\n');
    },
};