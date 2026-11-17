# Projeto: Flowise + API de Validação DSL com Z3

Este repositório reúne duas partes:

1. **Flowise**: orquestração dos agentes de IA.
2. **API de Validação DSL**: API REST em Python (Flask + Z3 Theorem Prover) que valida especificações escritas em uma DSL lógica contra exemplos de entrada e saída (`io_examples`).

---

## Sumário

- [Pré-requisitos](#pré-requisitos)
- [1. Flowise](#1-flowise)
- [2. API de Validação DSL com Z3](#2-api-de-validação-dsl-com-z3)
- [3. Descobrindo o IP do Linux](#3-descobrindo-o-ip-do-linux)

---

## Pré-requisitos

- [Docker](https://docs.docker.com/get-docker/)
- **Python 3.10+**
- **pip** e **python3-venv**

---

## 1. Flowise

### 1.1 Subir o container

```bash
docker run -d \
  --name flowise \
  -p 3000:3000 \
  -v flowise_data:/home/node/.flowise \
  flowiseai/flowise:3.0.13
```

Depois de iniciar, acesse: <http://localhost:3000>

### 1.2 Importar o fluxo

1. No Flowise, importe o arquivo `Fluxo_Projeto.json`, localizado na raiz do repositório.
2. Abra cada agente do fluxo e adicione as respectivas **chaves de API**.
3. Clique em **Salvar**.

> ⚠️ Não versione chaves de API no repositório. Configure-as apenas na interface do Flowise.

---

## 2. API de Validação DSL com Z3

### 2.1 Preparar o ambiente

Em ambientes Debian/Ubuntu recentes, instale o suporte a ambientes virtuais:

```bash
apt update && apt install -y python3-venv
```

Crie o ambiente virtual:

```bash
python3 -m venv venv
```

### 2.2 Instalar as dependências

```bash
source venv/bin/activate
pip install flask z3-solver
```


