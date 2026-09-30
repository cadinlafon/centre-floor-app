import { useEffect, useMemo, useRef, useState } from 'react';
import styled from 'styled-components';
import {
  addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query,
  serverTimestamp, setDoc, updateDoc, where,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { toDate } from '../utils/dates';
import { useKeyboardVisible } from '../hooks/useKeyboardVisible';
import { triggerNotification } from '../utils/notifyServer';
import { COMMON_EMOJIS, QUICK_REACTIONS } from '../data/commonEmojis';
import { addReaction, removeReaction, saveMessage, unsaveMessage, uploadChatAttachment } from '../lib/chat';

const Page = styled.div`height:100%; min-height:calc(100vh - var(--topbar-height) - var(--bottomnav-height)); display:flex; flex-direction:column; overflow:hidden; position:relative;`;
const Header = styled.div`padding:.75rem 1.25rem .6rem; border-bottom:1.5px solid var(--border); background:var(--bg-card); flex-shrink:0;`;
const HeaderRow = styled.div`display:flex; align-items:center; justify-content:space-between; gap:.75rem;`;
const HeaderTitle = styled.h2`font-family:Georgia,serif;font-size:1.1rem;color:var(--brown-dark);margin:0;`;
const HeaderSub = styled.p`font-size:.75rem;color:var(--text-muted);margin:0;`;
const HeaderActions = styled.div`display:flex;gap:.35rem;`;
const IconBtn = styled.button`border:1px solid var(--border);background:var(--bg-secondary);border-radius:10px;width:38px;height:38px;cursor:pointer;color:var(--text-primary);`;
const SearchBar = styled.div`padding:.5rem 1rem;background:var(--bg-secondary);border-bottom:1px solid var(--border);input{width:100%;padding:.45rem .75rem;border:1.5px solid var(--border);border-radius:20px;font-size:.875rem;background:var(--bg-card);color:var(--text-primary);box-sizing:border-box;&:focus{outline:none;border-color:var(--amber);}}`;
const Messages = styled.div`flex:1;overflow-y:auto;padding:${p=>p.$keyboardOpen?`1rem 1rem calc(7rem + ${p.$keyboardHeight}px)`:'1rem 1rem 7rem'};display:flex;flex-direction:column;gap:.55rem;justify-content:flex-end;`;
const EmptyState = styled.div`display:flex;flex-direction:column;align-items:center;justify-content:center;flex:1;color:var(--text-muted);text-align:center;gap:.4rem;padding:2rem 1rem;`;
const Bubble = styled.div`display:flex;flex-direction:${p=>p.$mine?'row-reverse':'row'};align-items:flex-end;gap:.5rem;`;
const AvatarDot = styled.div`width:30px;height:30px;border-radius:50%;flex-shrink:0;background:linear-gradient(135deg,#78350f,#d97706);color:white;font-size:.75rem;font-weight:700;display:flex;align-items:center;justify-content:center;`;
const BubbleContent = styled.div`max-width:min(78%,520px);position:relative;`;
const BubbleName = styled.p`font-size:.68rem;color:var(--text-muted);margin:0 0 .2rem;text-align:${p=>p.$mine?'right':'left'};`;
const BubbleText = styled.div`background:${p=>p.$mine?'linear-gradient(135deg,#78350f,#d97706)':'var(--bg-card)'};color:${p=>p.$mine?'white':'var(--text-primary)'};border:${p=>p.$mine?'none':'1.5px solid var(--border)'};border-radius:${p=>p.$mine?'16px 16px 4px 16px':'16px 16px 16px 4px'};padding:.6rem .9rem;font-size:.9rem;line-height:1.45;word-break:break-word;`;
const Meta = styled.div`display:flex;align-items:center;gap:.4rem;margin-top:.2rem;justify-content:${p=>p.$mine?'flex-end':'flex-start'};`;
const MetaText = styled.span`font-size:.65rem;color:var(--text-muted);`;
const Edited = styled.span`font-size:.62rem;color:var(--text-muted);font-style:italic;`;
const ActionBar = styled.div`display:flex;flex-wrap:wrap;gap:.3rem;margin-top:.3rem;justify-content:${p=>p.$mine?'flex-end':'flex-start'};`;
const MiniBtn = styled.button`border:1px solid var(--border);background:var(--bg-card);color:var(--text-secondary);border-radius:999px;padding:.2rem .45rem;font-size:.72rem;cursor:pointer;`;
const Reactions = styled.div`display:flex;gap:.25rem;flex-wrap:wrap;margin-top:.3rem;justify-content:${p=>p.$mine?'flex-end':'flex-start'};`;
const Reaction = styled.button`border:1px solid ${p=>p.$active?'var(--amber)':'var(--border)'};background:${p=>p.$active?'var(--warning-bg)':'var(--bg-card)'};border-radius:999px;padding:.18rem .42rem;font-size:.72rem;cursor:pointer;`;
const ReplyPreview = styled.div`border-left:3px solid var(--amber);background:rgba(217,119,6,.08);padding:.35rem .55rem;margin-bottom:.35rem;border-radius:6px;font-size:.72rem;color:var(--text-secondary);cursor:pointer;`;
const Attachment = styled.a`display:flex;align-items:center;gap:.5rem;padding:.5rem;border-radius:10px;background:rgba(255,255,255,.12);color:inherit;text-decoration:none;margin-bottom:.35rem;`;
const ComposerWrap = styled.div`position:fixed;left:0;right:0;bottom:${p=>p.$keyboardOpen?`${p.$keyboardHeight}px`:'var(--bottomnav-height)'};z-index:200;background:var(--bg-card);border-top:1.5px solid var(--border);padding-bottom:${p=>p.$keyboardOpen?'env(safe-area-inset-bottom)':'0'};`;
const Composer = styled.div`padding:.55rem 1rem .7rem;display:flex;gap:.4rem;align-items:flex-end;`;
const TextArea = styled.textarea`flex:1;padding:.65rem .9rem;border:1.5px solid var(--border);border-radius:20px;font-size:.9rem;resize:none;max-height:120px;font-family:inherit;background:var(--bg-secondary);color:var(--text-primary);line-height:1.4;box-sizing:border-box;&:focus{outline:none;border-color:var(--amber);}`;
const SendBtn = styled.button`width:42px;height:42px;border-radius:50%;border:none;flex-shrink:0;background:${p=>p.disabled?'var(--border)':'linear-gradient(135deg,#78350f,#d97706)'};color:white;font-size:1.1rem;cursor:${p=>p.disabled?'default':'pointer'};`;
const ToolBtn = styled.button`width:42px;height:42px;border-radius:50%;border:1px solid var(--border);background:var(--bg-secondary);cursor:pointer;font-size:1rem;`;
const Picker = styled.div`position:absolute;bottom:76px;left:10px;right:10px;background:var(--bg-card);border:1.5px solid var(--border);border-radius:16px;box-shadow:var(--shadow-lg);padding:.65rem;max-height:280px;overflow:auto;z-index:210;`;
const EmojiGrid = styled.div`display:grid;grid-template-columns:repeat(8,1fr);gap:.15rem;`;
const EmojiBtn = styled.button`border:none;background:transparent;font-size:1.35rem;padding:.35rem;cursor:pointer;border-radius:8px;&:hover{background:var(--bg-secondary);}`;
const Quick = styled.div`display:flex;gap:.25rem;padding:.3rem 0;`;
const Overlay = styled.div`position:fixed;inset:0;background:rgba(15,23,42,.35);z-index:500;display:flex;align-items:flex-end;justify-content:center;padding:1rem;`;
const Modal = styled.div`background:var(--bg-card);border:1.5px solid var(--border);border-radius:18px;padding:1rem;width:min(100%,520px);box-shadow:var(--shadow-lg);max-height:80vh;overflow:auto;`;
const FileRow = styled.div`display:flex;align-items:center;justify-content:space-between;gap:.5rem;padding:.55rem;border:1px solid var(--border);border-radius:10px;margin-top:.4rem;`;
const Status = styled.p`font-size:.68rem;color:var(--text-muted);text-align:right;margin:0 .7rem .15rem;min-height:1em;`;

function formatTime(ts){const d=toDate(ts);return d?d.toLocaleTimeString([],{hour:'numeric',minute:'2-digit'}):'';}
function initials(name){return name?.[0]?.toUpperCase()||'?';}
function dateLabel(ts){const d=toDate(ts);if(!d)return '';const now=new Date();const y=new Date(now);y.setDate(now.getDate()-1);if(d.toDateString()===now.toDateString())return 'Today';if(d.toDateString()===y.toDateString())return 'Yesterday';return d.toLocaleDateString([], {month:'short',day:'numeric',year:d.getFullYear()!==now.getFullYear()?'numeric':undefined});}

export default function ChatRoom({room,icon,title,subtitleSuffix='',userProfile,hasAccess=true,noAccessTitle,noAccessBody}){
  const [messages,setMessages]=useState([]); const [text,setText]=useState(''); const [search,setSearch]=useState('');
  const [sending,setSending]=useState(false); const [status,setStatus]=useState(''); const [editingId,setEditingId]=useState(null); const [editText,setEditText]=useState('');
  const [reply,setReply]=useState(null); const [emojiOpen,setEmojiOpen]=useState(false); const [selectedId,setSelectedId]=useState(null);
  const [reactions,setReactions]=useState([]); const [saved,setSaved]=useState(new Set()); const [savedItems,setSavedItems]=useState([]); const [attachments,setAttachments]=useState([]); const [uploading,setUploading]=useState(false);
  const [showInfo,setShowInfo]=useState(false); const [showSaved,setShowSaved]=useState(false); const [typing,setTyping]=useState([]); const [readIds,setReadIds]=useState(new Set());
  const bottomRef=useRef(null); const typingTimer=useRef(null); const fileInput=useRef(null); const myUid=userProfile?.uid; const {isKeyboardVisible,keyboardHeight}=useKeyboardVisible();

  useEffect(()=>{if(!hasAccess)return;const q=query(collection(db,'messages'),where('room','==',room),orderBy('createdAt','asc'));return onSnapshot(q,s=>setMessages(s.docs.map(d=>({id:d.id,...d.data()}))),e=>console.error('Messages listener failed',e));},[hasAccess,room]);
  useEffect(()=>{if(!hasAccess)return;const q=query(collection(db,'messageReactions'),where('room','==',room));return onSnapshot(q,s=>setReactions(s.docs.map(d=>({id:d.id,...d.data()}))),e=>console.error('Reactions listener failed',e));},[hasAccess,room]);
  useEffect(()=>{if(!hasAccess)return;const q=query(collection(db,'chatTyping'),where('room','==',room));return onSnapshot(q,s=>setTyping(s.docs.map(d=>d.data()).filter(x=>x.userId!==myUid&&x.expiresAt?.toMillis?.()>Date.now())),e=>console.error('Typing listener failed',e));},[hasAccess,room,myUid]);
  useEffect(()=>{if(!hasAccess)return;const q=query(collection(db,'messageReads'),where('room','==',room),where('userId','==',myUid));return onSnapshot(q,s=>setReadIds(new Set(s.docs.map(d=>d.data().messageId))),e=>console.error('Read listener failed',e));},[hasAccess,room,myUid]);
  useEffect(()=>{if(!myUid)return;const q=query(collection(db,'savedMessages'),where('uid','==',myUid));return onSnapshot(q,s=>{const rows=s.docs.map(d=>({id:d.id,...d.data()}));setSavedItems(rows);setSaved(new Set(rows.map(x=>x.messageId)));},e=>console.error('Saved listener failed',e));},[myUid]);
  useEffect(()=>{if(isKeyboardVisible)setTimeout(()=>bottomRef.current?.scrollIntoView({behavior:'smooth'}),100);},[isKeyboardVisible]);
  useEffect(()=>{bottomRef.current?.scrollIntoView({behavior:messages.length<=1?'auto':'smooth'});},[messages.length]);
  useEffect(()=>{if(!messages.length)return;const last=messages[messages.length-1];if(last.senderId===myUid)return;setDoc(doc(db,'messageReads',`${last.id}_${myUid}`),{room,messageId:last.id,userId:myUid,readAt:serverTimestamp()},{merge:true}).catch(()=>{});},[messages,myUid,room]);

  const displayed=useMemo(()=>search?messages.filter(m=>`${m.text||''} ${m.senderName||''}`.toLowerCase().includes(search.toLowerCase())):messages,[messages,search]);
  const reactionMap=useMemo(()=>reactions.reduce((a,r)=>{(a[r.messageId]??=[]).push(r);return a;},{}),[reactions]);
  const isSaved=(id)=>saved.has(id);

  async function setTypingState(value){
    if(!myUid)return;
    const id=`${room}_${myUid}`;
    if(!value){await deleteDoc(doc(db,'chatTyping',id)).catch(()=>{});return;}
    await updateDoc(doc(db,'chatTyping',id),{room,userId:myUid,userName:userProfile?.name||'Student',expiresAt:new Date(Date.now()+5000)}).catch(async()=>{await addDoc(collection(db,'chatTyping'),{room,userId:myUid,userName:userProfile?.name||'Student',expiresAt:new Date(Date.now()+5000)}).catch(()=>{});});
    clearTimeout(typingTimer.current);typingTimer.current=setTimeout(()=>setTypingState(false),3500);
  }

  async function handleSend(){const trimmed=text.trim();if((!trimmed&&!attachments.length)||sending)return;setSending(true);setStatus('Sending…');const draftReply=reply;const draftAttachments=attachments;setText('');setAttachments([]);setReply(null);await setTypingState(false);
    try{const docRef=await addDoc(collection(db,'messages'),{room,text:trimmed,senderId:myUid,senderName:userProfile?.name||'Student',edited:false,createdAt:serverTimestamp(),replyTo:draftReply?{messageId:draftReply.id,text:draftReply.text?.slice(0,160)||'',senderName:draftReply.senderName||'Student'}:null,attachments:draftAttachments});await triggerNotification('class-message',{room,roomTitle:title,senderId:myUid,senderName:userProfile?.name||'Student',text:trimmed,messageId:docRef.id});setStatus('Sent ✓');setTimeout(()=>setStatus(''),1800);}catch(e){console.error(e);setText(trimmed);setAttachments(draftAttachments);setStatus('Not sent — try again');}finally{setSending(false);}}
  async function handleEdit(msg){const trimmed=editText.trim();if(!trimmed)return;try{await updateDoc(doc(db,'messages',msg.id),{text:trimmed,edited:true,editedAt:serverTimestamp()});setEditingId(null);}catch(e){console.error(e);}}
  async function deleteMessage(msg){if(!confirm('Delete this message?'))return;try{await deleteDoc(doc(db,'messages',msg.id));}catch(e){console.error(e);}}
  async function toggleReaction(msg,emoji){const own=reactionMap[msg.id]?.find(r=>r.userId===myUid);if(own?.emoji===emoji){await removeReaction(msg.id,myUid);}else{if(own)await removeReaction(msg.id,myUid);await addReaction({room,messageId:msg.id,uid:myUid,userName:userProfile?.name,emoji});}}
  async function toggleSaved(msg){if(isSaved(msg.id)){await unsaveMessage(myUid,msg.id);setSaved(s=>{const n=new Set(s);n.delete(msg.id);return n;});}else{await saveMessage(myUid,msg);setSaved(s=>new Set(s).add(msg.id));}}
  async function togglePin(msg){if(!['admin','superadmin'].includes(userProfile?.role))return;await updateDoc(doc(db,'messages',msg.id),{pinned:!msg.pinned});}
  async function attachFiles(e){const files=[...e.target.files];if(!files.length)return;setUploading(true);try{const uploaded=[];for(const file of files.slice(0,5)){if(file.size>15*1024*1024)continue;uploaded.push(await uploadChatAttachment(room,myUid,file));}setAttachments(a=>[...a,...uploaded]);}finally{setUploading(false);e.target.value='';}}
  function addEmoji(emoji){setText(t=>`${t}${emoji}`);setEmojiOpen(false);}

  if(!hasAccess)return <NoAccessPage><div style={{fontSize:'3rem'}}>🔒</div><h2>{noAccessTitle}</h2><p>{noAccessBody}</p></NoAccessPage>;

  return <Page>
    <Header><HeaderRow><div><HeaderTitle>{icon} {title}</HeaderTitle><HeaderSub>{subtitleSuffix?`${subtitleSuffix} · `:''}{messages.length} messages{typing.length?` · ${typing.map(x=>x.userName).join(', ')} typing…`:''}</HeaderSub></div><HeaderActions><IconBtn onClick={()=>setShowSaved(true)} title="Saved messages">🔖</IconBtn><IconBtn onClick={()=>setShowInfo(true)} title="Conversation details">ⓘ</IconBtn></HeaderActions></HeaderRow></Header>
    <SearchBar><input placeholder="🔍 Search messages…" value={search} onChange={e=>setSearch(e.target.value)}/></SearchBar>
    <Messages $keyboardOpen={isKeyboardVisible} $keyboardHeight={keyboardHeight}>
      {displayed.length===0&&<EmptyState><span style={{fontSize:'2rem'}}>💬</span><span>{search?'No messages match your search.':'No messages yet — say hello!'}</span></EmptyState>}
      {displayed.map((msg,i)=>{const mine=msg.senderId===myUid;const prev=displayed[i-1];const showDate=!prev||dateLabel(prev.createdAt)!==dateLabel(msg.createdAt);const rs=reactionMap[msg.id]||[];const grouped=[...new Map(rs.map(r=>[r.emoji,r])).values()].map(r=>({emoji:r.emoji,count:rs.filter(x=>x.emoji===r.emoji).length,active:rs.some(x=>x.emoji===r.emoji&&x.userId===myUid)}));return <div key={msg.id}>
        {showDate&&<div style={{textAlign:'center',fontSize:'.7rem',color:'var(--text-muted)',margin:'.6rem'}}>{dateLabel(msg.createdAt)}</div>}
        <Bubble $mine={mine} onDoubleClick={()=>setReply(msg)}>
          {!mine&&<AvatarDot>{initials(msg.senderName)}</AvatarDot>}
          <BubbleContent>
            {!mine&&<BubbleName>{msg.senderName}</BubbleName>}
            {msg.replyTo&&<ReplyPreview onClick={()=>document.getElementById(`message-${msg.replyTo.messageId}`)?.scrollIntoView({behavior:'smooth',block:'center'})}>↩️ {msg.replyTo.senderName}: {msg.replyTo.text}</ReplyPreview>}
            {editingId===msg.id?<div style={{display:'flex',gap:'.35rem'}}><input value={editText} onChange={e=>setEditText(e.target.value)} autoFocus style={{flex:1,padding:'.5rem',borderRadius:8,border:'1.5px solid var(--amber)'}}/><MiniBtn onClick={()=>handleEdit(msg)}>Save</MiniBtn><MiniBtn onClick={()=>setEditingId(null)}>✕</MiniBtn></div>:<BubbleText $mine={mine} id={`message-${msg.id}`}>{msg.attachments?.map((a,j)=>a.type?.startsWith('image/')?<a key={j} href={a.url} target="_blank" rel="noreferrer"><img src={a.url} alt={a.name} style={{maxWidth:'100%',maxHeight:260,borderRadius:10,display:'block',marginBottom:'.35rem'}}/></a>:<Attachment key={j} href={a.url} target="_blank" rel="noreferrer">📎 <span>{a.name}</span></Attachment>)}{msg.text}</BubbleText>}
            <Meta $mine={mine}><MetaText>{formatTime(msg.createdAt)}</MetaText>{msg.edited&&<Edited>(edited)</Edited>}{mine&&<MetaText>{readIds.has(msg.id)?'✓✓ Read':'✓ Sent'}</MetaText>}{msg.pinned&&<MetaText>📌</MetaText>}</Meta>
            {grouped.length>0&&<Reactions $mine={mine}>{grouped.map(r=><Reaction key={r.emoji} $active={r.active} onClick={()=>toggleReaction(msg,r.emoji)}>{r.emoji} {r.count}</Reaction>)}</Reactions>}
            {selectedId===msg.id&&<ActionBar $mine={mine}><MiniBtn onClick={()=>setReply(msg)}>↩️ Reply</MiniBtn><MiniBtn onClick={()=>toggleReaction(msg,'❤️')}>❤️</MiniBtn><MiniBtn onClick={()=>toggleSaved(msg)}>{isSaved(msg.id)?'🔖 Saved':'🔖 Save'}</MiniBtn>{mine&&<MiniBtn onClick={()=>{setEditingId(msg.id);setEditText(msg.text||'');}}>✏️ Edit</MiniBtn>} {(mine||userProfile?.role==='admin'||userProfile?.role==='superadmin')&&<MiniBtn onClick={()=>deleteMessage(msg)}>🗑️ Delete</MiniBtn>} {(userProfile?.role==='admin'||userProfile?.role==='superadmin')&&<MiniBtn onClick={()=>togglePin(msg)}>{msg.pinned?'Unpin':'📌 Pin'}</MiniBtn>}</ActionBar>}
            <div style={{textAlign:mine?'right':'left'}}><MiniBtn onClick={()=>setSelectedId(selectedId===msg.id?null:msg.id)}>•••</MiniBtn></div>
          </BubbleContent>
        </Bubble>
      </div>})}<div ref={bottomRef}/>
    </Messages>

    <ComposerWrap $keyboardOpen={isKeyboardVisible} $keyboardHeight={keyboardHeight}>
      {reply&&<div style={{padding:'.45rem 1rem',background:'var(--bg-secondary)',fontSize:'.75rem',borderBottom:'1px solid var(--border)'}}>↩️ Replying to <strong>{reply.senderName}</strong>: {reply.text?.slice(0,100)} <button onClick={()=>setReply(null)} style={{float:'right',border:0,background:'transparent',cursor:'pointer'}}>✕</button></div>}
      {attachments.length>0&&<div style={{padding:'.35rem 1rem',display:'flex',gap:'.35rem',overflowX:'auto'}}>{attachments.map((a,i)=><FileRow key={i}><span>📎 {a.name}</span><MiniBtn onClick={()=>setAttachments(x=>x.filter((_,j)=>j!==i))}>✕</MiniBtn></FileRow>)}</div>}
      {emojiOpen&&<Picker><Quick>{QUICK_REACTIONS.map(e=><EmojiBtn key={e} onClick={()=>addEmoji(e)}>{e}</EmojiBtn>)}</Quick><EmojiGrid>{COMMON_EMOJIS.map((e,i)=><EmojiBtn key={`${e}-${i}`} onClick={()=>addEmoji(e)}>{e}</EmojiBtn>)}</EmojiGrid></Picker>}
      <Status>{uploading?'Uploading…':status}</Status>
      <Composer><ToolBtn onClick={()=>setEmojiOpen(x=>!x)} title="Emoji">😊</ToolBtn><ToolBtn onClick={()=>fileInput.current?.click()} title="Attach">📎</ToolBtn><input ref={fileInput} type="file" multiple hidden onChange={attachFiles}/><TextArea placeholder="Message all students…" value={text} rows={1} onChange={e=>{setText(e.target.value);setTypingState(Boolean(e.target.value.trim()));}} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();handleSend();}}}/><SendBtn onClick={handleSend} disabled={(!text.trim()&&!attachments.length)||sending}>➤</SendBtn></Composer>
    </ComposerWrap>

    {showInfo&&<Overlay onClick={()=>setShowInfo(false)}><Modal onClick={e=>e.stopPropagation()}><h3>Conversation details</h3><p style={{color:'var(--text-muted)',margin:'.3rem 0 1rem'}}>{title} · {messages.length} messages</p><FileRow><span>📌 Pinned messages</span><strong>{messages.filter(m=>m.pinned).length}</strong></FileRow><FileRow><span>📎 Attachments</span><strong>{messages.reduce((n,m)=>n+(m.attachments?.length||0),0)}</strong></FileRow><button onClick={()=>setShowInfo(false)} style={{marginTop:'1rem',padding:'.65rem 1rem',borderRadius:10,border:0,background:'var(--amber)',color:'white'}}>Close</button></Modal></Overlay>}
    {showSaved&&<Overlay onClick={()=>setShowSaved(false)}><Modal onClick={e=>e.stopPropagation()}><h3>🔖 Saved messages</h3><p style={{color:'var(--text-muted)'}}>{savedItems.length?'Your saved messages':'You have no saved messages yet.'}</p>{savedItems.map(item=><FileRow key={item.id}><div><strong>{item.senderName}</strong><div style={{fontSize:'.8rem',color:'var(--text-secondary)'}}>{item.text||'Attachment'}</div></div><MiniBtn onClick={()=>{document.getElementById(`message-${item.messageId}`)?.scrollIntoView({behavior:'smooth',block:'center'});setShowSaved(false);}}>Open</MiniBtn></FileRow>)}<button onClick={()=>setShowSaved(false)} style={{marginTop:'1rem',padding:'.65rem 1rem',borderRadius:10,border:0,background:'var(--amber)',color:'white'}}>Close</button></Modal></Overlay>}
  </Page>;
}

const NoAccessPage=styled.div`display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:calc(100vh - var(--topbar-height) - var(--bottomnav-height));padding:2rem 1.5rem;text-align:center;color:var(--text-muted);`;
