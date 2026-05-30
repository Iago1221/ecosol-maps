# Ecosol Maps

Aplicação de mapas interativos com [Leaflet](https://leafletjs.com/) para visualizar dados de EES por município.

## Estrutura

- `Tabela2008 (5).xls` — planilha fonte
- `data/maps/` — JSON gerados a partir das planilhas
- `data/maps-index.json` — índice de mapas disponíveis (usado pelo select)
- `scripts/` — conversão XLS → JSON e geocodificação
- `src/` — aplicação frontend (Vite + Leaflet)

## Setup

```bash
# Dependências Python (conversão de planilhas)
python3 -m venv .venv
.venv/bin/pip install xlrd

# Dependências Node
npm install

# Gerar JSON a partir da planilha e geocodificar municípios
npm run data:build
```

Os arquivos gerados ficam em `public/data/` (servidos estaticamente).

## Desenvolvimento

```bash
npm run dev
```

## Publicar no GitHub Pages

O deploy é automático via GitHub Actions ao fazer push na branch `main`.

### Primeira publicação

1. Crie um repositório no GitHub (ex.: `ecosol-maps`)
2. Na raiz do projeto:

```bash
git init
git add .
git commit -m "Publicar Ecosol Maps no GitHub Pages"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/ecosol-maps.git
git push -u origin main
```

3. No GitHub: **Settings → Pages → Build and deployment** → Source: **GitHub Actions**
4. Após o workflow concluir, o site ficará em:

`https://SEU_USUARIO.github.io/ecosol-maps/`

### Build local (simular produção)

```bash
VITE_BASE_PATH=/ecosol-maps/ npm run build
npm run preview
```

Substitua `ecosol-maps` pelo nome do seu repositório.

## Adicionar novo mapa

1. Coloque a planilha `.xls` na raiz do projeto
2. Execute: `python3 scripts/convert-xls-to-json.py "NovaTabela.xls" "2020" "Título do mapa" 2020`
3. Execute: `python3 scripts/geocode-municipios.py`
4. Adicione entrada em `data/maps-index.json`
5. Copie os JSON para `public/data/maps/`

## Geocodificação

As coordenadas são obtidas cruzando **nome + UF** com a base [municipios-brasileiros](https://github.com/kelvins/municipios-brasileiros) (referência IBGE).
