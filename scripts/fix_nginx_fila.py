#!/usr/bin/env python3
import glob

PORTA = "8092"
BLOCO = """
    location /api-financeiro/ {
        proxy_pass http://127.0.0.1:8092/;
        proxy_set_header Host $host;
    }
"""

alterados = 0
for conf in set(glob.glob("/etc/nginx/sites-available/*") + glob.glob("/etc/nginx/sites-enabled/*")):
    try:
        with open(conf) as f:
            c = f.read()
    except Exception:
        continue
    if "proxy_pass http://127.0.0.1:8082" not in c:
        continue
    if "location /api-financeiro/" in c:
        continue
    if "    location / {" not in c:
        continue
    c = c.replace("    location / {", BLOCO + "\n    location / {", 1)
    with open(conf, "w") as f:
        f.write(c)
    alterados += 1
    print("Atualizado:", conf)
print("Total alterados:", alterados)
