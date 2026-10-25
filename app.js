const $=s=>document.querySelector(s), KEY='taxcalc-returns-v1';
const fmt=n=>'$'+Math.round(n||0).toLocaleString('en-US'), pct=n=>(n*100).toFixed(1)+'%';
let store=JSON.parse(localStorage.getItem(KEY)||'[]'), cur=null, step=0;
const save=()=>{if(cur){cur.updated=Date.now();}localStorage.setItem(KEY,JSON.stringify(store));};
const M=(k,label,help)=>({k,label,help,t:'money'}), CNT=(k,label,help)=>({k,label,help,t:'count'}), CK=(k,label)=>({k,label,t:'check'});
const married=d=>d.status==='mfj';
const STEPS=[
 {title:'About you',lead:'Let’s start with the basics. This takes about 5–10 minutes.',items:[
  {t:'text',k:'name',label:'Whose return is this?',help:'Just a nickname so you can find it later, like “Me 2025” or “Mom”. Never enter a Social Security number.'},
  {t:'year'},{t:'status'},
  {t:'group',label:'Check any that apply',help:'“65 or older” means born before January 2, 1961. These raise your standard deduction, and 65+ also unlocks the new $6,000 senior deduction.',items:[CK('you.age65','I’m 65 or older'),CK('you.blind','I’m blind')],spItems:[CK('sp.age65','Spouse is 65 or older'),CK('sp.blind','Spouse is blind')]}]},
 {title:'Family',lead:'Kids and other people you support can mean big credits.',items:[
  {t:'yn',k:'hasDeps',q:'Can you claim any dependents?',help:'A dependent is usually a child or relative who lived with you and whom you supported. See IRS Pub. 501 if unsure.',items:[
   CNT('kids','Children under 17 at the end of 2025','Each qualifies for the Child Tax Credit of up to $2,200 (must have an SSN).'),
   CNT('otherDeps','Other dependents (17 or older, or parents/relatives)','Each qualifies for the $500 Credit for Other Dependents.'),
   CNT('eicKids','Children who qualify for the Earned Income Credit','Usually children under 19 (under 24 if a full-time student) who lived with you over half the year. Often the same as your kids above. Leave blank to use the number of kids under 17.')]}]},
 {title:'Jobs',lead:'Look at Form W-2 from each employer.',items:[
  M('wages','Total wages (W-2 box 1)','Add box 1 from every W-2. Include tips and overtime that are already in box 1.'),
  M('withholding','Federal tax withheld (W-2 box 2, plus any 1099 withholding)','This is tax already paid. It’s what creates a refund.'),
  {t:'sp',item:M('wagesSp','Of the wages above, how much was your spouse’s?','Used for the child-care credit, Social Security limits and the extra Medicare tax.')},
  {t:'yn',k:'hasTips',q:'Did you get tips or overtime pay?',help:'New for 2025 (One Big Beautiful Bill): up to $25,000 of qualified tips and up to $12,500 ($25,000 joint) of overtime premium can be deducted. Married people must file jointly.',items:[
   M('tips','Qualified tips','Tips in an IRS-listed tipped occupation, shown on your W-2 box 7 or reported to your employer.'),
   M('overtime','Qualified overtime (the extra “half” of time-and-a-half)','Only the premium part counts, e.g. if you earn $20/hr and get $30/hr for overtime, only the $10/hr extra counts. Check your W-2 or pay stubs.')]}]},
 {title:'Self-employment',lead:'Side gigs, 1099-NEC work, a small business.',items:[
  {t:'yn',k:'hasSE',q:'Did you have self-employment income?',help:'For example Uber/DoorDash, freelance or contract work paid on a 1099-NEC, or your own business.',items:[
   M('seNet','Net profit (income minus business expenses)','Your Schedule C bottom line. Self-employment tax (15.3%) is figured automatically, and half of it is deducted.'),
   M('seHealth','Health insurance premiums you paid as self-employed','Only if you weren’t eligible for an employer plan.'),
   M('estPay','Estimated tax payments made for 2025','Payments you sent with Form 1040-ES or through IRS Direct Pay for 2025, plus any 2024 refund applied.')]}]},
 {title:'Investments',lead:'Bank interest, dividends and stock sales (1099-INT, 1099-DIV, 1099-B).',items:[
  {t:'yn',k:'hasInv',q:'Did you have interest, dividends, or sell stocks/crypto?',help:'Even small amounts of bank interest count.',items:[
   M('interest','Taxable interest (1099-INT box 1)'),M('taxExemptInt','Tax-exempt interest (1099-INT box 8)','Not taxed, but it can affect Social Security taxes.'),
   M('ordDiv','Total ordinary dividends (1099-DIV box 1a)'),M('qualDiv','Qualified dividends (1099-DIV box 1b)','Taxed at the lower 0/15/20% rates.'),
   {k:'stcg',label:'Short-term gain or loss (held 1 year or less)',help:'Enter a loss as a negative number.',t:'money',neg:1},
   {k:'ltcg',label:'Long-term gain or loss (held over 1 year)',help:'Taxed at 0%, 15% or 20%. Enter a loss as negative. Include capital gain distributions.',t:'money',neg:1}]}]},
 {title:'Retirement & other income',lead:'Social Security, pensions, IRAs and unemployment.',items:[
  {t:'yn',k:'hasRet',q:'Did you get Social Security, retirement, or unemployment income?',items:[
   M('ssBen','Social Security benefits (SSA-1099 box 5)','We figure how much is taxable with the IRS worksheet — often none or part of it.'),
   M('iraDist','Taxable IRA distributions (1099-R box 2a)'),M('pension','Taxable pensions/annuities/401k (1099-R box 2a)'),
   M('unemp','Unemployment compensation (1099-G box 1)')]},
  {t:'yn',k:'hasOther',q:'Any other taxable income?',help:'Gambling winnings, jury duty pay, prizes, etc.',items:[{k:'other',label:'Other income',t:'money',neg:1}]}]},
 {title:'Adjustments',lead:'Things that lower your income before deductions.',items:[
  {t:'yn',k:'hasAdj',q:'Did you contribute to an IRA or HSA, pay student loan interest, or buy classroom supplies as a teacher?',items:[
   M('ira','Traditional IRA contributions','Up to $7,000 each ($8,000 if 50+). May be limited if you have a workplace retirement plan.'),
   CK('ira50','I’m 50 or older (IRA catch-up)'),CK('iraCovered','I’m covered by a retirement plan at work'),{t:'sp',item:CK('iraSpouseCovered','Spouse is covered by a plan at work')},
   M('hsa','HSA contributions you made yourself (not through payroll)','Don’t include employer or payroll contributions (W-2 box 12 code W). Limit $4,300 self / $8,550 family.'),
   CK('hsaFamily','Family HSA coverage'),CK('hsa55','55 or older (HSA catch-up)'),
   M('sli','Student loan interest paid (1098-E)','Up to $2,500. Phases out at higher incomes. Not allowed if married filing separately.'),
   M('educator','Educator expenses','K-12 teachers: up to $300 each.')]}]},
 {title:'Deductions',lead:'We’ll automatically pick whichever is bigger: the standard deduction or itemizing.',items:[
  {t:'yn',k:'hasItem',q:'Did you pay mortgage interest, big medical bills, or give to charity?',help:'Most people take the standard deduction ($15,750 single / $31,500 joint for 2025). Fill this in only if these could add up to more.',items:[
   M('mortgage','Home mortgage interest (Form 1098)'),M('salt','State & local taxes (property tax + sales or income tax)','Texas has no income tax, so this is usually property tax plus sales tax. Capped at $40,000 for 2025 ($20,000 MFS), lower above $500,000 income.'),
   M('charity','Gifts to charity'),M('medical','Medical & dental expenses you paid','Only the part over 7.5% of your income counts.')]},
  {t:'yn',k:'hasCar',q:'Did you buy a new car in 2025 with a loan?',help:'New for 2025: up to $10,000 of interest on a loan for a NEW personal car, assembled in the U.S., bought after Dec. 31, 2024, can be deducted — even if you don’t itemize.',items:[M('carInt','Car loan interest paid in 2025')]}]},
 {title:'Credits',lead:'Credits cut your tax dollar-for-dollar.',items:[
  {t:'yn',k:'hasCare',q:'Did you pay for child care so you could work?',help:'Daycare, before/after school care or day camp for kids under 13.',items:[CNT('careKids','Number of children in care'),M('careExp','Total care costs paid','Up to $3,000 for one child, $6,000 for two or more count.')]},
  {t:'yn',k:'hasEdu',q:'Did you pay college tuition (Form 1098-T)?',items:[CNT('aotcStudents','Students in their first 4 years of college','American Opportunity Credit: up to $2,500 each, 40% refundable.'),M('aotcExp','Tuition & books for those students'),M('llcExp','Other tuition (grad school, job training)','Lifetime Learning Credit: 20% of up to $10,000.')]},
  {t:'yn',k:'hasSaver',q:'Did you put money into a 401(k), IRA or similar retirement account?',help:'Low and moderate earners can get the Saver’s Credit for retirement contributions.',items:[M('saverYou','Your retirement contributions'),{t:'sp',item:M('saverSp','Spouse’s retirement contributions')}]}]},
];
const STATUS=[['single','Single','Not married'],['mfj','Married filing jointly','Usually the best for couples'],['mfs','Married filing separately','Each spouse files alone'],['hoh','Head of household','Unmarried & pay over half the cost of a home for a dependent'],['qss','Qualifying surviving spouse','Spouse died in 2023 or 2024 & you have a dependent child']];
const get=(d,k)=>k.split('.').reduce((o,p)=>o&&o[p],d);
const set=(d,k,v)=>{const p=k.split('.');let o=d;for(let i=0;i<p.length-1;i++)o=o[p[i]]=o[p[i]]||{};o[p.at(-1)]=v;};
function inputs(d){const x=JSON.parse(JSON.stringify(d));const off=(f,ks)=>{if(!x[f])ks.forEach(k=>delete x[k]);};
 off('hasDeps',['kids','otherDeps','eicKids']);off('hasTips',['tips','overtime']);off('hasSE',['seNet','seHealth']);off('hasInv',['interest','taxExemptInt','ordDiv','qualDiv','stcg','ltcg']);
 off('hasRet',['ssBen','iraDist','pension','unemp']);off('hasOther',['other']);off('hasAdj',['ira','hsa','sli','educator']);off('hasItem',['mortgage','salt','charity','medical']);off('hasCar',['carInt']);
 off('hasCare',['careKids','careExp']);off('hasEdu',['aotcStudents','aotcExp','llcExp']);off('hasSaver',['saverYou','saverSp']);
 if(x.eicKids===''||x.eicKids==null) delete x.eicKids; if(x.status!=='mfj'){delete x.sp;delete x.wagesSp;} x.year=+x.year||2025; return x;}
