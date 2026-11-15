// Experimental, keyless public-video retrieval. No account, cookies or API keys.
import {videoId} from './youtube-id.js';
const MAX=24*1024*1024;
const clients=[
 {clientName:'VISIONOS',clientVersion:'1.02',deviceMake:'Apple',deviceModel:'RealityDevice17,1',osName:'visionOS',osVersion:'26.5.23O471'},
 {clientName:'IOS',clientVersion:'20.11.6',deviceMake:'Apple',deviceModel:'iPhone10,4',osName:'iOS',osVersion:'16.7.7.20H330'}
];
async function readAudio(response,format,onStatus,signal){
 const expected=Number(format.contentLength)||Number(response.headers.get('content-length'))||0;
 if(expected>MAX)throw new Error('This recording is too large.');
 const reader=response.body.getReader(),chunks=[];let size=0;
 try{
  for(;;){
   if(signal.aborted)throw new Error('YouTube took too long to respond.');
   const {done,value}=await reader.read();if(done)break;
   size+=value.byteLength;if(size>MAX)throw new Error('This recording is too large.');chunks.push(value);
   onStatus('Loading recording… '+(expected?Math.min(100,Math.round(size/expected*100))+'%':Math.round(size/1024)+' KB'));
  }
 }catch(e){await reader.cancel().catch(()=>{});throw e;}
 if(size<512||(expected&&size!==expected))throw new Error('YouTube returned an incomplete recording.');
 return new Blob(chunks,{type:'audio/mp4'});
}
export async function getAudio(link,onStatus=()=>{},fetcher=fetch){
 const id=videoId(link),controller=new AbortController();const deadline=setTimeout(()=>controller.abort(),40000);
 try{
  onStatus('Requesting the YouTube recording…');
  for(const client of clients){
   if(controller.signal.aborted)break;
   try{
    const response=await fetcher('https://youtubei.googleapis.com/youtubei/v1/player?prettyPrint=false',{
     method:'POST',credentials:'omit',signal:controller.signal,headers:{'Content-Type':'application/json'},
     body:JSON.stringify({videoId:id,context:{client:{...client,hl:'en',gl:'US'}},contentCheckOk:true,racyCheckOk:true})
    });
    if(!response.ok)continue;
    const data=await response.json();if(data.playabilityStatus?.status!=='OK')continue;
    const duration=Number(data.videoDetails?.lengthSeconds)||0;
    if(duration>600||data.videoDetails?.isLiveContent)throw new Error('Choose a video under 10 minutes.');
    const formats=(data.streamingData?.adaptiveFormats||[]).filter(f=>f.url&&/^audio\/mp4/.test(f.mimeType||''));
    formats.sort((a,b)=>(a.bitrate||0)-(b.bitrate||0));
    for(const format of formats){
     const media=new URL(format.url);
     if(media.protocol!=='https:'||media.username||media.password||(media.port&&media.port!=='443')||!media.hostname.endsWith('.googlevideo.com')||media.pathname!=='/videoplayback')continue;
     if(Number(format.contentLength)>MAX)throw new Error('This recording is too large.');
     const audio=await fetcher(media.href,{credentials:'omit',signal:controller.signal});
     if(!audio.ok||!audio.headers.get('content-type')?.startsWith('audio/'))continue;
     const blob=await readAudio(audio,format,onStatus,controller.signal);
     return {blob,title:data.videoDetails?.title||'YouTube song',duration};
    }
   }catch(e){if(/under 10 minutes|too large|incomplete/.test(e.message))throw e;}
  }
  throw new Error(controller.signal.aborted?'YouTube took too long to respond.':'YouTube did not release this recording to the browser.');
 }finally{clearTimeout(deadline);}
}
