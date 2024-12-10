const fs = require('fs');
const path = require('path');

const platform = process.platform;
if (platform === 'darwin') {
    const libPath = path.join(__dirname, '../lib');
    const binaryPath = path.join(__dirname, '../binary');
    
    // Remove the Linux .so file
    const linuxLib = path.join(libPath, 'libxgboost.so');
    if (fs.existsSync(linuxLib)) {
        fs.unlinkSync(linuxLib);
    }
    
    // Copy the Mac .dylib file to lib folder
    const macSource = path.join(binaryPath, 'libxgboost.dylib');
    const macDest = path.join(libPath, 'libxgboost.dylib');
    fs.copyFileSync(macSource, macDest);
}