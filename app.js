(()=>{
'use strict';
const KEY='slottasks:v1:data';           // 他アプリと衝突しないよう固有プレフィックス
const COL={morning:'#ffe0a3',am:'#c6ecd2',pm:'#bde0f6',eve:'#ffc8d6',night:'#c9c4f2'};
const DEF=[['morning','朝','05:00'],['am','午前','09:00'],['pm','午後','12:00'],['eve','夕','17:00'],['night','夜','20:00']];
const defSlots=()=>DEF.map(([id,name,start])=>({id,name,start}));
// スロット別テーマ [ヘッダー, 背景, 薄い背景, アクセント]
const TH={base:['#b9a6e6','#f1ecfa','#e6ddf6','#7a56c2'],morning:['#ffd98f','#fff7e6','#ffeabd','#a9680f'],am:['#aee0bf','#eef9f1','#d6f0de','#2f8a55'],pm:['#a9d4f2','#edf6fd','#d3e9f8','#2f78b0'],eve:['#ffb8cb','#fff0f4','#ffdce6','#c2476b'],night:['#b4aee9','#efeefb','#dedcf5','#5a52b5']};
function theme(k){const t=TH[k]||TH.base,r=document.documentElement.style;
  ['--pri','--bg','--bg2','--acc'].forEach((v,i)=>r.setProperty(v,t[i]));
  const m=document.querySelector('meta[name=theme-color]');if(m)m.content=t[0]}
const $=id=>document.getElementById(id);
const h=(t,c,x)=>{const e=document.createElement(t);if(c)e.className=c;if(x!=null)e.textContent=x;return e};
const pad=n=>String(n).padStart(2,'0');
const ymd=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const tm=s=>{const [a,b]=String(s).split(':');return (+a||0)*60+(+b||0)};
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,6);

let S=load();
function load(){try{const d=JSON.parse(localStorage.getItem(KEY));if(d&&Array.isArray(d.tasks)&&Array.isArray(d.slots))return d}catch(e){}return{tasks:[],slots:defSlots(),last:''}}
function save(){try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){alert('保存に失敗しました')}}

// 起動時：日付が変わっていたら全チェックをリセット
const TODAY=ymd(new Date());
if(S.last!==TODAY){S.tasks.forEach(t=>t.done=false);S.last=TODAY;save()}

// 起動時の時刻でスロット判定（以後は自動切替しない）
function curSlot(){const n=new Date(),m=n.getHours()*60+n.getMinutes();
  const a=[...S.slots].sort((x,y)=>tm(x.start)-tm(y.start));let c=a[a.length-1];
  for(const s of a)if(tm(s.start)<=m)c=s;return c.id}
const NOW=curSlot();
let view='now';

const slot=id=>S.slots.find(s=>s.id===id)||S.slots[0];
const active=t=>t.type!=='period'||((!t.start||TODAY>=t.start)&&(!t.end||TODAY<=t.end));
const range=s=>{const a=[...S.slots].sort((x,y)=>tm(x.start)-tm(y.start));const i=a.findIndex(x=>x.id===s.id);return `${s.start}〜${a[(i+1)%a.length].start}`};
const md=d=>d?d.slice(5).replace('-','/'):'';

function card(t){
  const d=h('div','task'+(t.done?' done':'')+(active(t)?'':' out'));
  d.style.setProperty('--c',COL[t.slot]||'#ddd');
  const lb=h('label','cb'),cb=h('input');cb.type='checkbox';cb.checked=!!t.done;
  lb.onclick=e=>e.stopPropagation();
  cb.onchange=()=>{t.done=cb.checked;save();d.classList.toggle('done',t.done)};
  lb.append(cb);
  const b=h('div','body');b.append(h('div','nm',t.name));
  if(t.memo)b.append(h('div','mm',t.memo));
  if(t.type==='period')b.append(h('span','badge',`${md(t.start)}〜${md(t.end)}${active(t)?'':'（期間外）'}`));
  d.append(lb,b);d.dataset.id=t.id;d.dataset.slot=t.slot;d.oncontextmenu=e=>e.preventDefault();
  d.onclick=()=>{if(Date.now()<noClick)return;openModal(t)};
  d.addEventListener('pointerdown',e=>dragStart(e,d));return d}

