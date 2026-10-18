(() => {
  "use strict";
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const storage = {
    get(key, fallback) { try { const v = localStorage.getItem(key); return v === null ? fallback : JSON.parse(v); } catch { return fallback; } },
    set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} }
  };
  const toolDefs = [
    {id:"calculator",name:"Basic Calculator",desc:"Quick everyday calculations",icon:"＋",category:"math"},
    {id:"percentage",name:"Percentage Calculator",desc:"Find percentages and changes",icon:"％",category:"math"},
    {id:"converter",name:"Unit Converter",desc:"Length, weight and temperature",icon:"⇄",category:"math"},
    {id:"numberbase",name:"Number Base",desc:"Binary, decimal and hexadecimal",icon:"01",category:"math"},
    {id:"textcase",name:"Text Case",desc:"Uppercase, lowercase and title case",icon:"Aa",category:"text"},
    {id:"textclean",name:"Text Cleaner",desc:"Remove extra spaces and blank lines",icon:"≋",category:"text"},
    {id:"wordcount",name:"Word Counter",desc:"Count words, characters and lines",icon:"¶",category:"text"},
    {id:"json",name:"JSON Formatter",desc:"Format and validate JSON text",icon:"{}",category:"developer"},
    {id:"url",name:"URL Encoder",desc:"Encode and decode URL text",icon:"↗",category:"developer"},
    {id:"base64",name:"Base64 Tool",desc:"Encode or decode text locally",icon:"64",category:"developer"},
    {id:"uuid",name:"UUID Generator",desc:"Generate random UUID values",icon:"✳",category:"developer"},
    {id:"timestamp",name:"Timestamp Converter",desc:"Convert Unix timestamps and dates",icon:"◷",category:"developer"},
    {id:"timer",name:"Countdown Timer",desc:"A simple in-app timer",icon:"◴",category:"daily"},
    {id:"stopwatch",name:"Stopwatch",desc:"Measure elapsed time",icon:"⏱",category:"daily"},
    {id:"datecalc",name:"Date Difference",desc:"Days between two dates",icon:"▦",category:"daily"},
    {id:"age",name:"Age Calculator",desc:"Calculate age from date of birth",icon:"🎂",category:"daily"},
    {id:"notes",name:"Quick Notes",desc:"Save notes on this device",icon:"▤",category:"daily"},
    {id:"checklist",name:"Checklist",desc:"Keep a simple to-do list",icon:"☑",category:"daily"},
    {id:"qr",name:"QR Generator",desc:"Create a QR code from text or URL",icon:"▦",category:"text"},
    {id:"mime",name:"File Type Lookup",desc:"Guess a file type from its extension",icon:"▧",category:"developer"}
  ];
  let favourites = storage.get("mendi-favourites", []);
  let recents = storage.get("mendi-recents", []);
  let category = "all";
  let toastTimer;
  let activeTimer = null;
  let stopwatchState = {running:false, started:0, elapsed:0, interval:null};

  const toast = (message) => {
    const el = $("#toast"); el.textContent = message; el.classList.add("show");
    clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove("show"), 2300);
  };
  const esc = (s) => String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const fmtNum = (n) => Number.isFinite(n) ? new Intl.NumberFormat(undefined,{maximumFractionDigits:8}).format(n) : "Invalid result";
  const getTool = id => toolDefs.find(t => t.id === id);
  const updateStats = () => {
    $("#toolCount").textContent = toolDefs.length;
    $("#favCount").textContent = favourites.length;
    $("#recentCount").textContent = recents.length;
  };
  const toolCard = t => `<article class="tool-card" data-open="${t.id}">
    <button class="fav-btn ${favourites.includes(t.id)?"active":""}" data-fav="${t.id}" aria-label="${favourites.includes(t.id)?"Remove from":"Add to"} favourites" title="Favourite">${favourites.includes(t.id)?"★":"☆"}</button>
    <span class="tool-icon">${esc(t.icon)}</span><strong>${esc(t.name)}</strong><p>${esc(t.desc)}</p>
  </article>`;
  function renderRecent() {
    const items = recents.map(getTool).filter(Boolean);
    $("#recentSection").classList.toggle("hidden", items.length === 0 || category !== "all" || $("#searchInput").value.trim() !== "");
    $("#recentGrid").innerHTML = items.slice(0,4).map(toolCard).join("");
  }
  function renderTools() {
    const q = $("#searchInput").value.trim().toLowerCase();
    let items = toolDefs.filter(t => {
      const catOk = category === "all" || (category === "saved" ? favourites.includes(t.id) : t.category === category);
      return catOk && `${t.name} ${t.desc} ${t.category}`.toLowerCase().includes(q);
    });
    $("#gridHeading").textContent = category === "saved" ? "Favourites" : ({all:"All tools",math:"Calculator & Converter",text:"Text tools",daily:"Daily life",developer:"Developer tools"}[category] || "All tools");
    $("#resultLabel").textContent = `${items.length} tools`;
    $("#toolGrid").innerHTML = items.map(toolCard).join("");
    $("#emptyState").classList.toggle("hidden", items.length !== 0);
    $("#toolGrid").classList.toggle("hidden", items.length === 0);
    $$(".filter-chip").forEach(b => b.classList.toggle("active", b.dataset.category === category));
    renderRecent(); updateStats();
  }
  function setCategory(cat) { category = cat; renderTools(); }
  function openTool(id) {
    const t = getTool(id); if (!t) return;
    recents = [id, ...recents.filter(x => x !== id)].slice(0,8); storage.set("mendi-recents", recents);
    $("#modalIcon").textContent = t.icon; $("#modalTitle").textContent = t.name;
    $("#toolContent").innerHTML = toolMarkup(id);
    $("#toolModal").classList.remove("hidden"); document.body.style.overflow = "hidden";
    renderRecent(); updateStats();
    const first = $("#toolContent input, #toolContent textarea, #toolContent select", $("#toolModal"));
    if (first) setTimeout(() => first.focus({preventScroll:true}), 80);
    if (id === "stopwatch") renderStopwatch();
  }
  function closeTool() {
    $("#toolModal").classList.add("hidden"); document.body.style.overflow = "";
    if (activeTimer) { clearInterval(activeTimer); activeTimer = null; }
    if (stopwatchState.interval) { clearInterval(stopwatchState.interval); stopwatchState.interval = null; }
  }
  const field = (label, id, placeholder="", type="text", value="") => `<label><span class="field-label">${label}</span><input id="${id}" type="${type}" placeholder="${placeholder}" value="${esc(value)}"></label>`;
  const area = (label,id,placeholder="",value="",large=false) => `<label><span class="field-label">${label}</span><textarea id="${id}" placeholder="${placeholder}" ${large?'class="large"':""}>${esc(value)}</textarea></label>`;
  const btn = (text,action,primary=false) => `<button class="btn ${primary?"primary":""}" data-action="${action}">${text}</button>`;
  const select = (label,id,options) => `<label><span class="field-label">${label}</span><select id="${id}">${options.map(o=>`<option value="${o[0]}">${o[1]}</option>`).join("")}</select></label>`;
  function toolMarkup(id) {
    switch(id) {
      case "calculator": return `${field("Expression","calcInput","Example: (12 + 5) * 2")}<p class="hint">Supports numbers, + − × ÷, brackets, decimals, % and ^ for powers. Do not enter code.</p><div class="btn-row">${btn("Calculate","calc",true)}${btn("Clear","clearCalc")}</div><div class="result-box"><strong>Result</strong><div id="calcResult" class="result-value">—</div></div>`;
      case "percentage": return `<div class="field-row">${field("Percentage (%)","pctA","e.g. 15","number")}${field("Number","pctB","e.g. 200","number")}</div><div class="btn-row">${btn("Find percentage","pctFind",true)}${btn("What % is A of B?","pctOf")}</div><div class="field-row">${field("Original value","pctOld","e.g. 80","number")}${field("New value","pctNew","e.g. 100","number")}</div><div class="btn-row">${btn("Percentage change","pctChange")}</div><div class="result-box"><strong>Result</strong><div id="pctResult" class="result-value">Enter values to begin</div></div>`;
      case "converter": return `${select("Conversion type","convType",[["length","Length"],["weight","Weight"],["temperature","Temperature"]])}<div class="field-row">${field("Value","convValue","Enter value","number")}<label><span class="field-label">From</span><select id="convFrom"></select></label></div><label><span class="field-label">To</span><select id="convTo"></select></label><div class="btn-row">${btn("Convert","convert",true)}${btn("Swap units","swapConv")}</div><div class="result-box"><strong>Result</strong><div id="convResult" class="result-value">—</div></div>`;
      case "numberbase": return `${field("Number","baseInput","Enter a valid integer")}<div class="field-row">${select("Input base","baseFrom",[["2","Binary"],["8","Octal"],["10","Decimal"],["16","Hexadecimal"]])}${select("Output base","baseTo",[["2","Binary"],["8","Octal"],["10","Decimal"],["16","Hexadecimal"]])}</div><div class="btn-row">${btn("Convert","baseConvert",true)}</div><div class="result-box"><strong>Result</strong><div id="baseResult" class="result-value">—</div></div>`;
      case "textcase": return `${area("Your text","textCaseInput","Type or paste text here", "", true)}<div class="btn-row">${btn("UPPERCASE","caseUpper")}${btn("lowercase","caseLower")}${btn("Title Case","caseTitle")}${btn("Sentence case","caseSentence")}${btn("Copy result","copyText",true)}</div><p class="hint">The buttons update the text box directly. Copy result copies the current text.</p>`;
      case "textclean": return `${area("Text to clean","cleanInput","Paste text here","",true)}<div class="btn-row">${btn("Trim extra spaces","cleanSpaces",true)}${btn("Remove blank lines","cleanBlank")}${btn("Remove duplicate lines","cleanDup")}${btn("Copy","copyClean")}</div><div class="result-box"><strong>Preview</strong><div id="cleanResult" class="result-value">Your cleaned text will appear here.</div></div>`;
      case "wordcount": return `${area("Text","countInput","Start typing or paste text here","",true)}<div class="field-row"><div class="result-box"><strong>Words</strong><div id="wordsNum" class="result-value">0</div></div><div class="result-box"><strong>Characters</strong><div id="charsNum" class="result-value">0</div></div><div class="result-box"><strong>Characters (no spaces)</strong><div id="charsNoSpace" class="result-value">0</div></div><div class="result-box"><strong>Lines</strong><div id="linesNum" class="result-value">0</div></div></div>`;
      case "json": return `${area("JSON input","jsonInput",'{"hello":"world"}',"",true)}<div class="btn-row">${btn("Format JSON","jsonFormat",true)}${btn("Minify JSON","jsonMinify")}${btn("Copy result","copyJson")}</div><div class="result-box"><strong>Output / error</strong><div id="jsonResult" class="result-value">Formatted JSON will appear here.</div></div>`;
      case "url": return `${area("Text / URL","urlInput","Enter text or URL","",true)}<div class="btn-row">${btn("Encode","urlEncode",true)}${btn("Decode","urlDecode")}${btn("Copy","copyUrl")}</div><p class="hint">Encoding is useful when preparing URL query values. It does not validate whether a URL is safe.</p>`;
      case "base64": return `${area("Text","b64Input","Enter text","",true)}<div class="btn-row">${btn("Encode UTF-8","b64Encode",true)}${btn("Decode UTF-8","b64Decode")}${btn("Copy","copyB64")}</div><p class="hint">Base64 is an encoding format, not encryption or password protection.</p>`;
      case "uuid": return `<p class="hint">Generate random UUID v4 identifiers directly on this device.</p><div class="result-box"><strong>UUID</strong><div id="uuidResult" class="result-value">Press Generate</div></div><div class="btn-row">${btn("Generate UUID","uuidGenerate",true)}${btn("Copy","copyUuid")}</div>`;
      case "timestamp": return `${field("Unix timestamp (seconds or milliseconds)","tsInput","e.g. 1735689600")}<div class="btn-row">${btn("Convert timestamp","tsToDate",true)}${btn("Use current time","tsNow")}</div><div class="result-box"><strong>Date from timestamp</strong><div id="tsDateResult" class="result-value">—</div></div><hr style="border:0;border-top:1px solid var(--border);width:100%">${field("Date and time","dateToTs","", "datetime-local")}<div class="btn-row">${btn("Convert to timestamp","dateToTsAction")}</div><div class="result-box"><strong>Unix timestamp</strong><div id="tsUnixResult" class="result-value">—</div></div>`;
      case "timer": return `${field("Minutes","timerMin","5","number","5")}<div class="field-row">${field("Seconds","timerSec","0","number","0")}<div class="result-box"><strong>Time left</strong><div id="timerDisplay" class="result-value">05:00</div></div></div><div class="btn-row">${btn("Start","timerStart",true)}${btn("Pause","timerPause")}${btn("Reset","timerReset")}</div><p class="hint">Timer runs while this page stays open. Background timers may be paused by Android.</p>`;
      case "stopwatch": return `<div class="result-box"><strong>Elapsed time</strong><div id="swDisplay" class="result-value" style="font-size:32px">00:00.00</div></div><div class="btn-row">${btn("Start","swStart",true)}${btn("Pause","swPause")}${btn("Reset","swReset")}</div>`;
      case "datecalc": return `<div class="field-row">${field("Start date","dateStart","","date",new Date().toISOString().slice(0,10))}${field("End date","dateEnd","","date",new Date().toISOString().slice(0,10))}</div><div class="btn-row">${btn("Calculate days","dateDiff",true)}</div><div class="result-box"><strong>Difference</strong><div id="dateResult" class="result-value">0 days</div></div>`;
      case "age": return `${field("Date of birth","dob","","date")}<div class="btn-row">${btn("Calculate age","ageCalc",true)}</div><div class="result-box"><strong>Age</strong><div id="ageResult" class="result-value">—</div></div>`;
      case "notes": return `${field("Note title","noteTitle","Title (optional)")} ${area("Note","noteBody","Write a note here...")}<div class="btn-row">${btn("Save note","saveNote",true)}${btn("Clear fields","clearNote")}</div><div class="result-box"><strong>Saved on this device</strong><div id="notesList"></div></div>`;
      case "checklist": return `${field("New task","taskInput","What do you need to do?")}<div class="btn-row">${btn("Add task","addTask",true)}${btn("Clear completed","clearTasks")}</div><div class="result-box"><strong>Your checklist</strong><div id="taskList"></div></div>`;
      case "qr": return `${area("Text or URL","qrInput","Enter a URL or text to turn into a QR code")}<div class="btn-row">${btn("Generate QR","qrGenerate",true)}</div><p class="hint">QR image generation uses an external image service, so this tool needs internet. Do not put passwords or sensitive information into a public QR generator.</p><div id="qrPreview" class="qr-preview hidden"></div>`;
      case "mime": return `${field("File name or extension","mimeInput","e.g. report.pdf")}<div class="btn-row">${btn("Find file type","mimeFind",true)}</div><div class="result-box"><strong>File type</strong><div id="mimeResult" class="result-value">—</div></div><p class="hint">This is a best-effort lookup based on extension; it does not inspect file contents.</p>`;
      default: return `<p>Tool not found.</p>`;
    }
  }
  const unitSets = {
    length:{m:1,km:1000,cm:.01,mm:.001,mi:1609.344,ft:.3048,in:.0254,yd:.9144},
    weight:{kg:1,g:.001,mg:.000001,lb:.45359237,oz:.028349523125},
    temperature:{C:"C",F:"F",K:"K"}
  };
  const unitLabels = {m:"Meters",km:"Kilometers",cm:"Centimeters",mm:"Millimeters",mi:"Miles",ft:"Feet",in:"Inches",yd:"Yards",kg:"Kilograms",g:"Grams",mg:"Milligrams",lb:"Pounds",oz:"Ounces",C:"Celsius",F:"Fahrenheit",K:"Kelvin"};
  function fillUnits() {
    const type = $("#convType")?.value; if (!type) return;
    const keys = Object.keys(unitSets[type]);
    ["convFrom","convTo"].forEach((id,i) => {
      const el = $("#"+id), old = el.value; el.innerHTML = keys.map(k=>`<option value="${k}">${unitLabels[k]}</option>`).join("");
      if (keys.includes(old)) el.value = old; else el.value = keys[i===0?0:Math.min(1,keys.length-1)];
    });
  }
  function convertTemp(v, from, to) {
    let c = from==="C"?v:from==="F"?(v-32)*5/9:v-273.15;
    return to==="C"?c:to==="F"?c*9/5+32:c+273.15;
  }
  function safeCalculate(expr) {
    let s = expr.replace(/[×x]/gi,"*").replace(/÷/g,"/").replace(/−/g,"-").replace(/,/g,"");
    if (!s.trim()) throw Error("Enter an expression first.");
    if (!/^[0-9+\-*/().%\s^]+$/.test(s)) throw Error("Use only numbers and calculator operators.");
    s = s.replace(/\^/g,"**");
    if (!/^[0-9+\-*/().%\s*]+$/.test(s)) throw Error("Invalid expression.");
    if (/\*\*/.test(s.replace(/\*\*/g,""))) {}
    // Evaluate only a restricted arithmetic expression after a strict character allowlist.
    const result = Function('"use strict"; return ('+s+');')();
    if (!Number.isFinite(result)) throw Error("The result is not a finite number.");
    return result;
  }
  function updateCount() {
    const v = $("#countInput")?.value ?? "";
    $("#wordsNum").textContent = (v.trim().match(/\S+/g)||[]).length;
    $("#charsNum").textContent = v.length;
    $("#charsNoSpace").textContent = v.replace(/\s/g,"").length;
    $("#linesNum").textContent = v ? v.split(/\r\n|\r|\n/).length : 0;
  }
  const notesGet = () => storage.get("mendi-notes", []);
  function renderNotes() {
    const el = $("#notesList"); if (!el) return;
    const notes = notesGet();
    el.innerHTML = notes.length ? notes.map((n,i)=>`<div class="note-item"><div><strong>${esc(n.title||"Untitled note")}</strong><p>${esc(n.body)}</p><p>${esc(new Date(n.created).toLocaleString())}</p></div><button class="btn danger" data-note-delete="${i}">Delete</button></div>`).join("") : `<p class="hint">No saved notes yet.</p>`;
  }
  const tasksGet = () => storage.get("mendi-tasks", []);
  function renderTasks() {
    const el = $("#taskList"); if (!el) return;
    const tasks = tasksGet();
    el.innerHTML = tasks.length ? tasks.map((t,i)=>`<div class="note-item"><label style="display:flex;gap:9px;align-items:start;flex:1"><input type="checkbox" data-task-check="${i}" ${t.done?"checked":""} style="width:auto;margin-top:4px"><span><strong style="${t.done?"text-decoration:line-through;opacity:.65":""}">${esc(t.text)}</strong></span></label><button class="btn danger" data-task-delete="${i}">×</button></div>`).join("") : `<p class="hint">No tasks yet.</p>`;
  }
  function toolAction(action) {
    const val = id => $("#"+id)?.value ?? "";
    const out = (id, value) => { const el=$("#"+id); if(el) el.textContent=String(value); };
    try {
      switch(action) {
        case "calc": out("calcResult",fmtNum(safeCalculate(val("calcInput")))); break;
        case "clearCalc": $("#calcInput").value=""; out("calcResult","—"); break;
        case "pctFind": {const a=Number(val("pctA")),b=Number(val("pctB")); if(!val("pctA").trim()||!val("pctB").trim())throw Error("Enter both values.");out("pctResult",fmtNum(a/100*b));break;}
        case "pctOf": {const a=Number(val("pctA")),b=Number(val("pctB"));if(!val("pctA").trim()||!val("pctB").trim())throw Error("Enter both values.");if(b===0)throw Error("The second number cannot be zero.");out("pctResult",fmtNum(a/b*100)+"%");break;}
        case "pctChange": {const a=Number(val("pctOld")),b=Number(val("pctNew"));if(!val("pctOld").trim()||!val("pctNew").trim())throw Error("Enter both values.");if(a===0)throw Error("Original value cannot be zero.");out("pctResult",fmtNum((b-a)/Math.abs(a)*100)+"% change");break;}
        case "convert": {const type=val("convType"),a=Number(val("convValue")),from=val("convFrom"),to=val("convTo");if(!val("convValue").trim()||!Number.isFinite(a))throw Error("Enter a valid number.");let r=type==="temperature"?convertTemp(a,from,to):a*unitSets[type][from]/unitSets[type][to];out("convResult",`${fmtNum(r)} ${unitLabels[to]}`);break;}
        case "swapConv": {const a=$("#convFrom").value;$("#convFrom").value=$("#convTo").value;$("#convTo").value=a;toolAction("convert");break;}
        case "baseConvert": {const raw=val("baseInput").trim(),from=Number(val("baseFrom")),to=Number(val("baseTo"));if(!raw)throw Error("Enter a number.");const n=parseInt(raw,from);if(!Number.isFinite(n)||n.toString(from)!==raw.toLowerCase().replace(/^0+(?=[0-9a-f])/,""))throw Error("That number is not valid in the selected input base.");out("baseResult",n.toString(to).toUpperCase());break;}
        case "caseUpper": $("#textCaseInput").value=val("textCaseInput").toUpperCase();break;
        case "caseLower": $("#textCaseInput").value=val("textCaseInput").toLowerCase();break;
        case "caseTitle": $("#textCaseInput").value=val("textCaseInput").toLowerCase().replace(/\b[\p{L}\p{N}]/gu,m=>m.toUpperCase());break;
        case "caseSentence": $("#textCaseInput").value=val("textCaseInput").toLowerCase().replace(/(^\s*[a-z]|[.!?]\s+[a-z])/g,m=>m.toUpperCase());break;
        case "copyText": copy(val("textCaseInput"));break;
        case "cleanSpaces": {const s=val("cleanInput").split(/\r\n|\r|\n/).map(x=>x.trim().replace(/[ \t]+/g," ")).join("\n");out("cleanResult",s);$("#cleanInput").value=s;break;}
        case "cleanBlank": {const s=val("cleanInput").split(/\r\n|\r|\n/).filter(x=>x.trim()).join("\n");out("cleanResult",s);$("#cleanInput").value=s;break;}
        case "cleanDup": {const s=[...new Set(val("cleanInput").split(/\r\n|\r|\n/))].join("\n");out("cleanResult",s);$("#cleanInput").value=s;break;}
        case "copyClean": copy(val("cleanResult")==="Your cleaned text will appear here."?"":val("cleanResult"));break;
        case "jsonFormat": case "jsonMinify": {const j=JSON.parse(val("jsonInput"));out("jsonResult",action==="jsonFormat"?JSON.stringify(j,null,2):JSON.stringify(j));break;}
        case "copyJson": copy(val("jsonResult"));break;
        case "urlEncode": $("#urlInput").value=encodeURIComponent(val("urlInput"));break;
        case "urlDecode": {try{$("#urlInput").value=decodeURIComponent(val("urlInput"));}catch{throw Error("This text contains invalid encoded characters.");}break;}
        case "copyUrl": copy(val("urlInput"));break;
        case "b64Encode": {const bytes=new TextEncoder().encode(val("b64Input"));let bin="";bytes.forEach(b=>bin+=String.fromCharCode(b));$("#b64Input").value=btoa(bin);break;}
        case "b64Decode": {const bin=atob(val("b64Input"));const bytes=Uint8Array.from(bin,c=>c.charCodeAt(0));$("#b64Input").value=new TextDecoder("utf-8",{fatal:true}).decode(bytes);break;}
        case "copyB64": copy(val("b64Input"));break;
        case "uuidGenerate": {const u=crypto.randomUUID?crypto.randomUUID():"xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g,c=>{const r=Math.random()*16|0;return(c==="x"?r:(r&3|8)).toString(16)});out("uuidResult",u);break;}
        case "copyUuid": copy(val("uuidResult"));break;
        case "tsToDate": {const n=Number(val("tsInput"));if(!val("tsInput").trim()||!Number.isFinite(n))throw Error("Enter a valid timestamp.");const d=new Date(Math.abs(n)<1e12?n*1000:n);if(Number.isNaN(d.getTime()))throw Error("Timestamp is outside the supported range.");out("tsDateResult",d.toLocaleString()+" ("+d.toISOString()+")");break;}
        case "tsNow": {const n=Date.now();$("#tsInput").value=String(Math.floor(n/1000));out("tsDateResult",new Date(n).toLocaleString());break;}
        case "dateToTsAction": {const d=new Date(val("dateToTs"));if(!val("dateToTs")||Number.isNaN(d.getTime()))throw Error("Choose a valid date and time.");out("tsUnixResult",`Seconds: ${Math.floor(d.getTime()/1000)} | Milliseconds: ${d.getTime()}`);break;}
        case "timerStart": {const min=Number(val("timerMin")||0),sec=Number(val("timerSec")||0);if(min<0||sec<0||!Number.isFinite(min+sec)||min*60+sec<=0)throw Error("Enter a duration greater than zero.");if(activeTimer)clearInterval(activeTimer);let left=Math.floor(min*60+sec);const display=()=>out("timerDisplay",`${String(Math.floor(left/60)).padStart(2,"0")}:${String(left%60).padStart(2,"0")}`);display();activeTimer=setInterval(()=>{left--;display();if(left<=0){clearInterval(activeTimer);activeTimer=null;toast("Timer finished");if(navigator.vibrate)navigator.vibrate([150,80,150]);}},1000);break;}
        case "timerPause": if(activeTimer){clearInterval(activeTimer);activeTimer=null;}break;
        case "timerReset": if(activeTimer){clearInterval(activeTimer);activeTimer=null;}out("timerDisplay",`${String(Math.max(0,Number(val("timerMin")||0)).padStart?Number(val("timerMin")||0).toString().padStart(2,"0"): "00")}:${String(Math.max(0,Number(val("timerSec")||0)).toString().padStart(2,"0"))}`);break;
        case "swStart": if(!stopwatchState.running){stopwatchState.running=true;stopwatchState.started=Date.now();stopwatchState.interval=setInterval(renderStopwatch,50);}break;
        case "swPause": if(stopwatchState.running){stopwatchState.elapsed+=Date.now()-stopwatchState.started;stopwatchState.running=false;clearInterval(stopwatchState.interval);stopwatchState.interval=null;renderStopwatch();}break;
        case "swReset": stopwatchState={running:false,started:0,elapsed:0,interval:null};renderStopwatch();break;
        case "dateDiff": {const a=parseDate(val("dateStart")),b=parseDate(val("dateEnd"));if(!a||!b)throw Error("Choose both dates.");const days=Math.round((b-a)/86400000);out("dateResult",`${Math.abs(days)} days${days<0?" (end date is earlier)":""}`);break;}
        case "ageCalc": {const d=parseDate(val("dob")),now=new Date();if(!d)throw Error("Choose your date of birth.");if(d>now)throw Error("Birth date cannot be in the future.");let years=now.getFullYear()-d.getFullYear(),months=now.getMonth()-d.getMonth(),days=now.getDate()-d.getDate();if(days<0){months--;days+=new Date(now.getFullYear(),now.getMonth(),0).getDate();}if(months<0){years--;months+=12;}out("ageResult",`${years} years, ${months} months, ${days} days`);break;}
        case "saveNote": {const title=val("noteTitle").trim(),body=val("noteBody").trim();if(!body)throw Error("Write a note first.");const notes=notesGet();notes.unshift({title,body,created:Date.now()});storage.set("mendi-notes",notes.slice(0,100));$("#noteTitle").value="";$("#noteBody").value="";renderNotes();toast("Note saved on this device");break;}
        case "clearNote": $("#noteTitle").value="";$("#noteBody").value="";break;
        case "addTask": {const text=val("taskInput").trim();if(!text)throw Error("Enter a task first.");const tasks=tasksGet();tasks.unshift({text,done:false});storage.set("mendi-tasks",tasks.slice(0,200));$("#taskInput").value="";renderTasks();break;}
        case "clearTasks": storage.set("mendi-tasks",tasksGet().filter(t=>!t.done));renderTasks();break;
        case "qrGenerate": {const q=val("qrInput").trim();if(!q)throw Error("Enter text or a URL.");const url="https://api.qrserver.com/v1/create-qr-code/?size=240x240&data="+encodeURIComponent(q);$("#qrPreview").innerHTML=`<img alt="Generated QR code" src="${url}"><p style="color:#333;font-size:12px;text-align:center">Generated by an external service</p>`;$("#qrPreview").classList.remove("hidden");break;}
        case "mimeFind": {const raw=val("mimeInput").trim().toLowerCase();if(!raw)throw Error("Enter a file name or extension.");const ext=raw.includes(".")?raw.split(".").pop():raw.replace(/^\./,"");const map={html:"text/html",css:"text/css",js:"text/javascript",json:"application/json",pdf:"application/pdf",txt:"text/plain",csv:"text/csv",xml:"application/xml",zip:"application/zip",png:"image/png",jpg:"image/jpeg",jpeg:"image/jpeg",gif:"image/gif",webp:"image/webp",svg:"image/svg+xml",mp3:"audio/mpeg",mp4:"video/mp4",apk:"application/vnd.android.package-archive",docx:"application/vnd.openxmlformats-officedocument.wordprocessingml.document",xlsx:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",pptx:"application/vnd.openxmlformats-officedocument.presentationml.presentation"};out("mimeResult",map[ext]?`${map[ext]}\nExtension: .${ext}`:`Unknown extension: .${ext}`);break;}
      }
    } catch(e) { toast(e.message||"Something went wrong."); }
  }
  function parseDate(s) { if(!s)return null;const parts=s.split("-").map(Number);if(parts.length!==3)return null;const d=new Date(parts[0],parts[1]-1,parts[2]);return Number.isNaN(d.getTime())?null:d; }
  function renderStopwatch() {
    const el=$("#swDisplay");if(!el)return;
    const ms=stopwatchState.elapsed+(stopwatchState.running?Date.now()-stopwatchState.started:0);
    const mins=Math.floor(ms/60000),secs=Math.floor(ms/1000)%60,cent=Math.floor(ms/10)%100;
    el.textContent=`${String(mins).padStart(2,"0")}:${String(secs).padStart(2,"0")}.${String(cent).padStart(2,"0")}`;
  }
  async function copy(text) {
    if(!text || text==="—" || text==="Press Generate") {toast("Nothing to copy yet.");return;}
    try {await navigator.clipboard.writeText(text);toast("Copied to clipboard");}
    catch {const ta=document.createElement("textarea");ta.value=text;document.body.append(ta);ta.select();const ok=document.execCommand("copy");ta.remove();toast(ok?"Copied to clipboard":"Copy failed — select the text manually.");}
  }
  document.addEventListener("click",e=>{
    const fav=e.target.closest("[data-fav]");
    if(fav){e.stopPropagation();const id=fav.dataset.fav;favourites=favourites.includes(id)?favourites.filter(x=>x!==id):[...favourites,id];storage.set("mendi-favourites",favourites);renderTools();return;}
    const open=e.target.closest("[data-open]");if(open){openTool(open.dataset.open);return;}
    const filter=e.target.closest("[data-category]");if(filter){setCategory(filter.dataset.category);return;}
    const act=e.target.closest("[data-action]");if(act){toolAction(act.dataset.action);return;}
    const delNote=e.target.closest("[data-note-delete]");if(delNote){const notes=notesGet();notes.splice(Number(delNote.dataset.noteDelete),1);storage.set("mendi-notes",notes);renderNotes();return;}
    const delTask=e.target.closest("[data-task-delete]");if(delTask){const tasks=tasksGet();tasks.splice(Number(delTask.dataset.taskDelete),1);storage.set("mendi-tasks",tasks);renderTasks();return;}
    const check=e.target.closest("[data-task-check]");if(check){const tasks=tasksGet();tasks[Number(check.dataset.taskCheck)].done=check.checked;storage.set("mendi-tasks",tasks);renderTasks();return;}
    if(e.target.matches("[data-close]"))closeTool();
  });
  $("#closeModal").addEventListener("click",closeTool);
  $("#themeBtn").addEventListener("click",()=>{
    const root=document.documentElement;const next=root.dataset.theme==="light"?"dark":"light";root.dataset.theme=next;storage.set("mendi-theme",next);$("#themeBtn").textContent=next==="light"?"☾":"☼";
  });
  $("#searchInput").addEventListener("input",renderTools);
  $("#toolContent")?.addEventListener("input",e=>{if(e.target.id==="countInput")updateCount();});
  document.addEventListener("change",e=>{if(e.target.id==="convType")fillUnits();});
  $("#toolModal").addEventListener("click",e=>{if(e.target.closest("#toolContent") && $("#modalTitle").textContent==="Unit Converter" && e.target.id==="convType")fillUnits();});
  document.addEventListener("click",e=>{if(e.target.id==="convType")fillUnits();});
  document.addEventListener("keydown",e=>{
    if(e.key==="Escape")closeTool();
    if(e.key==="/" && !["INPUT","TEXTAREA"].includes(document.activeElement.tagName)){e.preventDefault();$("#searchInput").focus();}
  });
  // Re-render per-tool content after initial markup is created.
  const originalOpenTool = openTool;
  // Unit selector setup is handled immediately after opening the converter.
  const mo = new MutationObserver(() => {if(!$("#toolModal").classList.contains("hidden") && $("#modalTitle").textContent==="Unit Converter")fillUnits();if(!$("#toolModal").classList.contains("hidden") && $("#modalTitle").textContent==="Quick Notes")renderNotes();if(!$("#toolModal").classList.contains("hidden") && $("#modalTitle").textContent==="Checklist")renderTasks();if(!$("#toolModal").classList.contains("hidden") && $("#modalTitle").textContent==="Word Counter")updateCount();});
  mo.observe($("#toolContent"),{childList:true});
  $("#year").textContent=new Date().getFullYear();
  const theme=storage.get("mendi-theme","dark");document.documentElement.dataset.theme=theme;$("#themeBtn").textContent=theme==="light"?"☾":"☼";
  renderTools();
  let deferredInstall=null;
  window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferredInstall=e;$("#installBtn").classList.remove("hidden");});
  $("#installBtn").addEventListener("click",async()=>{if(!deferredInstall){toast("Use your browser menu and choose Install app / Add to Home screen.");return;}deferredInstall.prompt();await deferredInstall.userChoice;deferredInstall=null;$("#installBtn").classList.add("hidden");});
})();