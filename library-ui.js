(function(){
 'use strict';
 var $=function(id){return document.getElementById(id);},model=window.ScrollCatalogue,catalogue=[],tab='shared',page=0,pageSize=30,loading=true;
 function displayTitle(text){return text===text.toLocaleLowerCase()?text.replace(/\b[a-z]/g,function(c){return c.toUpperCase();}):text;}
 function selected(){return {query:$('librarySearch').value,artist:$('filterArtist').value,genre:$('filterGenre').value,era:$('filterEra').value,decade:$('filterDecade').value,sort:$('librarySort').value};}
 function personal(){return window.ScrollPlayer.saved().map(function(r){return {id:r.id,title:r.name,artist:r.artist||'',artists:[r.artist||''],genre:r.genre||'Not listed',era:r.era||'',decade:r.decade||'Not listed',playedAt:r.playedAt||0,record:r,source:r.source||(String(r.id).startsWith('lib_')?'shared':'upload')};});}
 function options(id,values,label){var el=$(id),keep=el.value;el.replaceChildren();var all=document.createElement('option');all.value='';all.textContent=label;el.appendChild(all);values.forEach(function(value){var op=document.createElement('option');op.value=value;op.textContent=value;el.appendChild(op);});if(values.includes(keep))el.value=keep;}
 function refreshFacets(){var rows=tab==='shared'?catalogue:personal().filter(function(r){return tab==='recent'?r.playedAt>0:r.source==='upload';}),f=model.facets(rows);options('filterArtist',f.artists,'All artists');options('filterGenre',f.genres,'All genres');options('filterEra',f.eras,'All periods');options('filterDecade',f.decades,'All decades');}
 function render(){
  if(!window.ScrollPlayer)return;
  var rows=tab==='shared'?catalogue:personal().filter(function(r){return tab==='recent'?r.playedAt>0:r.source==='upload';});
  if(tab==='recent')rows=rows.sort(function(a,b){return b.playedAt-a.playedAt;}).slice(0,10);
  var found=model.select(rows,selected());if(tab==='recent')found.sort(function(a,b){return b.playedAt-a.playedAt;});
  var result=model.page(found,page,pageSize);page=result.index;
  $('libraryCount').textContent=loading&&tab==='shared'?'Loading the library…':tab==='recent'?found.length+' of your 10 most recently played songs':found.length.toLocaleString()+(found.length===1?' song':' songs');
  $('libraryResults').replaceChildren();
  result.rows.forEach(function(row){
   var li=document.createElement('li');li.className='song-card';var info=document.createElement('div'),title=document.createElement('h3');title.className='song-title';title.textContent=displayTitle(row.title);var artist=document.createElement('p');artist.className='song-meta';artist.textContent=row.artist||'Your upload';info.append(title,artist);
   var tags=document.createElement('div');tags.className='song-tags';[row.genre,row.era,row.decade].filter(function(x){return x&&x!=='Not listed';}).forEach(function(value){var badge=document.createElement('span');badge.textContent=value;tags.appendChild(badge);});info.appendChild(tags);
   var actions=document.createElement('div');actions.className='song-actions';var open=document.createElement('button');open.type='button';open.textContent='Open';open.setAttribute('aria-label','Open '+row.title);open.addEventListener('click',async function(){open.disabled=true;open.textContent='Loading…';try{if(row.record){await window.ScrollPlayer.openSaved(row.record);$('playerStage').scrollIntoView({behavior:'smooth',block:'start'});}else await window.ScrollPlayer.openShared(row);}catch(e){$('libraryCount').textContent=e.message;}finally{open.disabled=false;open.textContent='Open';}});actions.appendChild(open);
   if(tab==='uploads'){var remove=document.createElement('button');remove.type='button';remove.className='quiet';remove.textContent='Delete';remove.setAttribute('aria-label','Delete '+row.title);remove.addEventListener('click',async function(){if(!remove.dataset.confirm){remove.dataset.confirm='1';remove.textContent='Confirm';setTimeout(function(){delete remove.dataset.confirm;remove.textContent='Delete';},4000);return;}try{await window.ScrollPlayer.remove(row.id);}catch(e){$('libraryCount').textContent=e.message;}});actions.appendChild(remove);}
   li.append(info,actions);$('libraryResults').appendChild(li);
  });
  $('libraryEmpty').hidden=found.length>0||loading&&tab==='shared';
  $('libraryEmpty').textContent=tab==='recent'?'Songs you play will appear here.':tab==='uploads'?'Your uploaded songs will appear here. Use “Upload a song” below.':'No songs match. Try another artist, title or filter.';
  $('previousPage').disabled=page===0;$('nextPage').disabled=page>=result.pages-1;$('pageInfo').textContent='Page '+(page+1)+' of '+result.pages;$('librarySort').disabled=tab==='recent';
 }
 document.querySelectorAll('[data-library-tab]').forEach(function(button){button.addEventListener('click',function(){tab=button.dataset.libraryTab;page=0;document.querySelectorAll('[data-library-tab]').forEach(function(b){b.setAttribute('aria-selected',String(b===button));});refreshFacets();render();});});
 ['librarySearch','filterArtist','filterGenre','filterEra','filterDecade','librarySort'].forEach(function(id){$(id).addEventListener(id==='librarySearch'?'input':'change',function(){page=0;render();});});
 $('clearFilters').addEventListener('click',function(){['librarySearch','filterArtist','filterGenre','filterEra','filterDecade'].forEach(function(id){$(id).value='';});page=0;render();});
 $('previousPage').addEventListener('click',function(){page--;render();$('library').scrollIntoView({behavior:'smooth',block:'start'});});$('nextPage').addEventListener('click',function(){page++;render();$('library').scrollIntoView({behavior:'smooth',block:'start'});});
 window.addEventListener('scroll:library-change',function(){refreshFacets();render();});
 fetch('catalogue.json').then(function(r){if(!r.ok)throw new Error('Library unavailable');return r.json();}).then(function(rows){catalogue=rows;loading=false;refreshFacets();render();}).catch(function(){loading=false;$('libraryCount').textContent='The library could not load. Check your connection and reopen the app.';});
 window.ScrollPlayer.ready().then(function(){refreshFacets();render();});
})();
