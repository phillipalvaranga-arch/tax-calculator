/* Tax Return Calculator engine — US federal, TY2025. Figures from IRS 2025 Form 1040 instructions,
   Schedule 1-A, Schedule A/8812/SE instructions, Forms 8863/8880/2441/8959/8960/8995 (see Sources page). */
(function(root){
const Y={2025:{
 std:{single:15750,mfj:31500,mfs:15750,hoh:23625,qss:31500},
 addl:{single:2000,hoh:2000,mfj:1600,mfs:1600,qss:1600},
 br:{single:[11925,48475,103350,197300,250525,626350],mfs:[11925,48475,103350,197300,250525,375800],
     mfj:[23850,96950,206700,394600,501050,751600],qss:[23850,96950,206700,394600,501050,751600],
     hoh:[17000,64850,103350,197300,250500,626350]},
 rates:[.10,.12,.22,.24,.32,.35,.37],
 cg0:{single:48350,mfs:48350,mfj:96700,qss:96700,hoh:64750},
 cg15:{single:533400,mfs:300000,mfj:600050,qss:600050,hoh:566700},
 ssWageBase:176100,
 ctc:2200,actc:1700,odc:500,ctcThr:{mfj:400000,other:200000},
 eic:{maxInv:11950,
   k:[{rate:.0765,earn:8490,max:649,pr:.0765,start:10620,startJ:17730},
      {rate:.34,earn:12730,max:4328,pr:.1598,start:23350,startJ:30470},
      {rate:.40,earn:17880,max:7152,pr:.2106,start:23350,startJ:30470},
      {rate:.45,earn:17880,max:8046,pr:.2106,start:23350,startJ:30470}]},
 salt:{cap:40000,capMfs:20000,thr:500000,thrMfs:250000,floor:10000,floorMfs:5000},
 sli:{max:2500,lo:85000,loJ:170000,rng:15000,rngJ:30000},
 educator:300, ira:{lim:7000,catch:1000,single:[79000,89000],mfj:[126000,146000],spouse:[236000,246000],mfs:[0,10000]},
 hsa:{self:4300,fam:8550,catch:1000},
 tips:{max:25000,thr:150000,thrJ:300000}, ot:{max:12500,maxJ:25000,thr:150000,thrJ:300000},
 car:{max:10000,thr:100000,thrJ:200000}, senior:{amt:6000,thr:75000,thrJ:150000},
 edu:{lo:80000,hi:90000,loJ:160000,hiJ:180000},
 saver:{mfj:[47500,51000,79000],hoh:[35625,38250,59250],other:[23750,25500,39500]},
 care:{one:3000,two:6000},
 addMed:{mfj:250000,mfs:125000,other:200000}, niit:{mfj:250000,qss:250000,mfs:125000,other:200000},
 qbi:{thr:197300,thrJ:394600}
}};
const r2=x=>Math.round(x*100)/100, R=x=>Math.round(x), P=x=>Math.max(0,+x||0), N=x=>+x||0;
const J=s=>s==='mfj'||s==='qss';
function rateTax(ti,s,c){const b=c.br[s];let t=0,prev=0;for(let i=0;i<7;i++){const top=i<6?b[i]:Infinity;if(ti>prev){t+=(Math.min(ti,top)-prev)*c.rates[i];}prev=top;}return t;}
// IRS Tax Table for taxable income under $100,000 (tax on midpoint of the row, rounded)
function taxTable(ti,s,c){ if(ti<=0) return 0; if(ti>=100000) return r2(rateTax(ti,s,c));
 let mid; if(ti<5) return 0; else if(ti<15) mid=10; else if(ti<25) mid=20; else if(ti<3000) mid=Math.floor((ti-25)/25)*25+25+12.5; else mid=Math.floor(ti/50)*50+25;
 return R(rateTax(mid,s,c)); }
function marginal(ti,s,c){const b=c.br[s];for(let i=0;i<6;i++) if(ti<=b[i]) return c.rates[i];return .37;}
// Qualified Dividends and Capital Gain Tax Worksheet (2025)
function qdcg(ti,qd,netcg,s,c){const l1=ti,l4=Math.min(l1,qd+netcg),l5=P(l1-l4),l7=Math.min(l1,c.cg0[s]),l8=Math.min(l5,l7),l9=l7-l8;
 const l10=Math.min(l1,l4),l12=l10-l9,l14=Math.min(l1,c.cg15[s]),l16=P(l14-(l5+l9)),l17=Math.min(l12,l16),l18=l17*.15,
 l20=l10-(l9+l17),l21=l20*.20,l22=taxTable(l5,s,c),l23=l18+l21+l22,l24=taxTable(l1,s,c);
 return {tax:Math.min(l23,l24),at0:l9,at15:l17,at20:l20};}
function ssTaxable(ben,other,status,lived){ if(ben<=0) return 0;
 const l2=ben/2,l=l2+other; let base,l10; if(status==='mfj'){base=32000;l10=12000;} else if(status==='mfs'&&!lived){base=0;l10=0;} else {base=25000;l10=9000;}
 if(l<=base) return 0; const l9=l-base,l11=P(l9-l10),l12=Math.min(l9,l10),l14=Math.min(l2,l12/2),l16=l14+l11*.85; return Math.min(l16,.85*ben);}
function eicAmt(x,k,j){ if(x<=0) return 0; const lo=Math.floor(x/50)*50, mid=lo+25; const ph=j?k.startJ:k.start;
 let cr=(lo+50>k.earn)?k.max:R(mid*k.rate); if(lo>=ph) cr=Math.max(0,R(k.max-(mid-ph)*k.pr)); return cr;}
function compute(inp){
 const c=Y[inp.year||2025], s=inp.status||'single', j=J(s), mfs=s==='mfs', notes=[], L={};
 const g=k=>P(inp[k]);
 const you=inp.you||{}, sp=(s==='mfj')?(inp.sp||{}):{};
 const kids=Math.floor(g('kids')), others=Math.floor(g('otherDeps')), eicKids=Math.min(3,Math.floor(inp.eicKids==null?kids:g('eicKids')));
 const wages=g('wages'), wagesSp=Math.min(wages,g('wagesSp'));
 // Self-employment (Schedule SE)
 const seNet=N(inp.seNet); let seTax=0,seEarn=0,seSS=0,seMed=0;
 if(seNet>0){seEarn=seNet*.9235; if(seEarn<400) seEarn=0; else { const yourWages=wages-wagesSp; seSS=Math.min(seEarn,P(c.ssWageBase-yourWages))*.124; seMed=seEarn*.029; seTax=r2(seSS+seMed);} }
 const halfSE=r2(seTax/2);
 // Capital gains
 const st=N(inp.stcg), lt=N(inp.ltcg); let cap=st+lt; if(cap<-(mfs?1500:3000)){notes.push('Capital loss limited to $'+(mfs?'1,500':'3,000')+'; the rest carries over to next year.'); cap=-(mfs?1500:3000);} 
 const netLTCG=P(Math.min(lt,st+lt)); const qd=Math.min(g('qualDiv'),g('ordDiv'));
 const sch1Inc=seNet+g('unemp')+N(inp.other);
 const preSS=wages+g('interest')+g('ordDiv')+cap+g('iraDist')+g('pension')+sch1Inc;
 // Adjustments (Schedule 1 Part II)
 const educ=Math.min(g('educator'),c.educator*(s==='mfj'?2:1));
 const seHealth=Math.min(g('seHealth'),P(seNet-halfSE));
 const hsaCap=(inp.hsaFamily?c.hsa.fam:c.hsa.self)+(inp.hsa55?c.hsa.catch:0)*(s==='mfj'&&inp.hsaFamily?2:1);
 const hsa=Math.min(g('hsa'),hsaCap); if(g('hsa')>hsaCap) notes.push('HSA deduction capped at the 2025 limit of $'+hsaCap.toLocaleString()+'.');
 const adjNoIRA=educ+halfSE+seHealth+hsa;
 // IRA deduction (two-pass because of Social Security interaction)
 function iraDed(magi){ let lim=c.ira.lim+(inp.ira50?c.ira.catch:0); let want=Math.min(g('ira'),lim*(s==='mfj'?2:1)); if(!want) return 0;
  const cov=!!inp.iraCovered, spCov=s==='mfj'&&!!inp.iraSpouseCovered; if(!cov&&!spCov) return want;
  let rg=mfs?c.ira.mfs:(j? (cov?c.ira.mfj:c.ira.spouse):c.ira.single); const width=rg[1]-rg[0];
  if(magi<=rg[0]) return want; if(magi>=rg[1]) return 0; let red=Math.ceil(lim*(rg[1]-magi)/width/10)*10; if(red<200) red=200; return Math.min(want,red*(s==='mfj'?2:1)); }
 let ssT=ssTaxable(g('ssBen'),preSS+g('taxExemptInt')-adjNoIRA,s,inp.mfsLivedTogether!==false);
 let ira=iraDed(preSS+ssT-adjNoIRA);
 ssT=ssTaxable(g('ssBen'),preSS+g('taxExemptInt')-adjNoIRA-ira,s,inp.mfsLivedTogether!==false);
 const totalInc=preSS+ssT;
 // Student loan interest
 let sli=0; if(g('sli')&&!mfs){ sli=Math.min(g('sli'),c.sli.max); const m=totalInc-adjNoIRA-ira, lo=j&&s==='mfj'?c.sli.loJ:c.sli.lo, rg=s==='mfj'?c.sli.rngJ:c.sli.rng; if(m>lo) sli=r2(sli*(1-Math.min(1,Math.round((m-lo)/rg*1000)/1000))); }
 else if(g('sli')&&mfs) notes.push('Student loan interest can’t be deducted when married filing separately.');
 const adj=r2(adjNoIRA+ira+sli), agi=r2(totalInc-adj);
 // Deductions
 const nAddl=(you.age65?1:0)+(you.blind?1:0)+(sp.age65?1:0)+(sp.blind?1:0);
 const std=c.std[s]+nAddl*c.addl[s];
 const med=P(g('medical')-.075*agi);
 const saltIn=g('salt'); let cap5=mfs?c.salt.capMfs:c.salt.cap; const thr=mfs?c.salt.thrMfs:c.salt.thr; if(agi>thr) cap5=Math.max(mfs?c.salt.floorMfs:c.salt.floor,cap5-.3*(agi-thr));
 const salt=Math.min(saltIn,cap5);
 const item=r2(med+salt+g('mortgage')+g('charity'));
 const useItem=inp.forceItemize|| item>std; const ded=useItem?item:std;
 // Schedule 1-A (OBBBA): tips, overtime, car loan interest, seniors
 const magi=agi; const sJ=s==='mfj';
 let tips=0,ot=0,car=0,sen=0;
 if(g('tips')){ if(mfs) notes.push('Tips deduction requires filing jointly if married.'); else { const l7=Math.min(g('tips'),c.tips.max), ex=P(magi-(sJ?c.tips.thrJ:c.tips.thr)); tips=P(l7-Math.floor(ex/1000)*100);} }
 if(g('overtime')){ if(mfs) notes.push('Overtime deduction requires filing jointly if married.'); else { const l15=Math.min(g('overtime'),sJ?c.ot.maxJ:c.ot.max), ex=P(magi-(sJ?c.ot.thrJ:c.ot.thr)); ot=P(l15-Math.floor(ex/1000)*100);} }
 if(g('carInt')){ const l24=Math.min(g('carInt'),c.car.max), ex=P(magi-(sJ?c.car.thrJ:c.car.thr)); car=P(l24-Math.ceil(ex/1000)*200); }
 const nSen=(you.age65?1:0)+(sp.age65?1:0);
 if(nSen){ if(mfs) notes.push('Senior deduction requires filing jointly if married.'); else { const ex=P(magi-(sJ?c.senior.thrJ:c.senior.thr)); sen=nSen*P(c.senior.amt-ex*.06);} }
 const sch1a=r2(tips+ot+car+sen);
 // QBI (simplified Form 8995)
 let qbiD=0; const preQBI=P(agi-ded-sch1a);
 if(seNet>0){ const lim=sJ?c.qbi.thrJ:c.qbi.thr; if(preQBI<=lim){ const qbi=P(seNet-halfSE-seHealth); qbiD=r2(Math.min(qbi*.2,P(preQBI-netLTCG-qd)*.2)); } else notes.push('Taxable income is above the $'+lim.toLocaleString()+' QBI threshold — the 20% business deduction (Form 8995-A) was NOT estimated; see a professional.'); }
 const ti=R(P(agi-ded-sch1a-qbiD));
 // Tax
 let tax,cg=null; if(qd+netLTCG>0){cg=qdcg(ti,qd,netLTCG,s,c);tax=cg.tax;} else tax=taxTable(ti,s,c); tax=R(tax);
 // Nonrefundable credits (Schedule 3 first, then CTC/ODC per Credit Limit Worksheet A)
 let left=tax;
 const earnedSE=P(seEarn-halfSE)*(seEarn>0?1:0); const earned=wages+(seNet>0?P(seNet-halfSE):0);
 // child & dependent care (Form 2441, 2025 rules)
 let care=0; const careN=Math.floor(g('careKids'));
 if(careN&&g('careExp')&&!mfs){ let e=Math.min(g('careExp'),careN>1?c.care.two:c.care.one); const lowEarn=s==='mfj'?Math.min(wagesSp+(inp.seSpouse?earnedSE:0),earned-wagesSp):earned; e=Math.min(e,s==='mfj'?P(lowEarn):earned);
   let rate=.35; if(agi>15000) rate=Math.max(.20,.35-Math.ceil((agi-15000)/2000)*.01); care=Math.min(left,R(e*rate)); left-=care; }
 // education (Form 8863)
 let aotcN=0,aotcR=0,llc=0; const nStu=Math.floor(g('aotcStudents'));
 if(!mfs&&(nStu||g('llcExp'))){ const lo=sJ?c.edu.loJ:c.edu.lo, hi=sJ?c.edu.hiJ:c.edu.hi; const f=agi>=hi?0:agi<=lo?1:Math.round((hi-agi)/(hi-lo)*1000)/1000;
   let a=0; if(nStu){ const per=Math.min(g('aotcExp')/nStu,4000); a=nStu*(Math.min(per,2000)+.25*P(per-2000)); }
   a=r2(a*f); aotcR=R(a*.4); const aNon=a-aotcR; llc=R(Math.min(g('llcExp'),10000)*.2*f);
   aotcN=Math.min(left,R(aNon+llc)); left-=aotcN; }
 // saver's credit (Form 8880)
 let saver=0; if(g('saverYou')||g('saverSp')){ const t=s==='mfj'?c.saver.mfj:(s==='hoh'?c.saver.hoh:c.saver.other); const rt=agi<=t[0]?.5:agi<=t[1]?.2:agi<=t[2]?.1:0;
   const base=Math.min(g('saverYou'),2000)+(s==='mfj'?Math.min(g('saverSp'),2000):0); saver=Math.min(left,R(base*rt)); left-=saver; }
 // CTC / ODC / ACTC (Schedule 8812)
 const ctcThr=s==='mfj'?c.ctcThr.mfj:c.ctcThr.other; const ctcMax=kids*c.ctc+others*c.odc; const red=agi>ctcThr?Math.ceil((agi-ctcThr)/1000)*50:0; const ctcAll=P(ctcMax-red);
 const ctcNon=Math.min(left,ctcAll); left-=ctcNon;
 let actc=0; if(kids&&ctcAll>ctcNon){ const kidPart=P(Math.min(ctcAll,kids*c.ctc)-ctcNon); actc=Math.min(kidPart,kids*c.actc,R(.15*P(earned-2500))); }
 const nonref=tax-left;
 // Other taxes (Schedule 2)
 const amThr=s==='mfj'?c.addMed.mfj:mfs?c.addMed.mfs:c.addMed.other;
 const addMed=r2(.009*P(wages-amThr)+.009*P(seEarn-P(amThr-wages)));
 const nii=P(g('interest')+g('ordDiv')+cap); const nThr=c.niit[s]||c.niit.other; const niit=r2(.038*Math.min(nii,P(agi-nThr)));
 const otherTax=R(seTax+addMed+niit);
 const totalTax=R(P(tax-nonref)+otherTax);
 // EIC
 let eic=0; const inv=g('interest')+g('taxExemptInt')+g('ordDiv')+P(cap);
 if(inp.noEIC||earned<=0){} else if(mfs&&!inp.mfsSeparated){ if(earned>0) notes.push('EIC generally isn’t allowed for married filing separately (unless separated — see Pub. 596).'); }
 else if(inv>c.eic.maxInv){ notes.push('No EIC: investment income is over $11,950.'); }
 else if(eicKids===0 && (you.age65||sp.age65)){ notes.push('EIC with no children requires age 25–64.'); }
 else { const k=c.eic.k[eicKids]; const e1=eicAmt(earned,k,s==='mfj'); const ph=s==='mfj'?k.startJ:k.start; eic=(agi>=ph&&agi!==earned)?Math.min(e1,eicAmt(agi,k,s==='mfj')):e1; if(agi<=0) eic=e1; }
 const wh=g('withholding'), est=g('estPay');
 const refundable=R(eic+actc+aotcR); const payments=R(wh+est+refundable);
 const diff=payments-totalTax;
 L['1z']=wages;L['2a']=g('taxExemptInt');L['2b']=g('interest');L['3a']=qd;L['3b']=g('ordDiv');L['4b']=g('iraDist');L['5b']=g('pension');L['6a']=g('ssBen');L['6b']=R(ssT);L['7a']=R(cap);L['8']=R(sch1Inc);L['9']=R(totalInc);L['10']=R(adj);L['11']=R(agi);
 L['12e']=R(ded);L['13a']=R(qbiD);L['13b']=R(sch1a);L['14']=R(ded+qbiD+sch1a);L['15']=ti;L['16']=tax;L['18']=tax;L['19']=ctcNon;L['20']=R(care+aotcN+saver);L['21']=R(nonref);L['22']=P(tax-nonref);
 L['23']=otherTax;L['24']=totalTax;L['25d']=wh;L['26']=est;L['27a']=eic;L['28']=actc;L['29']=aotcR;L['32']=refundable;L['33']=payments;L['34']=P(diff);L['37']=P(-diff);
 return {year:inp.year||2025,status:s,lines:L,totalIncome:R(totalInc),agi:R(agi),deduction:R(ded),itemized:useItem,standard:std,itemTotal:item,
   taxableIncome:ti,tax,credits:{ctc:ctcNon,care,edu:aotcN,saver,actc,eic,aotcRefund:aotcR},nonref,seTax,addMed,niit,otherTax,totalTax,
   payments,refund:diff>=0?diff:0,owed:diff<0?-diff:0,eff:totalInc>0?totalTax/totalInc:0,marginal:marginal(ti,s,c),
   sch1a:{tips,ot,car,sen},qbi:qbiD,ssTaxable:R(ssT),adjustments:{educ,halfSE,seHealth,hsa,ira,sli},cg,notes};
}
const api={compute,taxTable,ssTaxable,eicAmt,YEARS:Y};
if(typeof module!=='undefined') module.exports=api; else root.TaxEngine=api;
})(this);
