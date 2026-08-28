require('dotenv').config();
const http=require('http');const express=require('express');const cors=require('cors');const helmet=require('helmet');
const prisma=require('./db');const {initRealtime}=require('./services/realtime');
const authRoutes=require('./routes/auth');const contactsRoutes=require('./routes/contacts');const eventsRoutes=require('./routes/events');const templatesRoutes=require('./routes/templates');const campaignsRoutes=require('./routes/campaigns');const whatsappRoutes=require('./routes/whatsapp');const inboxRoutes=require('./routes/inbox');const reportsRoutes=require('./routes/reports');

const app=express();const server=http.createServer(app);
app.use(helmet({crossOriginResourcePolicy:false}));app.use(cors({origin:process.env.FRONTEND_URL||'http://localhost:5173'}));
app.get('/',(_req,res)=>res.json({service:'bharat-crm-api',ok:true,health:'/health'}));
app.use('/api/whatsapp',whatsappRoutes);
app.use(express.json({limit:'10mb'}));app.get('/health',async(_req,res)=>{try{await prisma.$queryRaw`SELECT 1`;res.json({ok:true,service:'bharat-crm-api',database:'up'});}catch(e){res.status(503).json({ok:false,database:'down'});}});
app.use('/api/auth',authRoutes);app.use('/api/contacts',contactsRoutes);app.use('/api/events',eventsRoutes);app.use('/api/templates',templatesRoutes);app.use('/api/campaigns',campaignsRoutes);app.use('/api/inbox',inboxRoutes);app.use('/api/reports',reportsRoutes);
app.use((err,_req,res,_next)=>{console.error(err);res.status(500).json({error:'Internal server error.'});});
initRealtime(server);
const port=Number(process.env.PORT||4000);server.listen(port,()=>console.log(`Bharat CRM API listening on http://localhost:${port}`));
async function shutdown(){await prisma.$disconnect();process.exit(0);}process.on('SIGINT',shutdown);process.on('SIGTERM',shutdown);
