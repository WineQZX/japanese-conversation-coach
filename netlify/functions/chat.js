import OpenAI from "openai";

const modeNames = {daily:"日常会話",work:"职场日语",trade:"外贸日语",interview:"日语面试"};

function prompt(mode){
 return `你是一名帮助中文母语者学习自然日语的会話コーチ。当前模式：${modeNames[mode]||"日常会话"}。
用户约N2、长期少用日语。目标是恢复自然、常用、真实的日语口语。

每次输入：
1. 先自然回复并继续对话。
2. 找出语法错误、助词错误、搭配问题，以及语法正确但不自然之处。
3. 给出最自然的常用说法；如果原句自然，明确说“这句没问题”。
4. 中文解释修改原因和语法。
5. 对重要动词解释基本意思、常用搭配、使用场景、语气，并比较相近动词。
6. 不要为了纠错把口语变成过度正式的敬语。
7. 最后只问一个追问。
返回JSON字段：reply,reply_cn,correction,is_natural,issues,grammar,verbs,follow_up,follow_up_cn。
issues元素：point,explanation。
grammar元素：form,explanation,example。
verbs元素：word,meaning,usage,examples,compare。`;
}

export default async function handler(request) {
 if (request.method !== "POST") return new Response(JSON.stringify({error:"POST only"}), {status:405, headers:{"Content-Type":"application/json"}});
 try {
  const {messages=[],mode="daily"} = await request.json();
  const client = new OpenAI({apiKey: process.env.OPENAI_API_KEY});
  const input=[{role:"system",content:prompt(mode)},...messages.slice(-12)];
  const r=await client.responses.create({
   model:process.env.OPENAI_MODEL || "gpt-5.6-luna",
   input,
   text:{format:{type:"json_object"}}
  });
  return new Response(r.output_text,{status:200,headers:{"Content-Type":"application/json"}});
 } catch(e) {
  console.error(e);
  return new Response(JSON.stringify({error:"AI请求失败，请检查OPENAI_API_KEY。",detail:e?.message||""}), {status:500,headers:{"Content-Type":"application/json"}});
 }
}
