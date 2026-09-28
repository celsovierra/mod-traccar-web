#!/usr/bin/env python3
from flask import Flask, jsonify
import subprocess
import pymysql
import json

app = Flask(__name__)

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

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=8092)
