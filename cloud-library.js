/* Optional private account storage. No service/admin key may be placed in browser code. */
(function(root){
 'use strict';
 function create(config,fetcher,storage){
  if(!config||!config.enabled)return null;
  var url=new URL(config.url);if(url.protocol!=='https:'||!(/^[a-z0-9-]+\.supabase\.co$/.test(url.hostname)||/^c--[a-f0-9-]{36}-prod\.lovable\.cloud$/.test(url.hostname))||url.username||url.password||url.port)throw new Error('Invalid private-library service address.');
  var publishable=/^sb_publishable_[A-Za-z0-9_-]+$/.test(config.publishableKey||'');
  if(!publishable){try{publishable=JSON.parse(atob(config.publishableKey.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))).role==='anon';}catch(e){}}
  if(!publishable)throw new Error('A public publishable key is required. Never use a secret or administrator key.');
  var base=url.origin,key=config.publishableKey,session=null,refreshing=null,storeKey='scrollPlay.privateAccount';
  fetcher=fetcher||fetch;storage=storage||localStorage;
  try{session=JSON.parse(storage.getItem(storeKey)||'null');}catch(e){}
  function persist(value){session=value;if(value)storage.setItem(storeKey,JSON.stringify(value));else storage.removeItem(storeKey);}
  async function request(path,method,body,auth,extra){
   var headers={'apikey':key},payload=body;if(auth){await ensure();if(!session)throw new Error('Sign in to open your private library.');headers.Authorization='Bearer '+session.access_token;}
   if(body&&!(typeof Blob!=='undefined'&&body instanceof Blob)){headers['Content-Type']='application/json';payload=JSON.stringify(body);}Object.assign(headers,extra||{});
   var r=await fetcher(base+path,{method:method||'GET',headers:headers,body:payload,credentials:'omit'});
   if(!r.ok){var error;try{error=await r.json();}catch(e){}throw new Error(error?.msg||error?.message||error?.error_description||'The private library could not be reached.');}
   if(r.status===204)return null;var type=r.headers.get('content-type')||'';return type.includes('application/json')?r.json():r.blob();
  }
  async function ensure(){
   if(!session)return;if((session.expires_at||0)>Date.now()/1000+30)return;
   if(!refreshing)refreshing=request('/auth/v1/token?grant_type=refresh_token','POST',{refresh_token:session.refresh_token},false).then(function(s){persist({...s,expires_at:s.expires_at||Date.now()/1000+s.expires_in});}).catch(function(e){persist(null);throw e;}).finally(function(){refreshing=null;});await refreshing;
  }
  function id(value){if(typeof value!=='string'||!/^[A-Za-z0-9_-]{1,160}$/.test(value))throw new Error('Invalid song identifier.');return encodeURIComponent(value);}
  function record(row){return {id:row.id,name:row.name,artist:row.artist,genre:row.genre,era:row.era,decade:row.decade,source:row.source,sharedId:row.shared_id,o:row.hand_split,sc:row.score?1:0,playedAt:row.played_at,t:Date.parse(row.updated_at)||0,n:row.notes,notesCount:row.note_count,remote:true,originalPath:row.original_path,originalType:row.original_type};}
  var api={
   cloud:true,
   configured:true,
   user:function(){return session?.user||null;},
   verify:async function(){await ensure();if(!session)return null;try{var user=await request('/auth/v1/user','GET',null,true);session.user=user;persist(session);return user;}catch(e){persist(null);return null;}},
   signIn:async function(email,password){var s=await request('/auth/v1/token?grant_type=password','POST',{email:email,password:password},false);persist({...s,expires_at:s.expires_at||Date.now()/1000+s.expires_in});return s.user;},
   signUp:async function(email,password){var s=await request('/auth/v1/signup?redirect_to='+encodeURIComponent('https://ultreya.github.io/scROLL_PLAY/'),'POST',{email:email,password:password},false);if(s.access_token)persist({...s,expires_at:s.expires_at||Date.now()/1000+s.expires_in});return {confirmed:!!s.access_token};},
   signOut:async function(){try{if(session)await request('/auth/v1/logout','POST',null,true);}catch(e){/* Always clear the local session, including when offline. */}finally{persist(null);}},
   list:async function(){var rows=await request('/rest/v1/scroll_songs?select=id,name,artist,genre,era,decade,note_count,hand_split,score,source,shared_id,played_at,original_path,original_type,updated_at&order=updated_at.desc','GET',null,true);return rows.map(record);},
   get:async function(songId){var rows=await request('/rest/v1/scroll_songs?id=eq.'+id(songId)+'&select=*','GET',null,true);if(rows.length!==1)throw new Error('That song is not in your account.');return record(rows[0]);},
   put:async function(song){if(!root.SongLibrary.valid(song))throw new Error('Invalid song data');await ensure();if(!session?.user?.id)throw new Error('Sign in first.');return request('/rest/v1/scroll_songs?on_conflict=user_id,id','POST',{user_id:session.user.id,id:song.id,name:song.name,artist:song.artist||'',genre:song.genre||'Not listed',era:song.era||'',decade:song.decade||'Not listed',notes:song.n,hand_split:song.o||0,score:!!song.sc,source:song.source||'upload',shared_id:song.sharedId||null,original_path:song.originalPath||null,original_type:song.originalType||null,played_at:song.playedAt||0,updated_at:new Date().toISOString()},true,{'Prefer':'resolution=merge-duplicates,return=minimal'});},
   touch:async function(songId,time){return request('/rest/v1/scroll_songs?id=eq.'+id(songId),'PATCH',{played_at:time},true,{'Prefer':'return=minimal'});},
   remove:async function(songId){var row=await api.get(songId);if(row.originalPath)await request('/storage/v1/object/scroll-play-originals','DELETE',{prefixes:[row.originalPath]},true);return request('/rest/v1/scroll_songs?id=eq.'+id(songId),'DELETE',null,true,{'Prefer':'return=minimal'});},
   putFile:async function(songId,file){await ensure();if(file.size>52428800)throw new Error('Original recordings can be saved up to 50 MB. The piano notes can still be saved.');var name=session.user.id+'/'+id(songId);await request('/storage/v1/object/scroll-play-originals/'+name,'POST',file,true,{'Content-Type':file.type||'application/octet-stream','x-upsert':'true'});await request('/rest/v1/scroll_songs?id=eq.'+id(songId),'PATCH',{original_path:name,original_type:file.type||''},true,{'Prefer':'return=minimal'});return {path:name,type:file.type||''};},
   getFile:async function(songId){await ensure();return request('/storage/v1/object/scroll-play-originals/'+session.user.id+'/'+id(songId),'GET',null,true);}
  };return api;
 }
 root.ScrollCloud={create:create};
})(typeof window!=='undefined'?window:globalThis);
