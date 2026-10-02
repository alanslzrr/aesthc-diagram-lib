import { readFileSync } from 'node:fs'
import { exportDocumentHtml } from '/Users/alansalazar/development-projects/personal-proyects/aesthc-diagram-lib/src/export/html.ts'
const d=JSON.parse(readFileSync('/Users/alansalazar/development-projects/personal-proyects/aesthc-diagram-lib/tests/fixtures/editor/graph-document.json','utf8'))
const r=exportDocumentHtml(d,{runtime:'',css:'',fonts:{sans:new Uint8Array([1]),mono:new Uint8Array([2])},theme:'dark'}); if(r.ok){const data=JSON.parse(r.value.html.match(/id="aesthc-document">(.*?)<\/script>/s)![1]);console.log('fallback',r.value.html.match(/id="aesthc-fallback" data-theme="([^"]+)"/)![1],'hydrated document theme',data.presentation.theme.mode)}
