#!/usr/bin/env python3
import http.server
import socketserver
import json
import urllib.parse
import os
from urllib.request import urlopen

PORT = 8000
GOOGLE_API_KEY = 'AIzaSyD5264kcW9Yzf4Okvm3Weat-fquYwnJ7Nw' # Remplacez par votre clé

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
