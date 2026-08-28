const fs = require('fs');
const { parse } = require('csv-parse/sync');
const XLSX = require('xlsx');

function normalizePhone(v) {
  const raw = String(v ?? '').trim().replace(/[^\d+]/g, '');
  if (raw.startsWith('+')) return '+' + raw.slice(1).replace(/\D/g,'');
  const digits = raw.replace(/\D/g,'');
  return digits ? '+' + digits : '';
}
function isValidPhone(v) {
  const p = normalizePhone(v);
  return /^\+[1-9]\d{7,14}$/.test(p);
}
function parseFile(filePath, originalName='') {
  const ext = String(originalName || filePath).toLowerCase().split('.').pop();
  if (ext === 'xlsx' || ext === 'xls') {
    const wb = XLSX.readFile(filePath, { cellDates:false });
    const ws = wb.Sheets[wb.SheetNames[0]];
    return XLSX.utils.sheet_to_json(ws, { defval:'' });
  }
  return parse(fs.readFileSync(filePath,'utf8'), { columns:true, skip_empty_lines:true, relax_column_count:true, bom:true });
}
function detectColumns(records){ return records.length ? Object.keys(records[0]) : []; }
function suggestMapping(columns){
  const m={};const aliases={name:'name','full name':'name',phone:'phone','phone number':'phone',mobile:'phone',email:'email',company:'company',organisation:'company',organization:'company',designation:'designation',title:'designation','event date':'event_date',venue:'venue',link:'link','registration link':'link'};
  columns.forEach(c=>m[c]=aliases[c.trim().toLowerCase()]||null);return m;
}
function validateRows(records,mapping,existingPhones){
  const seen=new Set();let valid=0,invalid=0,duplicates=0;
  const rows=records.map((raw,index)=>{const d={};const custom={};for(const [col,target] of Object.entries(mapping)){const v=raw[col]??'';if(target)d[target]=String(v).trim();else if(String(v).trim())custom[col]=v;}d.phone=normalizePhone(d.phone);const duplicate=seen.has(d.phone)||existingPhones.has(d.phone);const okName=!!d.name;const okPhone=isValidPhone(d.phone);let reason='';if(!okName)reason='Name is required';else if(!okPhone)reason='Invalid E.164 phone';else if(duplicate){reason='Duplicate phone';duplicates++;}if(okName&&okPhone&&!duplicate){valid++;seen.add(d.phone);}else invalid++;return{row:index+2,valid:okName&&okPhone&&!duplicate,mappedData:d,customFields:custom,error:reason};});
  return {total:records.length,valid,invalid,duplicates,rows};
}
module.exports={normalizePhone,isValidPhone,parseFile,detectColumns,suggestMapping,validateRows};
