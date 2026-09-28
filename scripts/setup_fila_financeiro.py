#!/usr/bin/env python3
import json
import sys
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

def get_admin(conn):
    with conn.cursor() as cur:
        cur.execute("SELECT id, attributes FROM tc_users WHERE administrator = 1 LIMIT 1")
        row = cur.fetchone()
    return row

def garantir_admin(conn):
    with conn.cursor() as cur:
        cur.execute("UPDATE tc_users SET administrator = 1 WHERE id = 1000 AND (administrator IS NULL OR administrator = 0)")
    conn.commit()

TEXTOS_ANTIGOS = {
    "fin_msg_atraso": [
        "Olá *{nome}*!\n\nSua mensalidade está em atraso.\n🗓 Vencimento:{vencimento}\n💰 Valor: R$ {valor}\n\nApós o vencimento será cobrado juros.\n\n_O pagamento é confirmado automaticamente._",
        "Olá *{nome}*!\n\nSua mensalidade está em atraso.\n🗓 Vencimento: {vencimento}\n💰 Valor: R$ {valor}\n\nApós o vencimento será cobrado juros.\n\n_O pagamento é confirmado automaticamente._",
    ],
}

def merge_attrs(attrs, novos):
    try:
        d = json.loads(attrs) if attrs else {}
    except Exception:
        d = {}
    for k, v in novos.items():
        atual = d.get(k)
        if not atual:
            d[k] = v
            continue
        if k in TEXTOS_ANTIGOS and atual in TEXTOS_ANTIGOS[k]:
            d[k] = v
    return json.dumps(d, ensure_ascii=False)

TEMPLATES = {
    "fin_msg_lembrete": "Olá *{nome}*!\n\nSua mensalidade vence em breve.\n🗓 Vencimento: {vencimento}\n💰 Valor: R$ {valor}\n\nQualquer dúvida, estamos à disposição.",
    "fin_msg_vencimento": "Olá *{nome}*!\n\nSua mensalidade vence hoje.\n🗓 Vencimento: {vencimento}\n💰 Valor: R$ {valor}\n\nApós o vencimento será cobrado juros.",
    "fin_msg_atraso": "Olá *{nome}*!\n\nIdentificamos que sua mensalidade está em atraso.\n\n📅 *Vencimento original:* {vencimento}\n💵 *Valor mensal:* R$ {valor}\n📊 *Multa:* {multa}\n📈 *Juros:* {juros}\n💰 *Total a pagar: {valor_atualizado}*\n\nRegularize agora pelo PIX:\n\n{pix_copia_cola}\n\n_Evite o bloqueio dos serviços._",
    "fin_msg_recibo": "✅ *Pagamento Confirmado!* ✅\n\nRECIBO DE PAGAMENTO\n=======================\nCliente : {nome}\nServiço : Rastreamento\nPeríodo : {vencimento}\nValor   : R$ {valor}\nMulta   : {multa}\nJuros   : {juros}\nDesconto: {desconto}\n\nValor Total : {valor_atualizado}\n=======================\nPago em : {data_hoje}\nStatus  : ✅PAGO✅\nPróx Venc: {prox_vencimento}\n=======================",
    "fin_multa_valor": "1",
    "fin_juros_valor": "0,10",
    "fin_msg_atraso_dias": "1",

}

def setup():
    conn = conectar()
    garantir_admin(conn)
    admin = get_admin(conn)
    if not admin:
        print("   [FILA] Nenhum admin encontrado.")
        conn.close()
        return
    novo = merge_attrs(admin["attributes"], TEMPLATES)
    with conn.cursor() as cur:
        cur.execute("UPDATE tc_users SET attributes = %s WHERE id = %s", (novo, admin["id"]))
    conn.commit()
    conn.close()
    print("   [FILA] Templates garantidos no admin id=%s." % admin["id"])

if __name__ == "__main__":
    setup()