const calc=()=>TaxEngine.compute(inputs(cur.data));
function tick(){const t=$('#ticker');if(!cur||step<0){t.classList.add('hidden');return;}t.classList.remove('hidden');const r=calc();
 $('#tkLabel').textContent=r.owed?'Estimated amount owed':'Estimated refund';const v=$('#tkVal');v.textContent=fmt(r.owed||r.refund);v.className=r.owed?'neg':'pos';$('#tkTax').textContent=fmt(r.totalTax);}
function helpBtn(h){return h?`<button class="help" type="button" aria-label="Help" onclick="this.closest('.q').querySelector('.tip').classList.toggle('show')">?</button>`:'';}
function field(f,d){
 if(f.t==='sp') return married(d)?field(f.item,d):'';
 const v=get(d,f.k);
 if(f.t==='check') return `<label class="chk"><input type="checkbox" data-k="${f.k}" ${v?'checked':''}>${f.label}</label>`;
 const tip=f.help?`<div class="tip">${f.help}</div>`:'';
 const inp=f.t==='money'?`<div class="money"><input inputmode="decimal" data-k="${f.k}" data-t="money" value="${v??''}" placeholder="0"></div>`:
  f.t==='count'?`<input inputmode="numeric" data-k="${f.k}" data-t="count" value="${v??''}" placeholder="0">`:`<input data-k="${f.k}" value="${v??''}" placeholder="e.g. Me 2025">`;
 return `<div class="q"><div class="lab">${f.label}${helpBtn(f.help)}</div>${tip}${inp}</div>`;}
