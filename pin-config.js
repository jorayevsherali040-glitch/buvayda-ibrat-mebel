const DB_KEY="ibratV13Database";
const DEFAULT_DATA={
  laminates:[],
  edges:[],
  products:[],
  orders:[],
  customers:[],
  finance:[],
  sales:[],
  services:[],
  workers:[],
  suppliers:[],
  purchases:[],
  priceHistory:[],
  inventoryMovements:[],
  workerLogs:[],
  inventory:[],
  orderSettings:{nextNumber:1,statuses:["Kutmoqda","Kesilmoqda","Kromka urilmoqda","Teshilmoqda","Yig‘ilmoqda","Tayyor","Yetkazildi"]},
  settings:{
    cutPrice:40000,
    edgePrice:0,
    drillPrice:0,
    cncPrice:0,
    phone:"+998 95 802 77 55",
    telegram:"ibratmebel8909",
    slogan:"Buvayda Ibrat Mebel — mebel ustalari uchun barcha xizmatlar bir platformada."
  }
};

function clone(value){return JSON.parse(JSON.stringify(value))}
function normalize(data){
  const base=clone(DEFAULT_DATA);
  if(!data||typeof data!=="object")return base;
  for(const key of Object.keys(base)){
    if(Array.isArray(base[key]))base[key]=Array.isArray(data[key])?data[key]:[];
    else base[key]={...base[key],...(data[key]||{})};
  }
  return base;
}
export function loadDB(){
  try{return normalize(JSON.parse(localStorage.getItem(DB_KEY)||"null"))}
  catch{return clone(DEFAULT_DATA)}
}
export function saveDB(data){
  const normalized=normalize(data);
  localStorage.setItem(DB_KEY,JSON.stringify(normalized));
  window.dispatchEvent(new CustomEvent("ibrat-db-change",{detail:normalized}));
  return normalized;
}
export function uid(prefix="id"){
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}`;
}
export function nowISO(){return new Date().toISOString()}
export function today(){return new Date().toISOString().slice(0,10)}
export function money(value){return Number(value||0).toLocaleString("uz-UZ")+" so‘m"}
export function exportBackup(){
  const blob=new Blob([JSON.stringify(loadDB(),null,2)],{type:"application/json"});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");
  a.href=url;a.download=`ibrat-v13-backup-${today()}.json`;a.click();
  setTimeout(()=>URL.revokeObjectURL(url),500);
}
export async function importBackup(file){
  const text=await file.text();
  const data=normalize(JSON.parse(text));
  saveDB(data);
  return data;
}
export function resetDB(){saveDB(clone(DEFAULT_DATA))}
export const DB_DEFAULTS=clone(DEFAULT_DATA);
