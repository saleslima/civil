# CivilOff PWA

PWA móvel para controle de folgas do COPOM Civil.

## Recursos

- Ciclo de folgas salvo no `localStorage`.
- Calendário mensal com meses anteriores e posteriores.
- Modos dia e noturno.
- Cor neon configurável após a definição da data-base.
- Modo 190 como padrão.
- Modo 193 com tema vermelho/amarelo, fogo por 5 segundos e extinção por água.
- 365 reflexões diárias inspiradas em pensadores, exibidas em faixa animada.
- Contador local acompanhado por ícone de três usuários.
- Funcionamento offline após o primeiro carregamento.
- Instalação como PWA em Android e iOS.

## Publicação

Publique todos os arquivos desta pasta em uma hospedagem HTTPS, mantendo a estrutura original.

> O contador de usuários desta versão é local ao aparelho. Uma contagem global exige banco de dados ou API no servidor.


## Persistência dos modos

As escolhas de tema claro/escuro e modo operacional 190/193 ficam salvas no navegador e são restauradas após recarregar ou reabrir o PWA.


- O botão Instalar permanece visível por 60 segundos ao abrir o app.

## Contador de dispositivos únicos com Firebase

Esta versão não usa contador online. Ela registra cada aparelho/navegador uma única vez no Firebase Realtime Database e exibe o total de dispositivos únicos que já abriram a página.

O navegador não permite capturar o MAC real do dispositivo. Por isso, o app cria um ID anônimo do tipo `device_xxxxx`, salva esse ID no `localStorage` do próprio aparelho e usa esse ID como chave no banco. Como a chave é única, o mesmo dispositivo/navegador não cria uma segunda entrada quando abre a página novamente.

Caminho usado no Realtime Database:

```text
deviceIds/civiloff/{deviceId}
```

A estrutura esperada é semelhante a:

```text
deviceIds
  civiloff
    device_abc123
      deviceKey: "device_abc123"
      firstSeenAt: ...
      lastSeenAt: ...
      userAgent: "..."
```

O caminho antigo `presence/civiloff/onlineUsers` pertence à versão anterior de usuários online. Ele pode ser apagado manualmente no Firebase Console depois de publicar esta versão.

Use o conteúdo de `database.rules.json` nas regras do Realtime Database.

## Escalas ATEND e SUPV (versão de teste)

- **ATEND:** mantém o ciclo anterior de 12 dias, com folga unitária e folga dupla, e preserva a data-base já armazenada.
- **SUPV:** selecione um **dia de trabalho** como data-base. A partir dele, há alternância contínua de trabalho/folga, sem limite de meses e também para datas anteriores à base.
- Cada aba mantém sua própria data-base no `localStorage`. O RESET apaga somente a aba selecionada.
- Para testar localmente, abra um terminal nesta pasta e execute `python -m http.server 8000`; acesse `http://localhost:8000` no navegador. O PWA pode usar arquivos armazenados offline; ao testar uma atualização já instalada, recarregue a página com internet para obter a nova versão.


## Atualização segura e contagem por usuário

- O contador mantém o mesmo caminho Firebase `deviceIds/civiloff` e o mesmo ID de dispositivo (`civilOffDeviceId:v2`); cada novo navegador/dispositivo registrado soma **1** ao total, seja na aba ATEND ou SUPV. Navegação e troca de abas **não** somam novamente.
- A aba usada por último fica no campo `scaleTab` do registro existente. Registros antigos continuam válidos; não é necessário excluir dados nem recriar o banco.
- As configurações e datas individuais continuam no `localStorage` com as chaves anteriores, incluindo `copomCivilFolgaConfig:v1`, `copomCivilSupvConfig:v1` e `copomCivilScaleTab:v1`.
- Não desinstale o PWA, apague dados do site nem altere o domínio se desejar preservar configurações dos navegadores existentes.
- Antes da publicação, exporte um backup JSON do Firebase. **Não substitua as regras atuais do Firebase automaticamente**, caso contenham permissões de outras funcionalidades.
- O contador é de **dispositivos/navegadores identificados**, não de pessoas autenticadas. Limpar dados locais ou usar outro navegador pode gerar novo registro.
