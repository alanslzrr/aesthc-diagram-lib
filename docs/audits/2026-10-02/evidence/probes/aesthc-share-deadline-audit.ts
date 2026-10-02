import { decodeShareDocument } from '/Users/alansalazar/development-projects/personal-proyects/aesthc-diagram-lib/src/persistence/share.ts'
async function main(){const actual=globalThis.DecompressionStream;let canceled=false;class StalledDecompressor{readable=new ReadableStream({cancel(){canceled=true}});writable=new WritableStream({write(){},close(){}})}
;(globalThis as any).DecompressionStream=StalledDecompressor
try{console.log('share read deadline',await Promise.race([decodeShareDocument('d=zAAAA',{timeoutMs:5}),new Promise(r=>setTimeout(()=>r('TIMEOUT: unsettled after 80ms'),80))]),'reader canceled',canceled)}finally{globalThis.DecompressionStream=actual}}
main()
