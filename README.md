# Stater

O Stater mostra resultados exportados do Qualtrics Stats iQ de forma clara: gráficos, tabelas e um resumo de cada tab, organizados por marca.

**Abrir:** https://cookiept.github.io/stater/

## Como se usa
1. No Stats iQ, faz a análise da tab (Describe, Relate, Pivot Table, Regression ou Text iQ) e exporta para Excel. Cada tab tem os passos em "Como importar".
2. No Stater, abre a marca e a tab, e arrasta o Excel (ou carrega em "Escolher ficheiro").
3. A tab mostra o período e os filtros do Excel, os números principais, os gráficos, a tabela e o resumo.
4. "Exportar" gera PDF ou PowerPoint (com capa); cada gráfico tem também "Download" em PowerPoint.

No **Overview** ficam o NPS de cada marca e o objetivo ("Editar objetivos").

## Tipos de análise
| Tipo | Excel do Stats iQ | Tabs |
|---|---|---|
| NPS | Describe do NPS (0 a 10) | NPS |
| Causa Raiz | Relate de Group NPS com a Causa Raiz (resposta múltipla) | NPS por Causa Raiz |
| Causa Raiz por driver | Um Relate de Group NPS por driver, com a causa raiz desse driver | NPS por Causa Raiz (quando cada driver tem a sua causa raiz) |
| NPS por grupo | Relate do NPS com outra variável | Resultado, Segmento, NPS x CES, NPS x CSAT, Topics |
| NPS por Driver | Pivot Table (driver × área × Group NPS) ou um Relate por área | NPS por Driver |
| Text iQ | Relate do NPS com os tópicos (CHECKED / UNCHECKED) | Topic Hierarchy Level 1 e 2, Drivers e Subtopics (Text iQ) |
| CES | Describe do CES (1 a 7) | CES |
| CSAT | Um Relate de Group NPS por CSAT | Overview CSAT's |
| Regressão | Regression com os CSAT | Overview CSAT's |

Algumas tabs estão desativadas por agora (aparecem a cinzento no menu).

## Dados
Os Excel são lidos só no browser de quem os abre e ficam guardados nesse browser (localStorage). Nada é enviado para a internet. **Não ponhas ficheiros Excel neste repositório** (o `.gitignore` bloqueia-os).

## Estrutura do código
- `index.html`: página única.
- `css/app.css`: estilos, com os tokens do design system.
- `js/brands.js`: marcas, cores, fontes e tabs (cada tab diz o seu `tipo`).
- `js/analises.js`: lista dos tipos de análise (leitura do Excel + vista).
- `js/excel.js`: leitura do Excel, período, filtros e um parser por tipo.
- `js/stats.js`: contas do NPS (uma só regra).
- `js/views/`: uma vista por tipo de análise; `comum.js` tem os blocos partilhados (números, cartões, barras, tabelas, PowerPoint).
- `js/painel.js`, `js/overview.js`, `js/layout.js`, `js/store.js`, `js/app.js`: página da tab, Overview, menu, dados guardados e ações.
- `vendor/`: Apache ECharts 5.5.1 (gráficos) e PptxGenJS 4.0.1 (PowerPoint). SheetJS 0.20.3 vem de cdn.sheetjs.com.

Para juntar um tipo de análise novo: o parser em `excel.js`, a vista em `js/views/`, uma linha em `analises.js` e o `tipo` nas tabs de `brands.js`.

Sem passo de build: abre com qualquer servidor estático (ex.: `npx serve .`).

## Versão dos ficheiros (cache)
O GitHub Pages guarda os ficheiros em cache durante 10 minutos. Para que todos vejam logo a versão nova, cada publicação muda o número `?v=` nos `import` dos ficheiros `js/` e no `index.html`:

```bash
V=$(date +%Y%m%d-%H%M); sed -i -E "s#(from '\.{1,2}/[^']+\.js)(\?v=[^']*)?'#\1?v=$V'#" js/*.js js/views/*.js; sed -i -E "s#(css/app\.css|js/app\.js)(\?v=[^\"]*)?\"#\1?v=$V\"#g" index.html
```
