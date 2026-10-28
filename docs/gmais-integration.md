# Contrato da futura conexão GMAIS

O app está preparado para receber a configuração de cada frota do servidor de integração que o Luiz conectará. Não é necessário cadastrar ou embutir a lista de frotas consultada no GMAIS. Esta preparação não abre conexão com o GMAIS nem importa registros. Autenticação, permissões e fila continuam no fluxo existente.

## Ponto de entrada

O servidor entrega o catálogo na propriedade `fleets` da resposta autenticada de `diesel_session`, preservando os demais dados da sessão. Uma frota externa acrescenta o objeto opcional `gmais` abaixo. O app normaliza essa resposta antes de usá-la ou guardá-la no cache offline. O transporte atual pode ser mantido pelo servidor; nenhuma URL ou credencial do GMAIS precisa ser enviada ao navegador ou APK.

Exemplo fictício de uma frota, sem correspondência com o catálogo real:

```json
{
  "id": "EXAMPLE",
  "name": "VEÍCULO DE EXEMPLO",
  "type": "Outro",
  "active": true,
  "last_km": 120,
  "last_engine": 0,
  "last_elevator": 0,
  "gmais": {
    "version": 1,
    "companyCode": "ORG",
    "branchCode": "BRANCH",
    "fleetCode": "EXAMPLE",
    "modelCode": "MODEL",
    "meterUnit": "KM",
    "additionalMeter": "none",
    "tankCapacityConfirmed": false,
    "tankCapacityLiters": null
  }
}
```

Os nomes desse contrato são campos da API do aplicativo. Os nomes observados nas telas do GMAIS abaixo não são nomes físicos de colunas SQL confirmados. O Luiz poderá mapear uma API, view ou consulta autorizada para este contrato sem acoplar o app ao esquema físico.

## Campos a consultar e traduzir no servidor

| Informação | Referência observada na interface GMAIS | Contrato do app |
| --- | --- | --- |
| Empresa, filial, frota e modelo fabricante vinculado | EMPCOD, FROFILCOD, FROCOD, MODCOD | companyCode, branchCode, fleetCode, modelCode |
| Unidade do medidor principal do modelo | MODDIS, Hora/KM | meterUnit: `KM` ou `HR` |
| Controle adicional habilitado | MODODOADI, Hodômetro Adic? | additionalMeter: `none` ou `elevator`, depois de confirmar a finalidade |
| Capacidade real de combustível | Não confirmada nas telas examinadas | tankCapacityLiters e tankCapacityConfirmed |
| Leituras anteriores válidas | Consulta oficial do último evento, a definir | last_km, last_engine, last_elevator no formato existente |

Todos os identificadores do objeto `gmais` são strings não vazias com até 30 caracteres (letras sem acento, números, ponto, hífen ou sublinhado). `fleetCode` deve coincidir exatamente com `id`. O catálogo deve ser delimitado por empresa no servidor e conter IDs únicos; o app atual identifica QR Codes, históricos e pendências por `id`. Não misturar empresas com o mesmo código de frota ou alternar o contexto de empresa sobre filas existentes. Uma futura implementação multiempresa precisa definir identidade e migração próprias.

## Comportamento do formulário

- `meterUnit: KM` habilita KM e desabilita horímetro principal.
- `meterUnit: HR` habilita horímetro principal e desabilita KM, inclusive em caminhões ou equipamentos classificados como Outro.
- `additionalMeter: none` oculta elevador mesmo se a categoria local sugerir uma máquina com elevador.
- `additionalMeter: elevator` habilita o horímetro elevador porque o servidor confirmou essa finalidade, sem deduzir pela categoria ou nome. Não transformar automaticamente todo Hodômetro Adic? marcado em elevador: o controle pode ter outra finalidade ou estar cadastrado incorretamente. Quando não houver certeza, o servidor deve resolver a configuração antes de publicar essa frota no catálogo externo.
- Unidade ausente/desconhecida, adicional ambíguo, versão não suportada ou identificação inconsistente rejeitam a resposta com `GMAIS_CONFIGURATION_INVALID`; não há fallback para KM baseado no nome. A resposta anterior e as pendências não são apagadas.

O adaptador gera `meter_fields` usado pelo Android, administração, cálculo dos campos e `measuredFields` do lançamento. Esses mesmos campos são preservados no catálogo offline. Frotas locais sem `gmais` mantêm o comportamento atual. Nenhuma lista de modelos ou códigos reais é necessária no cliente.

## Tanques

`tankCapacityConfirmed` é obrigatório e booleano. Se `true`, `tankCapacityLiters` precisa ser um número JSON finito, maior que zero e até 100000. O adaptador o converte para `tank_capacity`, já usado pelo aviso de abastecimento acima da capacidade. Se `false`, a capacidade normalizada é `null`, mesmo se houver uma estimativa ou valor antigo no objeto: não há aviso baseado em uma capacidade desconhecida.

Cabe ao servidor escolher o valor final confirmado, incluindo eventual ajuste manual válido, e registrar a origem da confirmação. Não usar capacidade de carga em kg/m³, limite de troca de óleo, consumo padrão, maior abastecimento histórico ou estimativa do modelo como se fossem capacidade física do tanque de combustível.

## Leituras, servidor e registros pendentes

O adaptador não recalcula nem sobrescreve `last_km`, `last_engine` e `last_elevator`. O servidor deve fornecê-los a partir de eventos válidos, com tratamento de cancelamentos, correções e troca/remonta de medidores. Não usar o maior número como sinônimo de último evento. Leituras com origem simulada não são dados reais do GMAIS. O contrato de última leitura, sua versão e mudanças de medidor precisa ser definido na conexão antes de usá-las operacionalmente.

O servidor de integração deve validar a configuração consultada também ao receber abastecimentos: `measuredFields` do celular não é autoridade sobre a frota. Não confiar no cliente para autorizar medidores, capacidade, acesso à empresa ou cadastro de frota. Ao mudar a configuração enquanto houver registros offline, devolver conflito para conferência, preservando UUID e conteúdo do lançamento; não converter leituras silenciosamente.

**O backend atual ainda valida contra o cadastro local do app.** Para ativar o catálogo externo, o Luiz deverá adaptar a resolução de frotas e as validações dos endpoints de sessão, envio normal, envio nativo em segundo plano, QR e checklist para a mesma fonte autorizada. As chaves estrangeiras e o histórico atuais também precisam de uma estratégia no servidor; expor uma frota nova somente no JSON não a torna gravável nesses endpoints. A restrição SQL atual de elevador por categoria precisa ser revista se for confirmado um medidor desse tipo fora de Trator/Colhedora. Esta preparação não altera migrações aplicadas nem ativa essa conexão.

## Validação disponível

`node tests/gmais-fleet.mjs` cobre unidades por configuração, adicional explícito, tanque confirmado/desconhecido, contrato inválido, colisão de IDs, compatibilidade local, leitura do catálogo em cache e preservação de pendências. `tests/connection.mjs` exercita a normalização na resposta da sessão RPC. Os builds web e Android incluem o mesmo adaptador, sem dependência de uma conexão ativa com o GMAIS.
