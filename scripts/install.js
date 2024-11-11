import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';
import https from 'https';
import extract from 'extract-zip';
import { fileURLToPath, pathToFileURL } from 'url';
import readline from 'readline';
import { dirname } from 'path';
import { promisify } from 'util';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const XGBOOST_VERSION = '1.7.5';
const platform = os.platform();
const depsDir = path.join(__dirname, '../deps');
const buildDir = path.join(__dirname, '../build');

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});
const question = promisify(rl.question).bind(rl);

// Check if CMake is installed
async function checkCMake() {
  try {
    await runCommand('cmake', ['--version']);
    console.log('CMake is already installed, skipping download.');
    return true;
  } catch (err) {
    console.log('CMake not found, proceeding with download...');
    return false;
  }
}

// Download and install CMake if not present
async function installCMake() {
  const isWindows = platform === 'win32';
  const toolsDir = path.join(__dirname, '../tools');
  const cmakeDir = path.join(toolsDir, 'cmake');
  
  try {
    const cmakePath = path.join(cmakeDir, 'bin', isWindows ? 'cmake.exe' : 'cmake');
    if (fs.existsSync(cmakePath)) {
      console.log('Using previously downloaded CMake.');
      const pathSeparator = isWindows ? ';' : ':';
      process.env.PATH = `${path.join(cmakeDir, 'bin')}${pathSeparator}${process.env.PATH}`;
      return;
    }
  } catch (err) {
    // If check fails, proceed with download
  }

  fs.mkdirSync(toolsDir, { recursive: true });

  const cmakeUrl = getCMakeDownloadUrl();
  console.log(`Downloading CMake from ${cmakeUrl}...`);
  const extension = isWindows ? '.zip' : '.tar.gz';
  const cmakeArchive = path.join(toolsDir, `cmake${extension}`);

  await downloadFile(cmakeUrl, cmakeArchive);

  console.log('Extracting CMake...');
  if (isWindows) {
    await extract(cmakeArchive, { dir: toolsDir });
    const extractedDir = path.join(toolsDir, 'cmake-3.23.2-windows-x86_64');
    if (fs.existsSync(cmakeDir)) {
      fs.rmSync(cmakeDir, { recursive: true, force: true });
    }
    fs.renameSync(extractedDir, cmakeDir);
  } else {
    await runCommand('tar', ['xzf', cmakeArchive, '-C', toolsDir]);
    const extractedDir = path.join(toolsDir, 'cmake-3.23.2-linux-x86_64');
    if (fs.existsSync(cmakeDir)) {
      fs.rmSync(cmakeDir, { recursive: true, force: true });
    }
    fs.renameSync(extractedDir, cmakeDir);
  }

  fs.unlinkSync(cmakeArchive);

  const pathSeparator = isWindows ? ';' : ':';
  process.env.PATH = `${path.join(cmakeDir, 'bin')}${pathSeparator}${process.env.PATH}`;
  
  console.log('CMake installed and added to PATH.');
}

// Determine the CMake download URL based on the platform
function getCMakeDownloadUrl() {
  if (platform === 'win32') {
    return 'https://cmake.org/files/v3.23/cmake-3.23.2-windows-x86_64.zip';
  } else if (platform === 'darwin') {
    return 'https://cmake.org/files/v3.23/cmake-3.23.2-macos-universal.tar.gz';
  } else {
    return 'https://cmake.org/files/v3.23/cmake-3.23.2-linux-x86_64.tar.gz';
  }
}

// Download a file
async function downloadFile(url, dest) {
  const stream = fs.createWriteStream(dest);
  await new Promise((resolve, reject) => {
    https.get(url, (response) => {
      response.pipe(stream);
      stream.on('finish', resolve);
      stream.on('error', reject);
    });
  });
}

