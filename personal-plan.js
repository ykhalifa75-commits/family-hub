// Personal content is fetched after authentication; no profile data is shipped in the app shell.
const FHPersonal = (() => {
 let plan=null, logs=[], uid=null, generation=0, previousFocus=null;
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const date=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Cairo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 function reset(){generation++;plan=null;logs=[];uid=null;document.getElementById('personalPlanButton')?.remove();document.getElementById('personalPlanModal')?.remove()}
 async function sync(){
  reset(); const token=generation;
  const {data:{user},error}=await sb.auth.getUser();if(error||!user||token!==generation)return;
  const r=await sb.from('personal_plans').select('*').eq('owner_id',user.id).maybeSingle();
  if(token!==generation||r.error||!r.data)return;
  uid=user.id;plan=r.data;
  const b=document.createElement('button');b.id='personalPlanButton';b.className='btn ghost';b.type='button';b.textContent='🔒 خطتي';b.onclick=open;
  document.querySelector('.top .actions')?.prepend(b);
  if(new URL(location.href).searchParams.get('notification')==='personal')await open();
 }
 async function open(){
  if(!plan||document.body.classList.contains('authLocked'))return;
  previousFocus=document.activeElement;const token=generation;
  const r=await sb.from('personal_plan_logs').select('*').eq('owner_id',uid).order('log_date',{ascending:false}).limit(90);
  if(token!==generation)return;
  if(r.error){showToast('تعذر تحميل خطتك؛ راجع الاتصال');return}
  logs=r.data||[];draw();
 }
 function draw(){
  if(!plan)return;document.getElementById('personalPlanModal')?.remove();
  const p=plan.settings,today=logs.find(x=>x.log_date===date())?.entry||{};
  const weights=logs.filter(x=>Number(x.entry.weight)>0),latest=weights[0]?.entry.weight??p.start_weight;
  const eDone=logs.filter(x=>x.entry.english).length,wDone=logs.filter(x=>x.entry.walk||x.entry.cycle).length;
  const modal=document.createElement('div');modal.id='personalPlanModal';modal.className='modal show';modal.style.zIndex='250';modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');modal.setAttribute('aria-labelledby','personalTitle');
  modal.innerHTML=`<div class="modalbox" style="width:min(900px,100%);max-height:90dvh;overflow:auto"><div class="sectionhead"><h2 id="personalTitle">🔒 خطتي الشخصية</h2><button type="button" class="btn ghost" data-close aria-label="إغلاق">×</button></div>
  <p class="muted">حسابك فقط • المواعيد بتوقيت القاهرة • البيانات تُحفظ أونلاين في حسابك</p>
  <div class="cards" style="grid-template-columns:repeat(auto-fit,minmax(130px,1fr))"><div class="card">آخر وزن مسجل<br><b>${esc(latest)} كجم</b></div><div class="card">الهدف الأول<br><b>${esc(p.target_weight)} كجم</b></div><div class="card">إنجليزي / آخر 90 سجل<br><b>${eDone} يوم</b></div><div class="card">حركة / آخر 90 سجل<br><b>${wDone} يوم</b></div></div>
  <div class="grid2" style="grid-template-columns:repeat(auto-fit,minmax(min(100%,280px),1fr))"><section class="card"><h2>🥗 الأكل والحركة</h2><ul>${p.diet.map(x=>`<li style="margin-bottom:12px">${esc(x)}</li>`).join('')}</ul></section><section class="card"><h2>🇬🇧 الإنجليزي</h2><ul>${p.english.map(x=>`<li style="margin-bottom:12px">${esc(x)}</li>`).join('')}</ul><form data-video><div class="field"><label>اسم الكورس<input name="course" maxlength="150" value="${esc(p.course_name)}"></label></div><div class="row"><div class="field"><label>رقم السيشن<input type="number" min="1" max="9999" name="video" value="${esc(p.video_number)}" required></label></div><div class="field"><label>وقفت عند الدقيقة<input type="number" min="0" max="45" name="offset" value="${esc(p.video_offset)}" required></label></div></div><button class="btn primary">حفظ تقدم الفيديو</button></form></section></div>
  <section class="card" style="margin-top:14px"><h2>✅ متابعة النهارده — ${esc(date())}</h2><form data-log><div style="display:flex;gap:18px;flex-wrap:wrap"><label><input type="checkbox" name="walk" ${today.walk?'checked':''}> مشيت</label><label><input type="checkbox" name="cycle" ${today.cycle?'checked':''}> ركبت العجلة 🚴</label><label>مدة العجلة بالدقائق <input type="number" name="cycle_minutes" min="1" max="600" step="1" value="${esc(today.cycle_minutes??'')}" style="width:85px"></label><label><input type="checkbox" name="english" ${today.english?'checked':''}> مارست الإنجليزي</label><label><input type="checkbox" name="food" ${today.food?'checked':''}> التزمت بخطة الأكل</label></div><div class="row"><div class="field"><label>الوزن كجم — اختياري<input type="number" step="0.1" min="30" max="300" name="weight" value="${esc(today.weight??'')}"></label></div><div class="field"><label>محيط الخصر سم — اختياري<input type="number" step="0.1" min="30" max="250" name="waist" value="${esc(today.waist??'')}"></label></div></div><div class="field"><label>جملك بالإنجليزي أو ملاحظتك<input name="note" maxlength="2000" value="${esc(today.note??'')}" placeholder="اكتب تدريبك هنا"></label></div><button class="btn primary">حفظ متابعة اليوم</button></form></section>
  <section class="card" style="margin-top:14px"><h2>🔔 مواعيد تذكيراتي</h2><form data-schedule><p>التذكيرات توصلك أنت فقط، ومحتواها على شاشة القفل عام لحماية خصوصيتك.</p><label><input type="checkbox" name="enabled" ${plan.enabled?'checked':''}> تشغيل تذكيرات خطتي</label>${p.routines.map((r,i)=>`<div class="field"><label>${esc(r.label)} — ${r.days.length===7?'يوميًا':r.days.length===1?'الجمعة':'الأحد–الخميس'}<input type="time" name="time${i}" value="${esc(r.time)}" required></label></div>`).join('')}<button class="btn primary">حفظ المواعيد</button> <button type="button" class="btn ghost" data-push>تفعيل / اختبار إشعارات الجهاز</button></form><p class="muted">التذكير عادة خلال دقيقتين من الموعد، ويحتاج اتصال إنترنت واشتراك جهاز مفعّل. يمكنك إيقافه من هنا.</p></section>
  <details class="card" style="margin-top:14px"><summary>سجل تقدمي</summary>${logs.length?logs.slice(0,30).map(x=>`<p>${esc(x.log_date)} — مشي ${x.entry.walk?'✓':'—'} • عجلة ${x.entry.cycle?'✓'+(x.entry.cycle_minutes?' ('+esc(x.entry.cycle_minutes)+' دقيقة)':''):'—'} • إنجليزي ${x.entry.english?'✓':'—'}${x.entry.weight?' • وزن '+esc(x.entry.weight):''}${x.entry.waist?' • خصر '+esc(x.entry.waist):''}<br>${esc(x.entry.note||'')}</p>`).join(''):'سجّل أول يوم ليك'}</details>
  <p class="muted">مصادر: ${p.sources.map(x=>`<a target="_blank" rel="noopener noreferrer" href="${esc(x.url)}">${esc(x.label)}</a>`).join(' • ')}</p><p role="status" data-status aria-live="polite"></p></div>`;
  document.body.append(modal);modal.querySelector('[data-close]').onclick=close;modal.querySelector('[data-close]').focus();
  modal.querySelector('[data-push]').onclick=()=>{close();openPushSettings()};
  modal.querySelector('[data-video]').onsubmit=e=>save(e,'video');modal.querySelector('[data-schedule]').onsubmit=e=>save(e,'schedule');modal.querySelector('[data-log]').onsubmit=e=>save(e,'log');
 }
 async function save(event,kind){
  event.preventDefault();const form=event.currentTarget;if(!form.reportValidity()||!plan)return;
  const token=generation,owner=uid,data=new FormData(form),status=document.querySelector('#personalPlanModal [data-status]');
  const buttons=[...form.querySelectorAll('button')];buttons.forEach(b=>b.disabled=true);status.textContent='جاري الحفظ…';
  try{let r;
   if(kind==='log'){
    const entry={...logs.find(x=>x.log_date===date())?.entry,walk:data.has('walk'),cycle:data.has('cycle'),cycle_minutes:data.has('cycle')&&data.get('cycle_minutes')!==''?Number(data.get('cycle_minutes')):null,english:data.has('english'),food:data.has('food'),note:String(data.get('note')||'').trim()};
    for(const k of ['weight','waist'])if(data.get(k)!=='')entry[k]=Number(data.get(k));
    r=await sb.from('personal_plan_logs').upsert({owner_id:owner,log_date:date(),entry}).select();
    if(r.error||!r.data?.length)throw Error();if(token!==generation)return;
    logs=[r.data[0],...logs.filter(x=>x.log_date!==date())];
   }else{
    const next=structuredClone(plan.settings);let enabled=plan.enabled;
    if(kind==='video'){next.course_name=String(data.get('course')||'').trim();next.video_number=Number(data.get('video'));next.video_offset=Number(data.get('offset'))}
    else{enabled=data.has('enabled');next.routines.forEach((x,i)=>x.time=data.get('time'+i))}
    r=await sb.from('personal_plans').update({settings:next,enabled,updated_at:new Date().toISOString()}).eq('owner_id',owner).select();
    if(r.error||!r.data?.length)throw Error();if(token!==generation)return;plan=r.data[0];
   }
   draw();document.querySelector('#personalPlanModal [data-status]').textContent='اتحفظ ✓';
  }catch{if(token===generation&&status)status.textContent='الحفظ ما اكتملش؛ راجع الاتصال وحاول تاني.'}finally{buttons.forEach(b=>b.disabled=false)}
 }
 function close(){document.getElementById('personalPlanModal')?.remove();previousFocus?.focus()}
 document.addEventListener('keydown',e=>{const m=document.getElementById('personalPlanModal');if(!m)return;if(e.key==='Escape'){close();return}if(e.key==='Tab'){const a=[...m.querySelectorAll('button,input,summary,a')].filter(x=>!x.disabled),first=a[0],last=a.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}});
 sb.auth.onAuthStateChange(event=>{if(event==='SIGNED_OUT')reset()});
 navigator.serviceWorker?.addEventListener('message',e=>{if(e.data?.type==='FH_NOTIFICATION_OPEN'&&e.data.page==='personal')open()});
 return {sync,reset,open};
})();
