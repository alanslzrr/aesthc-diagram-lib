import fs from 'node:fs';
import { createEditorStore, createDocument, validateDocument, serializeDocument } from '/Users/alansalazar/development-projects/personal-proyects/aesthc-diagram-lib/src/editor-core/index.ts';
const base = JSON.parse(fs.readFileSync('/Users/alansalazar/development-projects/personal-proyects/aesthc-diagram-lib/tests/fixtures/editor/graph-document.json','utf8'));
function make(document = structuredClone(base), edit = true) { return createEditorStore({ document, permissions: {edit, save:true, export:true} }); }
function dispatch(s:any, commands:any[]) {return s.dispatch({id:'audit',label:'Audit',expectedRevision:s.getSnapshot().document.revision,commands});}
for (const mode of ['scene-locked-move','scene-unlock','json-locked-move','json-locked-label','json-change-type','command-foreign-id','preview-invalid-presentation','preview-invalid-metadata','readonly-control']) {
 const s = make();
 let result:any;
 if (mode.startsWith('scene-') || mode.startsWith('json-locked')) {
  dispatch(s,[{type:'nodes.set-lock',ids:['a'],locked:true}]);
  const d = structuredClone(s.getSnapshot().document);
  if(mode==='scene-unlock') d.scene.nodes.a.locked=false;
  else if(mode==='json-locked-label') d.spec.nodes.find((n:any)=>n.id==='a').label='Changed despite lock';
  else d.scene.nodes.a.x=999;
  if(mode.startsWith('scene-')) result=dispatch(s,[{type:'scene.set',scene:d.scene}]);
  else {s.setTextDraft(JSON.stringify(d));result=s.commitTextDraft();}
 } else if(mode==='json-change-type') {
  const d=createDocument({type:'timeline',caption:'New type',legend:{main:'M',branch:'B'},events:[{id:'new-event',label:'Event',description:''}]},{id:base.id,locale:'en'});
  if(!d.ok)throw Error(JSON.stringify(d));
  s.setTextDraft(serializeDocument(d.value));result=s.commitTextDraft();
 } else if(mode==='command-foreign-id') {
  const d=structuredClone(base);d.id='foreign-document';d.spec.caption='Foreign payload';
  result=dispatch(s,[{type:'document.replace-content',document:d}]);
 } else if(mode.startsWith('preview-')) {
  s.beginGesture({id:'g',label:'Preview',expectedRevision:0});
  s.previewGesture([{type:'nodes.move',positions:{a:{x:10,y:20}}}],{skipValidation:true});
  const prev=s.getSnapshot().draft;
  if(mode==='preview-invalid-presentation') {const p=structuredClone(base.presentation);p.textScale=NaN;result=s.previewGesture([{type:'presentation.set',presentation:p}],{skipValidation:true});}
  else {const m=structuredClone(base.metadata);m.nodes.a={roles:[],tags:[],links:[{label:'Unsafe',href:'javascript:alert(1)'}]};result=s.previewGesture([{type:'metadata.set',metadata:m}],{skipValidation:true});}
  const d=s.getSnapshot().draft;
  console.log(JSON.stringify({mode,accepted:result.ok,retainsLastValidPreview:d===prev,draftValidation:d.kind==='gesture'?validateDocument(d.preview):null},(_k,v)=>typeof v==='number'&&!Number.isFinite(v)?String(v):v));
  continue;
 } else if(mode==='readonly-control') {s.setPermissions({edit:false,save:true,export:true});result=dispatch(s,[{type:'nodes.move',positions:{a:{x:999,y:0}}}]);}
 console.log(JSON.stringify({mode,status:result.status,diagnostics:result.diagnostics,revision:s.getSnapshot().document.revision,id:s.getSnapshot().document.id,type:s.getSnapshot().document.spec.type,placement:s.getSnapshot().document.scene.nodes.a,label:s.getSnapshot().document.spec.type==='graph'?s.getSnapshot().document.spec.nodes.find((n:any)=>n.id==='a')?.label:null,valid:validateDocument(s.getSnapshot().document).ok}));
}
