import { readFileSync } from 'node:fs'
import { exportStoryWebm } from '/Users/alansalazar/development-projects/personal-proyects/aesthc-diagram-lib/src/export/motion.ts'
import { validateDocument } from '/Users/alansalazar/development-projects/personal-proyects/aesthc-diagram-lib/src/editor-core/validation.ts'
const f=JSON.parse(readFileSync('/Users/alansalazar/development-projects/personal-proyects/aesthc-diagram-lib/tests/fixtures/editor/graph-document.json','utf8'))
f.views=[{id:'v',label:'View',focus:{nodeIds:['a'],edgeIds:[]}}];f.story=[{id:'step',viewId:'v',durationMs:1000}]
let stopped=0,allocated:any
class FakeCanvas {width=0;height=0;getContext(){return {font:'',measureText:()=>({width:12})}};captureStream(){return {getTracks:()=>[{readyState:'live',stop(){stopped++}}]}}}
Object.assign(globalThis,{HTMLCanvasElement:FakeCanvas,window:{document:{createElement(){allocated=new FakeCanvas();return allocated}}}})
async function main(){
console.log('valid',validateDocument(f).ok)
class ConstructorFail {static isTypeSupported(){return true};constructor(){throw new Error('codec failed')}}
;(globalThis as any).MediaRecorder=ConstructorFail
try{console.log('constructor result',await exportStoryWebm(f))}catch(e){console.log('constructor threw',(e as Error).message,'tracks stopped',stopped,'canvas remains',allocated.width,allocated.height)}
class StartFail {static isTypeSupported(){return true};state='inactive';start(){throw new Error('start failed')};stop(){throw new Error('already inactive')}}
;(globalThis as any).MediaRecorder=StartFail;stopped=0
console.log('start result',await Promise.race([exportStoryWebm(f),new Promise(r=>setTimeout(()=>r('TIMEOUT unresolved after 100ms'),100))]),'tracks stopped',stopped,'canvas remains',allocated.width,allocated.height)
}
main()
