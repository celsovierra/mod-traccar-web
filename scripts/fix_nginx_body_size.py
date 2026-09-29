#!/usr/bin/env python3
import glob
import re

alterados = 0
for conf in set(glob.glob("/etc/nginx/sites-available/*") + glob.glob("/etc/nginx/sites-enabled/*")):
    try:
        with open(conf) as f:
            c = f.read()
    except Exception:
        continue
    if "proxy_pass http://127.0.0.1:8082" not in c and "server_name" not in c:
        continue
    if "client_max_body_size" in c:
        continue
    c2 = re.sub(r"(server\s*\{)", r"\1\n    client_max_body_size 50M;", c, count=1)
    if c2 != c:
        with open(conf, "w") as f:
            f.write(c2)
        alterados += 1
        print("Atualizado:", conf)
print("Total alterados:", alterados)