// The settings page, delivered to the Pebble app as a self-contained data: URI.
// pkjs replaces the __CONFIG__ token with encodeURIComponent(currentConfigJSON)
// before opening it. On Save the page returns the new config via pebblejs://close.
// Bundled into PebbleKit JS by wscript (src/common/**/*.js).

var CONFIG_HTML = '<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">' +
'<title>qrbuddy</title><style>' +
'body{font-family:-apple-system,Helvetica,Arial,sans-serif;margin:0;padding:16px;background:#f4f4f4;color:#222}' +
'h1{font-size:20px;margin:0 0 12px}h2{font-size:14px;margin:16px 0 6px;color:#555}' +
'.row{display:flex;gap:6px;margin-bottom:8px}.row input{flex:1;min-width:0;padding:8px;font-size:15px;border:1px solid #ccc;border-radius:6px}' +
'.row button{flex:0 0 auto;border:none;background:#d33;color:#fff;border-radius:6px;width:36px;font-size:18px}' +
'button{padding:10px 14px;font-size:15px;border:none;border-radius:6px}' +
'#add{background:#eee;color:#222;width:100%;margin-top:4px}' +
'#save{background:#0a7;color:#fff;width:100%;margin-top:20px;font-size:17px}' +
'label.pos{margin-right:16px;font-size:15px}' +
'</style></head><body>' +
'<h1>qrbuddy</h1>' +
'<h2>Label position</h2>' +
'<div><label class="pos"><input type="radio" name="pos" value="below">Below QR</label>' +
'<label class="pos"><input type="radio" name="pos" value="above">Above QR</label></div>' +
'<h2>Entries</h2><div id="list"></div>' +
'<button id="add">+ Add entry</button>' +
'<button id="save">Save</button>' +
'<script>' +
'var SEED="__CONFIG__";' +
'var cfg;try{cfg=JSON.parse(decodeURIComponent(SEED))}catch(e){cfg={}}' +
'if(!cfg||typeof cfg!=="object")cfg={};' +
'var entries=Array.isArray(cfg.entries)?cfg.entries:[];' +
'var pos=cfg.labelPosition==="above"?"above":"below";' +
'document.querySelector(\'input[name=pos][value="\'+pos+\'"]\').checked=true;' +
'var list=document.getElementById("list");' +
'function esc(s){return(s==null?"":String(s)).replace(/"/g,"&quot;").replace(/</g,"&lt;")}' +
'function addRow(label,text){' +
'var d=document.createElement("div");d.className="row";' +
'd.innerHTML=\'<input class="lbl" placeholder="Label" value="\'+esc(label)+\'"><input class="txt" placeholder="Text / URL" value="\'+esc(text)+\'"><button class="rm">&times;</button>\';' +
'd.querySelector(".rm").onclick=function(){list.removeChild(d)};' +
'list.appendChild(d)}' +
'for(var i=0;i<entries.length;i++)addRow(entries[i].label,entries[i].text);' +
'if(entries.length===0)addRow("","");' +
'document.getElementById("add").onclick=function(){addRow("","")};' +
'document.getElementById("save").onclick=function(){' +
'var out=[];var rows=list.querySelectorAll(".row");' +
'for(var i=0;i<rows.length;i++){var t=rows[i].querySelector(".txt").value;var l=rows[i].querySelector(".lbl").value;' +
'if(t&&t.length)out.push({label:l,text:t})}' +
'var p=document.querySelector("input[name=pos]:checked");' +
'var config={labelPosition:p?p.value:"below",entries:out};' +
'location.href="pebblejs://close#"+encodeURIComponent(JSON.stringify(config))};' +
'</script></body></html>';

module.exports = { CONFIG_HTML: CONFIG_HTML };
