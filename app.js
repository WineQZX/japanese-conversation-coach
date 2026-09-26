const chat=document.querySelector("#chat"),analysis=document.querySelector("#analysisContent"),form=document.querySelector("#composer"),input=document.querySelector("#input"),mode=document.querySelector("#mode"),showChinese=document.querySelector("#showChinese"),clearBtn=document.querySelector("#clearBtn"),messageCount=document.querySelector("#messageCount");
let messages=JSON.parse(localStorage.getItem("jpCoachMessages")||"[]");

function escapeHtml(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}

function historyAnalysis(a){
  if(!a)return "";
  const natural=a.is_natural;
  const issues=(a.issues||[]).slice(0,2).map(x=>'<div class="history-issue"><b>'+escapeHtml(x.point)+'</b><span>'+escapeHtml(x.explanation)+'</span></div>').join("");
  return '<div class="history-analysis"><div class="history-title">✦ 这句话的纠错</div><div class="history-correction">'+escapeHtml(a.correction||"")+'</div>'+
    (natural?'<div class="history-ok">✓ 原句自然，没有明显问题</div>':issues)+
    '<details><summary>查看完整讲解</summary><div class="history-detail">'+
    (a.issues||[]).map(x=>'<p><b>'+escapeHtml(x.point)+'</b><br>'+escapeHtml(x.explanation)+'</p>').join("")+
    (a.grammar||[]).map(x=>'<p><b>语法：'+escapeHtml(x.form)+'</b><br>'+escapeHtml(x.explanation)+(x.example?'<br><span>'+escapeHtml(x.example)+'</span>':"")+'</p>').join("")+
    (a.verbs||[]).map(x=>'<p><b>动词：'+escapeHtml(x.word)+'</b> · '+escapeHtml(x.meaning)+'<br>'+escapeHtml(x.usage)+(x.compare?'<br>'+escapeHtml(x.compare):"")+'</p>').join("")+
    '</div></details></div>';
}

function render(){
  chat.innerHTML="";
  const visible=messages.filter(m=>m.role!=="system");
  messageCount.textContent=visible.length+" 条";
  if(!visible.length){chat.innerHTML='<div class="empty">从一句日语开始。比如：今日は仕事が忙しかったです。</div>';return}
  visible.forEach(m=>{
    const d=document.createElement("div");
    d.className="turn";
    d.innerHTML='<div class="bubble '+(m.role==="user"?"user":"ai")+'"><div class="label">'+(m.role==="user"?"你":"会話コーチ")+"</div>"+escapeHtml(m.text)+"</div>";
    if(m.role==="user"&&m.analysis)d.innerHTML+=historyAnalysis(m.analysis);
    chat.appendChild(d);
  });
  chat.scrollTop=chat.scrollHeight;
}

function renderAnalysis(r){
  analysis.innerHTML='<section><b>更自然的说法</b><div class="jp good">'+escapeHtml(r.correction)+'</div></section>'+
  (r.reply_cn&&showChinese.checked?'<section><b>AI 回复中文</b><p>'+escapeHtml(r.reply_cn)+'</p></section>':"")+
  (r.issues||[]).map(x=>'<section><b>'+escapeHtml(x.point)+'</b><p>'+escapeHtml(x.explanation)+'</p></section>').join("")+
  (r.grammar||[]).map(x=>'<section><b>语法：'+escapeHtml(x.form)+'</b><p>'+escapeHtml(x.explanation)+'</p><div class="example">'+escapeHtml(x.example)+'</div></section>').join("")+
  (r.verbs||[]).map(x=>'<section><b>动词：'+escapeHtml(x.word)+'</b><p>'+escapeHtml(x.meaning)+'</p><p>'+escapeHtml(x.usage)+'</p><div class="example">'+(x.examples||[]).map(escapeHtml).join("<br>")+'</div><p>'+escapeHtml(x.compare)+'</p></section>').join("")+
  '<section><b>会話を続ける</b><p>'+escapeHtml(r.follow_up||"もう少し詳しく教えてもらえますか？")+'</p>'+(showChinese.checked?'<p class="cn">'+escapeHtml(r.follow_up_cn||"可以再详细说说吗？")+"</p>":"")+'</section>';
}

async function sendToAI(text){
  const apiBase=location.protocol==="file:"?"http://localhost:8888":"";
  const response=await fetch(apiBase+"/.netlify/functions/chat",{method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({mode:mode.value,messages:[...messages,{role:"user",content:text}].filter(m=>m.role==="user"||m.role==="assistant").map(m=>({role:m.role,content:m.text||m.content})).slice(-12)})});
  if(!response.ok)throw new Error("API "+response.status);
  return response.json();
}

form.addEventListener("submit",async e=>{
  e.preventDefault();
  const t=input.value.trim();if(!t)return;
  input.disabled=true;form.querySelector("button").disabled=true;
  const userMessage={role:"user",text:t};
  messages.push(userMessage);render();
  analysis.innerHTML="<section>AI 正在分析：语法、自然度、动词和表达区别……</section>";
  input.value="";
  try{
    const r=await sendToAI(t);
    userMessage.analysis=r;
    messages.push({role:"assistant",text:r.reply||"すみません、もう一度お願いします。"});
    localStorage.setItem("jpCoachMessages",JSON.stringify(messages));
    render();renderAnalysis(r);
  }catch(err){
    analysis.innerHTML='<section><b>暂时无法连接 AI</b><p>如果是在本地运行，请确认后端已启动并设置 OPENAI_API_KEY。</p><p>'+escapeHtml(err.message)+'</p></section>';
  }finally{input.disabled=false;form.querySelector("button").disabled=false;input.focus()}
});

clearBtn.onclick=()=>{messages=[];localStorage.removeItem("jpCoachMessages");analysis.innerHTML="发送一句日语后，这里会显示详细纠错。";render()};
render();