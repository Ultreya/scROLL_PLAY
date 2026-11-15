import test from 'node:test';
import assert from 'node:assert/strict';
import {getAudio} from './youtube.js';
const link='https://www.youtube.com/watch?v=ImKY6TZEyrI';
test('retrieves supplied playable audio without keys or account credentials',async()=>{
 let requests=0;
 const fetcher=async(url,options)=>{
  requests++;assert.equal(options.credentials,'omit');assert.ok(!String(url).includes('key='));assert.ok(!JSON.stringify(options.headers||{}).toLowerCase().includes('authorization'));
  if(String(url).includes('youtubei.googleapis.com'))return Response.json({playabilityStatus:{status:'OK'},videoDetails:{title:'Test piece',lengthSeconds:'12'},streamingData:{adaptiveFormats:[{mimeType:'audio/mp4',bitrate:48000,contentLength:'1000',url:'https://r1.googlevideo.com/videoplayback?id=test'}]}});
  return new Response(new Uint8Array(1000),{headers:{'content-type':'audio/mp4'}});
 };
 const audio=await getAudio(link,()=>{},fetcher);assert.equal(audio.title,'Test piece');assert.equal(audio.blob.size,1000);assert.equal(requests,2);
});
test('reports a blocked video rather than returning invented notes',async()=>{
 await assert.rejects(getAudio(link,()=>{},async()=>Response.json({playabilityStatus:{status:'LOGIN_REQUIRED'}})),/did not release/);
});
test('rejects unsupported links before sending requests',async()=>{
 let sent=false;await assert.rejects(getAudio('https://evil.example/video',()=>{},async()=>{sent=true;}),/YouTube/);assert.equal(sent,false);
});
