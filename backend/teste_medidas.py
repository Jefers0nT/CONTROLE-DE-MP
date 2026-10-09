import requests

# 1. Cadastrando a chapa
dados = {
    "produto": "CHAPA-001",
    "comprimento": 2000,  # 2 metros
    "largura": 1000,      # 1 metro
    "espessura": 5        # 5 milímetros
}

print("Cadastrando...")
resposta_post = requests.post('http://localhost:5000/api/produtos/medidas', json=dados)
print(resposta_post.json())

# 2. Testando o cálculo de peso (Rota que criamos anteriormente)
print("\nCalculando o peso...")
resposta_peso = requests.get('http://localhost:5000/api/produtos/CHAPA-001/peso')
print(resposta_peso.json())