function list(tasks,box){
  if(!tasks.length)box.append(h('div','empty','表示するタスクがありません。\n右下の＋から追加できます。'));
  tasks.forEach(t=>box.append(card(t)))}

function render(){
  const m=$('main');m.replaceChildren();$('sub').textContent='';
  theme(view==='all'||view==='settings'?'base':view==='now'?NOW:view);
  if(view==='settings'){$('title').textContent='設定';return renderSettings(m)}
  if(view==='all'){
    $('title').textContent='すべてのタスク';
    S.slots.forEach(s=>{const ts=S.tasks.filter(t=>t.slot===s.id);if(!ts.length)return;
      const hd=h('div','sec');const dt=h('span','dot');dt.style.setProperty('--c',COL[s.id]);hd.append(dt,h('span','',s.name));m.append(hd);ts.forEach(t=>m.append(card(t)))});
    if(!S.tasks.length)list([],m);return}
  const id=view==='now'?NOW:view,s=slot(id);
  $('title').textContent=s.name+(view==='now'?'（いま）':'');$('sub').textContent=range(s);
  list(S.tasks.filter(t=>t.slot===s.id&&active(t)),m)}

function renderSettings(m){
  const box=h('div','set');box.append(h('h4','','スロットの開始時刻'),h('p','','各スロットは次のスロットの開始時刻まで適用されます。'));
  S.slots.forEach(s=>{const r=h('div','row'),dt=h('span','dot');dt.style.setProperty('--c',COL[s.id]);
    const nm=h('span','',s.name),i=h('input');i.type='time';i.value=s.start;
    i.onchange=()=>{if(i.value){s.start=i.value;save()}};r.append(dt,nm,i);box.append(r)});
  const rs=h('button','','初期時刻に戻す');rs.style.marginTop='12px';
  rs.onclick=()=>{S.slots.forEach(s=>s.start=DEF.find(d=>d[0]===s.id)?.[2]||s.start);save();render()};box.append(rs);
  const b2=h('div','set');b2.append(h('h4','','データのバックアップ'),h('p','',`タスク ${S.tasks.length} 件。CSVで書き出し・復元できます。`));
  const a=h('div','acts'),ex=h('button','primary','CSVエクスポート'),im=h('button','','CSVインポート');
  ex.onclick=exportCSV;im.onclick=()=>$('fileIn').click();a.append(ex,im);b2.append(a);m.append(box,b2)}

// ---- CSV ----
const esc=v=>{v=String(v??'');return /[",\r\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v};
function toCSV(){const R=[['kind','id','name','memo','slot','type','start','end','done']];
  S.slots.forEach(s=>R.push(['slot',s.id,s.name,'','','',s.start,'','']));
  S.tasks.forEach(t=>R.push(['task',t.id,t.name,t.memo||'',t.slot,t.type,t.start||'',t.end||'',t.done?1:0]));
  return '\ufeff'+R.map(r=>r.map(esc).join(',')).join('\r\n')}
function parseCSV(s){s=s.replace(/^\ufeff/,'');const R=[];let r=[],f='',q=false;
  for(let i=0;i<s.length;i++){const c=s[i];
    if(q){if(c==='"'){if(s[i+1]==='"'){f+='"';i++}else q=false}else f+=c}
    else if(c==='"')q=true;else if(c===','){r.push(f);f=''}
    else if(c==='\n'||c==='\r'){if(c==='\r'&&s[i+1]==='\n')i++;r.push(f);R.push(r);r=[];f=''}else f+=c}
  if(f!==''||r.length){r.push(f);R.push(r)}return R.filter(r=>r.some(x=>x!==''))}
function exportCSV(){const a=h('a');a.href=URL.createObjectURL(new Blob([toCSV()],{type:'text/csv'}));
  a.download=`slot-tasks-${TODAY}.csv`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),2000)}
