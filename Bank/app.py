import React, { useMemo, useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PiggyBank, Link as LinkIcon, RefreshCcw } from "lucide-react";

// Types
interface Account {
  id: string;
  name: string;
  type: "Cash" | "Bank";
  balance: number;
  plaidLinked?: boolean;
  institution?: string;
  lastSyncTs?: number;
}

// Helpers
const storageKey = "bills_balance_dashboard_v2";
const fmt = (n:number) => `$${(n||0).toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2})}`;
function usePersistentState<T>(key:string, initial:T){
  const [state,setState] = useState<T>(()=>{
    if (typeof window==='undefined') return initial;
    const raw = localStorage.getItem(key);
    return raw? JSON.parse(raw) as T : initial;
  });
  useEffect(()=>{ if(typeof window!=='undefined') localStorage.setItem(key, JSON.stringify(state)); },[key,state]);
  return [state,setState] as const;
}
function notify(msg:string){ alert(msg); }

export default function Dashboard(){
  const [accounts,setAccounts] = usePersistentState<Account[]>(`${storageKey}:accounts`, [
    { id:'cash', name:'Cash on Hand', type:'Cash', balance:0 },
    { id:'bank', name:'Checking', type:'Bank', balance:0 }
  ]);
  const [linkingId,setLinkingId] = useState<string|null>(null);

  async function ensurePlaidScript(){
    if ((window as any).Plaid?.create) return true;
    const existing = document.querySelector('script[src*="plaid.com/link"]');
    if (!existing){
      const s = document.createElement('script');
      s.src = 'https://cdn.plaid.com/link/v2/stable/link-initialize.js';
      s.async = true; document.head.appendChild(s);
    }
    return await new Promise<boolean>((resolve)=>{
      let tries=0; const iv=setInterval(()=>{
        tries++;
        if ((window as any).Plaid?.create){ clearInterval(iv); resolve(true);} 
        if (tries>50){ clearInterval(iv); resolve(false);} 
      },100);
    });
  }

  async function openPlaidLink(accountId:string){
    setLinkingId(accountId);
    try{
      const scriptOk = await ensurePlaidScript();

      async function fetchLinkToken(): Promise<string|null>{
        try{
          const res1 = await fetch('/api/plaid/create-link-token',{method:'POST'});
          if(res1.ok){ const d=await res1.json(); return d.link_token; }
          const res2 = await fetch('/api/plaid/create_link_token',{method:'POST'});
          if(res2.ok){ const d=await res2.json(); return d.link_token; }
        }catch(e){ console.warn('create_link_token failed', e); }
        return null;
      }
      const linkToken = await fetchLinkToken();

      if (scriptOk && linkToken && (window as any).Plaid?.create){
        const handler = (window as any).Plaid.create({
          token: linkToken,
          onSuccess: async(public_token:string, metadata:any)=>{
            try{
              const payload = { public_token, accountId };
              const ex1 = await fetch('/api/plaid/exchange',{method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload)});
              if(!ex1.ok){
                const ex2 = await fetch('/api/plaid/exchange_public_token',{method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload)});
                if(!ex2.ok) throw new Error(await ex2.text());
              }
              setAccounts(prev=> prev.map(a=> a.id===accountId? {...a, plaidLinked:true, institution:metadata?.institution?.name||'Linked', lastSyncTs:Date.now()} : a));
              await refreshPlaid(accountId);
              notify('Plaid linked');
            }catch(err:any){ notify('Exchange failed: '+(err?.message||String(err))); }
          },
          onExit: (err:any)=>{ if(err) console.warn('Plaid exit', err); }
        });
        handler.open();
        return;
      }
      // Demo fallback
      setAccounts(prev=> prev.map(a=> a.id===accountId? {...a, plaidLinked:true, institution:'Demo Bank', lastSyncTs:Date.now()} : a));
      notify('Plaid linked (demo)');
    }catch(e:any){
      notify('Plaid error: '+(e?.message||e));
    }finally{
      setLinkingId(null);
    }
  }

  async function refreshPlaid(accountId:string){
    try{
      const res=await fetch(`/api/plaid/balances?clientAccountId=${encodeURIComponent(accountId)}`);
      if(res.ok){
        const data=await res.json();
        const rec=(data.accounts||[])[0];
        setAccounts(prev=> prev.map(a=> a.id===accountId? {...a,balance: rec?.available||rec?.current||a.balance,lastSyncTs:Date.now()} : a));
        notify('Balance refreshed');
        return;
      }
    }catch{}
    // demo fallback
    setAccounts(prev=> prev.map(a=> a.id===accountId? {...a, balance: a.balance+Math.round(Math.random()*100-50), lastSyncTs:Date.now()} : a));
    notify('Balance refreshed (demo)');
  }

  function unlinkPlaid(accountId:string){
    setAccounts(prev=> prev.map(a=> a.id===accountId? {...a, plaidLinked:false, institution:undefined} : a));
  }

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold flex items-center gap-2"><PiggyBank/> Accounts</h1>
      <div className="grid md:grid-cols-2 gap-4">
        {accounts.map(a=> (
          <Card key={a.id}>
            <CardContent className="p-3 space-y-2">
              <div className="flex justify-between"><strong>{a.name}</strong><span>{fmt(a.balance)}</span></div>
              {a.plaidLinked ? (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={()=>refreshPlaid(a.id)}><RefreshCcw className="w-4 h-4 mr-1"/>Refresh</Button>
                  <Button size="sm" variant="outline" onClick={()=>unlinkPlaid(a.id)}>Unlink</Button>
                </div>
              ):(
                <Button size="sm" variant="outline" disabled={linkingId===a.id} onClick={()=>openPlaidLink(a.id)}>
                  {linkingId===a.id? 'Linking…' : (<><LinkIcon className="w-4 h-4 mr-1"/>Link Plaid</>)}
                </Button>
              )}
              {a.institution && <div className="text-xs text-muted-foreground">{a.institution} {a.lastSyncTs?`· ${new Date(a.lastSyncTs).toLocaleString()}`:''}</div>}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
