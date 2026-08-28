require("dotenv").config();
const bcrypt=require("bcryptjs");
const prisma=require("../db");

(async()=>{
  const tenant=await prisma.tenant.upsert({where:{slug:"bharat-demo"},update:{},create:{name:"Bharat Infotechs Demo",slug:"bharat-demo"}});
  const adminHash=await bcrypt.hash("Admin@123",12);
  await prisma.user.upsert({where:{tenantId_email:{tenantId:tenant.id,email:"admin@bharatinfotechs.com"}},update:{passwordHash:adminHash,role:"admin",name:"Bharat Admin"},create:{tenantId:tenant.id,name:"Bharat Admin",email:"admin@bharatinfotechs.com",passwordHash:adminHash,role:"admin"}});
  const clientHash=await bcrypt.hash("Client@123",12);
  await prisma.user.upsert({where:{tenantId_email:{tenantId:tenant.id,email:"client@bharatinfotechs.com"}},update:{passwordHash:clientHash,role:"client",name:"Demo Client"},create:{tenantId:tenant.id,name:"Demo Client",email:"client@bharatinfotechs.com",passwordHash:clientHash,role:"client"}});
  await prisma.whatsAppConfiguration.upsert({where:{tenantId:tenant.id},update:{},create:{tenantId:tenant.id,mode:process.env.WHATSAPP_MODE||"mock",connectionStatus:"connected",webhookVerifyToken:process.env.META_WEBHOOK_VERIFY_TOKEN||"change-me"}});
  let template=await prisma.messageTemplate.findFirst({where:{tenantId:tenant.id,name:"event_invitation",language:"en_US"}});
  if(!template) template=await prisma.messageTemplate.create({data:{tenantId:tenant.id,name:"event_invitation",category:"MARKETING",language:"en_US",status:"APPROVED",body:"Hello {{name}},\n\nYou are invited to {{event_name}} on {{date}} at {{venue}}.\n\nRegister: {{link}}",variables:["name","event_name","date","venue","link"]}});
  let event=await prisma.event.findFirst({where:{tenantId:tenant.id,name:"Bharat Growth Summit 2026"}});
  if(!event) event=await prisma.event.create({data:{tenantId:tenant.id,name:"Bharat Growth Summit 2026",eventDate:"2026-09-20",eventTime:"10:00 AM",venue:"Lucknow Convention Centre",address:"Lucknow, Uttar Pradesh",description:"Demo event for the CRM workflow.",registrationUrl:"https://example.com/register",status:"upcoming"}});
  const demoContacts=[
    ["Aarav Sharma","+919876543210","aarav@example.com","Acme Industries"],
    ["Priya Verma","+919876543211","priya@example.com","Northstar Retail"],
    ["Rohan Gupta","+919876543212","rohan@example.com","Vertex Labs"],
    ["Neha Singh","+919876543213","neha@example.com","Greenfield Group"],
    ["Kabir Khan","+919876543214","kabir@example.com","K2 Enterprises"]
  ];
  const contacts=[];
  for(const [name,phone,email,company] of demoContacts){contacts.push(await prisma.contact.upsert({where:{tenantId_phone:{tenantId:tenant.id,phone}},update:{name,email,company,eventId:event.id,eventDate:event.eventDate,venue:event.venue,link:event.registrationUrl},create:{tenantId:tenant.id,name,phone,email,company,eventId:event.id,eventDate:event.eventDate,venue:event.venue,link:event.registrationUrl}}));}
  let campaign=await prisma.campaign.findFirst({where:{tenantId:tenant.id,name:"September Event Invitation"}});
  if(!campaign) campaign=await prisma.campaign.create({data:{tenantId:tenant.id,name:"September Event Invitation",eventId:event.id,templateId:template.id,messageContent:template.body,status:"draft",createdBy:(await prisma.user.findFirst({where:{tenantId:tenant.id,email:"admin@bharatinfotechs.com"}})).id}});
  for(const c of contacts) await prisma.campaignRecipient.upsert({where:{campaignId_contactId:{campaignId:campaign.id,contactId:c.id}},update:{},create:{tenantId:tenant.id,campaignId:campaign.id,contactId:c.id,personalizedMessage:`Hello ${c.name}, you are invited to ${event.name}.`}});
  for(const c of contacts.slice(0,2)){let conv=await prisma.conversation.upsert({where:{tenantId_phone:{tenantId:tenant.id,phone:c.phone}},update:{contactId:c.id,contactName:c.name,status:"open",lastMessageAt:new Date()},create:{tenantId:tenant.id,contactId:c.id,phone:c.phone,contactName:c.name,status:"open",lastMessageAt:new Date()}});const count=await prisma.conversationMessage.count({where:{conversationId:conv.id}});if(!count)await prisma.conversationMessage.createMany({data:[{tenantId:tenant.id,conversationId:conv.id,direction:"outbound",content:`Hi ${c.name}, your event invitation is ready.`,status:"read"},{tenantId:tenant.id,conversationId:conv.id,direction:"inbound",content:"Thanks! Please share the registration link.",status:"received"}]});}
  console.log("Seed complete. Admin: admin@bharatinfotechs.com / Admin@123");
  await prisma.$disconnect();
})().catch(async e=>{console.error(e);await prisma.$disconnect();process.exit(1);});
