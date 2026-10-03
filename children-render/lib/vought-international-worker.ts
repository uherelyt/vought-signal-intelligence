import {
  AttachmentBuilder,
  ChannelType,
  Client,
  Events,
  GatewayIntentBits,
  Partials,
  PermissionsBitField,
  REST,
  Routes
} from "discord.js";
import { Redis } from "./render-redis.ts";
import { consolidateVoughtChannels } from "./vought-material-consolidation.ts";
import { runChildrenReactiveMessage } from "./children-of-endless.ts";

const ANCHOR = "1555308025525440584";
const PRIMARY_MATERIAL_CHANNEL = "1556062516470358126";
const STATE_KEY = "vought:cove-network:state:v1";
const redisUrl = process.env.REDIS_URL?.trim() || "";
const redis = redisUrl ? new Redis(redisUrl) : null;

const children = [
  ["bart-erelyt","Bart / Erelyt",["bart","erelyt","3я3⅃yt","uherelyt"]],
  ["orpheus","Orpheus",["orpheus"]],
  ["rose-walker","Rose Walker",["rose","rose walker"]],
  ["john-ryder",'John "Pestilence" Ryder',["john","john ryder","pestilence"]],
  ["thanatos","Thanatos",["thanatos"]],
  ["perses","Perses",["perses"]],
  ["distress","Distress of the Endless",["distress"]],
  ["asclepius","Asclepius",["asclepius"]],
  ["ah-muzen-cab","Ah-Muzen-Cab",["ah-muzen-cab","ah muzen cab"]],
  ["cab","Cab / Ah-Muzen-Cab II",["cab","cab ii","ah-muzen-cab ii"]]
] as const;

const store = [
  ["vought-water","Vought Water",20],["a-train-smooths","A-Train Smooths",25],
  ["maeve-pride-bars","Brave Maeve Pride Bars",30],["maeve-rainbow-pops","Brave Maeve Rainbow Pops",30],
  ["black-noir-dark-roast","Colombian Black Noir Dark Roast",35],["frosted-a-trains","Frosted A-Trains",35],
  ["starlight-pops","Starlight Pops",30],["turbo-rush","Turbo Rush",35],["a-trainers","A-Trainers",120],
  ["homelander-high-tops","Homelander High-Tops",140],["vought-backpack","Vought Backpack",90],
  ["voughtality","Voughtality",80],["autumn-breeze","Autumn Breeze",70],
  ["starlight-face-wash","Starlight Wish Face Wash",55],["starlight-perfume","Starlight Wish Perfume",85],
  ["vought-coloring-book","Vought Coloring Book of Heroes",40],["seven-action-figure","The Seven Action Figure",75],
  ["maeve-lasagna","Brave Maeve's Vegetarian Pride Lasagna",45],["maeve-veggie-tacos","Brave Maeve's Veggie Tacos",40],
  ["double-whole-milk","Double Whole Milk",20],["frozen-peas","Frozen Peas",15],
  ["gfuel-compound-v","G Fuel Compound V",45],["lean-lad-lunch","Lean Lad Diet Lunches",35],
  ["homelander-diapers","Homelander Diapers",45],["starlight-diapers","Starlight Diapers",45],
  ["xlr8","XLR8",70],["a-train-limited-figure","A-Train Comic Con 2016 Limited Edition",160],
  ["ezekiel-toy","Ezekiel Toy",65],["kuddle-buddiez","Jr. Seven Kuddle Buddiez",55],
  ["deeper-book","Deeper",50],["vought-american-history","Vought's American History",55]
] as const;

const channelNames = {
  hq:"material",store:"material",support:"material",logs:"material",
  starboard:"material",suggestions:"material"
};
const optRoles = {
  announcements:"Vought Announcements",events:"Vought Events",giveaways:"Vought Giveaways"
};

type Rating = {score:number;messages:number;voiceMinutes:number;lastAward:number};
type Reminder = {id:string;guildId:string;channelId:string;userId:string;dueAt:number;text:string;repeatEveryMs:number|null;remaining:number};
type Giveaway = {guildId:string;channelId:string;messageId:string;itemId:string;winnerCount:number;endsAt:number;entrants:string[];closed:boolean};
type Ticket = {id:string;guildId:string;userId:string;subject:string;openedAt:string;closedAt?:string;status:"open"|"closed"};
type State = {
  ratings:Record<string,Rating>;childBalances:Record<string,number>;userBalances:Record<string,number>;
  inventories:Record<string,string[]>;dailyCredits:Record<string,number>;cooldowns:Record<string,number>;
  activity:{messages:number;voiceMinutes:number;joins:number;leaves:number;commands:number};
  warnings:Record<string,unknown[]>;reminders:Reminder[];giveaways:Record<string,Giveaway>;tickets:Record<string,Ticket>;
  tags:Record<string,string>;triggers:Record<string,string>;starboarded:Record<string,boolean>;
  voiceSessions:Record<string,{startedAt:number;guildId:string;name:string}>;welcomed:Record<string,boolean>;
  statsMessageIds:Record<string,string>;storeMessageIds:Record<string,string>;childrenBridgeSeen:Record<string,boolean>;
};

