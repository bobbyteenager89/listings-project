"use client";

import { useState, useCallback } from "react";

const SE_BROOKLYN = [
  { label: "Park Slope", slug: "park-slope" },
  { label: "Carroll Gardens", slug: "carroll-gardens" },
  { label: "Cobble Hill", slug: "cobble-hill" },
  { label: "Brooklyn Heights", slug: "brooklyn-heights" },
  { label: "Boerum Hill", slug: "boerum-hill" },
  { label: "Gowanus", slug: "gowanus" },
  { label: "Fort Greene", slug: "fort-greene" },
  { label: "Prospect Heights", slug: "prospect-heights" },
  { label: "Downtown BK", slug: "downtown-brooklyn" },
  { label: "Clinton Hill", slug: "clinton-hill" },
  { label: "Red Hook", slug: "red-hook" },
];

const SE_MANHATTAN = [
  { label: "East Village", slug: "east-village" },
  { label: "West Village", slug: "west-village" },
  { label: "Lower East Side", slug: "lower-east-side" },
  { label: "SoHo", slug: "soho" },
  { label: "Tribeca", slug: "tribeca" },
  { label: "Chelsea", slug: "chelsea" },
  { label: "Gramercy", slug: "gramercy-park" },
];

function seUrl(slug: string) {
  return `https://streeteasy.com/for-rent/${slug}/price:-3200%7Cbeds%3A0?sort_by=listed_desc`;
}

const LP_LINKS = [
  { label: "NYC Sublets", url: "https://www.listingsproject.com/real-estate/new-york-city/sublets" },
  { label: "NYC Rentals", url: "https://www.listingsproject.com/real-estate/new-york-city/rentals" },
  { label: "LA Sublets", url: "https://www.listingsproject.com/real-estate/los-angeles/sublets" },
  { label: "LA Rentals", url: "https://www.listingsproject.com/real-estate/los-angeles/rentals" },
];

// StreetEasy bookmarklet — extracts cards with image, copies JSON to clipboard
const SE_BOOKMARKLET = `javascript:void(${encodeURIComponent(`(function(){var c=document.querySelectorAll('[class*="ListingCard-module__cardContainer"]');if(!c.length){alert('No listings found');return}var r=[...c].map(function(card){var a=card.querySelector('a[href]'),img=card.querySelector('img'),iu=img?img.src:null,t=card.innerText||'',ls=t.split('\\n').map(function(l){return l.trim()}).filter(Boolean),tp=ls[0]||'',nh=tp.replace(/^(?:RENTAL UNIT|CO-OP|CONDO|TOWNHOUSE|HOUSE)\\s+IN\\s+/i,'').toLowerCase(),al=ls[1]||'',hi=al.indexOf('#'),ad=hi>=0?al.substring(0,hi).trim():al,un=hi>=0?al.substring(hi):null,pl=ls.find(function(l){return l.startsWith('$')&&l.includes(',')}),pr=pl?parseInt(pl.replace(/[^0-9]/g,'')):0,nl=ls.find(function(l){return l.includes('net effective')}),ne=nl?parseInt(nl.replace(/[^0-9]/g,'')):null,sl=ls.find(function(l){return l.includes('ft\\u00B2')&&!l.startsWith('-')}),sq=sl?parseInt(sl.replace(/[^0-9]/g,'')):null,nf=t.toLowerCase().includes('no fee'),nd=tp.toLowerCase().includes('new dev')||t.toLowerCase().includes('new development'),im=t.match(/Image \\d+ of (\\d+)/),pc=im?parseInt(im[1]):0,hr=a?a.href:'',ur=hr.split('?')[0],si=ur.split('/').pop()||'';return{source:'streeteasy',sourceId:si,url:ur,address:ad,unit:un,neighborhood:nh,city:'nyc',listingType:'rental',price:pr,netEffective:ne,sqft:sq,noFee:nf,newDev:nd,hasLaundry:false,hasElevator:false,photoCount:pc,imageUrl:iu,availableDate:null,endDate:null}}).filter(function(l){return l.url&&l.price>0});navigator.clipboard.writeText(JSON.stringify(r)).then(function(){alert('Copied '+r.length+' listings!')}).catch(function(){prompt('Copy this:',JSON.stringify(r))})})()`)})`;

// Listings Project bookmarklet — extracts cards, copies JSON to clipboard
const LP_BOOKMARKLET = `javascript:void(${encodeURIComponent(`(function(){var cards=document.querySelectorAll('a[href*="/listings/"]');if(!cards.length){alert('No listings found');return}var seen=new Set(),r=[];cards.forEach(function(a){var hr=a.href;if(!hr||seen.has(hr)||hr.includes('/listings/new'))return;seen.add(hr);var t=a.innerText||'',ls=t.split('\\n').map(function(l){return l.trim()}).filter(Boolean);var img=a.querySelector('img'),iu=img?img.src:null;var pl=ls.find(function(l){return l.startsWith('$')}),pr=pl?parseInt(pl.replace(/[^0-9]/g,'')):0;var loc=ls.find(function(l){return l.includes(',')&&!l.startsWith('$')})||'';var parts=loc.split(',').map(function(p){return p.trim()});var hood=parts[0]||'';var city=loc.toLowerCase().includes('los angeles')||loc.toLowerCase().includes(', la')||loc.toLowerCase().includes(', ca')?'la':'nyc';var isSub=document.title.toLowerCase().includes('sublet')||t.toLowerCase().includes('sublet');var dates=ls.filter(function(l){return l.match(/\\d{1,2}\\/\\d{1,2}/)});var si=hr.split('/').pop()||'';r.push({source:'listingsproject',sourceId:si,url:hr,address:loc,unit:null,neighborhood:hood.toLowerCase(),city:city,listingType:isSub?'sublet':'rental',price:pr,netEffective:null,sqft:null,noFee:true,newDev:false,hasLaundry:false,hasElevator:false,photoCount:iu?1:0,imageUrl:iu,availableDate:dates[0]||null,endDate:dates[1]||null})});r=r.filter(function(l){return l.price>0});navigator.clipboard.writeText(JSON.stringify(r)).then(function(){alert('Copied '+r.length+' listings!')}).catch(function(){prompt('Copy this:',JSON.stringify(r))})})()`)})`;

