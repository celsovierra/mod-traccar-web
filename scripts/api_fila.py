#!/usr/bin/env python3
from flask import Flask, jsonify, request
import subprocess
import pymysql
import json
import urllib.request
import datetime
import calendar

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

@app.route("/fila", methods=["GET"])
def get_fila():
    try:
        conn = conectar()
        with conn.cursor() as cur:
            cur.execute("SELECT id, user_id, nome, telefone, tipo, valor, vencimento, dias_atraso, enviado_em, status, erro FROM tc_fila_financeiro ORDER BY id DESC")
            rows = cur.fetchall()
        conn.close()
        for r in rows:
            if r.get("vencimento"):
                r["vencimento"] = r["vencimento"].strftime("%Y-%m-%d")
            if r.get("enviado_em"):
                r["enviado_em"] = r["enviado_em"].strftime("%d/%m/%Y %H:%M")
        return jsonify(rows)
    except Exception as e:
        return jsonify({"erro": str(e)}), 500

@app.route("/popular", methods=["POST"])
def post_popular():
    subprocess.Popen(["python3", "/opt/traccar/scripts/fila_financeiro.py", "povoar"])
    return jsonify({"ok": True})

@app.route("/limpar", methods=["POST"])
def post_limpar():
    subprocess.Popen(["python3", "/opt/traccar/scripts/fila_financeiro.py", "limpar"])
    return jsonify({"ok": True})

@app.route("/processar", methods=["POST"])
def post_processar():
    subprocess.Popen(["python3", "/opt/traccar/scripts/fila_financeiro.py", "processar-forcar"])
    return jsonify({"ok": True})

@app.route("/pagamento/<token>", methods=["GET"])
def get_pagamento(token):
    try:
        conn = conectar()
        with conn.cursor() as cur:
            cur.execute("SELECT id, user_id, nome, telefone, tipo, valor, vencimento, dias_atraso, pix_id, status, pago_em FROM tc_fila_financeiro WHERE token_pag = %s LIMIT 1", (token,))
            row = cur.fetchone()
        conn.close()
        if not row:
            return jsonify({"success": False, "error": "Link invalido"}), 404
        if row.get("vencimento"):
            row["vencimento"] = str(row["vencimento"])
        if row.get("pago_em"):
            row["pago_em"] = str(row["pago_em"])
        valor_num = 0.0
        try:
            valor_num = float(str(row.get("valor") or "0").replace(",", "."))
        except Exception:
            valor_num = 0.0
        multa = 0.0
        juros = 0.0
        if row.get("tipo") == "Atraso":
            conn2 = conectar()
            with conn2.cursor() as cur2:
                cur2.execute("SELECT attributes FROM tc_users WHERE administrator = 1 LIMIT 1")
                r2 = cur2.fetchone()
            conn2.close()
            attrs = {}
            if r2 and r2.get("attributes"):
                try:
                    attrs = json.loads(r2["attributes"])
                except Exception:
                    attrs = {}
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
                dias = int(row.get("dias_atraso") or 0)
                juros = juros_dia * dias
        total = valor_num + multa + juros
        row["valor_num"] = valor_num
        row["multa"] = multa
        row["juros"] = juros
        row["total"] = total
        pix_copia = ""
        qr_base64 = ""
        if row.get("pix_id"):
            conn3 = conectar()
            with conn3.cursor() as cur3:
                cur3.execute("SELECT attributes FROM tc_users WHERE administrator = 1 LIMIT 1")
                r3 = cur3.fetchone()
            conn3.close()
            attrs3 = {}
            if r3 and r3.get("attributes"):
                try:
                    attrs3 = json.loads(r3["attributes"])
                except Exception:
                    attrs3 = {}
            tok = attrs3.get("fin_gw_token") or ""
            if tok:
                try:
                    req = urllib.request.Request("https://api.mercadopago.com/v1/payments/" + str(row["pix_id"]), headers={"Authorization": "Bearer " + tok})
                    with urllib.request.urlopen(req, timeout=15) as rr:
                        pd = json.loads(rr.read().decode())
                    point = pd.get("point_of_interaction", {}).get("transaction_data", {})
                    pix_copia = point.get("qr_code") or ""
                    qr_base64 = point.get("qr_code_base64") or ""
                except Exception:
                    pass
        row["pix_copia_cola"] = pix_copia
        row["qr_code_base64"] = qr_base64
        return jsonify({"success": True, "data": row})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/webhook/mercadopago", methods=["POST"])
def webhook_mercadopago():
    try:
        data = request.get_json(silent=True) or {}
        pid = None
        if data.get("data") and data["data"].get("id"):
            pid = str(data["data"]["id"])
        elif data.get("id"):
            pid = str(data["id"])
        if not pid:
            return jsonify({"ok": True})
        conn = conectar()
        attrs = {}
        with conn.cursor() as cur:
            cur.execute("SELECT attributes FROM tc_users WHERE administrator = 1 LIMIT 1")
            r = cur.fetchone()
        if r and r.get("attributes"):
            try:
                attrs = json.loads(r["attributes"])
            except Exception:
                attrs = {}
        tok = attrs.get("fin_gw_token") or ""
        if not tok:
            conn.close()
            return jsonify({"ok": True})
        req = urllib.request.Request("https://api.mercadopago.com/v1/payments/" + pid, headers={"Authorization": "Bearer " + tok})
        with urllib.request.urlopen(req, timeout=15) as rr:
            pd = json.loads(rr.read().decode())
        status = pd.get("status")
        if status != "approved":
            conn.close()
            return jsonify({"ok": True, "status": status})
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM tc_fila_financeiro WHERE pix_id = %s LIMIT 1", (pid,))
            item = cur.fetchone()
            if not item:
                conn.close()
                return jsonify({"ok": True})
            user_id = item["user_id"]
            cur.execute("SELECT attributes FROM tc_users WHERE id = %s LIMIT 1", (user_id,))
            urow = cur.fetchone()
            if urow and urow.get("attributes"):
                try:
                    uattrs = json.loads(urow["attributes"])
                except Exception:
                    uattrs = {}
                venc_atual = uattrs.get("fin_vencimento") or ""
                try:
                    dt = datetime.datetime.strptime(venc_atual[:10], "%Y-%m-%d")
                    novo_mes = dt.month + 1
                    novo_ano = dt.year
                    if novo_mes > 12:
                        novo_mes = 1
                        novo_ano += 1
                    import calendar
                    ultimo_dia = calendar.monthrange(novo_ano, novo_mes)[1]
                    novo_dia = min(dt.day, ultimo_dia)
                    novo_venc = "%04d-%02d-%02d" % (novo_ano, novo_mes, novo_dia)
                except Exception:
                    novo_venc = venc_atual
                uattrs["fin_vencimento"] = novo_venc
                cur.execute("UPDATE tc_users SET attributes = %s WHERE id = %s", (json.dumps(uattrs, ensure_ascii=False), user_id))
            cur.execute("UPDATE tc_fila_financeiro SET status='Pago', pago_em=NOW() WHERE id=%s", (item["id"],))
        conn.commit()
        conn.close()
        return jsonify({"ok": True, "pago": True})
    except Exception as e:
        return jsonify({"ok": True, "error": str(e)})

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=8092)
