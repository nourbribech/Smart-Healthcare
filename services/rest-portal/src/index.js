import express from 'express';
import cors from 'cors'
import fs from 'node:fs';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { parse } from 'yaml';
import swaggerUi from 'swagger-ui-express';
import { patients, slots, appointments, prescriptions, dispatches } from './data.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(cors());
app.use(express.json());
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

const api = express.Router();

api.get('/patients/:id', (req, res) => {
const p = patients.find(x => x.id === req.params.id);
if (!p) return res.status(404).json({ error: 'PATIENT_NOT_FOUND' });
res.json(p);
});

api.patch('/patients/:id',(req,res)=>{
constp= patients.find(x=>x.id===req.params.id);
if(!p)returnres.status(404).json({error:'PATIENT_NOT_FOUND'});
constallowed=['phone','email','address']; //neverletclientschangeid/name freely
for(const k of allowed) if(kinreq.body)p[k]=req.body[k];
res.json(p);
});

api.get('/slots',(req,res)=>{
const{doctorId,date}=req.query;
res.json(slots.filter(s=>s.free&&
(!doctorId||s.doctorId===doctorId)&&
(!date||s.start.startsWith(date))));
});

api.post('/appointments',(req,res)=>{
const{patientId,slotId,reason,type='STANDARD'}=req.body;
if(!patientId)returnres.status(400).json({error:'VALIDATION',details:['patientId is required']});
if(!patients.some(p=>p.id===patientId))returnres.status(404).json({error:'PATIENT_NOT_FOUND'});
constslot=type==='URGENCE'
?slots.find(s=>s.free&&s.emergency) //earliestemergencyslot
:slots.find(s=>s.id===slotId);
if(!slot)returnres.status(404).json({error:'SLOT_NOT_FOUND'});
if(!slot.free)returnres.status(409).json({error:'SLOT_TAKEN'});
slot.free =false;
constappt={id:randomUUID(),patientId,slotId:slot.id,doctorId:slot.doctorId,
start:slot.start,type,reason,status:'CONFIRMED'};
appointments.push(appt);
res.status(201).location('/api/v1/appointments/${appt.id}').json(appt);
});

api.get('/appointments',(req,res)=> {
const{patientId}=req.query;
res.json(appointments.filter(a=>!patientId||a.patientId===patientId));
});

api.delete('/appointments/:id',(req,res)=>{
consti= appointments.findIndex(a=>a.id===req.params.id);
if(i<0)returnres.status(404).json({error:'APPOINTMENT_NOT_FOUND'});
const[a] =appointments.splice(i,1);
consts= slots.find(x=>x.id===a.slotId);if(s)s.free=true;
res.status(204).end();
});

//PUT/appointments/:id (re-schedule),GET/appointments/:id,prescriptions:samepattern
api.get('/patients/:id/prescriptions', (req,res)=>
res.json(prescriptions.filter(p=>p.patientId===req.params.id)));
api.post('/ambulance-dispatches',(req,res)=>{
const{patientId,location,priority='HIGH'}=req.body;
if(!patientId)returnres.status(400).json({error:'VALIDATION'});
constd= {id:randomUUID(),patientId,location,priority,status:'DISPATCHED',eta:'12 min'};
dispatches.push(d);
res.status(201).json(d);
});

app.use('/api/v1',api);
constspec=parse(fs.readFileSync(path.resolve(__dirname,'../../../contracts/openapi.yaml'),
'utf8'));
app.use('/docs',swaggerUi.serve,swaggerUi.setup(spec));
app.listen(8002,()=>console.log('RESTportalon:8002'));
