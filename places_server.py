#!/usr/bin/env python3
import http.server
import socketserver
import json
import urllib.parse
import os
from urllib.request import urlopen

PORT = 8000

# Charger la clé API depuis les variables d'environnement
def load_api_key():
    try:
        with open('.env.local', 'r') as f:
            for line in f:
                if line.startswith('GOOGLE_API_KEY='):
                    return line.split('=', 1)[1].strip()
    except FileNotFoundError:
        print("Erreur: Fichier .env.local non trouvé")
        print("Créez le fichier .env.local avec votre clé API:")
        print("GOOGLE_API_KEY=votre_clé_api_ici")
        return None
    
    print("Erreur: GOOGLE_API_KEY non trouvé dans .env.local")
    return None

GOOGLE_API_KEY = load_api_key()

if not GOOGLE_API_KEY:
    print("Arrêt du serveur: clé API non configurée")
    exit(1)

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path.startswith('/places-search'):
            # Extraire la requête de recherche
            query = self.path.split('?query=')[1] if '?query=' in self.path else ''
            query = urllib.parse.unquote(query)
            
            # Faire la requête Places API
            try:
                url = f"https://maps.googleapis.com/maps/api/place/textsearch/json?query={urllib.parse.quote(query)}&key={GOOGLE_API_KEY}"
                response = urlopen(url)
                data = json.loads(response.read().decode())
                
                # Envoyer la réponse
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps(data).encode())
                
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode())
        elif self.path == '/' or self.path == '/index.html':
            # Servir index.html en injectant la clé API
            try:
                with open('index.html', 'r', encoding='utf-8') as f:
                    content = f.read()
                    # Injecter la clé API dans une variable JavaScript
                    content = content.replace(
                        '<!-- Search Service -->',
                        f'<script>window.GOOGLE_API_KEY = "{GOOGLE_API_KEY}";</script>\n    <!-- Search Service -->'
                    )
                
                self.send_response(200)
                self.send_header('Content-Type', 'text/html')
                self.end_headers()
                self.wfile.write(content.encode('utf-8'))
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'text/plain')
                self.end_headers()
                self.wfile.write(f'Erreur: {str(e)}'.encode())
        else:
            # Servir les fichiers statiques
            super().do_GET()

if __name__ == "__main__":
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    
    with socketserver.TCPServer(("", PORT), MyHTTPRequestHandler) as httpd:
        print(f"Serving at http://localhost:{PORT}")
        print("Appuyez sur Ctrl+C pour arrêter le serveur")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServeur arrêté")
            httpd.shutdown()
