import express from "express";
import cors from "cors";
import OpenAI from "openai";

const app = express();
app.use(cors());
app.use(express.json({limit:"1mb"}));

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const PORT = process.env.PORT || 3000;

const modeNames = {daily:"日常会話",work:"职场日语",trade:"外贸日语",interview:"日语面试"};

function buildPrompt(mode){
  return `你是一名专门帮助中文母语者学习自然日语的会話コーチ。当前模式：${modeNames[mode] || "日常会话"}。
用户大约 N2 水平，但长期没有使用日语，所以重点是恢复自然口语，不要写成教科书。

每次用户发来日语后，严格完成：
1. 先用自然、简洁的日语回复，让对话继续。
2. 判断用户原句：语法错误、搭配错误、助词错误、语气问题，以及“语法没错但日本人更少这样说”的地方。
3. 给出一个最自然、常用的版本；如果原句本身自然，明确告诉用户“这句没问题”，只补充可选表达。
4. 用简明中文解释每一个重要修改：为什么错/为什么不自然。
5. 对值得学习的动词解释：基本意思、常见搭配、一般使用场景、语气，并与相近动词比较。例如「確認する／確かめる／チェックする」。
6. 解释语法时优先使用用户这句话里的例子，不要堆术语。
7. 日语中出现较难汉字时可附读音。
8. 最后只问一个自然的追问，让用户继续回答。
9. 不要为了纠错而把自然口语改成过度正式的敬语。
10. 用户如果只写一句很短的话，也要继续聊天，不要只做老师讲义。

请以 JSON 返回，字段必须是：
reply：继续聊天的日语
reply_cn：reply 的中文意思
correction：自然版本
is_natural：true/false
issues：数组，每项包含 point、explanation
grammar：数组，每项包含 form、explanation、example
verbs：数组，每项包含 word、meaning、usage、examples、compare
follow_up：继续对话的问题（日语）
follow_up_cn：问题中文意思。`;
}

app.post("/api/chat", async (req,res)=>{
  try{
    const {messages=[],mode="daily"}=req.body;
    if(!Array.isArray(messages) || !messages.length) return res.status(400).json({error:"messages required"});
    const input = [{role:"system",content:buildPrompt(mode)}, ...messages.slice(-12)];
    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-5.6-luna",
      input,
      text:{format:{type:"json_object"}}
    });
    const data = JSON.parse(response.output_text);
    res.json(data);
  }catch(err){
    console.error(err);
    res.status(500).json({error:"AI 请求失败，请检查服务器上的 OPENAI_API_KEY。"});
  }
});

app.get("/api/health",(req,res)=>res.json({ok:true}));
app.listen(PORT,()=>console.log(`Japanese Coach API listening on ${PORT}`));
