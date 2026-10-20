/* Written greetings, clock and visual prayer reminders. */
(() => {
'use strict';
const nicknames={yasser:'ياسو',riham:'ريما',hamza:'ميزو',ismail:'سمسم'};
const prayers=[['Fajr','الفجر'],['Dhuhr','الظهر'],['Asr','العصر'],['Maghrib','المغرب'],['Isha','العشاء']];
const cities={'Sheikh Zayed':'الشيخ زايد',Cairo:'القاهرة',Giza:'الجيزة',Alexandria:'الإسكندرية'};
const zone='Africa/Cairo';
const box=document.getElementById('familyFun');
let active=null,prefs={},schedule=null,requestId=0,loading=false,nextRetry=0,lastPrayer='';
const el=id=>document.getElementById(id);
const key=()=> 'fh_fun_v1_'+familyId+'_'+currentUser;
function read(){try{return JSON.parse(localStorage.getItem(key())||'{}')||{}}catch{return {}}}
function save(){try{localStorage.setItem(key(),JSON.stringify(prefs))}catch{}}
function parts(now=new Date()){return Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',hourCycle:'h23'}).formatToParts(now).map(p=>[p.type,p.value]))}
function day(now=new Date()){const p=parts(now);return p.year+'-'+p.month+'-'+p.day}
function greeting(){const h=+parts().hour;const name=nicknames[currentUser]||members.find(m=>m.id===currentUser)?.ar||'';return (h<12?'صباح الفل':'مساء الفل')+(name?' يا '+name:'')+' 🌷'}
function paint(){
 if(!box)return;
 if(!currentUser||!familyId||document.body.classList.contains('authLocked')){box.hidden=true;if(active){active=null;requestId++;schedule=null}return}
 box.hidden=false;
 const id=familyId+':'+currentUser;
 if(active!==id){
  active=id;prefs=read();prefs.city=Object.hasOwn(cities,prefs.city)?prefs.city:'Sheikh Zayed';
  schedule=null;requestId++;loading=false;nextRetry=0;lastPrayer='';
  el('funPrayer').checked=!!prefs.prayer;el('funCity').value=prefs.city;
  el('funPhrase').textContent=greeting();el('funStatus').textContent='الترحيب وتذكيرات الصلاة مكتوبة فقط.';
 }
 tick();
}
async function fetchDay(){
 if(loading||Date.now()<nextRetry||!active)return;
 loading=true;const token=++requestId,city=prefs.city,date=day(),who=active;
 el('prayerNext').textContent='بنحمّل مواعيد الصلاة…';
 const p=parts(),query=new URLSearchParams({city,country:'Egypt',method:'5',school:'0',timezonestring:zone,iso8601:'true'});
 try{
  const response=await fetch('https://api.aladhan.com/v1/timingsByCity/'+p.day+'-'+p.month+'-'+p.year+'?'+query,{signal:AbortSignal.timeout(15000),credentials:'omit',referrerPolicy:'no-referrer'});
  if(!response.ok)throw Error('request');
  const data=await response.json();
  if(token!==requestId||active!==who)return;
  const dates=prayers.map(([id,label])=>({id,label,at:Date.parse(data?.data?.timings?.[id])}));
  if(data.code!==200||dates.some(x=>!Number.isFinite(x.at)||day(new Date(x.at))!==date)||dates.some((x,i)=>i&&x.at<=dates[i-1].at))throw Error('schedule');
  schedule={date,city,dates};nextRetry=0;
  el('prayerList').replaceChildren(...dates.map(x=>{const cell=document.createElement('span');cell.textContent=x.label+' '+new Intl.DateTimeFormat('ar-EG',{timeZone:zone,hour:'numeric',minute:'2-digit'}).format(x.at);return cell}));
  tick();
 }catch{
  if(token===requestId){schedule=null;nextRetry=Date.now()+60000;el('prayerNext').textContent='المواعيد مش متاحة دلوقتي. اتأكد من الإنترنت؛ هنحاول تاني.';el('prayerList').replaceChildren()}
 }finally{if(token===requestId)loading=false}
}
function tick(){
 if(!active||box.hidden)return;
 el('funPhrase').textContent=greeting();
 const now=Date.now();
 el('familyClock').textContent=new Intl.DateTimeFormat('ar-EG',{timeZone:zone,hour:'numeric',minute:'2-digit',second:'2-digit'}).format(now);
 el('familyClock').dateTime=new Date(now).toISOString();
 if(!schedule||schedule.date!==day()||schedule.city!==prefs.city){if(schedule){schedule=null;el('prayerList').replaceChildren()}fetchDay();return}
 const next=schedule.dates.find(x=>x.at>now);
 if(next){const min=Math.ceil((next.at-now)/60000);el('prayerNext').textContent='🕌 '+next.label+' بعد '+(min>=60?Math.floor(min/60)+' ساعة و':'')+(min%60)+' دقيقة'}
 else el('prayerNext').textContent='ربنا يتقبل منكم. مواعيد بكرة هتتحدث بعد منتصف الليل.';
 if(!prefs.prayer||document.hidden)return;
 const due=schedule.dates.find(x=>now>=x.at&&now-x.at<90000);
 if(!due)return;
 const marker=schedule.date+':'+due.id,storageKey='fh_prayer_seen_'+key();
 let seen='';try{seen=localStorage.getItem(storageKey)||''}catch{}
 if(marker===lastPrayer||marker===seen)return;
 lastPrayer=marker;try{localStorage.setItem(storageKey,marker)}catch{}
 el('funStatus').textContent='🕌 جه وقت صلاة '+due.label+'. يلا نقوم نصلي، ربنا يتقبل منك.';
}
el('funPrayer').addEventListener('change',e=>{prefs.prayer=e.target.checked;save();el('funStatus').textContent=prefs.prayer?'تذكير الصلاة المكتوب اتفعّل والتطبيق مفتوح.':'تذكير الصلاة اتوقف.'});
el('funCity').addEventListener('change',e=>{prefs.city=e.target.value;save();requestId++;loading=false;nextRetry=0;schedule=null;el('prayerList').replaceChildren();tick()});
document.addEventListener('visibilitychange',()=>{if(!document.hidden){paint();tick()}});
window.FHFun={refresh:paint,cheer:()=>{}};
setInterval(()=>{paint()},1000);
paint();
})();