function item(it,d){
 if(it.t==='status') return `<div class="q"><div class="lab">What’s your filing status?${helpBtn(1)}</div><div class="tip">Your status on Dec. 31, 2025. If more than one fits, Head of household or Married filing jointly usually gives the lowest tax. See IRS Pub. 501.</div><div class="choices">${STATUS.map(([k,a,b])=>`<button class="choice ${d.status===k?'on':''}" data-status="${k}"><b>${a}</b><small>${b}</small></button>`).join('')}</div></div>`;
 if(it.t==='year') return `<div class="q"><div class="lab">Tax year</div><div class="choices"><button class="choice on"><b>2025</b><small>Filed in 2026</small></button><button class="choice" disabled style="opacity:.5"><b>2026</b><small>Coming when IRS releases 2026 forms</small></button></div></div>`;
 if(it.t==='group') return `<div class="q"><div class="lab">${it.label}${helpBtn(it.help)}</div><div class="tip">${it.help}</div><div class="checks">${it.items.map(f=>field(f,d)).join('')}${married(d)?it.spItems.map(f=>field(f,d)).join(''):''}</div></div>`;
 if(it.t==='yn'){const v=d[it.k];return `<div class="card"><div class="q" style="margin:0"><div class="lab" style="font-size:19px">${it.q}${helpBtn(it.help)}</div>${it.help?`<div class="tip">${it.help}</div>`:''}
  <div class="yn"><button data-yn="${it.k}" data-v="1" class="${v===true?'on':''}">Yes</button><button data-yn="${it.k}" data-v="0" class="${v===false?'on':''}">No</button></div>
  ${v?`<div class="reveal sub">${it.items.map(f=>f.t==='check'?`<div class="checks" style="margin:6px 0 12px">${field(f,d)}</div>`:field(f,d)).join('')}</div>`:''}</div></div>`;}
 return field(it,d);}
