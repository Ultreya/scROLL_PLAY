(function(root){
 'use strict';
 function fold(text){return String(text||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase();}
 function matches(row,state){
  var query=fold(state.query).trim(),artists=row.artists||[row.artist||''];
  return (!query||fold([row.title,row.artist,row.arrangement].join(' ')).includes(query))&&(!state.artist||artists.some(function(a){return fold(a)===fold(state.artist);}))&&(!state.genre||row.genre===state.genre)&&(!state.era||String(row.era||'').split(' / ').includes(state.era))&&(!state.decade||row.decade===state.decade);
 }
 function select(rows,state){
  var list=rows.filter(function(r){return matches(r,state);});
  list.sort(function(a,b){var x=state.sort==='artist'?[a.artist,a.title]:[a.title,a.artist],y=state.sort==='artist'?[b.artist,b.title]:[b.title,b.artist];return String(x[0]||'').localeCompare(String(y[0]||''),undefined,{sensitivity:'base',numeric:true})||String(x[1]||'').localeCompare(String(y[1]||''),undefined,{sensitivity:'base',numeric:true});});return list;
 }
 function page(rows,index,size){var count=Math.max(1,Math.ceil(rows.length/size)),current=Math.max(0,Math.min(index,count-1));return {rows:rows.slice(current*size,(current+1)*size),index:current,pages:count,total:rows.length};}
 function facets(rows){
  function unique(values){return Array.from(new Set(values.filter(Boolean))).sort(function(a,b){if(a==='Not listed')return 1;if(b==='Not listed')return -1;return a.localeCompare(b,undefined,{sensitivity:'base',numeric:true});});}
  return {artists:unique(rows.flatMap(function(r){return r.artists||[r.artist];})),genres:unique(rows.map(function(r){return r.genre;})),eras:unique(rows.flatMap(function(r){return String(r.era||'').split(' / ');})),decades:unique(rows.map(function(r){return r.decade;}))};
 }
 var api={fold:fold,select:select,page:page,facets:facets};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ScrollCatalogue=api;
})(typeof window!=='undefined'?window:globalThis);
