import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('Copying binary file...');
const sourcePath = path.join(__dirname, '..', 'build', 'Release', 'xgboost_binding.node');
const targetPath = path.join(__dirname, '..', 'lib', 'xgboost_binding.node');

try {
    fs.copyFileSync(sourcePath, targetPath);
    console.log('Binary copied successfully');
} catch (error) {
    console.error('Error copying binary:', error);
    process.exit(1);
}