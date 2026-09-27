#!/usr/bin/env python3
from flask import Flask, jsonify
import subprocess
import pymysql
import json

app = Flask(__name__)

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