$('fileIn').onchange=async e=>{const f=e.target.files[0];e.target.value='';if(!f)return;
  try{const rows=parseCSV(await f.text()),slots=defSlots(),tasks=[];
    rows.forEach(r=>{if(r[0]==='slot'){const s=slots.find(x=>x.id===r[1]);if(s){s.name=r[2]||s.name;if(/^\d{1,2}:\d{2}$/.test(r[6]))s.start=r[6].padStart(5,'0')}}
      else if(r[0]==='task'&&r[2]){tasks.push({id:r[1]||uid(),name:r[2],memo:r[3]||'',slot:slots.some(x=>x.id===r[4])?r[4]:slots[0].id,
        type:r[5]==='period'?'period':'routine',start:r[6]||'',end:r[7]||'',done:r[8]==='1'})}});
    if(!confirm(`タスク ${tasks.length} 件を読み込みます。現在のデータは置き換えられます。よろしいですか？`))return;
    S={tasks,slots,last:TODAY};save();render();alert('インポートしました')}
  catch(err){alert('CSVを読み込めませんでした')}};

// ---- メニュー ----
function buildDrawer(){const d=$('drawer');d.replaceChildren();
  const hd=h('h3');hd.innerHTML='<svg class="logo" viewBox="0 0 32 24"><rect width="32" height="24" rx="7" fill="#7a56c2"/><path d="M13 7l9 5-9 5z" fill="#fff"/></svg>';hd.append(h('span','','スロットタスク'));d.append(hd);
  const item=(label,v,col,cls)=>{const b=h('button',(view===v?'cur':'')+(cls?' '+cls:''));
    if(col){const dt=h('span','dot');dt.style.setProperty('--c',col);b.append(dt)}
    b.append(h('span','',label));b.onclick=()=>{view=v;closeDrawer();render()};return b};
  d.append(item('すべてのタスク','all','#fff'));
  S.slots.forEach(s=>d.append(item(s.name,s.id,COL[s.id])));
  const bt=h('div','bot');bt.append(item('⚙ 設定','settings'));d.append(bt)}
function openDrawer(){buildDrawer();$('drawer').classList.add('on');$('overlay').classList.add('on')}
function closeDrawer(){$('drawer').classList.remove('on');$('overlay').classList.remove('on')}
$('menuBtn').onclick=openDrawer;$('overlay').onclick=closeDrawer;

// ---- 追加・編集モーダル ----
let editing=null;
$('fPeriod').onchange=()=>$('periodBox').classList.toggle('hidden',!$('fPeriod').checked);
function openModal(t){editing=t||null;
  $('mTitle').textContent=t?'タスクを編集':'タスクを追加';
  $('fSlot').replaceChildren(...S.slots.map(s=>{const o=h('option','',s.name);o.value=s.id;return o}));
  $('fName').value=t?t.name:'';$('fMemo').value=t?t.memo:'';
  $('fSlot').value=t?t.slot:(S.slots.some(s=>s.id===view)?view:NOW);
  const p=t&&t.type==='period';$('fPeriod').checked=!!p;$('periodBox').classList.toggle('hidden',!p);
  $('fStart').value=p?t.start:TODAY;$('fEnd').value=p?t.end:TODAY;
  $('fDel').classList.toggle('hidden',!t);$('modal').classList.remove('hidden');
  if(!t)setTimeout(()=>$('fName').focus(),50)}
