(function(){
 'use strict';var $=id=>document.getElementById(id),api=null,signUp=false;
 async function showAccount(){
  var user=api.user();$('accountState').textContent=user?'Private library · '+user.email:'Your private library';$('accountHint').textContent=user?'Your uploads and recent plays follow your account. Sign out on shared devices.':'Sign in to use your songs on your other devices.';$('accountButton').textContent=user?'Sign out':'Sign in';
  $('accountMove').hidden=!user||(await ScrollPlayer.deviceSongs()).length===0;
 }
 $('accountButton').addEventListener('click',async function(){
  if(ScrollPlayer.busy()){$('accountHint').textContent='Wait for the current song to finish.';return;}
  if(!api.user()){$('accountDialog').showModal();return;}
  try{await api.signOut();await ScrollPlayer.useLibrary(null);await showAccount();}catch(e){$('accountHint').textContent=e.message;}
 });
 $('closeAccount').addEventListener('click',function(){$('accountDialog').close();$('accountPassword').value='';});
 $('switchAccountMode').addEventListener('click',function(){signUp=!signUp;$('accountHeading').textContent=signUp?'Create your private library':'Sign in to your library';$('submitAccount').textContent=signUp?'Create account':'Sign in';$('switchAccountMode').textContent=signUp?'I already have an account':'Create an account';$('accountPassword').autocomplete=signUp?'new-password':'current-password';$('accountMessage').textContent='';});
 $('accountForm').addEventListener('submit',async function(e){
  e.preventDefault();if(ScrollPlayer.busy()){$('accountMessage').textContent='Wait for the current song to finish.';return;}$('submitAccount').disabled=true;
  try{var email=$('accountEmail').value.trim(),password=$('accountPassword').value;
   if(signUp){var result=await api.signUp(email,password);$('accountPassword').value='';if(!result.confirmed){$('accountMessage').textContent='Check your email (and spam folder) to confirm your account. Then return to this app and choose “I already have an account” to sign in. You can close the page opened by the email.';return;}}
   else await api.signIn(email,password);
   $('accountPassword').value='';await ScrollPlayer.useLibrary(api);await showAccount();$('accountDialog').close();$('accountMessage').textContent='';
  }catch(error){$('accountPassword').value='';$('accountMessage').textContent=error.message;}
  finally{$('submitAccount').disabled=false;}
 });
 $('moveDeviceSongs').addEventListener('click',async function(){$('moveDeviceSongs').disabled=true;try{await ScrollPlayer.moveDeviceSongs();$('accountMoveStatus').textContent='Your saved songs are in your private account.';await showAccount();}catch(e){$('accountMoveStatus').textContent='Could not finish moving every song. Songs not moved are still on this device.';}finally{$('moveDeviceSongs').disabled=false;}});
 fetch('sync-config.json',{cache:'no-store'}).then(r=>r.json()).then(async function(config){
  api=ScrollCloud.create(config);if(!api)return;await ScrollPlayer.ready();var user=await api.verify();if(user)await ScrollPlayer.useLibrary(api);$('accountBar').hidden=false;await showAccount();
 }).catch(function(){if(api){$('accountBar').hidden=false;$('accountHint').textContent='The private library is unavailable. Your device library is still here.';}});
 window.addEventListener('storage',function(e){if(e.key==='scrollPlay.privateAccount')location.reload();});
 if(location.hash&&/(access_token|refresh_token|error_description)=/.test(location.hash)){history.replaceState(null,'',location.pathname+location.search);$('accountMessage').textContent='Return from your confirmation email? You can now sign in below.';}
})();