function progress(show){$('#prog').classList.toggle('hidden',!show);if(!show)return;const tot=STEPS.length+1;$('#barfill').style.width=((Math.min(step,tot-1)+1)/tot*100)+'%';
 $('#steplabel').innerHTML=`<span>Step ${Math.min(step+1,tot)} of ${tot}</span><span>${step<STEPS.length?STEPS[step].title:'Your result'}</span>`;}
function render(){window.scrollTo({top:0,behavior:'smooth'});$('#who').textContent=cur?(cur.data.name||'Untitled return')+' · TY'+(cur.data.year||2025):'Federal estimate';
 if(!cur){step=-1;progress(false);tick();return home();}
 if(step>=STEPS.length){progress(true);tick();$('#ticker').classList.add('hidden');return result();}
 progress(true);const S=STEPS[step],d=cur.data;
 $('#main').innerHTML=`<div class="view"><h1>${S.title}</h1><p class="lead">${S.lead}</p>${S.items.map(it=>it.t==='yn'?item(it,d):`<div class="card">${item(it,d)}</div>`).join('')}
 <div class="navrow"><button class="ghost" id="back">← Back</button><button class="primary" id="next">${step===STEPS.length-1?'See my result':'Continue'} →</button></div></div>`;
 tick();}
document.addEventListener('input',e=>{const el=e.target;if(!cur||!el.dataset.k)return;let v=el.value;
 if(el.dataset.t==='money'){v=v.replace(/[^0-9.\-]/g,'');} if(el.dataset.t==='count')v=v.replace(/\D/g,'');
 if(el.type==='checkbox')v=el.checked; set(cur.data,el.dataset.k,v);save();tick();if(el.dataset.k==='name')$('#who').textContent=(v||'Untitled return')+' · TY2025';});
