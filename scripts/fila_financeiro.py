#!/usr/bin/env python3
import sys
import json
import time
import datetime
import urllib.request
try:
    import pymysql
except ImportError:
    print("pymysql nao instalado")
    sys.exit(1)

DB = {
    "host": "127.0.0.1",
    "user": "traccar_user",
    "password": "Traccar@2026#Sec",
    "database": "traccar",
    "charset": "utf8mb4",
    "cursorclass": pymysql.cursors.DictCursor,
}

def conectar():
    return pymysql.connect(**DB)

def hoje():
    return datetime.date.today()

def to_date(s):
    if not s:
        return None
    try:
        return datetime.datetime.strptime(str(s)[:10], "%Y-%m-%d").date()
    except Exception:
        return None

def get_attr(attrs, chave):
    try:
        d = json.loads(attrs) if isinstance(attrs, str) else (attrs or {})
        return d.get(chave) or ""
    except Exception:
        return ""

def povoar():
    conn = conectar()
    with conn.cursor() as cur:
        cur.execute("SELECT id, name, attributes FROM tc_users WHERE attributes IS NOT NULL")
        users = cur.fetchall()
        cur.execute("DELETE FROM tc_fila_financeiro WHERE DATE(created_at) = CURDATE()")
        inseridos = 0
        for u in users:
            attrs = u.get("attributes") or "{}"
            venc = to_date(get_attr(attrs, "fin_vencimento"))
            if not venc:
                continue
            valor = get_attr(attrs, "fin_valor") or "0"
            tel1 = get_attr(attrs, "fin_telefone1")
            tel2 = get_attr(attrs, "fin_telefone2")
            fone = tel1 or tel2
            if not fone:
                continue
            dias_antes = int(get_attr(attrs, "fin_msg_lembrete_dias") or "3")
            diff = (venc - hoje()).days
            tipo = None
            if diff == 0:
                tipo = "Vencimento"
            elif diff == dias_antes:
                tipo = "Lembrete"
            elif diff < 0:
                tipo = "Atraso"
            if not tipo:
                continue
            dias_atraso = abs(diff) if diff < 0 else 0
            cur.execute("INSERT INTO tc_fila_financeiro (user_id, nome, telefone, tipo, valor, vencimento, dias_atraso, status) VALUES (%s,%s,%s,%s,%s,%s,%s,%s)",
                (u["id"], u["name"], fone, tipo, valor, venc, dias_atraso, "Pendente"))
            inseridos += 1
        conn.commit()
        print("Fila povoada: %d clientes" % inseridos)
    conn.close()

def limpar():
    conn = conectar()
    with conn.cursor() as cur:
        cur.execute("DELETE FROM tc_fila_financeiro")
        conn.commit()
    conn.close()
    print("Fila limpa")

def get_intervalo_segundos():
    conn = conectar()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT attributes FROM tc_users WHERE administrator = 1 AND attributes LIKE %s LIMIT 1", ("%fin_fila_intervalo%",))
            row = cur.fetchone()
        if not row:
            return 10
        v = get_attr(row["attributes"], "fin_fila_intervalo") or "10s"
        import re
        m = re.match(r"^(\d+)([smh])$", v)
        if not m:
            return 10
        n = int(m.group(1))
        u = m.group(2)
        return n if u == "s" else (n * 60 if u == "m" else n * 3600)
    finally:
        conn.close()

def get_credenciais():
    conn = conectar()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT attributes FROM tc_users WHERE administrator = 1 AND attributes LIKE %s LIMIT 1", ("%fin_evo_url%",))
            row = cur.fetchone()
        if not row:
            return None
        attrs = row["attributes"]
        return {
            "url": get_attr(attrs, "fin_evo_url"),
            "key": get_attr(attrs, "fin_evo_key"),
            "instance": get_attr(attrs, "fin_evo_instance"),
            "lembrete": get_attr(attrs, "fin_msg_lembrete"),
            "vencimento": get_attr(attrs, "fin_msg_vencimento"),
            "atraso": get_attr(attrs, "fin_msg_atraso"),
            "hora_lembrete": get_attr(attrs, "fin_msg_lembrete_hora") or "13:00",
            "hora_vencimento": get_attr(attrs, "fin_msg_vencimento_hora") or "08:30",
            "hora_atraso": get_attr(attrs, "fin_msg_atraso_hora") or "09:00",
        }
    finally:
        conn.close()

