import { existsSync, unlinkSync, copyFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const platform = process.platform;
if (platform === 'darwin') {
    const libPath = join(__dirname, '../lib');
    const binaryPath = join(__dirname, '../binary');
    
    // Remove the Linux .so file
    const linuxLib = join(libPath, 'libxgboost.so');
    if (existsSync(linuxLib)) {
        unlinkSync(linuxLib);
    }
    
    // Copy the Mac .dylib file to lib folder
    const macSource = join(binaryPath, 'libxgboost.dylib');
    const macDest = join(libPath, 'libxgboost.dylib');
    copyFileSync(macSource, macDest);
}