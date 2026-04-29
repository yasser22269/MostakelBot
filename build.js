import esbuild from 'esbuild';
import inlineWorkerPlugin from 'esbuild-plugin-inline-worker';
import path from 'path';

const entryPoints = [
  'scripts/prepare_booking_info.js',
  'scripts/socket_listen.js', 
  'scripts/prepare_access_token.js',
  'scripts/prepare_hold_token.js',
  'src/utils/FirstLaunch.js',
  'src/bot/worker.js',
  'src/bot/hold_token_worker.js',
  'scripts/release.js'
];

const workers = [];

function bundleFile(filePath, outputAsIs = false, outputFolder = 'bundled/') {
  const fileName = path.basename(filePath);
  const outfile = outputFolder + (outputAsIs ? fileName.split('.')[0] + '.cjs' : fileName);
  
  esbuild.build({
    entryPoints: [filePath],
    bundle: true,
    outfile: outfile,
    format: 'cjs', // Output CommonJS format
    platform: 'node',
    plugins: [inlineWorkerPlugin({ platform: 'node' })],
    external: ['yargs'] ,
  }).catch(() => process.exit(1));
  
  console.log(`Bundled: ${filePath}`);
}

entryPoints.forEach(filePath => {
  bundleFile(filePath);
  bundleFile(filePath, false, 'bundled copy/');
});

workers.forEach(filePath => {
  bundleFile(filePath, true);
  bundleFile(filePath, false, 'bundled copy/');
});
