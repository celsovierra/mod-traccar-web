#!/usr/bin/env python3
import sys
import json
import datetime
import time
import urllib.request
import urllib.parse
try:
    import pymysql
except ImportError:
    print("pymysql nao instalado. Rode: pip3 install pymysql")
    sys.exit(1)

DB = {
    "host": "127.0.0.1",
    "user": "root",
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
        cur.execute("DELETE FROM tc_fila_financeiro")
        conn.commit()
    conn.close()
    print("Fila limpa")

def get_intervalo_segundos():
    conn = conectar()
    try:
        with conn.cursor() as cur:
            cur.execute(\"SELECT attributes FROM tc_users WHERE administrator = 1 AND attributes LIKE %s LIMIT 1\", (\"%fin_fila_intervalo%\",))
            row = cur.fetchone()
        if not row:
            return 10
        v = get_attr(row[\"attributes\"], \"fin_fila_intervalo\") or \"10s\"
        import re
        m = re.match(r\"^(\d+)([smh])$\", v)
        if not m:
            return 10
        n = int(m.group(1))
        u = m.group(2)
        return n if u == \"s\" else (n * 60 if u == \"m\" else n * 3600)
    finally:
        conn.close()

def get_credenciais():
    conn = conectar()
    with conn.cursor() as cur:
        cur.execute("SELECT attributes FROM tc_users WHERE administrator = 1 AND attributes LIKE %s LIMIT 1", ("%fin_evo_url%",))
        row = cur.fetchone()
    conn.close()
    if not row:
        return None
    attrs = row["attributes"]
    return {
        "url": get_attr(attrs, "fin_evo_url"),
        "key": get_attr(attrs, "fin_evo_key"),
        "instance": get_attr(attrs, "fin_evo_instance"),
        "recibo": get_attr(attrs, "fin_msg_recibo"),
        "lembrete": get_attr(attrs, "fin_msg_lembrete"),
        "vencimento": get_attr(attrs, "fin_msg_vencimento"),
        "atraso": get_attr(attrs, "fin_msg_atraso"),
    }

def enviar_whatsapp(url, key, instance, numero, texto):
    body = json.dumps({"number": numero, "text": texto}).encode("utf-8")
    req = urllib.request.Request(
        url.rstrip("/") + "/message/sendText/" + instance,
        data=body,
        headers={"apikey": key, "Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.status == 200

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

const [vencimentoTexto, setVencimentoTexto] = useState(userAttributes.fin_msg_vencimento || 'Olá *{nome}*!' + String.fromCharCode(10) + String.fromCharCode(10) + 'Sua mensalidade está disponível para pagamento.' + String.fromCharCode(10) + String.fromCharCode(10) + '🗓 Vencimento: {vencimento}' + String.fromCharCode(10) + '💰 Valor: R$ {valor}' + String.fromCharCode(10) + String.fromCharCode(10) + 'PIX Copia e Cola:' + String.fromCharCode(10) + '{pix_copia_cola}' + String.fromCharCode(10) + String.fromCharCode(10) + 'Após o vencimento será cobrado juros.' + String.fromCharCode(10) + String.fromCharCode(10) + '_O pagamento é confirmado automaticamente._');

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