document.addEventListener('click',e=>{const b=e.target.closest('button,[data-go]');if(!b)return;
 if(b.dataset.go){cur=b.dataset.go==='home'?null:cur;return b.dataset.go==='home'?render():b.dataset.go==='sources'?sources():about();}
 if(b.dataset.status){cur.data.status=b.dataset.status;save();return render();}
 if(b.dataset.yn){cur.data[b.dataset.yn]=b.dataset.v==='1';save();const y=window.scrollY;render();window.scrollTo(0,y);return;}
 if(b.id==='next'){step++;return render();} if(b.id==='back'){step--;if(step<0){cur=null;}return render();}
});
function home(){const list=store.slice().sort((a,b)=>b.updated-a.updated);
 $('#main').innerHTML=`<div class="view"><h1>Estimate a federal tax return</h1><p class="lead">2025 tax year (filed in 2026). Step-by-step, plain English, with your refund updating as you go.</p>
 <button class="primary" id="new" style="width:100%;font-size:19px;min-height:62px">＋ Start a new return</button>
 ${list.length?'<h2 style="margin-top:28px">Saved returns</h2>':''}${list.map(r=>{let x;try{x=TaxEngine.compute(inputs(r.data));}catch(e){x={refund:0,owed:0}}return `<div class="card ret"><div><b>${esc(r.data.name||'Untitled return')}</b><br><small>TY${r.data.year||2025} · ${(STATUS.find(s=>s[0]===r.data.status)||[0,'No status yet'])[1]} · <span class="${x.owed?'neg':'pos'}">${x.owed?'Owes '+fmt(x.owed):'Refund '+fmt(x.refund)}</span></small></div><div style="display:flex;gap:8px"><button data-open="${r.id}">Open</button><button class="ghost danger" data-del="${r.id}" aria-label="Delete">✕</button></div></div>`}).join('')}
 <div class="card"><h2>Backup & share</h2><p class="mut">Returns are saved only on this device. Export a backup file to move them to another device.</p><div class="navrow" style="margin-top:8px"><button id="exp">⬇ Export</button><label class="btn" style="flex:1">⬆ Import<input type="file" id="imp" accept=".json" hidden></label></div></div>
 <div class="note">🔒 Never enter a Social Security number. This app never asks for one and nothing leaves this device.<br>⚠️ This is an <b>estimate</b>, not a filed return. File with <a href="https://www.irs.gov/filing/irs-free-file-do-your-federal-taxes-for-free" target="_blank">IRS Free File</a> (free if 2025 income is $89,000 or less) or a tax professional. IRS Direct File is <b>not</b> offered for 2025 returns.</div></div>`;
 $('#new').onclick=()=>{cur={id:Date.now().toString(36),updated:Date.now(),data:{year:2025,status:'single'}};store.push(cur);save();step=0;render();};
 document.querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>{cur=store.find(r=>r.id===b.dataset.open);step=0;render();});
 document.querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>{const r=store.find(x=>x.id===b.dataset.del);if(confirm('Delete “'+(r.data.name||'Untitled')+'”? This can’t be undone.')){store=store.filter(x=>x!==r);save();render();}});
 $('#exp').onclick=()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify({app:'tax-calculator',v:1,returns:store},null,1)],{type:'application/json'}));a.download='tax-returns-backup.json';a.click();};
 $('#imp').onchange=e=>{const f=e.target.files[0];if(!f)return;f.text().then(t=>{try{const j=JSON.parse(t),rs=j.returns||j;let n=0;rs.forEach(r=>{if(r&&r.data){const i=store.findIndex(x=>x.id===r.id);if(i>=0)store[i]=r;else store.push(r);n++;}});save();alert('Imported '+n+' return(s).');render();}catch(_){alert('That file isn’t a Tax Calculator backup.');}});};}
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const LN=[['1z','Wages'],['2b','Taxable interest'],['3a','Qualified dividends'],['3b','Ordinary dividends'],['4b','IRA distributions (taxable)'],['5b','Pensions & annuities (taxable)'],['6a','Social Security benefits'],['6b','Social Security (taxable)'],['7a','Capital gain or (loss)'],['8','Schedule 1 income (business, unemployment, other)'],['9','Total income',1],['10','Adjustments to income'],['11','Adjusted gross income (AGI)',1],['12e','Standard or itemized deduction'],['13a','Qualified business income deduction'],['13b','Schedule 1-A (tips, overtime, car loan, seniors)'],['14','Total deductions'],['15','Taxable income',1],['16','Tax'],['19','Child tax credit / credit for other dependents'],['20','Other credits (Schedule 3)'],['22','Tax after credits'],['23','Other taxes (SE tax, Medicare, NIIT)'],['24','Total tax',1],['25d','Federal tax withheld'],['26','Estimated payments'],['27a','Earned income credit'],['28','Additional child tax credit'],['29','American opportunity credit (refundable)'],['33','Total payments',1],['34','Overpaid (refund)',1],['37','Amount you owe',1]];
function result(){const r=calc(),d=cur.data,own=r.owed>0;
 $('#main').innerHTML=`<div class="view"><div class="hero ${own?'neg':'pos'}"><div class="k ${own?'neg':'pos'}">${own?'You owe':'Your refund'}</div><div class="v ${own?'neg':'pos'}">${fmt(own?r.owed:r.refund)}</div><div class="mut">${esc(d.name||'Untitled return')} · Tax year ${r.year} · ${STATUS.find(s=>s[0]===r.status)[1]}</div></div>
 <div class="stats"><div class="stat"><small>Total income</small><b>${fmt(r.totalIncome)}</b></div><div class="stat"><small>AGI</small><b>${fmt(r.agi)}</b></div><div class="stat"><small>Taxable income</small><b>${fmt(r.taxableIncome)}</b></div><div class="stat"><small>Total tax</small><b>${fmt(r.totalTax)}</b></div><div class="stat"><small>Total payments</small><b>${fmt(r.payments)}</b></div><div class="stat"><small>Effective rate</small><b>${pct(r.eff)}</b></div><div class="stat"><small>Tax bracket</small><b>${Math.round(r.marginal*100)}%</b></div><div class="stat"><small>Deduction used</small><b>${r.itemized?'Itemized':'Standard'}</b></div></div>
 ${r.notes.map(n=>`<div class="note">${n}</div>`).join('')}
 <div class="card"><h2>Line-by-line (Form 1040)</h2><p class="mut">Rounded to whole dollars, mapped to 2025 Form 1040 lines.</p><table>${LN.filter(([k,,t])=>t||r.lines[k]).map(([k,l,t])=>`<tr class="${t?'tot':''}"><td>${k}</td><td>${l}</td><td>${fmt(r.lines[k])}</td></tr>`).join('')}</table></div>
 <div class="card"><h2>How we got there</h2><table>
 <tr><td></td><td>Standard deduction</td><td>${fmt(r.standard)}</td></tr><tr><td></td><td>Itemized total</td><td>${fmt(r.itemTotal)}</td></tr>
 ${r.seTax?`<tr><td></td><td>Self-employment tax</td><td>${fmt(r.seTax)}</td></tr>`:''}${r.addMed?`<tr><td></td><td>Additional Medicare tax</td><td>${fmt(r.addMed)}</td></tr>`:''}${r.niit?`<tr><td></td><td>Net investment income tax</td><td>${fmt(r.niit)}</td></tr>`:''}
 ${[['tips','No tax on tips'],['ot','No tax on overtime'],['car','Car loan interest'],['sen','Senior deduction']].filter(([k])=>r.sch1a[k]).map(([k,l])=>`<tr><td></td><td>${l}</td><td>${fmt(r.sch1a[k])}</td></tr>`).join('')}
 ${[['care','Child & dependent care credit'],['edu','Education credits (nonrefundable)'],['saver','Saver’s credit']].filter(([k])=>r.credits[k]).map(([k,l])=>`<tr><td></td><td>${l}</td><td>${fmt(r.credits[k])}</td></tr>`).join('')}
 </table></div>
 <div class="note">⚠️ <b>This is an estimate</b> using official IRS 2025 figures, not a filed return. Some situations aren’t covered (see Help). To file for free use <a href="https://www.irs.gov/filing/irs-free-file-do-your-federal-taxes-for-free" target="_blank">IRS Free File</a> (2025 AGI $89,000 or less) or Free File Fillable Forms, or see a tax professional. IRS Direct File is not available for 2025 returns.</div>
 <div class="navrow noprint"><button class="ghost" id="back">← Edit answers</button><button class="primary" onclick="window.print()">🖨 Print / Save PDF</button></div>
 <div class="navrow noprint" style="margin-top:10px"><button style="flex:1" data-go="home">Done — back to returns</button></div></div>`;}
