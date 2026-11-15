import {videoId as parseVideoId} from './youtube-id.js';
import Innertube, { Platform } from 'youtubei.js/web';
import { BotGuardClient, getChallenge } from 'bgutils-js/botguard';
import { WebPoMinter } from 'bgutils-js/webpo';
import { buildURL, getHeaders } from 'bgutils-js/utils';
const LIMIT=24*1024*1024;
let tracePlayback=()=>{};
const directUnavailable=new Set();
Platform.shim.eval = async data => new Function(data.output)();
async function relay(input,init={}){
 const incoming=input instanceof Request?input:null;
 const target=new URL(incoming?incoming.url:String(input),'https://www.youtube.com');
 const method=init.method||incoming?.method||'GET';
 const headers=new Headers(init.headers||incoming?.headers||{});
 for(const [real,alias] of [['user-agent','x-upstream-user-agent'],['origin','x-upstream-origin'],['referer','x-upstream-referer']]){
  const value=headers.get(real);if(value){headers.delete(real);headers.set(alias,value);}
 }
 if(!headers.has('x-upstream-user-agent'))headers.set('x-upstream-user-agent',navigator.userAgent);
 headers.delete('cookie');headers.delete('authorization');
 const body=method==='GET'||method==='HEAD'?undefined:(init.body??(incoming?await incoming.clone().arrayBuffer():undefined));
 let direct=null;
 if(target.hostname==='jnn-pa.googleapis.com')direct=new URL(target);
 if(target.pathname.startsWith('/api/jnn/v1/'))direct=new URL('https://jnn-pa.googleapis.com/$rpc/google.internal.waa.v1.Waa/'+target.pathname.split('/').pop());
 if(target.pathname.startsWith('/youtubei/v1/')){direct=new URL(target);direct.hostname='youtubei.googleapis.com';}
 if(target.hostname.endsWith('.googlevideo.com'))direct=new URL(target);
 if(!direct)direct=new URL(target);
 const safe=new Headers(headers);for(const key of [...safe.keys()])if(key.startsWith('x-upstream-'))safe.delete(key);
 try{const response=await fetch(direct,{method,headers:safe,body,credentials:'omit',signal:AbortSignal.timeout(30000)});if(!response.ok)throw new Error('YouTube refused this request');return response;}
 catch(e){throw new Error('YouTube could not release the recording to this browser.');}
}
let minterPromise,minterExpires=0;
async function getMinter(){
 if(minterPromise&&Date.now()<minterExpires)return minterPromise;
 minterExpires=Date.now()+600000;
 minterPromise=(async()=>{
  const key='O43z0dpjhgX20SCx4KAo';
  const challenge=await getChallenge({fetchFunction:relay,requestKey:key});
  let script=challenge.interpreterJavascript?.privateDoNotAccessOrElseSafeScriptWrappedValue;
  if(!script&&challenge.interpreterUrl){
   const url=challenge.interpreterUrl.privateDoNotAccessOrElseTrustedResourceUrlWrappedValue;
   script=await (await relay(url.startsWith('//')?'https:'+url:url)).text();
  }
  if(!script)throw new Error('YouTube playback verification could not start.');
  new Function(script)();
  const guard=await BotGuardClient.create({program:challenge.program,globalName:challenge.globalName,globalObject:globalThis});
  const output=[];
  const answer=await guard.snapshot({webPoSignalOutput:output});
  const response=await relay(buildURL('GenerateIT',true),{method:'POST',headers:getHeaders(),body:JSON.stringify([key,answer])});
  if(!response.ok)throw new Error('YouTube playback verification was refused.');
  const [integrityToken,estimatedTtlSecs,mintRefreshThreshold,websafeFallbackToken]=await response.json();
  minterExpires=Date.now()+Math.max(30,Math.min(21600,estimatedTtlSecs||600))*800;
  return WebPoMinter.create({integrityToken,estimatedTtlSecs,mintRefreshThreshold,websafeFallbackToken},output);
 })();
 try{return await minterPromise;}catch(e){minterPromise=null;throw e;}
}
async function downloadAudio(info,yt,client,token,onStatus,onTrace){
 const duration=info.basic_info.duration||0;
 if(duration>600||info.basic_info.is_live)throw new Error('Choose a video under 10 minutes.');
 const format=info.chooseFormat({type:'audio',format:'mp4',quality:'bestefficiency'});
 if((format.content_length||0)>LIMIT)throw new Error('This recording is too large.');
 if(!yt.session.player&&!format.url)throw new Error('This playback format needs verification.');
 if(yt.session.player)yt.session.player.po_token=client==='VISIONOS'?undefined:token;
 onStatus('Loading '+info.basic_info.title+'…');onTrace({stage:'browser-audio-start',length:format.content_length});
 const source=await info.download({type:'audio',format:'mp4',quality:'bestefficiency'});
 const reader=source.getReader();const chunks=[];let received=0;
 for(;;){
  const {done,value}=await reader.read();if(done)break;
  received+=value.byteLength;if(received>LIMIT){await reader.cancel();throw new Error('Recording exceeds the size limit.');}chunks.push(value);
  onStatus('Loading '+info.basic_info.title+'… '+(format.content_length?Math.min(100,Math.round(received/format.content_length*100))+'%':Math.round(received/1024)+' KB'));
 }
 if(received<512)throw new Error('YouTube returned an empty recording.');
 const blob=new Blob(chunks,{type:'audio/mp4'});onTrace({stage:'browser-audio-complete',bytes:blob.size,expected:format.content_length});
 return {blob,title:info.basic_info.title||'YouTube song',duration};
}
export async function getAudio(link,onStatus=()=>{},onTrace=()=>{}){
 tracePlayback=onTrace;
 const id=parseVideoId(link);
 onStatus('Preparing YouTube playback…');onTrace({stage:'browser-init'});
 const phone=true;
 // Native clients run first on the iPhone. If unavailable, verify anonymous web
 // playback on the same phone connection before reporting a blocked video.
 for(const native of (phone?[true,false]:[false])){
  let contentToken;
  try{
   if(!native){const minter=await getMinter();contentToken=await minter.mintAsWebsafeString(id);onTrace({stage:'browser-verified'});}
   const yt=await Innertube.create({fetch:relay,generate_session_locally:native,user_agent:navigator.userAgent,retrieve_innertube_config:!native,retrieve_player:!native});
   onTrace({stage:'browser-player-ready'});
   for(const client of (native?['VISIONOS','IOS']:['YTMUSIC','WEB_EMBEDDED','VISIONOS','WEB'])){
    try{
     const info=await yt.getBasicInfo(id,{client});
     onTrace({stage:'browser-info',client,status:info.playability_status?.status,formats:info.streaming_data?.adaptive_formats?.length||0});
     if(!info.streaming_data?.adaptive_formats?.some(f=>f.has_audio))continue;
     return await downloadAudio(info,yt,client,contentToken,onStatus,onTrace);
    }catch(e){onTrace({stage:'browser-info-error',client,error:e.message});if(/under 10 minutes|too large|size limit/.test(e.message))throw e;}
   }
  }catch(e){if(/under 10 minutes|too large|size limit/.test(e.message))throw e;onTrace({stage:'playback-method-error',error:e.message});}
 }
 throw new Error('YouTube did not release the audio for this video.');
}
