(function (root) {
  'use strict';
  const valid = month => /^\d{4}-(0[1-9]|1[0-2])$/.test(month || '') && +month.slice(0, 4) >= 1900;
  function localDate(date = new Date()) {
    return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
  }
  function current(date = new Date()) { return localDate(date).slice(0, 7); }
  function bounds(month) {
    if (!valid(month)) throw new Error('Invalid month');
    const [y, m] = month.split('-').map(Number);
    const days = new Date(y, m, 0).getDate();
    return [month + '-01', month + '-' + String(days).padStart(2, '0')];
  }
  function next(month) {
    if (!valid(month)) throw new Error('Invalid month');
    const [y, m] = month.split('-').map(Number);
    return m === 12 ? (y + 1) + '-01' : y + '-' + String(m + 1).padStart(2, '0');
  }
  function label(month, language = 'ar') {
    if (!valid(month)) return '';
    const [y, m] = month.split('-').map(Number);
    return new Date(y, m - 1, 15).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-GB', {month: 'long', year: 'numeric'});
  }
  function oldMonths(rows, currentMonth = current()) {
    return [...new Set(rows.map(x => String(x.date || '').slice(0, 7)).filter(m => valid(m) && m < currentMonth))].sort().reverse();
  }
  function deletionPlan(rows, target, currentMonth = current()) {
    const cutoff = bounds(currentMonth)[0];
    if (target !== 'all-old' && (!valid(target) || target >= currentMonth)) throw new Error('Choose a past month');
    const [from, to] = target === 'all-old' ? ['', ''] : bounds(target);
    const selected = rows.filter(x => !String(x.cat || x.category || '').startsWith('[goal:') && x.date && x.date < cutoff && (target === 'all-old' || (x.date >= from && x.date <= to)));
    return {target, cutoff, from, to, ids: selected.map(x => String(x.id)), rows: selected.map(x => ({...x}))};
  }
  root.FHMonths = Object.freeze({valid, localDate, current, bounds, next, label, oldMonths, deletionPlan});
})(typeof window === 'undefined' ? globalThis : window);