type LogEntry = {
  time: string;
  msg: string;
  type: "info" | "success" | "error";
};

export default function ScrapePage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [secret, setSecret] = useState("");

  const log = useCallback(
    (msg: string, type: LogEntry["type"] = "info") => {
      setLogs((prev) => [
        ...prev,
        { time: new Date().toLocaleTimeString(), msg, type },
      ]);
    },
    []
  );

  async function handlePaste() {
    if (!secret) {
      log("Enter your CRON_SECRET first", "error");
      return;
    }
    try {
      const text = await navigator.clipboard.readText();
      const listings = JSON.parse(text);
      if (!Array.isArray(listings) || listings.length === 0) {
        log("No valid listing data in clipboard", "error");
        return;
      }
      log(`Found ${listings.length} listings in clipboard, sending...`);
      const res = await fetch("/api/scrape/ingest", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${secret}`,
        },
        body: JSON.stringify({ listings }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      log(
        `${data.new} new, ${data.updated} updated out of ${data.total}`,
        "success"
      );
    } catch (e) {
      log(
        `Failed: ${e instanceof Error ? e.message : String(e)}`,
        "error"
      );
    }
  }

  return (
    <main className="max-w-2xl mx-auto p-8 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Scrape Listings</h1>
        <a href="/" className="text-sm text-blue-600 hover:underline">
          ← Dashboard
        </a>
      </div>

      <section className="space-y-3 p-4 bg-zinc-50 rounded-lg border">
        <h2 className="font-semibold">Setup</h2>
        <label className="block text-sm text-zinc-600">
          CRON_SECRET (for API auth)
        </label>
        <input
          type="password"
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
          placeholder="Paste your CRON_SECRET..."
          className="w-full p-2 border rounded text-sm font-mono"
        />
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold">
          Step 1: Drag bookmarklets to bookmark bar
        </h2>
        <p className="text-sm text-zinc-500">
          Use the right bookmarklet for each site. Click on a search page to
          extract listings to clipboard.
        </p>
        <div className="flex gap-3">
          <a
            href={SE_BOOKMARKLET}
            className="inline-block px-4 py-2 bg-zinc-900 text-white rounded-lg text-sm font-medium hover:bg-zinc-700 cursor-grab active:cursor-grabbing"
            onClick={(e) => e.preventDefault()}
          >
            SE Extract
          </a>
          <a
            href={LP_BOOKMARKLET}
            className="inline-block px-4 py-2 bg-emerald-700 text-white rounded-lg text-sm font-medium hover:bg-emerald-600 cursor-grab active:cursor-grabbing"
            onClick={(e) => e.preventDefault()}
          >
            LP Extract
          </a>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold">Step 2: Visit search pages</h2>

        <div className="space-y-2">
          <h3 className="text-sm font-medium text-zinc-700">StreetEasy — Brooklyn</h3>
          <div className="flex gap-2 flex-wrap">
            {SE_BROOKLYN.map((s) => (
              <a key={s.slug} href={seUrl(s.slug)} target="_blank" rel="noopener noreferrer"
                className="text-xs px-3 py-1.5 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 font-medium">
                {s.label} ↗
              </a>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-medium text-zinc-700">StreetEasy — Manhattan</h3>
          <div className="flex gap-2 flex-wrap">
            {SE_MANHATTAN.map((s) => (
              <a key={s.slug} href={seUrl(s.slug)} target="_blank" rel="noopener noreferrer"
                className="text-xs px-3 py-1.5 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 font-medium">
                {s.label} ↗
              </a>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-medium text-zinc-700">Listings Project — NYC & LA</h3>
          <div className="flex gap-2 flex-wrap">
            {LP_LINKS.map((s) => (
              <a key={s.label} href={s.url} target="_blank" rel="noopener noreferrer"
                className="text-xs px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-md hover:bg-emerald-100 font-medium">
                {s.label} ↗
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold">Step 3: Ingest</h2>
        <button
          onClick={handlePaste}
          disabled={!secret}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-500 disabled:opacity-50"
        >
          Paste & Ingest from Clipboard
        </button>
      </section>

      {logs.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-semibold">Log</h2>
          <div className="bg-zinc-900 text-zinc-100 p-4 rounded-lg text-xs font-mono max-h-64 overflow-y-auto space-y-1">
            {logs.map((entry, i) => (
              <div
                key={i}
                className={
                  entry.type === "error"
                    ? "text-red-400"
                    : entry.type === "success"
                      ? "text-green-400"
                      : "text-zinc-300"
                }
              >
                <span className="text-zinc-500">[{entry.time}]</span>{" "}
                {entry.msg}
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