// Run a command and return a promise
function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, {
      stdio: 'inherit',
      ...options
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command "${command}" failed with code ${code}`));
      }
    });

    proc.on('error', (err) => {
      reject(err);
    });
  });
}

async function buildXGBoost(xgboostDir) {
  const isWindows = platform === 'win32';
  const finalBuildPath = path.join(buildDir, 'lib');

  if (isWindows) {
    console.log('Building XGBoost for Windows...');
    const buildPath = path.join(xgboostDir, 'build');
    
    // Create build directory
    fs.mkdirSync(buildPath, { recursive: true });
    
    // Run cmake with Visual Studio generator
    await runCommand('cmake', [
      '..',
      '-G', 'Visual Studio 16 2019',
      '-A', 'x64',
      '-DCMAKE_CONFIGURATION_TYPES=Release',
      '-DBUILD_SHARED_LIBS=ON',
      '-DUSE_CUDA=OFF'
    ], { cwd: buildPath });
    
    // Build with MSBuild
    await runCommand('cmake', [
      '--build', '.',
      '--config', 'Release'
    ], { cwd: buildPath });

    // Copy the built library
    fs.mkdirSync(finalBuildPath, { recursive: true });
    const libraryName = 'xgboost.dll';
    const sourcePath = path.join(buildPath, 'lib', 'Release', libraryName);
    const destPath = path.join(finalBuildPath, libraryName);
    fs.copyFileSync(sourcePath, destPath);
    console.log(`Library copied to: ${destPath}`);
  } else {
    // Simple Linux/Unix build process
    console.log('Building XGBoost for Linux/Unix...');
    const buildPath = path.join(xgboostDir, 'build');
    
    // Create build directory
    fs.mkdirSync(buildPath, { recursive: true });
    
    // Run cmake
    await runCommand('cmake', ['..'], { cwd: buildPath });
    
    // Run make with all available cores
    await runCommand('make', ['-j$(nproc)'], { cwd: buildPath });

    // Copy the built library
    fs.mkdirSync(finalBuildPath, { recursive: true });
    const libraryName = 'libxgboost.so';
    const sourcePath = path.join(buildPath, 'lib', libraryName);
    const destPath = path.join(finalBuildPath, libraryName);
    fs.copyFileSync(sourcePath, destPath);
    console.log(`Library copied to: ${destPath}`);
  }
}

async function installXGBoost() {
  console.log('Installing XGBoost...');
  const xgboostDir = path.join(depsDir, `xgboost-${XGBOOST_VERSION}`);
  let shouldDownload = true;

  // First ensure CMake is available
  const hasCMake = await checkCMake();
  if (!hasCMake) {
    await installCMake();
  }

  // Check if XGBoost directory exists
  if (fs.existsSync(xgboostDir)) {
    const answer = await question(
      'Existing XGBoost installation detected. What would you like to do?\n' +
      '1) Clean and rebuild (recommended if previous build failed)\n' +
      '2) Continue with existing build\n' +
      '3) Cancel installation\n' +
      'Enter your choice (1-3): '
    );

    switch (answer.trim()) {
      case '1':
        console.log('Cleaning up existing XGBoost directory...');
        try {
          if (platform === 'win32') {
            await runCommand('cmd', ['/c', 'rmdir', '/s', '/q', xgboostDir]);
          } else {
            await fs.promises.rm(xgboostDir, { recursive: true, force: true });
          }
          await new Promise(resolve => setTimeout(resolve, 1000));
          shouldDownload = true;  // Make sure we download after cleaning
        } catch (err) {
          console.log('Failed to clean directory:', err);
          rl.close();
          process.exit(1);
        }
        break;
      case '2':
        console.log('Continuing with existing build...');
        shouldDownload = false;
        break;
      case '3':
        console.log('Installation cancelled.');
        rl.close();
        process.exit(0);
        break;
      default:
        console.log('Invalid choice. Installation cancelled.');
        rl.close();
        process.exit(1);
    }
  }

  try {
    // Create build directory if it doesn't exist
    if (!fs.existsSync(buildDir)) {
      fs.mkdirSync(buildDir, { recursive: true });
    }

    // Only download if needed
    if (shouldDownload) {
      console.log('Downloading XGBoost...');
      await runCommand('git', [
        'clone',
        '--recursive',
        '--branch',
        `v${XGBOOST_VERSION}`,
        'https://github.com/dmlc/xgboost.git',
        xgboostDir
      ]);
    }

    console.log('Starting XGBoost build process...');  // Added for debugging
    await buildXGBoost(xgboostDir);  // Make sure this is being called
    console.log('XGBoost installation completed successfully!');

  } catch (error) {
    console.error('Error during XGBoost installation:', error);
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Update the main execution block
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  installXGBoost().catch(error => {
    console.error('Failed to install XGBoost:', error);
    process.exit(1);
  });
}

export default installXGBoost;
