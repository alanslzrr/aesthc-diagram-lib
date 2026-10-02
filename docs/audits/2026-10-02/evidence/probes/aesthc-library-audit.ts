import { readFileSync, writeFileSync } from 'node:fs'
import { validateDocument } from '/Users/alansalazar/development-projects/personal-proyects/aesthc-diagram-lib/src/editor-core/validation.ts'
import { exportDocument } from '/Users/alansalazar/development-projects/personal-proyects/aesthc-diagram-lib/src/export/index.ts'
import { exportDocumentHtml } from '/Users/alansalazar/development-projects/personal-proyects/aesthc-diagram-lib/src/export/html.ts'
import { cardSvg } from '/Users/alansalazar/development-projects/personal-proyects/aesthc-diagram-lib/src/export/cards.ts'
import { createRendererRegistry } from '/Users/alansalazar/development-projects/personal-proyects/aesthc-diagram-lib/src/editor-core/renderers.ts'
const root='/Users/alansalazar/development-projects/personal-proyects/aesthc-diagram-lib'
const fixture=JSON.parse(readFileSync(root+'/tests/fixtures/editor/graph-document.json','utf8'))
async function main(){
const d=structuredClone(fixture)
d.metadata.edges['ab-primary']={roles:[],tags:[],notes:'PRIVATE_EDGE_NOTE'}
d.metadata.nodes.a={roles:[],tags:[],notes:'PRIVATE_NODE_NOTE',links:[{label:'Internal only',href:'https://example.com/private'}]}
d.extensions={'com.example.audit':{secret:'PRIVATE_EXTENSION'}}
console.log('private valid',validateDocument(d).ok)
const html=exportDocumentHtml(d,{runtime:readFileSync(root+'/dist/standalone/viewer.js','utf8'),css:readFileSync(root+'/dist/viewer.css','utf8'),fonts:{sans:new Uint8Array(readFileSync(root+'/src/assets/fonts/geist-sans.woff2')),mono:new Uint8Array(readFileSync(root+'/src/assets/fonts/geist-mono.woff2'))},includeSource:false})
if(html.ok)writeFileSync('/tmp/aesthc-minimal-export-audit.html',html.value.html)
console.log('HTML no-source result',html.ok,html.ok&&Object.fromEntries(['PRIVATE_EDGE_NOTE','PRIVATE_NODE_NOTE','PRIVATE_EXTENSION','https://example.com/private'].map(s=>[s,html.value.html.includes(s)])),html.ok&&html.value.receipt)
const custom=structuredClone(fixture)
custom.spec.nodes[0].renderer={typeKey:'audit',data:{}}
const renderers=createRendererRegistry()
renderers.register({typeKey:'audit',validate:data=>({ok:true,value:data,diagnostics:[]}),measure:()=>({width:120,height:64}),renderSvg:(_,ctx)=>`<rect data-audit-theme="${ctx.theme}" x="${ctx.x}" y="${ctx.y}" width="120" height="64" fill="${ctx.palette.card}"/>`})
const svg=await exportDocument(custom,{format:'svg',scope:{type:'document'},theme:'dark',quality:'edit',background:'theme',scale:1,includeSource:false,metadata:'minimal',fontPolicy:'fallback',renderers})
console.log('custom dark export',svg.ok,svg.ok&&new TextDecoder().decode(svg.value.bytes).match(/data-audit-theme="[^"]*"/g))
for(const padding of [NaN,Infinity,400,-1]){const r=cardSvg(fixture,{padding});console.log('card padding',padding,'ok',r.ok,r.ok&&r.value.svg.match(/translate\([^)]*\) scale\([^)]*\)/)?.[0])}
}
main()