function sources(){progress(false);$('#ticker').classList.add('hidden');const S=[
 ['2025 Form 1040 & Instructions (tax table, tax computation worksheet, standard deduction, QDCG worksheet, Social Security worksheet, IRA & student-loan worksheets, EIC table)','https://www.irs.gov/pub/irs-pdf/i1040gi.pdf'],
 ['2025 Form 1040','https://www.irs.gov/pub/irs-pdf/f1040.pdf'],['2025 Schedule 1-A — tips, overtime, car loan interest, enhanced senior deduction (One Big Beautiful Bill Act)','https://www.irs.gov/pub/irs-pdf/f1040s1a.pdf'],
 ['2025 Schedule A instructions — $40,000 SALT cap & phase-down','https://www.irs.gov/pub/irs-pdf/i1040sca.pdf'],['2025 Schedule 8812 instructions — $2,200 CTC, $1,700 ACTC','https://www.irs.gov/pub/irs-pdf/i1040s8.pdf'],
 ['2025 Schedule SE — $176,100 wage base','https://www.irs.gov/pub/irs-pdf/f1040sse.pdf'],['Publication 596 (2025) — Earned Income Credit','https://www.irs.gov/pub/irs-pdf/p596.pdf'],['Publication 915 (2025) — Social Security benefits','https://www.irs.gov/pub/irs-pdf/p915.pdf'],
 ['Form 8863 instructions — education credits','https://www.irs.gov/pub/irs-pdf/i8863.pdf'],['2025 Form 8880 — Saver’s credit','https://www.irs.gov/pub/irs-pdf/f8880.pdf'],['Form 2441 instructions — child & dependent care','https://www.irs.gov/pub/irs-pdf/i2441.pdf'],
 ['Form 8889 instructions — HSA limits','https://www.irs.gov/pub/irs-pdf/i8889.pdf'],['Form 8959 — Additional Medicare tax','https://www.irs.gov/pub/irs-pdf/i8959.pdf'],['Form 8960 — Net investment income tax','https://www.irs.gov/pub/irs-pdf/i8960.pdf'],['Form 8995 instructions — QBI deduction','https://www.irs.gov/pub/irs-pdf/i8995.pdf'],
 ['IRS: Working Families Tax Cuts (One Big Beautiful Bill) provisions','https://www.irs.gov/newsroom/one-big-beautiful-bill-provisions'],['IRS Free File (IR-2026-05)','https://www.irs.gov/newsroom/use-irs-free-file-to-conveniently-file-your-return-at-no-cost'],['AP: IRS Direct File not available in 2026 filing season','https://apnews.com/article/irs-direct-file-not-available-2026-04f2d0c31bec80b55d122a0e76e08c36']];
 $('#main').innerHTML=`<div class="view"><h1>Sources</h1><p class="lead">Every number in this app comes from these official IRS documents for tax year 2025. The calculator was tested against every row of the official 2025 Tax Table and EIC Table.</p><div class="card"><ul class="src">${S.map(([t,u])=>`<li><a href="${u}" target="_blank" rel="noopener">${t}</a></li>`).join('')}</ul></div><button class="ghost" data-go="home">← Back</button></div>`;}
