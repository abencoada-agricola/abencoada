import {spawnSync,execFileSync} from 'node:child_process';
import {existsSync,mkdirSync,readFileSync,writeFileSync,chmodSync} from 'node:fs';
import {homedir} from 'node:os';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
process.chdir(root);
const envDir=join(homedir(),'.local','share','abastece','graphify-venv');
const python=join(envDir,process.platform==='win32'?'Scripts/python.exe':'bin/python');
const binary=process.env.GRAPHIFY_BIN||join(envDir,process.platform==='win32'?'Scripts/graphify.exe':'bin/graphify');
const [action='status',...args]=process.argv.slice(2);
function run(command,parameters,options={}){
 const result=spawnSync(command,parameters,{cwd:root,stdio:'inherit',...options});
 if(result.error)throw result.error;
 if(result.status!==0)throw Error(`${command} exited with ${result.status}`);
 return result;
}
function graph(parameters,options={}){return run(binary,parameters,options)}
function installHook(){
 const hook=resolve(root,execFileSync('git',['rev-parse','--git-path','hooks/post-commit'],{encoding:'utf8'}).trim());
 const marker='# Abastece architecture map';
 if(existsSync(hook)&&!readFileSync(hook,'utf8').includes(marker))throw Error('An existing post-commit hook was preserved. Chain the update command manually.');
 mkdirSync(dirname(hook),{recursive:true});
 writeFileSync(hook,`#!/bin/sh\n${marker}\nif ! node scripts/project-graph.mjs update > "$(git rev-parse --git-path graphify-update.log)" 2>&1; then\n  printf '%s\\n' 'Graphify update failed. Run node scripts/project-graph.mjs update and inspect .git/graphify-update.log.' >&2\nfi\n`);
 chmodSync(hook,0o755);console.log('Local post-commit update installed.');
}
try{
 if(action==='setup'){
  if(!existsSync(python))run(process.env.GRAPHIFY_SETUP_PYTHON||'python3',['-m','venv',envDir]);
  run(python,['-m','pip','install','-r','tools/graphify-requirements.txt']);
  graph(['--version']);installHook();
 }else if(action==='install-hook')installHook();
 else if(action==='update'||action==='rebuild'){
  mkdirSync('graphify-out',{recursive:true});
  const started=new Date().toISOString();
  if(action==='rebuild'||!existsSync('graphify-out/graph.json')){
   // These switches prevent semantic/API processing and external model labeling.
   graph(['extract','.', '--code-only','--no-cluster','--max-workers','2']);
   graph(['cluster-only','.', '--no-label']);
  }else graph(['update','.']); // Deterministic AST-only incremental update.
  const data=JSON.parse(readFileSync('graphify-out/graph.json','utf8'));
  const version=spawnSync(binary,['--version'],{encoding:'utf8'}).stdout?.trim();
  const commit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
  writeFileSync('graphify-out/BUILD.json',JSON.stringify({version,commit,started,finished:new Date().toISOString(),mode:'local-ast-only',nodes:data.nodes.length,edges:(data.links||data.edges||[]).length},null,2)+'\n');
  const health=graph(['diagnose','multigraph','--max-examples','2'],{stdio:'pipe',encoding:'utf8'});
  writeFileSync('graphify-out/HEALTH.txt',health.stdout);console.log(health.stdout);
 }else if(action==='status'){
  if(!existsSync('graphify-out/BUILD.json'))throw Error('No map yet. Run node scripts/project-graph.mjs setup, then update.');
  console.log(readFileSync('graphify-out/BUILD.json','utf8'));
 }else if(action==='health')graph(['diagnose','multigraph',...args]);
 else if(['query','path','explain','affected','god-nodes','save-result','reflect'].includes(action))graph([action,...args]);
 else throw Error('Use setup, install-hook, update, rebuild, status, health, query, path, explain or affected.');
}catch(error){console.error(error.message);process.exitCode=1}
