const fs=require('fs'),T=require('../tax.js'),C=T.YEARS[2025];
let pass=0,fail=0;const eq=(n,a,b)=>{if(a===b)pass++;else{fail++;console.log('FAIL',n,'got',a,'want',b);}};
const txt=fs.readFileSync(__dirname+'/i1040gi.txt','utf8').split('\n');
// 1) Every row of the official 2025 Tax Table (Form 1040 instructions)
const st=['single','mfj','mfs','hoh'];let rows=0;
txt.slice(4740,6400).forEach(l=>{const n=l.trim().replace(/,/g,'').split(/\s+/).map(Number);
 for(let i=0;i+6<=n.length;i+=6){const g=n.slice(i,i+6);if(g.some(isNaN)||g[1]<=g[0]||g[0]>=100000)continue;if(!(g[1]-g[0]===5||g[1]-g[0]===10||g[1]-g[0]===25||g[1]-g[0]===50))continue;
  rows++;st.forEach((s,k)=>{eq('table '+s+' '+g[0],T.taxTable(g[0],s,C),g[2+k]);eq('table hi '+s+' '+g[0],T.taxTable(g[1]-0.01,s,C),g[2+k]);});}});
console.log('Tax Table rows checked:',rows);
// 2) Every row of the official 2025 EIC Table
let er=0;txt.slice(3200,4740).forEach(l=>{const n=l.trim().replace(/,/g,'').split(/\s+/).map(Number);
 for(let i=0;i+10<=n.length;i+=10){const g=n.slice(i,i+10);if(g.some(isNaN)||g[1]-g[0]!==50&&!(g[0]===1&&g[1]===50))continue;er++;
  for(let k=0;k<4;k++){eq('eic s'+k+' '+g[0],T.eicAmt(g[0]+1,C.eic.k[k],false),g[2+k]);eq('eic j'+k+' '+g[0],T.eicAmt(g[0]+1,C.eic.k[k],true),g[6+k]);}}});
console.log('EIC Table rows checked:',er);
// 3) Worked examples
const ex=(name,inp,check)=>{const r=T.compute(inp);console.log('\n'+name+': AGI',r.agi,'TI',r.taxableIncome,'tax',r.tax,'totalTax',r.totalTax,'payments',r.payments,r.refund?'REFUND '+r.refund:'OWED '+r.owed,r.notes.join(' | '));check(r);};
ex('Single W-2 $50k',{status:'single',wages:50000,withholding:5000},r=>{eq('ti',r.taxableIncome,34250);eq('tax',r.tax,3875);eq('refund',r.refund,1125);});
// MFJ 2 kids $90k: TI 58,500 -> official table 6,546; CTC 4,400 -> 2,146
ex('MFJ 2 kids $90k',{status:'mfj',wages:90000,kids:2,withholding:3000},r=>{eq('ti',r.taxableIncome,58500);eq('tax',r.tax,6546);eq('ctc',r.credits.ctc,4400);eq('eic',r.credits.eic,0);eq('total',r.totalTax,2146);eq('refund',r.refund,854);});
// Self-employed $60k single: SE earn 55,410 ; SE tax 8,477.73; half 4,238.87 ; AGI 55,761.13 ; pre-QBI 40,011.13 ; QBI .2*(60000-4238.87)=11,152.23 vs .2*40011.13=8,002.23 -> 8,002.23 ; TI 32,009 -> table 3,605
ex('Self-employed $60k',{status:'single',seNet:60000,estPay:8000},r=>{eq('seTax',r.seTax,8477.73);eq('agi',r.agi,55761);eq('qbi',r.qbi,8002.23);eq('ti',r.taxableIncome,32009);eq('tax',r.tax,3605);eq('total',r.totalTax,12083);});
// Retiree MFJ both 65+: SS 40,000, pension 30,000, IRA 10,000.  provisional = 20,000+40,000 = 60,000; l9=28,000; l11=16,000; l12=12,000 -> 6,000 ; 6,000+13,600 = 19,600 taxable SS
// AGI 59,600 ; std 31,500+3,200=34,700 ; senior 2x6,000 (MAGI<150k) -> TI 59,600-34,700-12,000 = 12,900 -> table (12,900-12,950 mid 12,925) = 1,292.50 -> 1,293
ex('Retiree MFJ 65+ w/ SS',{status:'mfj',you:{age65:1},sp:{age65:1},ssBen:40000,pension:30000,iraDist:10000,withholding:2000},r=>{eq('ssT',r.ssTaxable,19600);eq('agi',r.agi,59600);eq('ded',r.deduction,34700);eq('sen',r.sch1a.sen,12000);eq('ti',r.taxableIncome,12900);eq('tax',r.tax,1293);eq('refund',r.refund,707);});
// HoH 1 child $30k: TI 6,375 -> table; EIC at 30,000 1 child: 4328-(30025-23350)*.1598=3,261.33 -> 3,261 ; ACTC
ex('HoH 1 child $30k',{status:'hoh',wages:30000,kids:1,withholding:1000},r=>{eq('ti',r.taxableIncome,6375);eq('tax',r.tax,T.taxTable(6375,'hoh',C));eq('eic',r.credits.eic,3261);eq('ctc+actc',r.credits.ctc+r.credits.actc,Math.min(2200,r.tax+1700));});
// Qualified dividends/LTCG single: wages 40k, LTCG 20k -> TI 44,250 all within 0% for gains: ordinary 24,250 table tax
ex('Single w/ LTCG',{status:'single',wages:40000,ltcg:20000},r=>{eq('tax',r.tax,T.taxTable(24250,'single',C));eq('at0',r.cg.at0,20000);});
// Tips & overtime single 70k incl 8k tips + 5k OT
ex('Tips+OT single',{status:'single',wages:70000,tips:8000,overtime:5000,withholding:6000},r=>{eq('1a',r.lines['13b'],13000);eq('ti',r.taxableIncome,41250);});
// Car interest phase-out: MAGI 105,500 -> reduce ceil(5.5)=6*200=1200
ex('Car loan phase-out',{status:'single',wages:105500,carInt:3000},r=>{eq('car',r.sch1a.car,1800);});
// SALT phase-down: MFJ AGI 600k, SALT 50k -> cap 40,000-30,000=10,000 floor
ex('SALT high income',{status:'mfj',wages:600000,salt:50000,mortgage:30000},r=>{eq('item',r.itemTotal,40000);eq('addMed',r.addMed,3150);});
console.log(`\n${pass} passed, ${fail} failed`);process.exit(fail?1:0);
