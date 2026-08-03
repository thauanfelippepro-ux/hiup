# PRODUTORAHIUP® — Site institucional

Landing page da PRODUTORAHIUP®, produtora audiovisual. Página única, com narrativa
conduzida por scroll: seções fixadas (pinning), revelações sincronizadas ao
rolamento, carrosséis e um fundo 3D interativo.

**No ar:** https://www.produtorahiup.com
**Desenvolvimento:** Thauan Felippe

---

## Stack

| Camada | Escolha |
| --- | --- |
| Build | Vite 8 |
| Animação | GSAP 3.15 — ScrollTrigger, SplitText, matchMedia |
| Carrosséis | Swiper 14 |
| 3D | Spline (`@splinetool/viewer`), carregado sob demanda |
| Tipografia | Host Grotesk, hospedada no próprio domínio |
| Hospedagem | Vercel (deploy automático a cada push) |

Sem framework de UI: HTML, CSS e JavaScript modernos. Menos camadas entre o
código e o navegador significa menos peso para o visitante carregar.

---

## Rodando localmente

Requer Node.js 18 ou superior.

```bash
npm install
```

```bash
npm run dev
```

O site sobe em `http://localhost:5173`.

Outros comandos:

```bash
npm run build
```

```bash
npm run preview
```

```bash
npm run images
```

`npm run images` regenera as versões otimizadas das imagens a partir dos
originais em `assets-src/`. Só precisa rodar quando uma imagem de origem mudar.

---

## Estrutura

```
hiup-site/
├─ index.html              Marcação completa da página
├─ src/
│  ├─ main.js              Pins, carrosséis, modal, FAQ, carregamento do 3D
│  ├─ style.css            Estilos e tipografia
│  └─ motion/
│     ├─ config.js         Durações, easings e distâncias padronizadas
│     ├─ presets.js        Presets de animação reutilizáveis
│     └─ scan.js           Lê os atributos data-* e monta as animações
├─ assets-src/             Imagens originais (não vão para o site publicado)
├─ public/
│  ├─ assets/              Imagens otimizadas, ícones e SVGs
│  └─ fonts/               Host Grotesk (.woff2)
└─ scripts/
   └─ optimize-images.mjs  Pipeline de otimização de imagens
```

### Como as animações são declaradas

As revelações são escritas direto no HTML, por atributo — não há JavaScript
específico por seção:

```html
<p data-animate="fade-up">Texto que sobe ao entrar na tela</p>
<div data-stagger="0.08" data-animate="scale-in">…</div>
<h2 data-text-fx="line-wipe">…</h2>
```

`src/motion/scan.js` varre a página, encontra esses atributos e constrói as
animações correspondentes. Adicionar uma revelação nova é escrever um atributo,
não escrever código.

---

## Performance

O site passou por uma otimização completa. Medições feitas no Chrome DevTools,
simulando um celular em rede 4G lenta com processamento 4× mais lento —
o cenário desfavorável, não o ideal.

| Métrica | Antes | Depois |
| --- | --- | --- |
| Dados baixados na primeira visita | 15.516 KB | **601 KB** |
| Requisições | 32 | 24 |
| JavaScript inicial | 2.486 KB | **216 KB** |
| Página pronta para uso | 24,0 s | **2,6 s** |
| Carregamento completo | 89,8 s | **3,0 s** |
| Deslocamento de layout (CLS) | 0,00 | 0,00 |

**O que mudou, em resumo:**

- O motor 3D (2,2 MB) deixou de ser baixado no início e passa a carregar apenas
  quando o visitante se aproxima da seção que o usa.
- Todas as imagens foram convertidas para WebP e redimensionadas para o tamanho
  em que realmente aparecem — 79% mais leves, sem mudança visual.
- Imagens abaixo da dobra só carregam ao se aproximarem da tela, e todas têm
  dimensões declaradas, o que impede o layout de "pular" durante o carregamento.
- Efeitos visuais custosos deixam de ser processados quando estão fora da tela.
- As fontes saíram do Google Fonts e passaram a ser servidas pelo próprio
  domínio, eliminando conexões a servidores de terceiros.

Nenhuma animação, seção, texto ou elemento visual foi alterado nesse processo.

---

## Acessibilidade

- Indicadores de foco visíveis em toda a navegação por teclado (e apenas por
  teclado — a aparência com mouse permanece intacta).
- Listas e controles interativos operáveis por teclado, com `Enter` e `Espaço`.
- Modal com foco preso dentro do diálogo e devolvido ao ponto de origem ao
  fechar.
- `prefers-reduced-motion` respeitado: quem configurou o sistema para reduzir
  animações recebe uma versão sem movimento.

---

## SEO

`title`, `description`, `canonical`, Open Graph e Twitter Cards configurados,
com imagem de compartilhamento em 1200×630. `robots.txt` e `sitemap.xml`
publicados.

---

## Publicação

O deploy é automático: todo push para a branch principal publica a versão nova
na Vercel. Os cabeçalhos de cache estão definidos em `vercel.json` — arquivos com
hash no nome ficam em cache permanente, imagens revalidam em segundo plano.

---

© PRODUTORAHIUP®. Desenvolvido por Thauan Felippe.
