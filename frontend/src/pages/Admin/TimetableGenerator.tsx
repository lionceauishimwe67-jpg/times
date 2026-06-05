import React, { useState, useEffect, useRef } from 'react';
import { timetableApi } from '../../services/api';
import * as pdfjsLib from 'pdfjs-dist';
import Tesseract from 'tesseract.js';
import './TimetableGenerator.css';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

interface RefData { classes: any[]; subjects: any[]; teachers: any[]; classrooms: any[]; }
interface TSlot { startTime: string; endTime: string; label: string; isBreak: boolean; isLunch: boolean; }
interface Cell { subject_id: number; teacher_id: number; classroom_id: number; }

const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday'];
const DEF: TSlot[] = [
  {startTime:'08:10',endTime:'09:00',label:'Period 1',isBreak:false,isLunch:false},
  {startTime:'09:00',endTime:'09:50',label:'Period 2',isBreak:false,isLunch:false},
  {startTime:'09:50',endTime:'10:10',label:'Short Break',isBreak:true,isLunch:false},
  {startTime:'10:10',endTime:'10:55',label:'Period 3',isBreak:false,isLunch:false},
  {startTime:'10:55',endTime:'11:45',label:'Period 4',isBreak:false,isLunch:false},
  {startTime:'11:45',endTime:'12:35',label:'Period 5',isBreak:false,isLunch:false},
  {startTime:'12:35',endTime:'13:35',label:'Lunch Break',isBreak:false,isLunch:true},
  {startTime:'13:35',endTime:'14:25',label:'Period 6',isBreak:false,isLunch:false},
  {startTime:'14:25',endTime:'15:15',label:'Period 7',isBreak:false,isLunch:false},
];

