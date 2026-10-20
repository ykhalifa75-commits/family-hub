(function(root){
'use strict';
const tables=['savings_goals','transactions','tasks'];
const cleanText=v=>String(v??'').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'');
const xml=v=>cleanText(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
function validate(data,family){
 if(!data||data.app!=='Family Hub'||data.format!=='family-full-v1'||data.family_id!==family||!data.tables)throw Error('الملف مش نسخة كاملة لنفس الأسرة / Not a full backup of this family');
 for(const table of tables){
  const rows=data.tables[table];if(!Array.isArray(rows)||rows.length>100000)throw Error('جدول غير صالح / Invalid table');
  const ids=new Set();for(const row of rows){
   if(!row||typeof row.id!=='string'||!row.id||row.family_id!==family||ids.has(row.id))throw Error('صف مكرر أو تابع لأسرة أخرى / Invalid row');
   ids.add(row.id);
   if(table==='transactions'&&(!['income','expense','saving'].includes(row.type)||!Number.isFinite(row.amount)||row.amount<0))throw Error('حركة مالية غير صالحة / Invalid transaction');
   if(table==='savings_goals'&&(!Number.isFinite(row.target_amount)||row.target_amount<0||!Number.isFinite(row.saved_amount)||row.saved_amount<0))throw Error('هدف غير صالح / Invalid goal');
   if(table==='tasks'&&typeof row.title!=='string')throw Error('مهمة غير صالحة / Invalid task');
  }
 }
 return data;
}
function canonical(v){if(Array.isArray(v))return '['+v.map(canonical).sort().join(',')+']';if(v&&typeof v==='object')return '{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canonical(v[k])).join(',')+'}';return JSON.stringify(v)}
function crc32(bytes){let c=0xffffffff;for(const b of bytes){c^=b;for(let i=0;i<8;i++)c=(c>>>1)^((c&1)?0xedb88320:0)}return (c^0xffffffff)>>>0}
function zip(files){
 const enc=new TextEncoder(),parts=[],central=[];let offset=0,centralSize=0;
 for(const [name,content] of Object.entries(files)){
  const n=enc.encode(name),b=enc.encode(content),crc=crc32(b),h=new Uint8Array(30+n.length),v=new DataView(h.buffer);
  v.setUint32(0,0x04034b50,true);v.setUint16(4,20,true);v.setUint16(6,0x800,true);v.setUint32(14,crc,true);v.setUint32(18,b.length,true);v.setUint32(22,b.length,true);v.setUint16(26,n.length,true);h.set(n,30);parts.push(h,b);
  const c=new Uint8Array(46+n.length),d=new DataView(c.buffer);d.setUint32(0,0x02014b50,true);d.setUint16(4,20,true);d.setUint16(6,20,true);d.setUint16(8,0x800,true);d.setUint32(16,crc,true);d.setUint32(20,b.length,true);d.setUint32(24,b.length,true);d.setUint16(28,n.length,true);d.setUint32(42,offset,true);c.set(n,46);central.push(c);centralSize+=c.length;offset+=h.length+b.length;
 }
 const end=new Uint8Array(22),e=new DataView(end.buffer);e.setUint32(0,0x06054b50,true);e.setUint16(8,central.length,true);e.setUint16(10,central.length,true);e.setUint32(12,centralSize,true);e.setUint32(16,offset,true);
 const all=[...parts,...central,end],out=new Uint8Array(all.reduce((n,x)=>n+x.length,0));let pos=0;for(const x of all){out.set(x,pos);pos+=x.length}return out;
}
function xlsx(sheets){
 const files={},ns='http://schemas.openxmlformats.org/spreadsheetml/2006/main';
 files['[Content_Types].xml']='<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'+sheets.map((_,i)=>'<Override PartName="/xl/worksheets/sheet'+(i+1)+'.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>').join('')+'</Types>';
 files['_rels/.rels']='<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>';
 files['xl/workbook.xml']='<workbook xmlns="'+ns+'" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>'+sheets.map((s,i)=>'<sheet name="'+xml(s.name)+'" sheetId="'+(i+1)+'" r:id="rId'+(i+1)+'"/>').join('')+'</sheets></workbook>';
 files['xl/_rels/workbook.xml.rels']='<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+sheets.map((_,i)=>'<Relationship Id="rId'+(i+1)+'" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet'+(i+1)+'.xml"/>').join('')+'</Relationships>';
 function col(i){let s='';for(i++;i;i=Math.floor((i-1)/26))s=String.fromCharCode(65+(i-1)%26)+s;return s}
 sheets.forEach((s,i)=>{files['xl/worksheets/sheet'+(i+1)+'.xml']='<worksheet xmlns="'+ns+'"><sheetViews><sheetView workbookViewId="0" rightToLeft="1"/></sheetViews><cols><col min="1" max="20" width="25" customWidth="1"/></cols><sheetData>'+s.rows.map((r,n)=>'<row r="'+(n+1)+'">'+r.map((v,j)=>{const ref=col(j)+(n+1);return typeof v==='number'&&Number.isFinite(v)?'<c r="'+ref+'"><v>'+v+'</v></c>':'<c r="'+ref+'" t="inlineStr"><is><t xml:space="preserve">'+xml(v)+'</t></is></c>'}).join('')+'</row>').join('')+'</sheetData></worksheet>'});
 return zip(files);
}
root.FHDataFormat={tables,validate,canonical,xlsx};
})(typeof window==='undefined'?globalThis:window);
