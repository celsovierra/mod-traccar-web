#!/usr/bin/env python3
import sys
import json
import time
import datetime
import secrets
import urllib.request
try:
    import pymysql
except ImportError:
    print("pymysql nao instalado")
    sys.exit(1)

def ler_traccar_xml():
    path = "/opt/traccar/conf/traccar.xml"
    try:
        with open(path, "r") as f:
            content = f.read()
    except Exception:
        return ("traccar_user", "Traccar@2026#Sec", "traccar")
    import re
    u = re.search(r"database\.user[^>]*>\s*([^<\s]+)", content)
    p = re.search(r"database\.password[^>]*>\s*([^<\s]+)", content)
    d = re.search(r"database\.name[^>]*>\s*([^<\s]+)", content)
    return (
        u.group(1) if u else "traccar_user",
        p.group(1) if p else "Traccar@2026#Sec",
        d.group(1) if d else "traccar",
    )

_db_user, _db_pass, _db_name = ler_traccar_xml()

DB = {
    "host": "127.0.0.1",
    "user": _db_user,
    "password": _db_pass,
    "database": _db_name,
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
            if get_attr(attrs, "fin_nao_cobrar") == "true":
                continue
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
            elif diff > 0 and diff <= dias_antes:
                tipo = "Lembrete"
            elif diff < 0:
                atraso_dias_cfg = int(get_attr(attrs, "fin_msg_atraso_dias") or "1")
                if atraso_dias_cfg < 1:
                    atraso_dias_cfg = 1
                if abs(diff) % atraso_dias_cfg == 0:
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

def get_admin_attrs():
    conn = conectar()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT attributes FROM tc_users WHERE administrator = 1 LIMIT 1")
            row = cur.fetchone()
        if not row or not row["attributes"]:
            return {}
        return json.loads(row["attributes"])
    except Exception:
        return {}
    finally:
        conn.close()
def fmt_moeda(v):
    return ("%.2f" % float(v)).replace(".", ",")

def calcular_valores(item):
    valor_str = (item.get("valor") or "0").replace(",", ".")
    try:
        valor = float(valor_str)
    except Exception:
        valor = 0.0
    multa = 0.0
    juros = 0.0
    if item.get("tipo") == "Atraso":
        attrs = get_admin_attrs()
        ativo = str(attrs.get("fin_multa_ativo") or "true").lower()
        if ativo == "true":
            try:
                multa = float((attrs.get("fin_multa_valor") or "0").replace(",", "."))
            except Exception:
                multa = 0.0
            try:
                juros_dia = float((attrs.get("fin_juros_valor") or "0").replace(",", "."))
            except Exception:
                juros_dia = 0.0
            dias = int(item.get("dias_atraso") or 0)
            juros = juros_dia * dias
    total = valor + multa + juros
    return valor, multa, juros, total

def montar_texto(texto, item):
    venc_str = item["vencimento"].strftime("%d/%m/%Y") if item["vencimento"] else ""
    hoje_str = hoje().strftime("%d/%m/%Y")
    valor, multa, juros, total = calcular_valores(item)
    t = texto or ""
    t = t.replace("{nome}", item["nome"] or "")
    t = t.replace("{vencimento}", venc_str)
    t = t.replace("{prox_vencimento}", venc_str)
    t = t.replace("{valor}", fmt_moeda(valor))
    t = t.replace("{valor_atualizado}", fmt_moeda(total))
    t = t.replace("{data_hoje}", hoje_str)
    t = t.replace("{multa}", fmt_moeda(multa))
    t = t.replace("{juros}", fmt_moeda(juros))
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

def criar_pix_mercadopago(attrs, item, valor_total):
    """Cria um PIX no Mercado Pago e retorna (pix_copia_cola, link_pagamento, payment_id)."""
    token = attrs.get("fin_gw_token") or ""
    if not token:
        return None, None, None
    try:
        valor = float(str(valor_total).replace(",", "."))
    except Exception:
        valor = 0.0
    if valor <= 0:
        return None, None, None
    descricao = "Mensalidade Rastreamento - %s" % (item.get("nome") or "")
    body = {
        "transaction_amount": round(valor, 2),
        "description": descricao,
        "payment_method_id": "pix",
        "payer": {
            "email": "cliente@%s.com" % (item.get("user_id") or "x"),
            "first_name": item.get("nome") or "Cliente",
        },
    }
    data = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(
        "https://api.mercadopago.com/v1/payments",
        data=data,
        headers={
            "Authorization": "Bearer " + token,
            "Content-Type": "application/json",
            "X-Idempotency-Key": "fila-%s-%s" % (item.get("id"), int(time.time())),
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            resp = json.loads(r.read().decode())
    except Exception as e:
        print("   [PIX] Erro ao criar pagamento:", e)
        return None, None, None
    payment_id = resp.get("id")
    point = resp.get("point_of_interaction", {}).get("transaction_data", {})
    qr_code = point.get("qr_code") or ""
    ticket_url = point.get("ticket_url") or ""
    return qr_code, ticket_url, payment_id
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
            # Gera PIX no Mercado Pago se configurado
            attrs_admin = get_admin_attrs()
            gw_ativo = attrs_admin.get("fin_gw_ativo") or ""
            pix_copia = ""
            link_pag = ""
            payment_id = None
            if gw_ativo == "mercadopago" and attrs_admin.get("fin_gw_token"):
                valor_total_calc = calcular_valores(item)[3]
                pix_copia, link_pag, payment_id = criar_pix_mercadopago(attrs_admin, item, valor_total_calc)
                if payment_id:
                    import secrets
                    token_pag = secrets.token_urlsafe(24)[:32]
                    cur.execute("UPDATE tc_fila_financeiro SET pix_id=%s, token_pag=%s WHERE id=%s", (str(payment_id), token_pag, item["id"]))
                    conn.commit()
                    dominio = attrs_admin.get("fin_dominio") or "https://gpscell.site"
                    link_pag = dominio.rstrip("/") + "/pagar/" + token_pag
            texto = montar_texto(tpl, item)
            texto = texto.replace("{pix_copia_cola}", pix_copia or "")
            texto = texto.replace("{link_pagamento}", link_pag or "")
            try:
                ok = enviar_whatsapp(cred["url"], cred["key"], cred["instance"], item["telefone"], texto)
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
