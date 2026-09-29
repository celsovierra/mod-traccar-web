#!/usr/bin/env python3
import json
import base64
import uuid
import secrets
import urllib.request
import urllib.parse
from datetime import datetime, timedelta
from flask import Flask, request, jsonify
try:
    import pymysql
except ImportError:
    print("pymysql nao instalado")
    raise

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

app = Flask(__name__)

def conectar():
    return pymysql.connect(**DB)

def get_admin_attrs():
    conn = conectar()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT attributes FROM tc_users WHERE id = 1000 LIMIT 1")
            row = cur.fetchone()
        if not row or not row["attributes"]:
            return {}
        return json.loads(row["attributes"])
    finally:
        conn.close()

def drive_access_token(attrs):
    url = "https://oauth2.googleapis.com/token"
    data = urllib.parse.urlencode({
        "client_id": attrs.get("fin_gd_client_id", ""),
        "client_secret": attrs.get("fin_gd_client_secret", ""),
        "refresh_token": attrs.get("fin_gd_refresh_token", ""),
        "grant_type": "refresh_token",
    }).encode()
    req = urllib.request.Request(url, data=data, method="POST")
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read())

def find_or_create_folder(token, name, parent_id):
    q = f"name='{name}' and '{parent_id}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false"
    url = "https://www.googleapis.com/drive/v3/files?q=" + urllib.parse.quote(q) + "&fields=files(id,name)"
    req = urllib.request.Request(url, headers={"Authorization": "Bearer " + token})
    with urllib.request.urlopen(req, timeout=30) as r:
        d = json.loads(r.read())
    if d.get("files"):
        return d["files"][0]["id"]
    body = json.dumps({"name": name, "mimeType": "application/vnd.google-apps.folder", "parents": [parent_id]}).encode()
    req = urllib.request.Request("https://www.googleapis.com/drive/v3/files", data=body,
        headers={"Authorization": "Bearer " + token, "Content-Type": "application/json"}, method="POST")
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read()).get("id")

def upload_pdf_to_drive(token, folder_id, file_name, pdf_base64):
    comma = pdf_base64.find("base64,")
    if comma >= 0:
        pdf_base64 = pdf_base64[comma + 7:]
    binary = base64.b64decode(pdf_base64)
    boundary = "contract_pdf_" + str(int(datetime.now().timestamp()))
    metadata = json.dumps({"name": file_name, "parents": [folder_id]})
    body = (
        ("--" + boundary + "\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n" + metadata + "\r\n"
         + "--" + boundary + "\r\nContent-Type: application/pdf\r\n\r\n").encode()
        + binary
        + ("\r\n--" + boundary + "--").encode()
    )
    url = "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink"
    req = urllib.request.Request(url, data=body,
        headers={"Authorization": "Bearer " + token, "Content-Type": "multipart/related; boundary=" + boundary}, method="POST")
    with urllib.request.urlopen(req, timeout=60) as r:
        data = json.loads(r.read())
    perm_body = json.dumps({"role": "reader", "type": "anyone"}).encode()
    perm_req = urllib.request.Request("https://www.googleapis.com/drive/v3/files/" + data["id"] + "/permissions",
        data=perm_body, headers={"Authorization": "Bearer " + token, "Content-Type": "application/json"}, method="POST")
    try:
        urllib.request.urlopen(perm_req, timeout=30).read()
    except Exception:
        pass
    return {"fileId": data["id"], "fileUrl": data.get("webViewLink", "")}

def upload_to_drive(name, pdf_base64):
    attrs = get_admin_attrs()
    if not attrs.get("fin_gd_client_id") or not attrs.get("fin_gd_refresh_token") or not attrs.get("fin_gd_folder_id"):
        raise Exception("Google Drive nao configurado")
    token_data = drive_access_token(attrs)
    token = token_data.get("access_token")
    if not token:
        raise Exception("Google recusou credenciais: " + str(token_data.get("error_description", "erro")))
    root_id = attrs["fin_gd_folder_id"]
    contratos_id = find_or_create_folder(token, "contratos", root_id)
    safe = "".join(c for c in name if c.isalnum() or c in " -_").replace(" ", "_")
    date_str = datetime.now().strftime("%Y-%m-%d")
    file_name = "Contrato_" + safe + "_" + date_str + ".pdf"
    return upload_pdf_to_drive(token, contratos_id, file_name, pdf_base64)

@app.route("/templates", methods=["GET"])
def list_templates():
    conn = conectar()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM contract_templates ORDER BY created_at DESC")
            rows = cur.fetchall()
        for r in rows:
            if r.get("created_at"): r["created_at"] = str(r["created_at"])
            if r.get("updated_at"): r["updated_at"] = str(r["updated_at"])
        return jsonify({"success": True, "data": rows})
    finally:
        conn.close()

@app.route("/templates", methods=["POST"])
def create_template():
    d = request.get_json() or {}
    if not d.get("name") or not d.get("content"):
        return jsonify({"success": False, "error": "Nome e conteudo obrigatorios"}), 400
    tid = str(uuid.uuid4())
    is_def = 1 if d.get("is_default") else 0
    conn = conectar()
    try:
        with conn.cursor() as cur:
            if is_def:
                cur.execute("UPDATE contract_templates SET is_default = 0")
            cur.execute("INSERT INTO contract_templates (id, name, content, is_default) VALUES (%s,%s,%s,%s)",
                (tid, d["name"], d["content"], is_def))
        conn.commit()
        return jsonify({"success": True, "data": {"id": tid}})
    finally:
        conn.close()