def enviar_whatsapp(url, key, instance, numero, texto):
    body = json.dumps({"number": numero, "text": texto}).encode("utf-8")
    req = urllib.request.Request(
        url.rstrip("/") + "/message/sendText/" + instance,
        data=body,
        headers={"apikey": key, "Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.status in (200, 201)

def montar_texto(texto, item):
    venc_str = item["vencimento"].strftime("%d/%m/%Y") if item["vencimento"] else ""
    hoje_str = hoje().strftime("%d/%m/%Y")
    t = texto or ""
    t = t.replace("{nome}", item["nome"] or "")
    t = t.replace("{vencimento}", venc_str)
    t = t.replace("{prox_vencimento}", venc_str)
    t = t.replace("{valor}", item["valor"] or "0")
    t = t.replace("{valor_atualizado}", item["valor"] or "0")
    t = t.replace("{data_hoje}", hoje_str)
    t = t.replace("{multa}", "")
    t = t.replace("{juros}", "")
    t = t.replace("{desconto}", "")
    t = t.replace("{link_pagamento}", "")
    t = t.replace("{pix_copia_cola}", "")
    return t

def hora_agora():
    n = datetime.datetime.now()
    return n.hour * 60 + n.minute

def hora_config(hhmm):
    try:
        p = str(hhmm).split(":")
        return int(p[0]) * 60 + int(p[1])
    except Exception:
        return 0

def processar(forcar=False):
    cred = get_credenciais()
    intervalo = get_intervalo_segundos()
    if not cred or not cred["url"] or not cred["key"] or not cred["instance"]:
        print("Credenciais Evolution nao configuradas")
        return
    conn = conectar()
    with conn.cursor() as cur:
        cur.execute("SELECT * FROM tc_fila_financeiro WHERE status = %s", ("Pendente",))
        itens = cur.fetchall()
        enviados = 0
        erros = 0
        pulados = 0
        agora = hora_agora()
        for item in itens:
            tipo = item["tipo"]
            if tipo == "Lembrete":
                tpl = cred["lembrete"]
                hora_cfg = cred["hora_lembrete"]
            elif tipo == "Vencimento":
                tpl = cred["vencimento"]
                hora_cfg = cred["hora_vencimento"]
            else:
                tpl = cred["atraso"]
                hora_cfg = cred["hora_atraso"]
            if not tpl:
                continue
            if not forcar and agora < hora_config(hora_cfg):
                pulados += 1
                continue
            texto = montar_texto(tpl, item)
            try:
                ok = enviar_whatsapp(cred["url"], cred["key"], cred["instance"], item["telefone"], texto)
                if ok:
                    cur.execute("UPDATE tc_fila_financeiro SET status=%s, enviado_em=NOW() WHERE id=%s", ("Enviado", item["id"]))
                    conn.commit()
                    enviados += 1
                    time.sleep(intervalo)
                else:
                    cur.execute("UPDATE tc_fila_financeiro SET status=%s WHERE id=%s", ("Erro", item["id"]))
                    erros += 1
            except Exception as e:
                cur.execute("UPDATE tc_fila_financeiro SET status=%s, erro=%s WHERE id=%s", ("Erro", str(e)[:500], item["id"]))
                erros += 1
        conn.commit()
    conn.close()
    print("Enviados: %d, Erros: %d, Pulados: %d" % (enviados, erros, pulados))

if __name__ == "__main__":
    acao = sys.argv[1] if len(sys.argv) > 1 else "processar"
    if acao == "povoar":
        povoar()
    elif acao == "limpar":
        limpar()
    elif acao == "processar":
        processar(forcar=False)
    elif acao == "processar-forcar":
        processar(forcar=True)
    else:
        print("Uso: fila_financeiro.py [povoar|limpar|processar|processar-forcar]")