const closeModal=()=>$('modal').classList.add('hidden');
$('fab').onclick=()=>openModal();
$('fCancel').onclick=closeModal;
$('modal').onclick=e=>{if(e.target.id==='modal')closeModal()};
$('fSave').onclick=()=>{
  const name=$('fName').value.trim();if(!name){alert('タスク名を入力してください');return}
  const per=$('fPeriod').checked;let st=$('fStart').value,en=$('fEnd').value;
  if(per){if(!st||!en){alert('期間を選択してください');return}if(st>en){alert('終了日は開始日以降にしてください');return}}
  const data={name,memo:$('fMemo').value.trim(),slot:$('fSlot').value,type:per?'period':'routine',start:per?st:'',end:per?en:''};
  if(editing)Object.assign(editing,data);else S.tasks.push({id:uid(),done:false,...data});
  save();closeModal();render()};
$('fDel').onclick=()=>{if(editing&&confirm('このタスクを削除しますか？')){S.tasks=S.tasks.filter(t=>t!==editing);save();closeModal();render()}};

// ---- 長押しで並べ替え（同じスロット内） ----
let noClick=0,drag=null;
document.addEventListener('touchmove',e=>{if(drag)e.preventDefault()},{passive:false});
function dragStart(e,el){
  if(e.target.closest('.cb'))return;
  let lx=e.clientX,ly=e.clientY;
  const mv=ev=>{if(Math.hypot(ev.clientX-e.clientX,ev.clientY-e.clientY)>10)stop();lx=ev.clientX;ly=ev.clientY};
  const stop=()=>{clearTimeout(tid);removeEventListener('pointermove',mv);removeEventListener('pointerup',stop);removeEventListener('pointercancel',stop)};
  addEventListener('pointermove',mv);addEventListener('pointerup',stop);addEventListener('pointercancel',stop);
  const tid=setTimeout(()=>{stop();begin(el,ly)},450)}
function begin(el,y){
  if(navigator.vibrate)navigator.vibrate(15);
  drag={el,grab:y-el.getBoundingClientRect().top,y,slot:el.dataset.slot};
  el.classList.add('lift');document.body.classList.add('dragging');
  addEventListener('pointermove',dmove);addEventListener('pointerup',dend);addEventListener('pointercancel',dend);tick()}
const dmove=e=>{if(drag)drag.y=e.clientY};
function place(){
  const {el,grab,y}=drag;el.style.transform='';
  const c=y-grab+el.getBoundingClientRect().height/2;
  const same=n=>n&&n.classList&&n.classList.contains('task')&&n.dataset.slot===drag.slot;
  let p,n;
  while(same(p=el.previousElementSibling)){const q=p.getBoundingClientRect();if(c<q.top+q.height/2)el.parentNode.insertBefore(el,p);else break}
  while(same(n=el.nextElementSibling)){const q=n.getBoundingClientRect();if(c>q.top+q.height/2)el.parentNode.insertBefore(n,el);else break}
  el.style.transform=`translateY(${y-grab-el.getBoundingClientRect().top}px) scale(1.02)`}
function tick(){
  if(!drag)return;const y=drag.y;
  if(y<110)scrollBy(0,-10);else if(y>innerHeight-110)scrollBy(0,10);
  place();drag.raf=requestAnimationFrame(tick)}
function dend(){
  if(!drag)return;const {el,slot,raf}=drag;cancelAnimationFrame(raf);drag=null;
  removeEventListener('pointermove',dmove);removeEventListener('pointerup',dend);removeEventListener('pointercancel',dend);
  document.body.classList.remove('dragging');noClick=Date.now()+400;
  const ids=[...el.parentNode.querySelectorAll(`.task[data-slot="${slot}"]`)].map(n=>n.dataset.id);
  const set=new Set(ids),idx=[],by={};
  S.tasks.forEach((t,i)=>{by[t.id]=t;if(set.has(t.id))idx.push(i)});
  idx.forEach((i,k)=>{S.tasks[i]=by[ids[k]]});
  save();render()}

render();
if('serviceWorker' in navigator)addEventListener('load',()=>navigator.serviceWorker.register('./sw.js',{scope:'./'}).catch(()=>{}));
})();
