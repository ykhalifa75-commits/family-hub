let pendingMonthDelete = null;
let monthDeleteBusy = false;
let monthManagerOpener = null;
let monthLoadedFamily = null;
function restoreActiveMonth() {
  if (monthLoadedFamily === familyId) return;
  monthLoadedFamily = familyId;
  try {
    const saved = JSON.parse(LS.getItem('fh_month_' + familyId) || 'null');
    activeMonth = saved && saved.calendar === FHMonths.current() && FHMonths.valid(saved.month) ? saved.month : FHMonths.current();
  } catch { activeMonth = FHMonths.current(); }
  [reportFrom.value, reportTo.value] = FHMonths.bounds(activeMonth);
}
function useMonth(month) {
  if (!FHMonths.valid(month)) return false;
  activeMonth = month;
  if (familyId) LS.setItem('fh_month_' + familyId, JSON.stringify({month, calendar: FHMonths.current()}));
  [reportFrom.value, reportTo.value] = FHMonths.bounds(month);
  render();
  return true;
}
function renderMonthStrip() {
  const ar = lang === 'ar';
  document.getElementById('activeMonthLabel').textContent = FHMonths.label(activeMonth, lang);
  document.getElementById('activeMonthHint').textContent = ar ? 'ميزانية الشهر اللي بتتابعه' : 'The month you are viewing';
  document.getElementById('homeNewMonthBtn').textContent = ar ? '✨ شهر جديد' : '✨ New month';
  document.getElementById('homeArchiveBtn').textContent = ar ? '🗂️ الشهور القديمة' : '🗂️ Past months';
  document.getElementById('monthManageBtn').textContent = ar ? '🗓️ الشهور والأرشيف' : '🗓️ Months & history';
  document.querySelectorAll('[data-parent-month]').forEach(e => { e.hidden = !isParent(); });
  document.getElementById('reportRangeError').textContent = reportFrom.value && reportTo.value && reportFrom.value > reportTo.value
    ? (ar ? 'تاريخ البداية لازم يكون قبل تاريخ النهاية.' : 'The start date must be before the end date.') : '';
}
function openMonthManager(section = 'new') {
  if (!isParent() || !familyId) { showToast(lang === 'ar' ? 'إدارة الشهور لبابا وماما بعد تسجيل الدخول.' : 'Parents can manage months after signing in.'); return; }
  monthManagerOpener = document.activeElement;
  const ar = lang === 'ar';
  const set = (id, text) => { document.getElementById(id).textContent = text; };
  set('monthManagerTitle', ar ? '🗓️ الشهور والأرشيف' : '🗓️ Months & history');
  set('monthManagerHelp', ar ? 'اختار الشهر اللي هتتابعه، أو راجع الشهور القديمة.' : 'Choose a month to view, or manage earlier months.');
  set('newMonthTitle', ar ? '✨ نبدأ شهر جديد' : '✨ Start a new month');
  set('newMonthHelp', ar ? 'هنفتح الشهر اللي تختاره في الملخص والتقرير. كل حركة بتفضل في شهرها، والقديم محفوظ.' : 'Open the selected month in the dashboard and report. Previous transactions stay in their original months.');
  set('newMonthLabel', ar ? 'هنبدأ أنهي شهر؟' : 'Which month?');
  set('startMonthBtn', ar ? 'افتح الشهر ده' : 'Open this month');
  set('deleteOldTitle', ar ? '🗂️ الشهور القديمة' : '🗂️ Past months');
  set('deleteOldHelp', ar ? 'المسح للحركات المالية بس. المهام، المدخرات، حسابات العيلة وصورهم هيفضلوا زي ما هم.' : 'Clearing removes financial transactions only. Tasks, savings goals, family accounts and photos are kept.');
  set('oldMonthLabel', ar ? 'اختار شهر قديم' : 'Choose past data');
  set('viewOldMonthBtn', ar ? 'شوف التقرير' : 'View report');
  set('backupMonthBtn', ar ? 'نزّل نسخة قبل المسح' : 'Download a backup');
  set('deleteOldBtn', ar ? 'امسح البيانات دي…' : 'Clear this data…');
  set('deleteConfirmLabel', ar ? 'اكتب «حذف» عشان تأكد' : 'Type DELETE to confirm');
  set('confirmMonthDeleteBtn', ar ? 'امسح نهائيًا' : 'Delete permanently');
  set('cancelMonthDeleteBtn', ar ? 'إلغاء' : 'Cancel');
  document.getElementById('newMonthInput').value = FHMonths.next(activeMonth);
  const months = FHMonths.oldMonths(finance);
  const select = document.getElementById('oldMonthSelect');
  select.replaceChildren(new Option(ar ? 'اختار الأول…' : 'Choose first…', ''));
  months.forEach(m => select.add(new Option(FHMonths.label(m, lang), m)));
  if (months.length) select.add(new Option(ar ? 'كل الشهور قبل الشهر الحالي' : 'All months before this calendar month', 'all-old'));
  updateOldMonthPreview();
  document.getElementById('monthManagerModal').classList.add('show');
  document.getElementById(section === 'old' ? 'oldMonthSelect' : 'newMonthInput').focus();
}
function closeMonthManager() {
  if (monthDeleteBusy) return;
  document.getElementById('monthManagerModal').classList.remove('show');
  cancelMonthDelete();
  monthManagerOpener?.focus();
}
function startNewMonth() {
  if (!isParent() || !familyId) return;
  const month = document.getElementById('newMonthInput').value;
  if (!useMonth(month)) { showToast(lang === 'ar' ? 'اختار شهر صحيح الأول.' : 'Choose a valid month first.'); return; }
  closeMonthManager();
  showToast(lang === 'ar' ? 'فتحنا ' + FHMonths.label(month, lang) + ' — القديم محفوظ ✓' : FHMonths.label(month, lang) + ' opened — history kept ✓');
}
function selectedOldPlan() {
  const target = document.getElementById('oldMonthSelect').value;
  return target ? FHMonths.deletionPlan(finance, target) : null;
}
function updateOldMonthPreview() {
  cancelMonthDelete();
  const plan = selectedOldPlan();
  const count = plan?.ids.length || 0;
  const ar = lang === 'ar';
  document.getElementById('oldMonthPreview').textContent = count
    ? (ar ? count + ' حركة مالية في الاختيار ده.' : count + ' financial transactions selected.')
    : (ar ? 'مفيش حركات قديمة في الاختيار ده.' : 'No past transactions in this selection.');
  ['deleteOldBtn', 'backupMonthBtn', 'viewOldMonthBtn'].forEach(id => { document.getElementById(id).disabled = !count; });
}
function viewOldMonth() {
  const plan = selectedOldPlan();
  if (!plan?.ids.length) return;
  if (plan.target === 'all-old') {
    reportFrom.value = plan.rows.map(x => x.date).sort()[0];
    reportTo.value = plan.rows.map(x => x.date).sort().at(-1);
    render();
  } else useMonth(plan.target);
  closeMonthManager();
  document.querySelector('.nav button[data-page="finance"]').click();
}
function downloadOldMonthBackup() {
  if (!isParent() || !familyId) return;
  const plan = selectedOldPlan();
  if (!plan?.ids.length) return;
  const payload = {app: 'Family Hub', format: 1, exported_at: new Date().toISOString(), family_id: familyId, selection: plan.target, transactions: plan.rows};
  const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], {type: 'application/json;charset=utf-8'}));
  const link = document.createElement('a');
  link.href = url; link.download = 'Family-Hub-' + plan.target + '.json';
  document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  showToast(lang === 'ar' ? 'النسخة جاهزة للتنزيل. احتفظ بيها في مكان آمن.' : 'Backup ready. Keep it in a safe place.');
}
function deleteOldFinance() {
  if (!isParent() || !familyId || monthDeleteBusy) return;
  const plan = selectedOldPlan();
  if (!plan?.ids.length) return;
  pendingMonthDelete = {...plan, familyId, user: currentUser};
  const range = plan.target === 'all-old' ? (lang === 'ar' ? 'قبل ' : 'before ') + plan.cutoff : FHMonths.label(plan.target, lang);
  document.getElementById('deleteConfirmSummary').textContent = lang === 'ar'
    ? 'هتتمسح ' + plan.ids.length + ' حركة مالية (' + range + ') نهائيًا. مش هنقدر نرجّعها من التطبيق.'
    : 'Permanently delete ' + plan.ids.length + ' financial transactions (' + range + '). This cannot be undone in the app.';
  document.getElementById('deleteConfirmation').hidden = false;
  document.getElementById('deleteConfirmInput').value = '';
  updateDeleteConfirmation();
  document.getElementById('deleteConfirmInput').focus();
}
function updateDeleteConfirmation() {
  const value = document.getElementById('deleteConfirmInput').value.trim();
  const confirmed = lang === 'ar' ? value === 'حذف' : value.toUpperCase() === 'DELETE';
  document.getElementById('confirmMonthDeleteBtn').disabled = monthDeleteBusy || !pendingMonthDelete || !confirmed;
}
function cancelMonthDelete() {
  if (monthDeleteBusy) return;
  pendingMonthDelete = null;
  document.getElementById('deleteConfirmation').hidden = true;
  document.getElementById('deleteConfirmInput').value = '';
  updateDeleteConfirmation();
}
async function confirmOldMonthDelete() {
  const plan = pendingMonthDelete;
  const input = document.getElementById('deleteConfirmInput').value.trim();
  const confirmed = lang === 'ar' ? input === 'حذف' : input.toUpperCase() === 'DELETE';
  if (!plan || !confirmed || monthDeleteBusy || !isParent() || !familyId || familyId !== plan.familyId || currentUser !== plan.user) return;
  monthDeleteBusy = true;
  document.getElementById('monthManagerModal').setAttribute('aria-busy', 'true');
  document.querySelectorAll('#monthManagerModal button,#monthManagerModal select,#monthManagerModal input').forEach(e => { e.disabled = true; });
  let deleted = false;
  let message = '';
  try {
    if (navigator.onLine === false) throw new Error('offline');
    const {data, error: authError} = await sb.auth.getUser();
    const parent = memberRows[currentUser]?.auth_user_id;
    if (authError || !parent || data?.user?.id !== parent) throw new Error('auth');
    // Delete only the IDs shown in the confirmation; never sweep in new rows.
    let query = sb.from('transactions').delete().eq('family_id', plan.familyId).in('id', plan.ids).lt('transaction_date', plan.cutoff);
    if (plan.from) query = query.gte('transaction_date', plan.from).lte('transaction_date', plan.to);
    const {data: removed, error} = await query.select('id');
    if (error) throw error;
    if (!removed || removed.length !== plan.ids.length) throw new Error('incomplete');
    deleted = true;
    const loaded = await loadCloudData();
    if (!loaded) {
      const ids = new Set(removed.map(x => String(x.id)));
      finance = finance.filter(x => !ids.has(String(x.id)));
      message = lang === 'ar' ? 'تم المسح. تحديث البيانات محتاج اتصال؛ حدّث الصفحة لما النت يرجع.' : 'Deleted. Reconnect and refresh to sync the data.';
    } else message = lang === 'ar' ? 'اتمسحت ' + removed.length + ' حركة قديمة ✓' : removed.length + ' past transactions deleted ✓';
  } catch (e) {
    console.error('Month deletion failed', e);
    message = lang === 'ar' ? 'المسح ما اكتملش. راجع الاتصال والصلاحيات، وحدّث البيانات قبل ما تحاول تاني.' : 'Clearing did not complete. Check connection and permissions, then refresh before retrying.';
    if (e?.message === 'incomplete') await loadCloudData();
  } finally {
    monthDeleteBusy = false;
    document.getElementById('monthManagerModal').removeAttribute('aria-busy');
    document.querySelectorAll('#monthManagerModal button,#monthManagerModal select,#monthManagerModal input').forEach(e => { e.disabled = false; });
    cancelMonthDelete();
    if (deleted) { render(); openMonthManager('old'); }
    else updateOldMonthPreview();
    showToast(message);
  }
}
document.addEventListener('keydown', event => {
  const modal = document.getElementById('monthManagerModal');
  if (!modal?.classList.contains('show')) return;
  if (event.key === 'Escape') { event.preventDefault(); closeMonthManager(); }
  if (event.key === 'Tab') {
    const nodes = [...modal.querySelectorAll('button,input,select')].filter(e => !e.disabled && !e.closest('[hidden]'));
    const first = nodes[0], last = nodes.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  }
});
