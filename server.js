import express from "express";
import dotenv from "dotenv";
import crypto from "node:crypto";
import rateLimit from "express-rate-limit";
import { createClient } from "@supabase/supabase-js";

dotenv.config();
const app=express();
const PORT=Number(process.env.PORT||3000);
const SUPABASE_URL=process.env.SUPABASE_URL||"";
const SUPABASE_SERVICE_ROLE_KEY=process.env.SUPABASE_SERVICE_ROLE_KEY||"";
const ADMIN_USERNAME=process.env.ADMIN_USERNAME||"admin";
const ADMIN_PASSWORD=process.env.ADMIN_PASSWORD||"";
const SESSION_SECRET=process.env.SESSION_SECRET||"";
const SITE="mughlaifood.com";

if(!SUPABASE_URL||!SUPABASE_SERVICE_ROLE_KEY||!ADMIN_PASSWORD||!SESSION_SECRET){
  console.warn("Missing required environment variables. See .env.example");
}
const supabase=createClient(SUPABASE_URL,SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
app.set("trust proxy",1);
app.use(express.json({limit:"50kb"}));
app.use(express.urlencoded({extended:false}));

const trackLimiter=rateLimit({windowMs:60_000,max:60,standardHeaders:true,legacyHeaders:false});
const adminLimiter=rateLimit({windowMs:15*60_000,max:30,standardHeaders:true,legacyHeaders:false});

function sign(value){return crypto.createHmac("sha256",SESSION_SECRET).update(value).digest("hex");}
function makeSession(){const exp=Date.now()+8*60*60*1000; const raw=`${ADMIN_USERNAME}.${exp}`; return `${Buffer.from(raw).toString("base64url")}.${sign(raw)}`;}
function validSession(token){try{const [b,s]=String(token||"").split("."); if(!b||!s||!SESSION_SECRET)return false; const raw=Buffer.from(b,"base64url").toString(); if(sign(raw)!==s)return false; const [u,exp]=raw.split("."); return u===ADMIN_USERNAME&&Number(exp)>Date.now();}catch{return false;}}
function auth(req,res,next){if(validSession(req.headers.authorization?.replace(/^Bearer\s+/i,"")) || validSession(req.cookies?.admin_session)) return next(); return res.status(401).json({error:"Unauthorized"});}

// Simple cookie parser for the admin session.
app.use((req,_res,next)=>{req.cookies={}; const c=req.headers.cookie||""; for(const part of c.split(";")){const [k,...v]=part.trim().split("="); if(k)req.cookies[k]=decodeURIComponent(v.join("="));} next();});

app.post("/api/track",trackLimiter,async(req,res)=>{
  try{
    if(!SUPABASE_URL||!SUPABASE_SERVICE_ROLE_KEY)return res.status(503).json({error:"Server is not configured"});
    const b=req.body||{};
    const row={
      site:SITE,
      visitor_type:b.visitor_type==="bot"?"bot":"human",
      city:typeof b.city==="string"?b.city.slice(0,200):null,
      country:typeof b.country==="string"?b.country.slice(0,200):null,
      country_code:typeof b.country_code==="string"?b.country_code.slice(0,20):null,
      user_agent:typeof b.user_agent==="string"?b.user_agent.slice(0,1000):null,
      referrer:typeof b.referrer==="string"?b.referrer.slice(0,1000):null
    };
    const {error}=await supabase.from("visitor_logs").insert(row);
    if(error)throw error;
    res.status(204).end();
  }catch(e){res.status(500).json({error:"Tracker insert failed"});}
});

app.post("/api/admin/login",adminLimiter,(req,res)=>{
  const {username,password}=req.body||{};
  if(!ADMIN_PASSWORD || username!==ADMIN_USERNAME || password!==ADMIN_PASSWORD)return res.status(401).json({error:"Invalid login"});
  const token=makeSession();
  res.cookie("admin_session",token,{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"strict",maxAge:8*60*60*1000,path:"/"});
  res.json({ok:true});
});
app.post("/api/admin/logout",(req,res)=>{res.clearCookie("admin_session",{httpOnly:true,sameSite:"strict",path:"/"});res.status(204).end();});

app.get("/api/admin/visitors",auth,async(req,res)=>{
  try{
    const limit=Math.min(Math.max(Number(req.query.limit)||100,1),500);
    const {data,error}=await supabase.from("visitor_logs").select("id,visitor_type,city,country,country_code,visited_at,user_agent,referrer").eq("site",SITE).order("visited_at",{ascending:false}).limit(limit);
    if(error)throw error;
    res.json({site:SITE,count:data?.length||0,visitors:data||[]});
  }catch(e){res.status(500).json({error:"Could not load visitors"});}
});

app.get("/api/admin/stats",auth,async(_req,res)=>{
  try{
    const {data,error}=await supabase.from("visitor_logs").select("visitor_type,visited_at").eq("site",SITE).order("visited_at",{ascending:false}).limit(5000);
    if(error)throw error;
    const today=new Date(); today.setHours(0,0,0,0);
    const rows=data||[];
    res.json({
      total:rows.length,
      humans:rows.filter(x=>x.visitor_type==="human").length,
      bots:rows.filter(x=>x.visitor_type==="bot").length,
      today:rows.filter(x=>new Date(x.visited_at)>=today).length
    });
  }catch(e){res.status(500).json({error:"Could not load stats"});}
});

app.get("/admin",(_req,res)=>res.sendFile("admin.html",{root:process.cwd()}));
app.use(express.static(process.cwd(),{index:"index.html"}));
app.listen(PORT,()=>console.log(`MughlaiFood server running on port ${PORT}`));
