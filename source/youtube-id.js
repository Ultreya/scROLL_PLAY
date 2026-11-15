export function videoId(raw) {
  let u;try{u=new URL(raw);}catch{throw new Error('Paste a YouTube video link.');}
  if(!['https:','http:'].includes(u.protocol)||u.username||u.password)throw new Error('Paste a YouTube video link.');
  const h=u.hostname.toLowerCase();let id='';
  if(h==='youtu.be')id=u.pathname.slice(1).split('/')[0];
  if(['youtube.com','www.youtube.com','m.youtube.com','music.youtube.com'].includes(h))
    id=u.pathname==='/watch'?u.searchParams.get('v'):(u.pathname.match(/^\/(?:shorts|embed|live)\/([\w-]{11})\/?$/)||[])[1];
  if(!/^[\w-]{11}$/.test(id||''))throw new Error('Paste a link to one YouTube video.');
  return id;
}
