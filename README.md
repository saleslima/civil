# Controle de Folgas — COPOM Civil

PWA responsivo para Android e iOS.

## Funcionamento

1. Toque em **Definir folga unitária**.
2. Escolha a data no calendário aberto pelo sistema.
3. A escala é salva automaticamente no `localStorage` do navegador.
4. O calendário mensal passa a exibir as folgas em verde.
5. Use as setas ou deslize o calendário para navegar entre os meses.
6. Use o botão de sol/lua para alternar entre modo noturno e modo dia.
7. A configuração só é apagada ao tocar em **RESET** e confirmar.

## Regra da escala

- A data escolhida é a folga unitária.
- O 6º e o 7º dias seguintes são folgas duplas.
- No 5º dia após a segunda folga ocorre uma nova folga unitária.
- O ciclo se repete automaticamente.

## Instalação

Ao abrir a página fora do modo instalado, o botão **Instalar** fica visível durante os primeiros 10 segundos. Publique todos os arquivos em uma hospedagem HTTPS. Em Android, use a opção de instalar aplicativo do navegador. Em iPhone/iPad, abra no Safari, toque em Compartilhar e depois em Adicionar à Tela de Início.
