const http=require("http");
const mysql=require("/opt/telegram-bot/node_modules/mysql2/promise");
const pool=mysql.createPool({host:process.env.DB_HOST||"localhost",user:process.env.DB_USER,password:process.env.DB_PASS,database:process.env.DB_NAME||"traccar"});
const send=(r,c,d)=>{r.writeHead(c,{"Content-Type":"application/json"});r.end(JSON.stringify(d));};
http.createServer(async(req,res)=>{
 const u=new URL(req.url,"http://x");
 const p=u.pathname.replace(/^\/api-contas-pagar/,"").replace(/\.php$/,"");
 let body="";for await(const c of req)body+=c;
 let d={};try{d=body?JSON.parse(body):{};}catch(e){}
 try{
  if(p==="/get"){const[r]=await pool.query("SELECT * FROM tc_contas_pagar");return send(res,200,r);}
  if(p==="/create"){for(const i of(Array.isArray(d)?d:[d]))await pool.query("INSERT INTO tc_contas_pagar (descricao,valor,vencimento,pago) VALUES (?,?,?,0)",[i.descricao,i.valor,i.vencimento]);return send(res,200,{success:true});}
  if(p==="/update"){await pool.query("UPDATE tc_contas_pagar SET descricao=?,valor=?,vencimento=? WHERE id=?",[d.descricao,d.valor,d.vencimento,d.id]);return send(res,200,{success:true});}
  if(p==="/pay"){await pool.query("UPDATE tc_contas_pagar SET pago=? WHERE id=?",[d.pago?1:0,d.id]);return send(res,200,{success:true});}
  if(p==="/delete"){await pool.query("DELETE FROM tc_contas_pagar WHERE id=?",[u.searchParams.get("id")]);return send(res,200,{success:true});}
  send(res,404,{error:"not found"});
 }catch(e){send(res,500,{error:e.message});}
}).listen(8096,"127.0.0.1");
