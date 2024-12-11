import { spawnSync } from 'child_process';
import os from 'os';

const platform = os.platform();

if (platform !== 'linux') {
    console.log('Non-Linux platform detected, rebuilding native module...');
    const result = spawnSync('npx', ['node-gyp', 'rebuild'], { 
        stdio: 'inherit',
        shell: true 
    });
    
    if (result.error || result.status !== 0) {
        console.error('Failed to rebuild native module');
        process.exit(1);
    }

    // Copy the binary after rebuild
    const copyResult = spawnSync('node', ['./scripts/CopyBinary.js'], {
        stdio: 'inherit',
        shell: true
    });
    
    if (copyResult.error || copyResult.status !== 0) {
        console.error('Failed to copy binary');
        process.exit(1);
    }
} else {
    console.log('Linux platform detected, using pre-built binary');
}