# Controle de Folgas — COPOM Civil

PWA responsivo para Android e iOS, construído em HTML, CSS e JavaScript puros.

## Regra da escala

- A data escolhida é uma **folga unitária**.
- Contando os dias seguintes em dias corridos, o **5º e o 6º dias** são marcados como **folga dupla**.
- Seis dias após a segunda folga, ocorre nova **folga unitária**.
- O ciclo se repete a cada 12 dias: posição 0 = unitária; posições 5 e 6 = dupla.

## Persistência

A data-base é salva no `localStorage` com a chave `copomCivilFolgaConfig:v1`. Recarregar, fechar o navegador ou reiniciar o celular não apaga a configuração. Ela só é removida pelo botão **RESET**.

## Feriados

O calendário inclui os feriados nacionais recorrentes, a Paixão de Cristo calculada pela data da Páscoa e o feriado estadual paulista de 9 de julho. Carnaval, Quarta-feira de Cinzas e Corpus Christi aparecem identificados como pontos facultativos.

## Como executar localmente

O PWA deve ser servido por HTTP/HTTPS; abrir o arquivo diretamente (`file://`) não ativa o Service Worker.

Exemplo com Python:

```bash
python -m http.server 8080
```

Depois acesse `http://localhost:8080`.

## Instalação

- Android/Chrome: toque no raio amarelo e confirme a instalação.
- iPhone/iPad/Safari: toque no raio, depois use **Compartilhar > Adicionar à Tela de Início**.

## Publicação

Envie todos os arquivos desta pasta para uma hospedagem HTTPS, preservando a estrutura de diretórios.
