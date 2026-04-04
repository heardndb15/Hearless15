import urllib.request
import json

try:
    req1 = urllib.request.Request("http://127.0.0.1:8000/api/register", data=json.dumps({"username":"test2", "password":"123"}).encode(), headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req1) as f:
        print("Register:", f.read().decode())
except Exception as e:
    print("Register Error:", e)
    if hasattr(e, 'read'): print(e.read().decode())
    
try:
    req2 = urllib.request.Request("http://127.0.0.1:8000/api/login", data=json.dumps({"username":"test2", "password":"123"}).encode(), headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req2) as f:
        print("Login:", f.read().decode())
except Exception as e:
    print("Login Error:", e)
    if hasattr(e, 'read'): print(e.read().decode())
