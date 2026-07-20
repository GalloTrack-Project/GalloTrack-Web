from app import create_app
app = create_app()
app.testing = True
client = app.test_client()
resp = client.get('/')
print(f'Status: {resp.status_code}')
print(f'Location: {dict(resp.headers).get("Location", "N/A")}')
resp2 = client.get('/auth/register')
print(f'Register status: {resp2.status_code}')
print(f'Register length: {len(resp2.data)} bytes')