function about(){progress(false);$('#ticker').classList.add('hidden');
 $('#main').innerHTML=`<div class="view"><h1>Help & limits</h1><div class="card"><h2>How to use</h2><p>Tap <b>Start a new return</b>, answer each step, and watch the refund/owed total at the bottom update live. Tap any <b>?</b> for a plain-English tip. Answer “No” to skip sections that don’t apply. Your answers save automatically on this device.</p></div>
 <div class="card"><h2>Not included (see a professional)</h2><ul><li>State returns (Texas has no state income tax)</li><li>Rental income (Schedule E), farm income, K-1s, foreign income</li><li>Alternative minimum tax, kiddie tax, household employment taxes</li><li>QBI deduction above $197,300 ($394,600 joint) taxable income</li><li>Premium tax credit (marketplace health insurance), energy/EV credits, adoption credit</li><li>Being claimed as someone else’s dependent; dual-status aliens</li><li>Early-withdrawal penalties on retirement money</li><li>Self-employment for both spouses is treated as one person’s</li></ul></div>
 <div class="card"><h2>Privacy</h2><p>No Social Security numbers. No accounts. Nothing is sent anywhere — data stays in this browser. Use Export to back up.</p></div><button class="ghost" data-go="home">← Back</button></div>`;}
if('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');
render();
