# Webscrapping Microservice - Guia de Uso

## Melhorias Implementadas

O microservice agora possui as seguintes melhorias para tratamento de conteúdo HTML:

1. **Limpeza com Cheerio**: Remove elementos desnecessários (CSS, JS, menus, anúncios, etc.)
2. **Readability da Mozilla**: Extrai automaticamente o conteúdo principal de artigos
3. **Sanitização HTML**: Mantém apenas tags HTML essenciais e seguras
4. **Limpeza com Regex**: Remove caracteres especiais e normaliza espaços

## Endpoint: POST /scrape

### Parâmetros da Requisição

```json
{
  "tema": "string (obrigatório)",
  "includeOriginalHtml": "boolean (opcional, padrão: false)",
  "contentType": "string (opcional, padrão: 'all')"
}
```

#### Opções para contentType:
- `"all"`: Retorna todos os tipos de conteúdo processado
- `"clean"`: Apenas texto limpo com Cheerio + Regex
- `"readability"`: Apenas conteúdo extraído com Readability
- `"sanitized"`: Apenas HTML sanitizado

### Exemplos de Uso

#### 1. Busca completa (padrão)
```json
{
  "tema": "inteligência artificial 2024"
}
```

#### 2. Apenas texto limpo
```json
{
  "tema": "mudanças climáticas",
  "contentType": "clean"
}
```

#### 3. Conteúdo principal de artigos
```json
{
  "tema": "tecnologia blockchain",
  "contentType": "readability"
}
```

#### 4. HTML sanitizado com HTML original
```json
{
  "tema": "energia renovável",
  "contentType": "sanitized",
  "includeOriginalHtml": true
}
```

### Resposta do Endpoint

```json
{
  "tema": "inteligência artificial",
  "results": [
    {
      "url": "https://exemplo.com/artigo",
      "html": "HTML original completo (apenas se includeOriginalHtml: true)",
      "cleanText": "Texto limpo sem elementos desnecessários...",
      "readabilityContent": {
        "title": "Título do artigo extraído",
        "textContent": "Conteúdo principal do artigo...",
        "excerpt": "Resumo/excerpt do artigo..."
      },
      "sanitizedHtml": "<p>HTML sanitizado com apenas tags seguras...</p>"
    }
  ]
}
```

### Benefícios das Melhorias

1. **Texto mais limpo**: Remove automaticamente menus, anúncios, rodapés
2. **Conteúdo relevante**: Readability extrai apenas o artigo principal
3. **Flexibilidade**: Escolha o tipo de processamento conforme sua necessidade
4. **Performance**: Evita processar HTML original quando não necessário
5. **Segurança**: HTML sanitizado remove scripts e elementos perigosos

### Casos de Uso Recomendados

- **Análise de sentimento**: Use `contentType: "clean"` para texto puro
- **Indexação/busca**: Use `contentType: "readability"` para conteúdo principal
- **Exibição em frontend**: Use `contentType: "sanitized"` para HTML seguro
- **Processamento completo**: Use `contentType: "all"` (padrão)