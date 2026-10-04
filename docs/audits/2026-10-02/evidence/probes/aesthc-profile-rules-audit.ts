import { createDocument } from '/Users/alansalazar/development-projects/personal-proyects/aesthc-diagram-lib/src/editor-core/document.ts'
import { validateDeploymentProfile } from '/Users/alansalazar/development-projects/personal-proyects/aesthc-diagram-lib/src/editor-core/profiles.ts'
const made=createDocument({type:'graph',caption:'Regions',legend:{main:'Main',branch:'Branch'},nodes:[{id:'a',label:'A',description:''},{id:'b',label:'B',description:''}],edges:[{id:'ab',from:'a',to:'b'}]},{id:'audit',locale:'en'});if(!made.ok)throw Error('fixture'); const d=made.value;
d.metadata.engineeringProfile='deployment-ownership';d.metadata.nodes={a:{roles:[],tags:[],owner:'Team A'},b:{roles:[],tags:[],owner:'Team B'}}
d.scene.groups=[{id:'region-a',kind:'region',label:'Europe',nodeIds:['a'],locked:false},{id:'region-b',kind:'region',label:'America',nodeIds:['b'],locked:false}]
console.log('authored profile default',validateDeploymentProfile(d));console.log('cross-region without crossing',validateDeploymentProfile(d,{enabled:true}));d.metadata.nodes.a={roles:['external'],tags:[]};console.log('external owner',validateDeploymentProfile(d,{enabled:true}));
