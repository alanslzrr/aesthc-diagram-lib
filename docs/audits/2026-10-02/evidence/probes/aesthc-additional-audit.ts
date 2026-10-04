import { createDocument } from '/Users/alansalazar/development-projects/personal-proyects/aesthc-diagram-lib/src/editor-core/document.ts'
import { validateDeploymentProfile } from '/Users/alansalazar/development-projects/personal-proyects/aesthc-diagram-lib/src/editor-core/profiles.ts'
import { exportDocument } from '/Users/alansalazar/development-projects/personal-proyects/aesthc-diagram-lib/src/export/index.ts'
import { createLocalStorageAdapter } from '/Users/alansalazar/development-projects/personal-proyects/aesthc-diagram-lib/src/persistence/index.ts'
async function main(){
const made=createDocument({type:'graph',caption:'Profile',legend:{main:'Main',branch:'Branch'},nodes:[{id:'a',label:'A',description:''}],edges:[]},{id:'audit',locale:'en'});if(!made.ok)throw Error('fixture');const doc=made.value;doc.metadata.engineeringProfile='deployment-ownership'
const profile=validateDeploymentProfile(doc,{enabled:true}); const artifact=await exportDocument(doc,{format:'svg',scope:{type:'document'},theme:'light',quality:'publish',background:'theme',scale:1,includeSource:false,metadata:'minimal',fontPolicy:'fallback'})
console.log('profile violations',profile.ok&&profile.value.diagnostics.map(d=>d.code),'publish succeeds',artifact.ok,artifact.diagnostics.map(d=>d.code))
const records=new Map([['adl-document-v1:audit:good',JSON.stringify({schemaVersion:1,token:'goodtoken',document:doc})],['adl-document-v1:audit:%zz','bad']]);
;(globalThis as any).window={localStorage:{get length(){return records.size},key:(i:number)=>[...records.keys()][i],getItem:(key:string)=>records.get(key)??null}}
const adapter=createLocalStorageAdapter('audit');console.log('list with corrupt key',await adapter.list());records.delete('adl-document-v1:audit:%zz');console.log('list without corrupt key',await adapter.list())
}
main()
