# Conversor de Moedas

Para utilizar, acesse: https://cambiodemoedas.com ou clone o repositório seguindo as instruções do ponto n°4 deste README

## 🚀 Funcionalidades

- Conversão entre 11 moedas diferentes
- Seleção de data específica para a taxa de câmbio
- Exibição do valor convertido e da taxa de conversão

## 🛠️ Tecnologias utilizadas

- HTML5
- CSS3
- JavaScript (ES6+)
- [Vite](https://vitejs.dev/) - Build tool e servidor de desenvolvimento
- [GSAP](https://greensock.com/gsap/) - Biblioteca de animações
- [AOS](https://michalsnik.github.io/aos/) - Animate On Scroll
- API gratuita [ExchangeRate-API](https://exchangerate.host)

## 📋 Pré-requisitos

- Node.js (versão 14 ou superior)
- npm ou yarn

## 🔧 Instalação e execução

1. Clone o repositório
```bash
git clone [URL_DO_REPOSITORIO]
cd GetCotacoes
```

2. Instale as dependências
```bash
npm install
# ou
yarn
```

3. Inicie o servidor de desenvolvimento
```bash
npm run dev
# ou
yarn dev
```

4. Para build de produção
```bash
npm run build
# ou
yarn build
```

## 🌐 API utilizada

Esta aplicação utiliza a API gratuita [ExchangeRate-API](https://exchangerate.host) para obter taxas de câmbio históricas.

## 📝 Limitações

- A API gratuita utilizada pode ter restrições de uso
- Algumas datas históricas muito antigas podem não estar disponíveis
- A precisão das taxas de câmbio depende da API utilizada