const blankState = ():State => ({
  ratings:{},childBalances:{},userBalances:{},inventories:{},dailyCredits:{},cooldowns:{},
  activity:{messages:0,voiceMinutes:0,joins:0,leaves:0,commands:0},warnings:{},reminders:[],
  giveaways:{},tickets:{},tags:{},triggers:{},starboarded:{},voiceSessions:{},welcomed:{},statsMessageIds:{},storeMessageIds:{},childrenBridgeSeen:{}
});

let state = blankState();

async function loadState() {
  if (!redis) return;
  const raw = await redis.get(STATE_KEY);
  if (!raw) return;
  try { state = Object.assign(blankState(), JSON.parse(raw)); } catch {}
}
async function saveState() {
  if (redis) await redis.set(STATE_KEY, JSON.stringify(state));
}
function norm(v="") { return String(v).toLowerCase().replace(/[“”"'’]/g,"").replace(/[^a-z0-9я⅃ -]/g," ").replace(/\s+/g," ").trim(); }
function isNetworkGuild(g:any) { return Boolean(g?.channels?.cache?.has(ANCHOR)); }
function tier(score:number) { return score>=500?"S":score>=250?"A":score>=100?"B":score>=40?"C":score>=10?"D":"Unranked"; }
function findItem(id:string) { return store.find(x=>x[0]===id) || null; }
function childFrom(member:any,user:any) {
  const values = [member?.displayName,user?.globalName,user?.displayName,user?.username].filter(Boolean).map(norm);
  for (const [id,name,aliases] of children) {
    const all = [name,...aliases].map(norm);
    if (values.some(v=>all.some(a=>v===a || v.includes(a) || a.includes(v)))) return {id,name};
  }
  return null;
}
function ensureChild(id:string) {
  state.ratings[id] ||= {score:0,messages:0,voiceMinutes:0,lastAward:0};
  state.childBalances[id] ??= 0;
}
function rows() {
  for (const [id] of children) ensureChild(id);
  const sorted = children.map(([id,name])=>({id,name,score:state.ratings[id].score,credits:state.childBalances[id]}))
    .sort((a,b)=>b.score-a.score || a.name.localeCompare(b.name));
  let priorScore:number|null=null, priorRank:number|null=null;
  return sorted.map((x,i)=>{
    let rank:number|null=null;
    if (x.score>0) rank = priorScore===x.score ? priorRank : i+1;
    priorScore=x.score; priorRank=rank;
    return {...x,rank,tier:tier(x.score)};
  });
}
function today() { return new Date().toISOString().slice(0,10); }
function awardUser(id:string,amount:number) {
  const k = today()+":"+id, used=state.dailyCredits[k]||0, grant=Math.max(0,Math.min(amount,120-used));
  if (grant) { state.userBalances[id]=(state.userBalances[id]||0)+grant; state.dailyCredits[k]=used+grant; }
}
function awardChild(id:string,score:number,credits:number) {
  ensureChild(id); state.ratings[id].score+=score; state.ratings[id].lastAward=Date.now(); state.childBalances[id]+=credits;
}
async function role(guild:any,name:string) {
  let r=guild.roles.cache.find((x:any)=>x.name===name);
  if (!r) r=await guild.roles.create({name,reason:"Vought International Network bootstrap"});
  return r;
}
function chan(guild:any,_key:keyof typeof channelNames) {
  return guild.channels.cache.get(PRIMARY_MATERIAL_CHANNEL) || guild.channels.cache.find((c:any)=>c.name==="material");
}
async function log(guild:any,line:string) {
  console.info("[vought-network-audit]", JSON.stringify({guildId:guild?.id ?? null,line}));
}
async function bootstrap(guild:any) {
  if (!isNetworkGuild(guild)) return;
  await consolidateVoughtChannels(guild);
  for(const name of ["Network Member",...Object.values(optRoles)]) await role(guild,name);
}
function isAdmin(i:any){return i.memberPermissions?.has(PermissionsBitField.Flags.ManageGuild)||i.guild?.ownerId===i.user.id;}
function isMod(i:any){return i.memberPermissions?.has(PermissionsBitField.Flags.ModerateMembers)||i.memberPermissions?.has(PermissionsBitField.Flags.ManageMessages)||isAdmin(i);}

const O={SUB:1,GROUP:2,STRING:3,INTEGER:4,USER:6};
const s=(name:string,description:string,required=false,choices?:any[])=>({type:O.STRING,name,description,required,...(choices?{choices}:{})});
const n=(name:string,description:string,required=false,min_value?:number,max_value?:number)=>({type:O.INTEGER,name,description,required,...(min_value!==undefined?{min_value}:{}),...(max_value!==undefined?{max_value}:{})});
const u=(name:string,description:string,required=false)=>({type:O.USER,name,description,required});
const sub=(name:string,description:string,options:any[]=[])=>({type:O.SUB,name,description,options});
const networkGroup:any={type:O.GROUP,name:"network",description:"Vought International Network utilities",options:[
  sub("profile","Show a Child Network Supe Score",[s("child","Child entity ID",true)]),
  sub("leaderboard","Show Children Network rankings"),sub("store","Show the Vought Network store"),
  sub("balance","Show your Vought Credits and inventory"),sub("buy","Buy a promotional product",[s("item","Product ID from the store",true)]),
  sub("role","Toggle an opt-in notification role",[s("role","Role",true,[{name:"Announcements",value:"announcements"},{name:"Events",value:"events"},{name:"Giveaways",value:"giveaways"}])]),
  sub("poll","Create a Network poll",[s("question","Question",true),s("options","Options separated by |",true)]),
  sub("suggest","File a Network suggestion",[s("text","Suggestion",true)]),
  sub("remind","Schedule a reminder",[n("minutes","Minutes from now",true,1,10080),s("text","Reminder text",true),n("repeat_minutes","Optional repeat interval",false,1,10080),n("repeat_count","Total occurrences",false,1,50)]),
  sub("ticket-open","Open a private Vought support ticket",[s("subject","Ticket subject",true)]),sub("ticket-close","Close this support ticket"),
  sub("announce","Issue a Vought announcement",[s("text","Announcement text",true),s("title","Optional title")]),
  sub("event-create","Create an event with RSVP",[s("name","Event name",true),n("minutes","Minutes until start",true,1,10080),s("details","Optional details")]),
  sub("tag-set","Create or update a reusable tag",[s("name","Tag name",true),s("text","Tag content",true)]),
  sub("tag","Post a reusable tag",[s("name","Tag name",true)]),sub("tag-delete","Delete a tag",[s("name","Tag name",true)]),
  sub("trigger-set","Create an exact-match trigger",[s("phrase","Trigger phrase",true),s("response","Automatic response",true)]),
  sub("trigger-delete","Delete an exact-match trigger",[s("phrase","Trigger phrase",true)]),
  sub("slowmode","Set channel slowmode",[n("seconds","Seconds; 0 disables",true,0,21600)]),
  sub("giveaway-start","Launch a product giveaway",[s("item","Product ID from the store",true),n("minutes","Duration in minutes",true,1,10080),n("winners","Winner count",false,1,10)]),
  sub("stats","Show Network analytics"),sub("warn","Record a warning",[u("user","Member",true),s("reason","Reason")]),
  sub("timeout","Temporarily timeout a member",[u("user","Member",true),n("minutes","Timeout minutes",true,1,40320)]),
  sub("purge","Bulk-delete recent messages",[n("amount","Messages to delete",true,1,100)])
]};

async function registerNetworkGroup(token:string,appId:string,guildIds:string[]=[]) {
  const rest=new REST({version:"10"}).setToken(token);
  const list:any[]=await rest.get(Routes.applicationCommands(appId)) as any[];
  let c:any=list.find(x=>x.name==="cove");
  const options=(c?.options||[]).filter((x:any)=>x.name!=="network");
  options.push(networkGroup);
  const body={name:"cove",description:c?.description||"Cove / Vought International",options};
  if(!c) {
    c=await rest.post(Routes.applicationCommands(appId),{body});
  } else {
    c=await rest.patch(Routes.applicationCommand(appId,c.id),{body});
  }

  let guildMirrors=0;
  for(const guildId of guildIds){
    const local:any[]=await rest.get(Routes.applicationGuildCommands(appId,guildId)) as any[];
    const existing=local.find(x=>x.name==="cove");
    if(existing) await rest.patch(Routes.applicationGuildCommand(appId,guildId,existing.id),{body});
    else await rest.post(Routes.applicationGuildCommands(appId,guildId),{body});
    guildMirrors++;
  }

  console.info("[vought-international-commands-ready]", JSON.stringify({
    networkSubcommands:networkGroup.options.length,
    guildMirrors
  }));
}

function storeCatalogText() {
  return store.map(([id,name,price]) => "**"+name+"** — `"+id+"` — "+price+" VC").join("\n");
}

async function inviteChildrenResponse(message:any, content:string, kind="public") {
  if(!message?.id || message.channelId!==PRIMARY_MATERIAL_CHANNEL) return;
  const bridgeKey=kind+":"+message.id;
  if(state.childrenBridgeSeen[bridgeKey]) return;

  try {
    const result=await runChildrenReactiveMessage({
      messageId:message.id,
      channelId:PRIMARY_MATERIAL_CHANNEL,
      authorId:process.env.COVE_DISCORD_APPLICATION_ID?.trim()||message.author?.id||"vought-international",
      authorName:"Vought International",
      content,
      sourceKind:"vought",
      forceSourceLocation:true,
      routingNotice:false
    });
    if(result.ok && (!result.skipped || result.reason==="duplicate_message")) {
      state.childrenBridgeSeen[bridgeKey]=true;
      await saveState();
    }
    console.info("[vought-children-bridge]",JSON.stringify({kind,messageId:message.id,ok:result.ok,skipped:Boolean(result.skipped),reason:result.reason||null,participants:result.participants||[]}));
  } catch(error:any) {
    console.error("[vought-children-bridge-error]",error?.message||String(error));
  }
}

async function updateStoreSurface(guild:any) {
  const material=chan(guild,"store");
  if(!material?.isTextBased()) return;

  const payload={
    embeds:[{
      title:"VOUGHT NETWORK STORE",
      description:storeCatalogText(),
      footer:{text:"Buy with /cove network buy • Vought Credits are promotional Network currency"}
    }]
  };

  let message:any=null;
  const existingId=state.storeMessageIds[guild.id];
  if(existingId) message=await material.messages.fetch(existingId).catch(()=>null);

  if(message) {
    await message.edit(payload).catch(()=>{});
  } else {
    message=await material.send(payload).catch(()=>null);
    if(message) state.storeMessageIds[guild.id]=message.id;
  }

  if(message && !message.pinned) await message.pin("Keep the Vought Network store visible in #material").catch(()=>{});
  if(message) {
    console.info("[vought-store-visible]",JSON.stringify({guildId:guild.id,channelId:material.id,messageId:message.id,pinned:Boolean(message.pinned)}));
    await inviteChildrenResponse(message,"VOUGHT NETWORK STORE\n"+storeCatalogText(),"store");
  }
}

async function updateStats(guild:any) {
  const hq=chan(guild,"hq"); if(!hq?.isTextBased()) return;
  const text=["Members: "+guild.memberCount,"Observed messages: "+state.activity.messages,"Observed voice minutes: "+state.activity.voiceMinutes,
    "Active reminders: "+state.reminders.filter(x=>x.guildId===guild.id).length,
    "Open giveaways: "+Object.values(state.giveaways).filter(x=>x.guildId===guild.id&&!x.closed).length].join("\n");
  let m:any=null; const id=state.statsMessageIds[guild.id]; if(id) m=await hq.messages.fetch(id).catch(()=>null);
  if(m) await m.edit({content:"VOUGHT NETWORK LIVE STATS\n"+text}).catch(()=>{});
  else {m=await hq.send("VOUGHT NETWORK LIVE STATS\n"+text).catch(()=>null); if(m) state.statsMessageIds[guild.id]=m.id;}
}

async function handleCommand(i:any) {
  if(!i.isChatInputCommand()||i.commandName!=="cove"||i.options.getSubcommandGroup(false)!=="network") return;
  if(!isNetworkGuild(i.guild)){await i.reply({content:"Vought Network utilities are not enabled here.",ephemeral:true});return;}
  state.activity.commands++; const cmd=i.options.getSubcommand(); await log(i.guild,"COMMAND /cove network "+cmd+" by <@"+i.user.id+">");
  if(cmd==="leaderboard"){await i.reply(rows().map(r=>(r.rank?"#"+r.rank:"Unranked")+" "+r.name+" — "+r.score+" Network Supe Score — "+r.tier+(r.tier==="Unranked"?"":"-Rank")+" — "+r.credits+" VC").join("\n"));return;}
  if(cmd==="profile"){const id=i.options.getString("child",true);const r=rows().find(x=>x.id===id);if(!r){await i.reply({content:"Child not found.",ephemeral:true});return;}const p=state.ratings[id];await i.reply(["VOUGHT PROFILE — "+r.name,"Network Supe Score: "+r.score,"Vought Network Rank: "+(r.rank?"#"+r.rank:"Unranked"),"Tier: "+r.tier,"Vought Credits: "+r.credits+" VC","Rated messages: "+p.messages,"Rated voice minutes: "+p.voiceMinutes].join("\n"));return;}
  if(cmd==="store"){await updateStoreSurface(i.guild);await i.reply({content:"The Vought Network Store is pinned in <#"+PRIMARY_MATERIAL_CHANNEL+">. Use /cove network buy with the displayed product ID.",ephemeral:true});return;}
  if(cmd==="balance"){await i.reply({content:"Balance: "+(state.userBalances[i.user.id]||0)+" VC\nInventory: "+((state.inventories[i.user.id]||[]).join(", ")||"empty"),ephemeral:true});return;}
  if(cmd==="buy"){const id=i.options.getString("item",true),item=findItem(id);if(!item){await i.reply({content:"Product not found.",ephemeral:true});return;}const bal=state.userBalances[i.user.id]||0;if(bal<item[2]){await i.reply({content:"Insufficient VC. "+item[1]+" costs "+item[2]+" VC.",ephemeral:true});return;}state.userBalances[i.user.id]=bal-item[2];(state.inventories[i.user.id]||=[]).push(id);await saveState();await i.reply({content:"Purchased: "+item[1]+". Promotional inventory updated.",ephemeral:true});return;}
  if(cmd==="role"){const k=i.options.getString("role",true) as keyof typeof optRoles,r=await role(i.guild,optRoles[k]);const m=await i.guild.members.fetch(i.user.id);if(m.roles.cache.has(r.id)){await m.roles.remove(r);await i.reply({content:"Removed "+r.name+".",ephemeral:true});}else{await m.roles.add(r);await i.reply({content:"Added "+r.name+".",ephemeral:true});}return;}
  if(cmd==="poll"){const q=i.options.getString("question",true),opts=i.options.getString("options",true).split("|").map((x:string)=>x.trim()).filter(Boolean).slice(0,5),em=["1️⃣","2️⃣","3️⃣","4️⃣","5️⃣"];if(opts.length<2){await i.reply({content:"Provide at least two options separated by |.",ephemeral:true});return;}const pollText="POLL — "+q+"\n"+opts.map((x:string,j:number)=>em[j]+" "+x).join("\n");await i.reply(pollText);const m=await i.fetchReply();for(let j=0;j<opts.length;j++)await m.react(em[j]).catch(()=>{});await inviteChildrenResponse(m,pollText,"poll");return;}
  if(cmd==="suggest"){const c=chan(i.guild,"suggestions")||i.channel,text="VOUGHT SUGGESTION — <@"+i.user.id+">\n"+i.options.getString("text",true),m=await c.send(text);await m.react("👍").catch(()=>{});await m.react("👎").catch(()=>{});await inviteChildrenResponse(m,text,"suggestion");await i.reply({content:"Suggestion filed.",ephemeral:true});return;}
  if(cmd==="remind"){const mins=i.options.getInteger("minutes",true),repeat=i.options.getInteger("repeat_minutes"),count=i.options.getInteger("repeat_count")||1;state.reminders.push({id:"rem-"+Date.now(),guildId:i.guildId,channelId:i.channelId,userId:i.user.id,dueAt:Date.now()+mins*60000,text:i.options.getString("text",true),repeatEveryMs:repeat?repeat*60000:null,remaining:repeat?count:1});await saveState();await i.reply({content:"Reminder scheduled.",ephemeral:true});return;}
  if(cmd==="ticket-open"){const subject=i.options.getString("subject",true),id="ticket-"+Date.now().toString(36);state.tickets[id]={id,guildId:i.guildId,userId:i.user.id,subject,openedAt:new Date().toISOString(),status:"open"};await saveState();await log(i.guild,"TICKET OPEN "+id+" by "+i.user.id);await i.reply({content:"Vought support ticket "+id+" opened. Subject: "+subject,ephemeral:true});return;}
  if(cmd==="ticket-close"){const ticket=Object.values(state.tickets).filter(t=>t.guildId===i.guildId&&t.userId===i.user.id&&t.status==="open").sort((a,b)=>b.openedAt.localeCompare(a.openedAt))[0];if(!ticket){await i.reply({content:"No open Vought support ticket found for you.",ephemeral:true});return;}ticket.status="closed";ticket.closedAt=new Date().toISOString();await saveState();await log(i.guild,"TICKET CLOSE "+ticket.id+" by "+i.user.id);await i.reply({content:"Vought support ticket "+ticket.id+" closed.",ephemeral:true});return;}
  if(cmd==="announce"){if(!isAdmin(i)){await i.reply({content:"Authorization denied.",ephemeral:true});return;}const c=chan(i.guild,"hq")||i.channel,text="**"+(i.options.getString("title")||"Vought International")+"**\n"+i.options.getString("text",true),m=await c.send(text);await inviteChildrenResponse(m,text,"announcement");await i.reply({content:"Announcement issued.",ephemeral:true});return;}
  if(cmd==="event-create"){const c=chan(i.guild,"hq")||i.channel,name=i.options.getString("name",true),mins=i.options.getInteger("minutes",true),details=i.options.getString("details")||"No additional details.",text="VOUGHT EVENT — "+name+"\nStarts <t:"+Math.floor((Date.now()+mins*60000)/1000)+":R>\n"+details+"\n✅ attending • ❔ maybe • ❌ unavailable";const m=await c.send(text);for(const e of ["✅","❔","❌"])await m.react(e).catch(()=>{});await inviteChildrenResponse(m,text,"event");await i.reply({content:"Event posted.",ephemeral:true});return;}
  if(cmd==="tag-set"){if(!isAdmin(i)){await i.reply({content:"Authorization denied.",ephemeral:true});return;}state.tags[i.guildId+":"+norm(i.options.getString("name",true)).replace(/ /g,"-")]=i.options.getString("text",true);await saveState();await i.reply({content:"Tag saved.",ephemeral:true});return;}
  if(cmd==="tag"){const v=state.tags[i.guildId+":"+norm(i.options.getString("name",true)).replace(/ /g,"-")];await i.reply({content:v||"Vought tag not found.",ephemeral:!v});return;}
  if(cmd==="tag-delete"){if(!isAdmin(i)){await i.reply({content:"Authorization denied.",ephemeral:true});return;}delete state.tags[i.guildId+":"+norm(i.options.getString("name",true)).replace(/ /g,"-")];await saveState();await i.reply({content:"Tag deleted.",ephemeral:true});return;}
  if(cmd==="trigger-set"){if(!isAdmin(i)){await i.reply({content:"Authorization denied.",ephemeral:true});return;}state.triggers[i.guildId+":"+norm(i.options.getString("phrase",true))]=i.options.getString("response",true);await saveState();await i.reply({content:"Trigger saved.",ephemeral:true});return;}
  if(cmd==="trigger-delete"){if(!isAdmin(i)){await i.reply({content:"Authorization denied.",ephemeral:true});return;}delete state.triggers[i.guildId+":"+norm(i.options.getString("phrase",true))];await saveState();await i.reply({content:"Trigger deleted.",ephemeral:true});return;}
  if(cmd==="slowmode"){if(!isMod(i)){await i.reply({content:"Moderation access denied.",ephemeral:true});return;}const secs=i.options.getInteger("seconds",true);await i.channel.setRateLimitPerUser(secs,"Vought moderation");await log(i.guild,"SLOWMODE #"+i.channel.name+" — "+secs+"s");await i.reply({content:"Slowmode set.",ephemeral:true});return;}
  if(cmd==="giveaway-start"){if(!isAdmin(i)){await i.reply({content:"Authorization denied.",ephemeral:true});return;}const item=findItem(i.options.getString("item",true));if(!item){await i.reply({content:"Product not found or not giveaway eligible.",ephemeral:true});return;}const mins=i.options.getInteger("minutes",true),w=i.options.getInteger("winners")||1,c=chan(i.guild,"store")||i.channel,text="VOUGHT GIVEAWAY — "+item[1]+"\nEnds in "+mins+" minute(s). Winners: "+w+".\nReact 🎟️ to enter.",m=await c.send(text);await m.react("🎟️");state.giveaways[m.id]={guildId:i.guildId,channelId:c.id,messageId:m.id,itemId:item[0],winnerCount:w,endsAt:Date.now()+mins*60000,entrants:[],closed:false};await saveState();await inviteChildrenResponse(m,text,"giveaway");await i.reply({content:"Giveaway launched.",ephemeral:true});return;}
  if(cmd==="stats"){await i.reply(["VOUGHT NETWORK ANALYTICS","Members: "+i.guild.memberCount,"Observed messages: "+state.activity.messages,"Observed voice minutes: "+state.activity.voiceMinutes,"Joins: "+state.activity.joins,"Leaves: "+state.activity.leaves,"Commands: "+state.activity.commands].join("\n"));return;}
  if(cmd==="warn"){if(!isMod(i)){await i.reply({content:"Moderation access denied.",ephemeral:true});return;}const user=i.options.getUser("user",true),reason=i.options.getString("reason")||"No reason supplied";(state.warnings[user.id]||=[]).push({reason,moderatorId:i.user.id,at:new Date().toISOString()});await saveState();await log(i.guild,"WARN <@"+user.id+"> — "+reason);await i.reply({content:"Warning recorded.",ephemeral:true});return;}
  if(cmd==="timeout"){if(!isMod(i)){await i.reply({content:"Moderation access denied.",ephemeral:true});return;}const user=i.options.getUser("user",true),mins=i.options.getInteger("minutes",true),m=await i.guild.members.fetch(user.id);await m.timeout(mins*60000,"Vought moderation");await log(i.guild,"TIMEOUT <@"+user.id+"> — "+mins+"m");await i.reply({content:"Timeout applied.",ephemeral:true});return;}
  if(cmd==="purge"){if(!isMod(i)){await i.reply({content:"Moderation access denied.",ephemeral:true});return;}const amount=i.options.getInteger("amount",true),d=await i.channel.bulkDelete(amount,true);await log(i.guild,"PURGE #"+i.channel.name+" — "+d.size);await i.reply({content:"Purged "+d.size+" message(s).",ephemeral:true});return;}
}

async function timers(client:Client) {
  const now=Date.now();
  for(const r of [...state.reminders]) if(r.dueAt<=now){const c:any=await client.channels.fetch(r.channelId).catch(()=>null);if(c?.isTextBased())await c.send("<@"+r.userId+"> Vought reminder: "+r.text).catch(()=>{});if(r.repeatEveryMs&&r.remaining>1){r.remaining--;r.dueAt=now+r.repeatEveryMs;}else state.reminders=state.reminders.filter(x=>x.id!==r.id);}
  for(const g of Object.values(state.giveaways)) if(!g.closed&&g.endsAt<=now){g.closed=true;const ids=[...new Set(g.entrants)].sort(()=>Math.random()-.5).slice(0,g.winnerCount),item=findItem(g.itemId),c:any=await client.channels.fetch(g.channelId).catch(()=>null);if(c?.isTextBased())await c.send("VOUGHT GIVEAWAY CLOSED — "+(item?.[1]||g.itemId)+"\n"+(ids.length?"Winner(s): "+ids.map(id=>"<@"+id+">").join(", "):"No eligible entrants.")).catch(()=>{});}
  for(const guild of client.guilds.cache.values()) if(isNetworkGuild(guild)){await updateStats(guild).catch(()=>{});await updateStoreSurface(guild).catch(()=>{});}
  await saveState();
}

export const voughtInternationalStatus:any={state:"not_started",applicationId:null};

export async function startVoughtInternational() {
  const token=process.env.COVE_DISCORD_BOT_TOKEN?.trim()||"",appId=process.env.COVE_DISCORD_APPLICATION_ID?.trim()||"";
  if(!token||!appId){voughtInternationalStatus.state="credentials_missing";console.info("[vought-international-disabled] credentials_missing");return voughtInternationalStatus;}
  await loadState(); for(const [id] of children) ensureChild(id);
  const intents=[GatewayIntentBits.Guilds,GatewayIntentBits.GuildMessages,GatewayIntentBits.MessageContent,GatewayIntentBits.GuildMessageReactions,GatewayIntentBits.GuildVoiceStates,GatewayIntentBits.GuildMembers];
  const client=new Client({intents,partials:[Partials.Message,Partials.Channel,Partials.Reaction,Partials.User,Partials.GuildMember]});
  client.once(Events.ClientReady,async c=>{voughtInternationalStatus.state="ready";voughtInternationalStatus.applicationId=appId;const networkGuilds=[...c.guilds.cache.values()].filter(isNetworkGuild);await registerNetworkGroup(token,appId,networkGuilds.map(g=>g.id));for(const g of networkGuilds){await bootstrap(g);await log(g,"Network utility suite online.");await updateStats(g);await updateStoreSurface(g);}await saveState();console.info("[vought-international-ready]",JSON.stringify({guilds:networkGuilds.length}));});
  client.on(Events.InteractionCreate,i=>handleCommand(i).catch(async e=>{console.error("[vought-network-command-error]",e?.message||e);if(i.isRepliable()){const p={content:"Vought Network command failed.",ephemeral:true};if(i.replied||i.deferred)await i.followUp(p).catch(()=>{});else await i.reply(p).catch(()=>{});}}));
  client.on(Events.MessageCreate,async m=>{if(!m.guild||!isNetworkGuild(m.guild)||m.system)return;state.activity.messages++;if(!m.author.bot){awardUser(m.author.id,2);const wk=m.guildId+":"+m.author.id;if(!state.welcomed[wk]){const r=await role(m.guild,"Network Member").catch(()=>null);if(r&&m.member&&!m.member.roles.cache.has(r.id))await m.member.roles.add(r).catch(()=>{});state.welcomed[wk]=true;}const trig=state.triggers[m.guildId+":"+norm(m.content)];if(trig)await m.reply(trig.slice(0,1900)).catch(()=>{});}const child=childFrom(m.member,m.author);if(child){ensureChild(child.id);const k=m.guildId+":"+child.id,last=state.cooldowns[k]||0;if(Date.now()-last>=60000){awardChild(child.id,1,2);state.ratings[child.id].messages++;state.cooldowns[k]=Date.now();}}const spamKey="spam:"+m.guildId+":"+m.author.id;const raw=(state as any)[spamKey]||[];(state as any)[spamKey]=raw.filter((x:number)=>Date.now()-x<8000);(state as any)[spamKey].push(Date.now());if(!m.author.bot&&(state as any)[spamKey].length>7){if(m.deletable)await m.delete().catch(()=>{});await log(m.guild,"ANTI-SPAM flagged <@"+m.author.id+"> in #"+m.channel.name);}await saveState();});
  client.on(Events.MessageReactionAdd,async (r,user)=>{if(user.bot)return;if(r.partial)try{await r.fetch();}catch{return;}if(!isNetworkGuild(r.message.guild))return;const g=state.giveaways[r.message.id];if(g&&!g.closed&&r.emoji.name==="🎟️"&&!g.entrants.includes(user.id))g.entrants.push(user.id);if(r.emoji.name==="⭐"&&r.count>=3&&!state.starboarded[r.message.id]){const c=chan(r.message.guild,"starboard");if(c?.isTextBased()){state.starboarded[r.message.id]=true;await c.send("⭐ "+r.count+" — #"+r.message.channel.name+"\n"+r.message.author+": "+(r.message.content||"[attachment]")+"\n"+r.message.url).catch(()=>{});}}await saveState();});
  client.on(Events.GuildMemberAdd,async m=>{if(!isNetworkGuild(m.guild))return;state.activity.joins++;const r=await role(m.guild,"Network Member").catch(()=>null);if(r)await m.roles.add(r).catch(()=>{});const hq=chan(m.guild,"hq");if(hq?.isTextBased())await hq.send("Welcome <@"+m.id+"> to the Network. Vought International has completed intake.").catch(()=>{});await log(m.guild,"MEMBER JOIN <@"+m.id+">");await saveState();});
  client.on(Events.GuildMemberRemove,async m=>{if(!isNetworkGuild(m.guild))return;state.activity.leaves++;await log(m.guild,"MEMBER LEAVE "+(m.user?.tag||m.id));await saveState();});
  client.on(Events.VoiceStateUpdate,async (oldS,newS)=>{const guild=newS.guild||oldS.guild;if(!isNetworkGuild(guild))return;const id=newS.id||oldS.id;if(!oldS.channelId&&newS.channelId){state.voiceSessions[id]={startedAt:Date.now(),guildId:guild.id,name:newS.member?.displayName||""};await saveState();return;}if(oldS.channelId&&!newS.channelId){const ses=state.voiceSessions[id];if(!ses)return;const mins=Math.max(0,Math.floor((Date.now()-ses.startedAt)/60000));state.activity.voiceMinutes+=mins;awardUser(id,Math.floor(mins/5));const child=childFrom(oldS.member,oldS.member?.user);if(child){const pts=Math.min(12,Math.floor(mins/10));if(pts){awardChild(child.id,pts,pts*2);state.ratings[child.id].voiceMinutes+=mins;}}delete state.voiceSessions[id];await saveState();}});
  setInterval(()=>timers(client).catch(e=>console.error("[vought-network-timer-error]",e?.message||e)),30000);
  voughtInternationalStatus.state="starting";await client.login(token);return voughtInternationalStatus;
}
