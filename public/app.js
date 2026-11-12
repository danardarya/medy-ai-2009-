let token = localStorage.getItem("medy_token") || "";
let currentUser = null, authMode = "login";
const $ = id => document.getElementById(id);
function toast(msg){const t=$("toast");t.textContent=msg;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),2600)}
function headers(){return {"Content-Type":"application/json",...(token?{Authorization:"Bearer "+token}:{})}}
async function api(url,opts={}){const r=await fetch(url,{...opts,headers:{...headers(),...(opts.headers||{})}});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||"Si è verificato un errore.");return d}
function showPage(id){document.querySelectorAll(".page").forEach(p=>p.classList.toggle("active",p.id===id));document.querySelectorAll(".nav").forEach(n=>n.classList.toggle("active",n.dataset.page===id));const names={home:"Panoramica",chat:"MEDY Chat",image:"MEDY Image",video:"MEDY Video",studio:"MEDY Studio",history:"Cronologia",settings:"Impostazioni"};$("crumb").textContent=names[id]||id;if(id==="history")loadHistory();if(id==="settings")syncUser()}
function syncUser(){
  const btn = $("headerAccount");

  if(currentUser){
    $("sideName").textContent=currentUser.name;
    $("sideEmail").textContent=currentUser.email;
    $("avatar").textContent=currentUser.name[0].toUpperCase();
    $("settingsName").textContent=currentUser.name;
    $("settingsEmail").textContent=currentUser.email;
    if(btn) btn.textContent=currentUser.name;
  }else{
    $("sideName").textContent="Ospite";
    $("sideEmail").textContent="Accedi per iniziare";
    $("avatar").textContent="M";
    $("settingsName").textContent="Non hai effettuato l'accesso";
    $("settingsEmail").textContent="Accedi o crea un account per salvare i tuoi progetti.";
    if(btn) btn.textContent="Accedi / Registrati";
  }
}

function headerAccountClick(){
  if(currentUser){
    showPage("settings");
  }else{
    openAuth();
  }
}if(currentUser){$("sideName").textContent=currentUser.name;$("sideEmail").textContent=currentUser.email;$("avatar").textContent=currentUser.name[0].toUpperCase();$("settingsName").textContent=currentUser.name;$("settingsEmail").textContent=currentUser.email}else{$("sideName").textContent="Ospite";$("sideEmail").textContent="Accedi per iniziare";$("avatar").textContent="M";$("settingsName").textContent="Non hai effettuato l'accesso";$("settingsEmail").textContent="Accedi o crea un account per salvare i tuoi progetti."}}
async function boot(){if(token){try{const d=await api("/api/me");currentUser=d.user}catch{token="";localStorage.removeItem("medy_token")}}syncUser()}
function openAuth(){$("authModal").classList.remove("hidden");$("authError").textContent=""}
function closeAuth(){$("authModal").classList.add("hidden")}
function toggleAuthMode(){authMode=authMode==="login"?"register":"login";$("authTitle").textContent=authMode==="login"?"Bentornato.":"Crea il tuo account.";$("authSub").textContent=authMode==="login"?"Accedi al tuo workspace.":"Entra nel mondo MEDY AI.";$("nameWrap").classList.toggle("hidden",authMode==="login");$("authSubmit").textContent=authMode==="login"?"Accedi ↗":"Crea account ↗";$("authSwitch").innerHTML=authMode==="login"?'Non hai un account? <b>Registrati</b>':'Hai già un account? <b>Accedi</b>';$("authError").textContent=""}
$("authForm").addEventListener("submit",async e=>{e.preventDefault();$("authError").textContent="";try{const body={email:$("authEmail").value,password:$("authPassword").value};if(authMode==="register")body.name=$("authName").value;const d=await api("/api/"+(authMode==="login"?"login":"register"),{method:"POST",body:JSON.stringify(body)});token=d.token;localStorage.setItem("medy_token",token);currentUser=d.user;syncUser();closeAuth();toast("Accesso effettuato.")}catch(err){$("authError").textContent=err.message}});
function logout(){token="";currentUser=null;localStorage.removeItem("medy_token");syncUser();toast("Sei uscito dall'account.");showPage("home")}
$("chatForm").addEventListener("submit",async e=>{e.preventDefault();const input=$("chatInput"),message=input.value.trim();if(!message)return;if(!token){openAuth();return}input.value="";const box=$("chatMessages");box.querySelector(".welcome-msg")?.remove();addMessage("user",message);const pending=addMessage("ai","MEDY sta pensando...");try{const d=await api("/api/chat",{method:"POST",body:JSON.stringify({message})});pending.textContent=d.answer}catch(err){pending.textContent=err.message}});
function addMessage(kind,text){const el=document.createElement("div");el.className="message "+kind;el.textContent=text;$("chatMessages").appendChild(el);$("chatMessages").scrollTop=$("chatMessages").scrollHeight;return el}
async function generateImage(){if(!token){openAuth();return}const prompt=$("imagePrompt").value.trim();if(!prompt)return toast("Scrivi prima una descrizione.");const out=$("imageResult");out.textContent="Creazione immagine in corso...";try{const d=await api("/api/image",{method:"POST",body:JSON.stringify({prompt})});out.innerHTML="";if(d.image){const img=document.createElement("img");img.src=d.image;img.alt="Immagine generata";out.appendChild(img)}else out.textContent="Immagine non disponibile."}catch(e){out.textContent=e.message}}
async function generateVideo(){if(!token){openAuth();return}const prompt=$("videoPrompt").value.trim();if(!prompt)return toast("Scrivi prima una descrizione.");$("videoResult").textContent="Invio richiesta...";try{await api("/api/video",{method:"POST",body:JSON.stringify({prompt})})}catch(e){$("videoResult").textContent=e.message}}
$("fileInput").addEventListener("change",async e=>{const file=e.target.files[0];if(!file)return;if(!token){openAuth();return}const fd=new FormData();fd.append("file",file);$("uploadResult").textContent="Caricamento...";try{const r=await fetch("/api/upload",{method:"POST",headers:{Authorization:"Bearer "+token},body:fd});const d=await r.json();if(!r.ok)throw new Error(d.error);$("uploadResult").textContent=d.name+" — "+d.message}catch(err){$("uploadResult").textContent=err.message}});
async function loadHistory(){if(!token){$("historyList").innerHTML='<div class="empty">Accedi per visualizzare la cronologia.</div>';return}try{const d=await api("/api/history");const list=$("historyList");list.innerHTML="";if(!d.history.length){list.innerHTML='<div class="empty">Non hai ancora attività salvate.</div>';return}d.history.forEach(item=>{const row=document.createElement("div");row.className="history-item";const ico=item.kind==="chat"?"✳":item.kind==="image"?"▧":"▷";const copy=document.createElement("div");copy.className="history-copy";const b=document.createElement("b");b.textContent=ico+"  "+item.kind.toUpperCase();const s=document.createElement("small");s.textContent=item.prompt;copy.append(b,s);const del=document.createElement("button");del.textContent="Elimina";del.onclick=async()=>{try{await api("/api/history/"+item.id,{method:"DELETE"});loadHistory()}catch(e){toast(e.message)}};row.append(copy,del);list.append(row)})}catch(e){$("historyList").textContent=e.message}}
boot();