@app.route("/templates/<tid>", methods=["PUT"])
def update_template(tid):
    d = request.get_json() or {}
    conn = conectar()
    try:
        with conn.cursor() as cur:
            if d.get("is_default"):
                cur.execute("UPDATE contract_templates SET is_default = 0")
            cur.execute("UPDATE contract_templates SET name = %s, content = %s, is_default = %s WHERE id = %s",
                (d.get("name"), d.get("content"), 1 if d.get("is_default") else 0, tid))
        conn.commit()
        return jsonify({"success": True})
    finally:
        conn.close()

@app.route("/templates/<tid>", methods=["DELETE"])
def delete_template(tid):
    conn = conectar()
    try:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM contract_templates WHERE id = %s", (tid,))
        conn.commit()
        return jsonify({"success": True})
    finally:
        conn.close()

@app.route("/invites", methods=["GET"])
def list_invites():
    conn = conectar()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM contract_invites ORDER BY created_at DESC LIMIT 500")
            rows = cur.fetchall()
        for r in rows:
            for k in ("created_at","signed_at","expires_at"):
                if r.get(k): r[k] = str(r[k])
        return jsonify({"success": True, "data": rows})
    finally:
        conn.close()

@app.route("/invites", methods=["POST"])
def create_invite():
    d = request.get_json() or {}
    iid = str(uuid.uuid4())
    token = secrets.token_urlsafe(24)[:32]
    expires = datetime.now() + timedelta(days=int(d.get("expires_days", 7)))
    status_in = d.get("status") or "pending"
    if status_in not in ("pending", "signed"):
        status_in = "pending"
    signed_at = None
    if status_in == "signed":
        signed_at = datetime.now()
    conn = conectar()
    try:
        with conn.cursor() as cur:
            cur.execute("INSERT INTO contract_invites (id, template_id, token, status, client_name, client_user_id, client_data, expires_at, signed_at) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)",
                (iid, d.get("template_id"), token, status_in, d.get("client_name"),
                 d.get("client_user_id"), json.dumps(d.get("client_data") or {}), expires, signed_at))
        conn.commit()
        return jsonify({"success": True, "token": token, "invite_id": iid})
    finally:
        conn.close()

@app.route("/invites/<iid>", methods=["PUT"])
def update_invite(iid):
    d = request.get_json() or {}
    sets, params = [], []
    for k in ("client_name","status"):
        if k in d: sets.append(k + " = %s"); params.append(d[k])
    if "client_data" in d: sets.append("client_data = %s"); params.append(json.dumps(d["client_data"]))
    if not sets: return jsonify({"success": True})
    params.append(iid)
    conn = conectar()
    try:
        with conn.cursor() as cur:
            cur.execute("UPDATE contract_invites SET " + ", ".join(sets) + " WHERE id = %s", params)
        conn.commit()
        return jsonify({"success": True})
    finally:
        conn.close()

@app.route("/invites/<iid>", methods=["DELETE"])
def delete_invite(iid):
    conn = conectar()
    try:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM contract_invites WHERE id = %s", (iid,))
        conn.commit()
        return jsonify({"success": True})
    finally:
        conn.close()

@app.route("/invites/by-token/<token>", methods=["GET"])
def invite_by_token(token):
    conn = conectar()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT ci.*, ct.content AS template_content, ct.name AS template_name FROM contract_invites ci LEFT JOIN contract_templates ct ON ci.template_id = ct.id WHERE ci.token = %s LIMIT 1", (token,))
            row = cur.fetchone()
        if not row: return jsonify({"success": False, "error": "Convite nao encontrado"}), 404
        for k in ("created_at","signed_at","expires_at"):
            if row.get(k): row[k] = str(row[k])
        row["template"] = {"content": row.pop("template_content", None), "name": row.pop("template_name", None)}
        return jsonify({"success": True, "data": row})
    finally:
        conn.close()

@app.route("/sign", methods=["POST"])
def sign_contract():
    d = request.get_json() or {}
    token = d.get("token")
    name = d.get("name")
    whatsapp = d.get("whatsapp")
    pdf_base64 = d.get("pdfBase64")
    if not token or not name or not whatsapp or not pdf_base64:
        return jsonify({"success": False, "error": "Campos obrigatorios faltando"}), 400
    conn = conectar()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM contract_invites WHERE token = %s LIMIT 1", (token,))
            invite = cur.fetchone()
        if not invite:
            return jsonify({"success": False, "error": "Convite nao encontrado"}), 404
        if invite["status"] == "signed":
            return jsonify({"success": False, "error": "Contrato ja assinado"}), 400
        try:
            uploaded = upload_to_drive(name, pdf_base64)
        except Exception as e:
            return jsonify({"success": False, "error": str(e)}), 503
        with conn.cursor() as cur:
            cur.execute("UPDATE contract_invites SET status = %s, signed_at = NOW(), client_name = COALESCE(client_name, %s), google_drive_file_id = %s, google_drive_file_url = %s WHERE token = %s",
                ("signed", name, uploaded["fileId"], uploaded["fileUrl"], token))
        conn.commit()
        return jsonify({"success": True, "driveFileUrl": uploaded["fileUrl"], "driveFileId": uploaded["fileId"]})
    finally:
        conn.close()

@app.route("/google-drive-status", methods=["GET"])
def drive_status():
    try:
        attrs = get_admin_attrs()
        if not attrs.get("fin_gd_client_id") or not attrs.get("fin_gd_refresh_token") or not attrs.get("fin_gd_folder_id"):
            return jsonify({"success": True, "connected": False, "message": "Google Drive nao configurado"})
        td = drive_access_token(attrs)
        if not td.get("access_token"):
            return jsonify({"success": True, "connected": False, "message": "Credenciais recusadas: " + str(td.get("error_description", ""))})
        return jsonify({"success": True, "connected": True})
    except Exception as e:
        return jsonify({"success": True, "connected": False, "message": str(e)})

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=8093)
