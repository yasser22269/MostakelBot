import esbuild from 'esbuild';
import inlineWorkerPlugin from 'esbuild-plugin-inline-worker';

const entryPoints = ['prepare_booking_info.js','socketListen.js', 'prepare_access_token.js','prepare_hold_token.js','FirstLaunch.js','worker.js','hold_token_worker.js','release.js']

const workers = []
// const workers = ['worker.js','hold_token_worker.js']

function bundleFile(fileName,outputAsIs = false,outputFolder = 'bundled/') {
let outfileSuffix = 'bundled.cjs';
  
esbuild.build({
  entryPoints: [fileName],
  bundle: true,
  outfile: outputFolder + (outputAsIs?fileName.split('.')[0] + '.cjs': fileName),
  format: 'cjs' , // Output CommonJS format
  platform: 'node',
  plugins: [inlineWorkerPlugin({ platform: 'node' })],
  external: ['yargs'] ,
}).catch(() => process.exit(1));
  console.log(`Bundled: ${fileName}`);
}

entryPoints.forEach(fileName => {
  bundleFile(fileName);
  bundleFile(fileName,false,'bundled copy/');

})
workers.forEach(fileName => {
  bundleFile(fileName,true);
  bundleFile(fileName,false,'bundled copy/');

})