const TG: React.FC = () => {
  const [rd,setRd]=useState<RefData|null>(null);
  const [ld,setLd]=useState(false);
  const [er,setEr]=useState('');
  const [ok,setOk]=useState('');
  const [sl,setSl]=useState<TSlot[]>([...DEF]);
  const [cls,setCls]=useState<number|''>('');
  const [cells,setCells]=useState<Map<string,Cell>>(new Map());
  const [dy,setDy]=useState(1);
  const [st,setSt]=useState<0|1|2>(0);
  const [sv,setSv]=useState(false);
  const [importing,setImporting]=useState(false);
  const [ocrProgress,setOcrProgress]=useState('');
  const [debugText,setDebugText]=useState('');
  const impFileRef=useRef<HTMLInputElement>(null);

  useEffect(()=>{(async()=>{try{setLd(true);const r=await timetableApi.getReferenceData();const d=r.data?.data||r.data;const safe={classes:d?.classes||[],subjects:d?.subjects||[],teachers:d?.teachers||[],classrooms:d?.classrooms||[]};setRd(safe);}catch{setEr('Load failed');}finally{setLd(false);}})();},[]);
  const clr=()=>{setEr('');setOk('');};
  const uSl=(i:number,f:keyof TSlot,v:any)=>setSl(p=>{const n=[...p];n[i]={...n[i],[f]:v};return n;});
  const addSl=()=>{const l=sl[sl.length-1];setSl(p=>[...p,{startTime:l?l.endTime:'08:00',endTime:l?l.endTime:'08:45',label:'New Period',isBreak:false,isLunch:false}]);};
  const rmSl=(i:number)=>setSl(p=>p.filter((_,x)=>x!==i));
  const rstSl=()=>setSl([...DEF]);
  const expCh=()=>{const b=new Blob([JSON.stringify({timeSlots:sl},null,2)],{type:'application/json'});const u=URL.createObjectURL(b);const a=document.createElement('a');a.href=u;a.download=`chronogram-${new Date().toISOString().slice(0,10)}.json`;a.click();URL.revokeObjectURL(u);setOk('Exported');};

  const parseCSV=(text:string)=>{const lines=text.trim().split('\n');if(lines.length<2)return[];const headers=lines[0].split(',').map(h=>h.trim().toLowerCase());return lines.slice(1).filter(l=>l.trim()).map(line=>{const vals=line.split(',').map(v=>v.trim());const obj:any={};headers.forEach((h,i)=>{obj[h]=vals[i]||'';});return obj;});};

  const dayToNum=(d:string)=>{const m:any={monday:1,tuesday:2,wednesday:3,thursday:4,friday:5,mon:1,tue:2,wed:3,thu:4,fri:5};return m[d.toLowerCase()]||0;};

  const fuzzyMatch=(name:string,list:any[]):any|null=>{
    if(!name||!list||!list.length)return null;
    const nl=name.toLowerCase().replace(/[^a-z0-9]/g,'');
    // Exact match first
    const exact=list.find(i=>i.name?.toLowerCase()===name.toLowerCase());
    if(exact)return exact;
    // No-spaces match
    const noSpace=list.find(i=>i.name?.toLowerCase().replace(/[^a-z0-9]/g,'')===nl);
    if(noSpace)return noSpace;
    // Partial match: name contains item name or vice versa
    const partial=list.find(i=>{
      const il=i.name?.toLowerCase().replace(/[^a-z0-9]/g,'')||'';
      return il.length>=3&&(nl.includes(il)||il.includes(nl));
    });
    if(partial)return partial;
    // Word-by-word match
    const words=name.toLowerCase().split(/\s+/).filter(w=>w.length>2);
    for(const w of words){
      const found=list.find(i=>i.name?.toLowerCase().includes(w));
      if(found)return found;
    }
    return null;
  };

  const matchRefData=(text:string):{subjects:any[];teachers:any[];classrooms:any[];classes:any[]}=>{
    const tl=text.toLowerCase();
    return {
      subjects:(rd?.subjects||[]).filter(s=>s.name&&tl.includes(s.name.toLowerCase())),
      teachers:(rd?.teachers||[]).filter(t=>t.name&&tl.includes(t.name.toLowerCase())),
      classrooms:(rd?.classrooms||[]).filter(c=>c.name&&tl.includes(c.name.toLowerCase())),
      classes:(rd?.classes||[]).filter(c=>c.name&&tl.includes(c.name.toLowerCase())),
    };
  };

  const extractPdfText=async(file:File):Promise<string>=>{
    const buf=await file.arrayBuffer();
    const pdf=await pdfjsLib.getDocument({data:buf}).promise;
    let fullText='';
    for(let i=1;i<=pdf.numPages;i++){
      const page=await pdf.getPage(i);
      const content=await page.getTextContent();
      const lines:string[]=[];let lastY:number|null=null;
      for(const item of content.items as any[]){
        if(lastY!==null&&Math.abs(item.transform[5]-lastY)>5)lines.push('\n');
        lines.push(item.str);
        lastY=item.transform[5];
      }
      fullText+=lines.join(' ')+'\n\n';
    }
    return fullText;
  };

  const ocrImage=async(file:File):Promise<string>=>{
    setOcrProgress('Initializing OCR...');
    const result=await Tesseract.recognize(file,'eng',{
      logger:(m:any)=>{
        if(m.status==='recognizing text')setOcrProgress(`OCR: ${Math.round(m.progress*100)}%`);
      }
    });
    setOcrProgress('');
    return result.data.text;
  };

  const ocrPdf=async(file:File):Promise<string>=>{
    setOcrProgress('Extracting PDF pages...');
    const buf=await file.arrayBuffer();
    const pdf=await pdfjsLib.getDocument({data:buf}).promise;
    let fullText='';
    for(let i=1;i<=pdf.numPages;i++){
      setOcrProgress(`OCR page ${i}/${pdf.numPages}...`);
      const page=await pdf.getPage(i);
      const viewport=page.getViewport({scale:2});
      const canvas=document.createElement('canvas');
      canvas.width=viewport.width;
      canvas.height=viewport.height;
      const ctx=canvas.getContext('2d');
      if(!ctx)continue;
      await page.render({canvasContext:ctx,viewport}).promise;
      const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('Canvas toBlob failed')),'image/png'));
      const imgFile=new File([blob],`page${i}.png`,{type:'image/png'});
      const text=await ocrImage(imgFile);
      fullText+=text+'\n\n';
    }
    setOcrProgress('');
    return fullText;
  };

  const parseModuleTable=(text:string):{slots:TSlot[];entries:any[];className:string;unmatchedModules:{name:string;code:string;periodsPerWeek:number}[]}|null=>{
    const lines=text.split('\n').map(l=>l.trim()).filter(Boolean);
    if(lines.length<4)return null;

    // Find module names row - look for long text lines with module names
    const moduleNames:string[]=[];
    const moduleCodes:string[]=[];
    let periodsRow:number[]=[];

    // Scan for module names (long text lines before codes)
    for(let i=0;i<lines.length;i++){
      const line=lines[i];
      // Look for module code pattern like SWDBF501, GENPP501, etc.
      const codeMatches=line.match(/[A-Z]{2,5}[A-Z]?\d{3}/g);
      if(codeMatches&&codeMatches.length>=3){
        codeMatches.forEach(c=>moduleCodes.push(c));
        // The line(s) above likely have module names
        for(let j=i-1;j>=Math.max(0,i-3);j--){
          const prevLine=lines[j];
          if(prevLine.length>20&&!prevLine.match(/^\d/)){
            const names=prevLine.split(/\s{3,}/).map(n=>n.trim()).filter(n=>n.length>3);
            if(names.length>=2){
              names.forEach(n=>moduleNames.push(n));
              break;
            }
          }
        }
      }
      // Look for "Modules periods" row
      if(line.toLowerCase().includes('period')&&line.match(/\d+/g)){
        const nums=line.match(/\d+/g)?.map(Number)||[];
        if(nums.length>=3){
          periodsRow=nums;
        }
      }
    }

    if(moduleCodes.length<2)return null;

    // Build modules list - match to DB subjects if possible, keep all regardless
    const matchedModules:{name:string;code:string;periodsPerWeek:number;subjectId:number}[]=[];
    const unmatchedModules:{name:string;code:string;periodsPerWeek:number}[]=[];
    for(let i=0;i<moduleCodes.length;i++){
      const code=moduleCodes[i];
      const name=moduleNames[i]||'';
      const periods=periodsRow[i]||0;
      const subjByName=fuzzyMatch(name,rd?.subjects||[]);
      const subjByCode=(rd?.subjects||[]).find(s=>s.code?.toLowerCase()===code.toLowerCase()||s.name?.toLowerCase().includes(code.toLowerCase()));
      const matched=subjByCode||subjByName;
      if(matched){
        matchedModules.push({name:name||matched.name,code,periodsPerWeek:periods,subjectId:matched.id});
      }else if(name||code){
        unmatchedModules.push({name:name||code,code,periodsPerWeek:periods});
      }
    }

    if(!matchedModules.length&&!unmatchedModules.length)return null;

    // Build a default weekly timetable from the module periods
    const slots:TSlot[]=[...DEF];
    const entries:any[]=[];
    const nonBreakSlots=slots.filter(s=>!s.isBreak&&!s.isLunch);
    let slotIdx=0;

    // Distribute matched modules across the week
    for(const mod of matchedModules){
      let remaining=mod.periodsPerWeek;
      for(let day=1;day<=5&&remaining>0;day++){
        const perDay=Math.min(Math.ceil(remaining/(6-day)),2);
        for(let p=0;p<perDay&&remaining>0;p++){
          if(slotIdx>=nonBreakSlots.length)slotIdx=0;
          const slot=nonBreakSlots[slotIdx];
          entries.push({
            day_of_week:day,
            start_time:slot.startTime,
            end_time:slot.endTime,
            subject_id:mod.subjectId,
            teacher_id:0,
            classroom_id:0
          });
          remaining--;
          slotIdx++;
        }
      }
    }

    // Try to find class name in text
    let className='';
    for(const c of rd?.classes||[]){
      if(text.toLowerCase().includes(c.name?.toLowerCase())){
        className=c.name;
        break;
      }
    }

    return {slots,entries,className,unmatchedModules};
  };

  const parseChronogramFromText=(text:string):TSlot[]|null=>{
    const lines=text.split('\n').map(l=>l.trim()).filter(Boolean);
    const slots:TSlot[]=[];

    // Try to find time pairs on each line
    const timePairs:{st:string;et:string;raw:string}[]=[];
    for(const line of lines){
      // Match patterns like: 08:10 - 09:00, 8h10-9h00, 08.10 to 09.00
      const rangeMatch=line.match(/(\d{1,2})\s*[:.hH]\s*(\d{2})\s*[-–—toàa]+\s*(\d{1,2})\s*[:.hH]\s*(\d{2})/i);
      if(rangeMatch){
        const st=`${rangeMatch[1].padStart(2,'0')}:${rangeMatch[2]}`;
        const et=`${rangeMatch[3].padStart(2,'0')}:${rangeMatch[4]}`;
        const rest=line.substring(line.indexOf(rangeMatch[0])+rangeMatch[0].length).trim().toLowerCase();
        const isBreak=rest.includes('break')||rest.includes('repos')||rest.includes('pause')||rest.includes('short');
        const isLunch=rest.includes('lunch')||rest.includes('déjeuner')||rest.includes('midi')||rest.includes('diner');
        const label=rest.replace(/[-–—,;|]/g,'').trim()||`Period ${timePairs.length+1}`;
        timePairs.push({st,et,raw:line});
        slots.push({startTime:st,endTime:et,label,isBreak,isLunch});
        continue;
      }
      // Match single time with implicit end (next line's start or +50min)
      const singleMatch=line.match(/(\d{1,2})\s*[:.hH]\s*(\d{2})/);
      if(singleMatch){
        const st=`${singleMatch[1].padStart(2,'0')}:${singleMatch[2]}`;
        const rest=line.substring(line.indexOf(singleMatch[0])+singleMatch[0].length).trim().toLowerCase();
        const isBreak=rest.includes('break')||rest.includes('repos')||rest.includes('pause')||rest.includes('short');
        const isLunch=rest.includes('lunch')||rest.includes('déjeuner')||rest.includes('midi');
        const label=rest.replace(/[-–—,;|:\d]/g,'').trim()||`Period ${timePairs.length+1}`;
        timePairs.push({st,et:'',raw:line});
        slots.push({startTime:st,endTime:'',label,isBreak,isLunch});
      }
    }

    // Fill in missing end times from next slot's start
    for(let i=0;i<slots.length;i++){
      if(!slots[i].endTime){
        if(i+1<slots.length)slots[i].endTime=slots[i+1].startTime;
        else{
          // Default 50 min period
          const [h,m]=slots[i].startTime.split(':').map(Number);
          const nm=m+50;const nh=h+Math.floor(nm/60);
          slots[i].endTime=`${String(nh).padStart(2,'0')}:${String(nm%60).padStart(2,'0')}`;
        }
      }
    }

    // Auto-detect breaks: if a period is very short (<20min), mark as break
    for(const s of slots){
      if(!s.isBreak&&!s.isLunch){
        const [sh,sm]=s.startTime.split(':').map(Number);
        const [eh,em]=s.endTime.split(':').map(Number);
        const dur=(eh*60+em)-(sh*60+sm);
        if(dur>0&&dur<=20)s.isBreak=true;
      }
    }

    return slots.length>=2?slots:null;
  };

  const parseTimetableText=(text:string)=>{
    const rows:any[]=[];
    const lines=text.split('\n').map(l=>l.trim()).filter(Boolean);

    // Strategy 1: Lines with explicit time ranges (08:10-09:00, 8.10 to 9.00, etc.)
    for(const line of lines){
      const timeMatch=line.match(/(\d{1,2})\s*[:.hH]\s*(\d{2})\s*[-–—toàa]+\s*(\d{1,2})\s*[:.hH]\s*(\d{2})/i);
      if(!timeMatch)continue;
      const st=`${timeMatch[1].padStart(2,'0')}:${timeMatch[2]}`;
      const et=`${timeMatch[3].padStart(2,'0')}:${timeMatch[4]}`;
      let rest=line.substring(line.indexOf(timeMatch[0])+timeMatch[0].length).trim();
      const parts=rest.split(/\s{2,}|\t|[,|;]/).map(p=>p.trim()).filter(p=>p.length>1);
      let day='',subject='',teacher='',classroom='',clsN='';
      for(const dayName of DAYS){
        if(line.toLowerCase().includes(dayName.toLowerCase())){day=dayName;break;}
      }
      const dayNum=dayToNum(day);
      if(parts.length>=1)subject=parts[0];
      if(parts.length>=2)teacher=parts[1];
      if(parts.length>=3)classroom=parts[2];
      if(parts.length>=4)clsN=parts[3];
      if(subject||teacher){
        rows.push({day:day||'',day_of_week:dayNum||0,start_time:st,end_time:et,subject,teacher,classroom,class_name:clsN});
      }
    }
    if(rows.length)return rows;

    // Strategy 2: Table-like structure - detect columns by position
    // Group text items by Y position (same line) then by X position (columns)
    const items:{text:string;x:number;y:number}[]=[];
    for(const line of lines){
      const timeMatch=line.match(/(\d{1,2})\s*[:.hH]\s*(\d{2})/g);
      if(timeMatch&&timeMatch.length>=2){
        const times=timeMatch.map(t=>t.replace(/\s/g,'').replace(/[hH]/,':').replace('.',':'));
        const st=times[0].replace(/^(\d):/,'0$1:');
        const et=times[1].replace(/^(\d):/,'0$1:');
        const cleaned=line.replace(/(\d{1,2})\s*[:.hH]\s*(\d{2})/g,'|||').trim();
        const parts=cleaned.split('|||').map(p=>p.trim()).filter(p=>p.length>1);
        let day='',subject='',teacher='',classroom='',clsN='';
        for(const dayName of DAYS){
          if(line.toLowerCase().includes(dayName.toLowerCase())){day=dayName;break;}
        }
        const dayNum=dayToNum(day);
        for(const p of parts){
          const words=p.split(/\s+/).filter(w=>w.length>1);
          if(words.length>=1&&!subject)subject=words.join(' ');
          else if(words.length>=1&&!teacher)teacher=words.join(' ');
          else if(words.length>=1&&!classroom)classroom=words.join(' ');
        }
        if(subject||teacher){
          rows.push({day:day||'',day_of_week:dayNum||0,start_time:st,end_time:et,subject,teacher,classroom,class_name:clsN});
        }
      }
    }
    if(rows.length)return rows;

    // Strategy 3: Look for subject names from reference data in the text
    if(rd){
      for(const line of lines){
        let foundSubj='',foundTch='',foundClsR='',foundClsN='',day='',st='',et='';
        for(const s of rd.subjects){
          if(s.name&&line.toLowerCase().includes(s.name.toLowerCase())){foundSubj=s.name;break;}
        }
        for(const t of rd.teachers){
          if(t.name&&line.toLowerCase().includes(t.name.toLowerCase())){foundTch=t.name;break;}
        }
        for(const c of rd.classrooms){
          if(c.name&&line.toLowerCase().includes(c.name.toLowerCase())){foundClsR=c.name;break;}
        }
        for(const c of rd.classes){
          if(c.name&&line.toLowerCase().includes(c.name.toLowerCase())){foundClsN=c.name;break;}
        }
        for(const dayName of DAYS){
          if(line.toLowerCase().includes(dayName.toLowerCase())){day=dayName;break;}
        }
        const tm=line.match(/(\d{1,2})\s*[:.hH]\s*(\d{2})/);
        if(tm)st=`${tm[1].padStart(2,'0')}:${tm[2]}`;
        const allTimes=line.match(/(\d{1,2})\s*[:.hH]\s*(\d{2})/g);
        if(allTimes&&allTimes.length>=2){
          const t2=allTimes[1].replace(/\s/g,'').replace(/[hH]/,':').replace('.',':');
          et=t2.replace(/^(\d):/,'0$1:');
        }
        if(foundSubj){
          rows.push({day:day||'',day_of_week:dayToNum(day)||0,start_time:st,end_time:et,subject:foundSubj,teacher:foundTch,classroom:foundClsR,class_name:foundClsN});
        }
      }
    }
    if(rows.length)return rows;

    // Strategy 4: Every non-empty line with a time as a potential entry
    for(const line of lines){
      const tm=line.match(/(\d{1,2})\s*[:.hH]\s*(\d{2})/);
      if(!tm)continue;
      const st=`${tm[1].padStart(2,'0')}:${tm[2]}`;
      const allT=line.match(/(\d{1,2})\s*[:.hH]\s*(\d{2})/g);
      let et='';
      if(allT&&allT.length>=2){
        const t2=allT[1].replace(/\s/g,'').replace(/[hH]/,':').replace('.',':');
        et=t2.replace(/^(\d):/,'0$1:');
      }
      const rest=line.replace(/(\d{1,2})\s*[:.hH]\s*(\d{2})/g,'').trim();
      const words=rest.split(/\s+/).filter(w=>w.length>1&&!w.match(/^\d+$/));
      let day='',subject='',teacher='',classroom='';
      for(const dayName of DAYS){
        if(line.toLowerCase().includes(dayName.toLowerCase())){day=dayName;break;}
      }
      const dayNum=dayToNum(day);
      for(let w=0;w<words.length;w++){
        if(!subject){subject=words[w];}
        else if(!teacher){teacher=words[w];}
        else if(!classroom){classroom=words[w];}
      }
      if((subject||teacher)&&st){
        rows.push({day:day||'',day_of_week:dayNum||0,start_time:st,end_time:et||st,subject,teacher,classroom,class_name:''});
      }
    }
    if(rows.length)return rows;

    // Strategy 5: Scan entire text for reference data (teachers, subjects) near times
    if(rd){
      const matched=matchRefData(text);
      if(matched.teachers.length||matched.subjects.length){
        // Find all times in the text
        const allTimeLines=lines.filter(l=>l.match(/(\d{1,2})\s*[:.hH]\s*(\d{2})/));
        for(const tLine of allTimeLines){
          const tm=tLine.match(/(\d{1,2})\s*[:.hH]\s*(\d{2})/);
          if(!tm)continue;
          const st=`${tm[1].padStart(2,'0')}:${tm[2]}`;
          const allT=tLine.match(/(\d{1,2})\s*[:.hH]\s*(\d{2})/g);
          let et='';
          if(allT&&allT.length>=2){const t2=allT[1].replace(/\s/g,'').replace(/[hH]/,':').replace('.',':');et=t2.replace(/^(\d):/,'0$1:');}
          // Find which teacher/subject is mentioned on this line
          let foundSubj='',foundTch='',day='';
          for(const s of matched.subjects){if(tLine.toLowerCase().includes(s.name.toLowerCase())){foundSubj=s.name;break;}}
          for(const t of matched.teachers){if(tLine.toLowerCase().includes(t.name.toLowerCase())){foundTch=t.name;break;}}
          for(const dayName of DAYS){if(tLine.toLowerCase().includes(dayName.toLowerCase())){day=dayName;break;}}
          if(foundSubj||foundTch){
            rows.push({day:day||'',day_of_week:dayToNum(day)||0,start_time:st,end_time:et,subject:foundSubj,teacher:foundTch,classroom:'',class_name:''});
          }
        }
      }
    }
    return rows;
  };

  const impTimetableFile=async(e:React.ChangeEvent<HTMLInputElement>)=>{
    const f=e.target.files?.[0];if(!f||!rd)return;
    setImporting(true);clr();
    try{
      let rows:any[]=[];

      // Handle JSON files - check for chronogram format first
      if(f.name.endsWith('.json')){
        const text=await f.text();
        const data=JSON.parse(text);
        // Chronogram format: has timeSlots property
        if(data.timeSlots&&Array.isArray(data.timeSlots)){
          const validSlots=data.timeSlots.filter((s:any)=>s.startTime&&s.endTime);
          if(validSlots.length){
            setSl(validSlots.map((s:any)=>({
              startTime:s.startTime,
              endTime:s.endTime,
              label:s.label||`Period`,
              isBreak:!!s.isBreak,
              isLunch:!!s.isLunch
            })));
            setOk(`Loaded chronogram: ${validSlots.length} time slots`);
            setSt(1);
          }
          setImporting(false);
          if(impFileRef.current)impFileRef.current.value='';
          return;
        }
        // Timetable entries format
        rows=Array.isArray(data)?data:data.entries||data.timetable||data.data||[];
      }else if(f.name.endsWith('.csv')){
        const text=await f.text();
        rows=parseCSV(text);
      }else if(f.name.endsWith('.pdf')){
        let pdfText=await extractPdfText(f);
        setDebugText(pdfText);
        // Strategy 0: Try module distribution table first (curriculum PDFs)
        const moduleResult=parseModuleTable(pdfText);
        if(moduleResult&&moduleResult.entries.length>0){
          setSl(moduleResult.slots);
          const newCells=new Map<string,Cell>();
          for(const entry of moduleResult.entries){
            const si=moduleResult.slots.findIndex(s=>s.startTime===entry.start_time&&s.endTime===entry.end_time);
            if(si<0)continue;
            const ck2=ck(entry.day_of_week,si);
            const ex=newCells.get(ck2)||{subject_id:0,teacher_id:0,classroom_id:0};
            ex.subject_id=entry.subject_id;
            newCells.set(ck2,ex);
          }
          setCells(newCells);
          if(moduleResult.className){
            const fc=rd.classes.find(c=>c.name?.toLowerCase()===moduleResult.className.toLowerCase());
            if(fc)setCls(fc.id);
          }
          const unmatched=moduleResult.unmatchedModules;
          const msg=unmatched.length
            ?`Loaded ${moduleResult.entries.length} periods. ${unmatched.length} modules not in DB: ${unmatched.slice(0,3).map(m=>m.code).join(', ')}${unmatched.length>3?'...':''}`
            :`Loaded ${moduleResult.entries.length} module periods from curriculum PDF`;
          setOk(msg);
          setSt(1);
          setImporting(false);
          if(impFileRef.current)impFileRef.current.value='';
          return;
        }
        // Strategy 1: Try chronogram extraction AND timetable entries together
        const chronoSlots=parseChronogramFromText(pdfText);
        rows=parseTimetableText(pdfText);
        if(!rows.length){
          setOcrProgress('Text extraction failed, trying OCR...');
          pdfText=await ocrPdf(f);
          setDebugText(pdfText);
          // Try module table from OCR text
          const moduleResult2=parseModuleTable(pdfText);
          if(moduleResult2&&moduleResult2.entries.length>0){
            setSl(moduleResult2.slots);
            const newCells=new Map<string,Cell>();
            for(const entry of moduleResult2.entries){
              const si=moduleResult2.slots.findIndex(s=>s.startTime===entry.start_time&&s.endTime===entry.end_time);
              if(si<0)continue;
              const ck2=ck(entry.day_of_week,si);
              const ex=newCells.get(ck2)||{subject_id:0,teacher_id:0,classroom_id:0};
              ex.subject_id=entry.subject_id;
              newCells.set(ck2,ex);
            }
            setCells(newCells);
            const unmatched2=moduleResult2.unmatchedModules;
            const msg2=unmatched2.length
              ?`Loaded ${moduleResult2.entries.length} periods (OCR). ${unmatched2.length} modules not in DB`
              :`Loaded ${moduleResult2.entries.length} module periods (OCR)`;
            setOk(msg2);
            setSt(1);
            setImporting(false);
            if(impFileRef.current)impFileRef.current.value='';
            return;
          }
          const chronoSlots2=parseChronogramFromText(pdfText);
          if(chronoSlots2&&!chronoSlots)setSl(chronoSlots2);
          rows=parseTimetableText(pdfText);
        }
        if(!rows.length){
          const csvLike=pdfText.split('\n').filter(l=>l.includes(',')||l.includes('\t'));
          if(csvLike.length>1)rows=parseCSV(pdfText);
        }
        // If we found chronogram slots, set them
        if(chronoSlots){
          setSl(chronoSlots);
          if(!rows.length){
            setOk(`Loaded chronogram from PDF: ${chronoSlots.length} time slots. Assign subjects manually in Step 2.`);
            setSt(1);
            setImporting(false);
            if(impFileRef.current)impFileRef.current.value='';
            return;
          }
        }
      }else if(f.name.match(/\.(png|jpg|jpeg)$/i)){
        const imgText=await ocrImage(f);
        setDebugText(imgText);
        // Try module table first
        const moduleResult=parseModuleTable(imgText);
        if(moduleResult&&moduleResult.entries.length>0){
          setSl(moduleResult.slots);
          const newCells=new Map<string,Cell>();
          for(const entry of moduleResult.entries){
            const si=moduleResult.slots.findIndex(s=>s.startTime===entry.start_time&&s.endTime===entry.end_time);
            if(si<0)continue;
            const ck2=ck(entry.day_of_week,si);
            const ex=newCells.get(ck2)||{subject_id:0,teacher_id:0,classroom_id:0};
            ex.subject_id=entry.subject_id;
            newCells.set(ck2,ex);
          }
          setCells(newCells);
          const unmatched3=moduleResult.unmatchedModules;
          const msg3=unmatched3.length
            ?`Loaded ${moduleResult.entries.length} periods. ${unmatched3.length} modules not in DB: ${unmatched3.slice(0,3).map(m=>m.code).join(', ')}${unmatched3.length>3?'...':''}`
            :`Loaded ${moduleResult.entries.length} module periods from image`;
          setOk(msg3);
          setSt(1);
          setImporting(false);
          if(impFileRef.current)impFileRef.current.value='';
          return;
        }
        const chronoSlots=parseChronogramFromText(imgText);
        rows=parseTimetableText(imgText);
        if(!rows.length){
          const csvLike=imgText.split('\n').filter(l=>l.includes(',')||l.includes('\t'));
          if(csvLike.length>1)rows=parseCSV(imgText);
        }
        if(chronoSlots){
          setSl(chronoSlots);
          if(!rows.length){
            setOk(`Loaded chronogram from image: ${chronoSlots.length} time slots. Assign subjects manually in Step 2.`);
            setSt(1);
            setImporting(false);
            if(impFileRef.current)impFileRef.current.value='';
            return;
          }
        }
      }else{setEr('Only .pdf, .csv, .json, .png, .jpg files supported');setImporting(false);return;}

      if(!rows.length){setEr('No data found in file');setImporting(false);return;}

      const newCells=new Map<string,Cell>();
      const baseSlots:TSlot[]=[];
      const slotMap=new Map<string,TSlot>();
      let importedClass:number=0;
      let count=0;

      for(const row of rows){
        const dayNum=row.day_of_week||dayToNum(row.day||row.dayofweek||'');
        if(!dayNum||dayNum<1||dayNum>5)continue;

        const st=row.start_time||row.startTime||row.start||'';
        const et=row.end_time||row.endTime||row.end||'';
        if(!st||!et)continue;

        const subName=row.subject||row.subject_name||'';
        const tchName=row.teacher||row.teacher_name||'';
        const clsName=row.classroom||row.classroom_name||row.room||'';
        const clsN=row.class_name||row.class||'';

        const sub=fuzzyMatch(subName,rd.subjects);
        const tch=fuzzyMatch(tchName,rd.teachers);
        const clsR=fuzzyMatch(clsName,rd.classrooms);
        if(clsN&&!importedClass){const fc=fuzzyMatch(clsN,rd.classes);if(fc)importedClass=fc.id;}

        const key=`${st}-${et}`;
        if(!slotMap.has(key)){
          const ns:TSlot={startTime:st,endTime:et,label:subName||`Period ${baseSlots.length+1}`,isBreak:false,isLunch:false};
          slotMap.set(key,ns);baseSlots.push(ns);
        }

        const si=baseSlots.findIndex(s=>s.startTime===st&&s.endTime===et);
        if(si<0)continue;
        const ck2=ck(dayNum,si);
        const ex=newCells.get(ck2)||{subject_id:0,teacher_id:0,classroom_id:0};
        if(sub)ex.subject_id=sub.id;
        if(tch)ex.teacher_id=tch.id;
        if(clsR)ex.classroom_id=clsR.id;
        newCells.set(ck2,ex);
        count++;
      }

      if(!baseSlots.length){setEr('No valid entries found');setImporting(false);return;}
      setSl(baseSlots);setCells(newCells);
      if(importedClass)setCls(importedClass);
      setOk(`Imported ${count} entries from ${f.name}`);
      setSt(1);
    }catch(ex:any){setEr('Failed to parse file: '+ex.message);}
    finally{setImporting(false);if(impFileRef.current)impFileRef.current.value='';}
  };
  const ck=(d:number,s:number)=>`${d}-${s}`;
  const sCell=(d:number,s:number,f:keyof Cell,v:number)=>{const k=ck(d,s);setCells(p=>{const n=new Map(p);const e=n.get(k)||{subject_id:0,teacher_id:0,classroom_id:0};n.set(k,{...e,[f]:v});return n;});};
  const gCell=(d:number,s:number)=>cells.get(ck(d,s));
  const sN=(id:number)=>rd?.subjects.find(s=>s.id===id)?.name||'—';
  const tN=(id:number)=>rd?.teachers.find(t=>t.id===id)?.name||'—';
  const cN=(id:number)=>rd?.classrooms.find(c=>c.id===id)?.name||'—';
  const clN=(id:number)=>rd?.classes.find(c=>c.id===id)?.name||'—';
  const hasLessons=Array.from(cells.values()).some(c=>!!c.subject_id);
  const lessonCount=Array.from(cells.values()).filter(c=>!!c.subject_id).length;
  const canShowLessonGrid=!!cls||hasLessons;

  const gen=()=>{const e:any[]=[];if(!cls)return e;for(let d=1;d<=5;d++)sl.forEach((s,i)=>{if(s.isBreak||s.isLunch)return;const c=gCell(d,i);if(c?.subject_id)e.push({day_of_week:d,start_time:s.startTime,end_time:s.endTime,class_id:+cls,subject_id:c.subject_id,teacher_id:c.teacher_id||0,classroom_id:c.classroom_id||0});});return e;};
  const save=async()=>{const e=gen();if(!e.length){setEr('No entries');return;}if(!cls){setEr('Select a class first');return;}try{setSv(true);clr();const r=await timetableApi.bulkSave(+cls,e);setOk(`Saved ${r.data?.data?.insertedCount||e.length} entries!`);}catch(e:any){setEr(e.response?.data?.error||'Save failed');}finally{setSv(false);}};

  if(ld&&!rd)return <div className="tg-loading"><div className="tg-spinner"></div><p>Loading...</p></div>;

  return (
    <div className="timetable-generator">
      <div className="tg-header"><h1>Timetable Generator</h1><p className="tg-sub">Upload a chronogram and build your school timetable</p></div>

      {er&&<div className="tg-alert tg-err" onClick={()=>setEr('')}>{er} ✕</div>}
      {ok&&<div className="tg-alert tg-ok" onClick={()=>setOk('')}>{ok} ✕</div>}
      {debugText&&<div className="tg-debug-box">
        <div className="tg-debug-hdr"><strong>Extracted Text (debug)</strong><button className="tg-rm" onClick={()=>setDebugText('')}>✕</button></div>
        <pre className="tg-debug-pre">{debugText.slice(0,3000)}{debugText.length>3000?'...(truncated)':''}</pre>
      </div>}
      <div className="tg-tabs">
        <button className={`tg-tab ${st===0?'active':''}`} onClick={()=>setSt(0)}>1. Chronogram</button>
        <button className={`tg-tab ${st===1?'active':''}`} onClick={()=>setSt(1)}>2. Assign Lessons</button>
        <button className={`tg-tab ${st===2?'active':''}`} onClick={()=>setSt(2)}>3. Preview & Save</button>
      </div>

      {st===0&&(<div className="tg-step">
        <div className="tg-sh"><h2>Chronogram</h2>
          <div className="tg-acts">
            <button className="tg-bs" onClick={addSl}>+ Add</button>
            <button className="tg-bs" onClick={rstSl}>Reset</button>
            <button className="tg-bs" onClick={expCh}>📥 Export</button>
            <input type="file" ref={impFileRef} accept=".json,.csv,.pdf,.png,.jpg,.jpeg" style={{display:'none'}} onChange={impTimetableFile} />
            <button className="tg-btn-import" disabled={importing} onClick={()=>impFileRef.current?.click()}>
              {importing?(ocrProgress||'⏳ Importing...'):'📤 Import File'}
            </button>
          </div>
        </div>
        <p className="tg-hint">Define periods, breaks, and lunch. Import a <strong>.pdf</strong>, <strong>.csv</strong>, <strong>.json</strong> or <strong>image</strong> (.png, .jpg) timetable file to auto-fill.</p>
        {ocrProgress && <div className="tg-ocr-progress"><span className="tg-spinner-sm"></span> {ocrProgress}</div>}
        <div className="tg-import-formats">
          <div className="tg-format-hint"><strong>CSV:</strong> Day,StartTime,EndTime,Subject,Teacher,Classroom</div>
          <div className="tg-format-hint"><strong>JSON:</strong> [{"{day,start_time,end_time,subject,teacher,classroom}"}]</div>
          <div className="tg-format-hint"><strong>PDF/Image:</strong> Timetable with time slots (08:10 – 09:00), subject, teacher</div>
        </div>
        <div className="tg-tw"><table className="tg-tbl"><thead><tr><th>Label</th><th>Start</th><th>End</th><th>Type</th><th></th></tr></thead><tbody>
          {sl.map((s,i)=>(<tr key={i} className={s.isBreak?'brk':s.isLunch?'lnch':''}><td><input value={s.label} onChange={e=>uSl(i,'label',e.target.value)}/></td><td><input type="time" value={s.startTime} onChange={e=>uSl(i,'startTime',e.target.value)}/></td><td><input type="time" value={s.endTime} onChange={e=>uSl(i,'endTime',e.target.value)}/></td><td><select value={s.isBreak?'break':s.isLunch?'lunch':'period'} onChange={e=>{const v=e.target.value;uSl(i,'isBreak',v==='break');uSl(i,'isLunch',v==='lunch');}}><option value="period">Period</option><option value="break">Break</option><option value="lunch">Lunch</option></select></td><td><button className="tg-rm" onClick={()=>rmSl(i)}>🗑️</button></td></tr>))}
        </tbody></table></div>
        <div className="tg-ft"><button className="tg-bp" onClick={()=>{clr();setSt(1);}}>Next: Assign →</button></div>
      </div>)}

      {st===1&&(<div className="tg-step">
        <div className="tg-sh"><h2>Assign Lessons</h2></div>
        <div className="tg-cs"><label>Select Class:</label><select value={cls} onChange={e=>{setCls(e.target.value?+e.target.value:'');clr();}}><option value="">-- Choose --</option>{(rd?.classes||[]).map(c=><option key={c.id} value={c.id}>{c.name} ({c.level})</option>)}</select></div>
        {!cls&&hasLessons&&<div className="tg-note">Imported lessons are shown below. Choose a class before previewing or saving.</div>}
        {hasLessons&&<div className="tg-import-summary">{lessonCount} lessons detected from the uploaded file</div>}
        {!canShowLessonGrid?<div className="tg-empty">Select a class or import a timetable file to start.</div>:(<>
          <div className="tg-dtabs">{DAYS.map((d,i)=><button key={i} className={`tg-dt ${dy===i+1?'active':''}`} onClick={()=>setDy(i+1)}>{d}</button>)}</div>
          <div className="tg-tw"><table className="tg-atbl"><thead><tr><th>Time Slot</th><th>Subject</th><th>Teacher</th><th>Classroom</th></tr></thead><tbody>
            {sl.map((s,i)=>{if(s.isBreak||s.isLunch)return <tr key={i} className={s.isLunch?'lnch':'brk'}><td colSpan={4} className="tg-bc"><strong>{s.label}</strong> — {s.startTime} to {s.endTime}</td></tr>;const c=gCell(dy,i);return <tr key={i}><td className="tg-sc"><div>{s.label}</div><div className="tg-st">{s.startTime} – {s.endTime}</div></td><td><select value={c?.subject_id||''} onChange={e=>sCell(dy,i,'subject_id',+e.target.value)}><option value="">—</option>{(rd?.subjects||[]).map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></td><td><select value={c?.teacher_id||''} onChange={e=>sCell(dy,i,'teacher_id',+e.target.value)}><option value="">—</option>{(rd?.teachers||[]).map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></td><td><select value={c?.classroom_id||''} onChange={e=>sCell(dy,i,'classroom_id',+e.target.value)}><option value="">—</option>{(rd?.classrooms||[]).map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></td></tr>;})}
          </tbody></table></div>
        </>)}
        <div className="tg-ft"><button className="tg-bs" onClick={()=>setSt(0)}>← Back</button><button className="tg-bp" onClick={()=>{clr();setSt(2);}}>Preview →</button></div>
      </div>)}

      {st===2&&(<div className="tg-step">
        <div className="tg-sh"><h2>Preview {cls?`— ${clN(+cls)}`:''}</h2></div>
        {!cls?<div className="tg-empty">No class selected.</div>:<>
          {DAYS.map((dn,di)=>{const dn2=di+1;const de:{s:TSlot;c:Cell}[]=[];sl.forEach((s,i)=>{if(!s.isBreak&&!s.isLunch){const c=gCell(dn2,i);if(c?.subject_id)de.push({s,c});}});return <div key={dn2} className="tg-pday"><h3>{dn}</h3>{!de.length?<p className="tg-ed">No lessons</p>:<div className="tg-pl">{de.map(({s,c})=><div key={s.startTime} className="tg-pc"><div className="tg-pt">{s.startTime} – {s.endTime}</div><div className="tg-ps">{sN(c.subject_id)}</div><div className="tg-pm"><span>👨‍🏫 {tN(c.teacher_id)}</span><span>🏫 {cN(c.classroom_id)}</span></div></div>)}</div>}</div>;})}
          <div className="tg-ft"><button className="tg-bs" onClick={()=>setSt(1)}>← Back</button><button className="tg-bp" onClick={save} disabled={sv}>{sv?'Saving...':'Save Timetable'}</button></div>
        </>}
      </div>)}
    </div>
  );
};
export default TG;
